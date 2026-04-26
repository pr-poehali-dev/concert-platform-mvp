"""
Хранилище документов пользователей (организаторы и площадки).
Каждый пользователь видит только свои документы — изоляция по user_id.

GET  ?action=list              — список документов текущего пользователя
POST ?action=upload            — загрузить новый документ (base64)
POST ?action=delete            — удалить документ (только свой)
POST ?action=update_note       — обновить заметку к документу
"""
import json
import os
import base64
import uuid
import psycopg2
import boto3
from datetime import datetime

SCHEMA = "t_p17532248_concert_platform_mvp"
AUTH_SCHEMA = SCHEMA

CATEGORIES = {
    "technical_rider":  "Технический райдер",
    "domestic_rider":   "Бытовой райдер",
    "artist_contract":  "Договор с артистом",
    "venue_contract":   "Договор с площадкой",
    "other":            "Прочее",
}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB в base64-decoded bytes


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    }


def ok(data, status=200):
    return {
        "statusCode": status,
        "headers": {**cors(), "Content-Type": "application/json"},
        "body": json.dumps(data, ensure_ascii=False, default=str),
    }


def err(msg, status=400):
    return {
        "statusCode": status,
        "headers": {**cors(), "Content-Type": "application/json"},
        "body": json.dumps({"error": msg}, ensure_ascii=False),
    }


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def cdn_url(key: str) -> str:
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def get_session_user(conn, session_id: str) -> dict | None:
    """Возвращает user по session_id из in-memory сессий через SELECT на users."""
    # Сессии хранятся in-memory в auth функции, но мы можем проверить через auth action=me
    # Вместо этого используем X-Session-Id для поиска активной сессии.
    # Поскольку сессии in-memory, делаем запрос к auth через HTTP внутри бэкенда.
    import urllib.request
    auth_url = "https://functions.poehali.dev/f5e06ba0-2cd8-4b53-8899-3cfc3badc3e8"
    try:
        req = urllib.request.Request(
            f"{auth_url}?action=me",
            headers={"X-Session-Id": session_id},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            return data.get("user")
    except Exception as e:
        print(f"[documents] session check error: {e}")
        return None


def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} Б"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes // 1024} КБ"
    else:
        return f"{size_bytes / 1024 / 1024:.1f} МБ"


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "list")
    headers = event.get("headers") or {}

    session_id = headers.get("X-Session-Id", "") or headers.get("x-session-id", "")
    if not session_id:
        return err("Требуется авторизация", 401)

    conn = get_conn()
    user = get_session_user(conn, session_id)
    if not user:
        conn.close()
        return err("Сессия недействительна", 401)

    user_id = user["id"]
    user_role = user.get("role", "organizer")

    # ── GET list ──────────────────────────────────────────────────────────
    if method == "GET" and action == "list":
        cur = conn.cursor()
        cur.execute(f"""
            SELECT id, category, name, file_url, file_size, mime_type, note, created_at
            FROM {SCHEMA}.user_documents
            WHERE user_id = '{user_id}'
            ORDER BY created_at DESC
        """)
        rows = cur.fetchall()
        conn.close()
        docs = []
        for r in rows:
            docs.append({
                "id":         str(r[0]),
                "category":   r[1],
                "categoryLabel": CATEGORIES.get(r[1], "Прочее"),
                "name":       r[2],
                "fileUrl":    r[3],
                "fileSize":   r[4],
                "fileSizeHuman": format_size(r[4]),
                "mimeType":   r[5],
                "note":       r[6],
                "createdAt":  r[7].isoformat() if r[7] else "",
            })
        return ok({"documents": docs, "total": len(docs)})

    # ── POST upload ────────────────────────────────────────────────────────
    if method == "POST" and action == "upload":
        body = json.loads(event.get("body") or "{}")
        file_data = body.get("fileData", "")
        file_name = body.get("fileName", "document")
        mime_type = body.get("mimeType", "application/octet-stream")
        category  = body.get("category", "other")
        note      = body.get("note", "")

        if category not in CATEGORIES:
            category = "other"

        if not file_data:
            conn.close()
            return err("Файл не передан")

        try:
            raw = base64.b64decode(file_data)
        except Exception:
            conn.close()
            return err("Некорректный base64")

        if len(raw) > MAX_FILE_SIZE:
            conn.close()
            return err(f"Файл слишком большой (максимум 20 МБ)")

        # Расширение из mime
        ext_map = {
            "application/pdf": "pdf",
            "application/msword": "doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
            "application/vnd.ms-excel": "xls",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
            "image/jpeg": "jpg",
            "image/png": "png",
            "text/plain": "txt",
        }
        ext = ext_map.get(mime_type, "bin")

        s3_key = f"documents/{user_role}/{user_id}/{uuid.uuid4()}.{ext}"
        s3 = get_s3()
        s3.put_object(
            Bucket="files",
            Key=s3_key,
            Body=raw,
            ContentType=mime_type,
            ContentDisposition=f'attachment; filename="{file_name}"',
        )
        file_url = cdn_url(s3_key)
        file_size = len(raw)

        safe_name = file_name.replace("'", "''")
        safe_url  = file_url.replace("'", "''")
        safe_mime = mime_type.replace("'", "''")
        safe_note = note.replace("'", "''")
        safe_cat  = category.replace("'", "''")

        doc_id = str(uuid.uuid4())
        cur = conn.cursor()
        cur.execute(f"""
            INSERT INTO {SCHEMA}.user_documents
                (id, user_id, user_role, category, name, file_url, file_size, mime_type, note)
            VALUES
                ('{doc_id}', '{user_id}', '{user_role}', '{safe_cat}', '{safe_name}',
                 '{safe_url}', {file_size}, '{safe_mime}', '{safe_note}')
        """)
        conn.commit()
        conn.close()

        return ok({
            "id":       doc_id,
            "fileUrl":  file_url,
            "fileSize": file_size,
            "fileSizeHuman": format_size(file_size),
            "name":     file_name,
            "category": category,
            "categoryLabel": CATEGORIES.get(category, "Прочее"),
            "mimeType": mime_type,
            "note":     note,
            "createdAt": datetime.utcnow().isoformat(),
        })

    # ── POST update_note ──────────────────────────────────────────────────
    if method == "POST" and action == "update_note":
        body = json.loads(event.get("body") or "{}")
        doc_id = body.get("id", "")
        note   = body.get("note", "")
        safe_note = note.replace("'", "''")

        cur = conn.cursor()
        cur.execute(f"""
            UPDATE {SCHEMA}.user_documents
            SET note = '{safe_note}'
            WHERE id = '{doc_id}' AND user_id = '{user_id}'
        """)
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── POST delete ────────────────────────────────────────────────────────
    if method == "POST" and action == "delete":
        body = json.loads(event.get("body") or "{}")
        doc_id = body.get("id", "")

        cur = conn.cursor()
        cur.execute(f"""
            SELECT file_url FROM {SCHEMA}.user_documents
            WHERE id = '{doc_id}' AND user_id = '{user_id}'
        """)
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Документ не найден", 404)

        # Помечаем удалённым через UPDATE (физически из S3 не удаляем — дёшево)
        cur.execute(f"""
            UPDATE {SCHEMA}.user_documents
            SET name = '[удалён]', file_url = '', file_size = 0
            WHERE id = '{doc_id}' AND user_id = '{user_id}'
        """)
        conn.commit()
        conn.close()
        return ok({"ok": True})

    conn.close()
    return err("Неизвестное действие", 404)

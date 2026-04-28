"""
Хранилище документов пользователей (организаторы и площадки).
Каждый пользователь видит только свои документы — изоляция по user_id.
Документы могут быть привязаны к конкретному проекту (project_id).

GET  ?action=list              — все документы пользователя
GET  ?action=list&project_id=X — документы конкретного проекта
POST ?action=upload            — загрузить документ (base64), можно передать projectId
POST ?action=delete            — удалить свой документ
POST ?action=update_note       — обновить заметку
POST ?action=update_folder     — переместить документ в папку (folder: str, id: uuid)
"""
import json
import os
import base64
import uuid
import psycopg2
import boto3
from datetime import datetime

SCHEMA = "t_p17532248_concert_platform_mvp"

CATEGORIES = {
    "technical_rider":  "Технический райдер",
    "domestic_rider":   "Бытовой райдер",
    "artist_contract":  "Договор с артистом",
    "venue_contract":   "Договор с площадкой",
    "other":            "Прочее",
}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 МБ

EXT_MAP = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "text/plain": "txt",
    "application/zip": "zip",
}


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


def get_session_user(session_id: str) -> dict | None:
    """Проверяет сессию напрямую через таблицу sessions в БД."""
    try:
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(
            f"""SELECT user_data FROM {SCHEMA}.sessions
                WHERE session_id = %s
                  AND last_seen > NOW() - INTERVAL '30 days'""",
            (session_id,),
        )
        row = cur.fetchone()
        if row:
            cur.execute(
                f"UPDATE {SCHEMA}.sessions SET last_seen = NOW() WHERE session_id = %s",
                (session_id,),
            )
            conn.commit()
            conn.close()
            user_data = row[0]
            if isinstance(user_data, str):
                user_data = json.loads(user_data)
            return user_data
        conn.close()
        return None
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


def row_to_doc(r) -> dict:
    # r: id, category, name, file_url, file_size, mime_type, note,
    #    created_at, project_id, folder, is_signed
    return {
        "id":            str(r[0]),
        "category":      r[1],
        "categoryLabel": CATEGORIES.get(r[1], "Прочее"),
        "name":          r[2],
        "fileUrl":       r[3],
        "fileSize":      r[4],
        "fileSizeHuman": format_size(r[4]),
        "mimeType":      r[5],
        "note":          r[6] or "",
        "createdAt":     r[7].isoformat() if r[7] else "",
        "projectId":     str(r[8]) if r[8] else None,
        "folder":        r[9] or "",
        "isSigned":      bool(r[10]) if r[10] is not None else False,
    }


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method  = event.get("httpMethod", "GET")
    params  = event.get("queryStringParameters") or {}
    action  = params.get("action", "list")
    headers = event.get("headers") or {}

    session_id = headers.get("X-Session-Id", "") or headers.get("x-session-id", "")
    if not session_id:
        return err("Требуется авторизация", 401)

    user = get_session_user(session_id)
    if not user:
        return err("Сессия недействительна", 401)

    user_id   = user["id"]
    user_role = user.get("role", "organizer")

    # ── GET list ──────────────────────────────────────────────────────────
    if method == "GET" and action == "list":
        project_id = params.get("project_id", "")
        conn = get_conn()
        cur  = conn.cursor()

        if project_id:
            cur.execute(
                f"""SELECT id, category, name, file_url, file_size, mime_type, note,
                           created_at, project_id, folder, is_signed
                    FROM {SCHEMA}.user_documents
                    WHERE user_id = %s AND project_id = %s AND name != '[удалён]'
                    ORDER BY created_at DESC""",
                (user_id, project_id),
            )
        else:
            cur.execute(
                f"""SELECT id, category, name, file_url, file_size, mime_type, note,
                           created_at, project_id, folder, is_signed
                    FROM {SCHEMA}.user_documents
                    WHERE user_id = %s AND project_id IS NULL AND name != '[удалён]'
                    ORDER BY created_at DESC""",
                (user_id,),
            )

        rows = cur.fetchall()
        conn.close()
        docs = [row_to_doc(r) for r in rows]
        return ok({"documents": docs, "total": len(docs)})

    # ── POST upload ────────────────────────────────────────────────────────
    if method == "POST" and action == "upload":
        body      = json.loads(event.get("body") or "{}")
        file_data = body.get("fileData", "")
        file_name = body.get("fileName", "document")
        mime_type = body.get("mimeType", "application/octet-stream")
        category  = body.get("category", "other")
        note      = body.get("note", "")
        project_id = body.get("projectId", None)  # опционально

        if category not in CATEGORIES:
            category = "other"
        if not file_data:
            return err("Файл не передан")

        try:
            raw = base64.b64decode(file_data)
        except Exception:
            return err("Некорректный base64")

        if len(raw) > MAX_FILE_SIZE:
            return err("Файл слишком большой (максимум 20 МБ)")

        ext    = EXT_MAP.get(mime_type, "bin")
        folder = f"documents/projects/{project_id}" if project_id else f"documents/{user_role}/{user_id}"
        s3_key = f"{folder}/{uuid.uuid4()}.{ext}"

        s3 = get_s3()
        s3.put_object(
            Bucket="files",
            Key=s3_key,
            Body=raw,
            ContentType=mime_type,
            ContentDisposition=f'attachment; filename="{file_name}"',
        )
        file_url  = cdn_url(s3_key)
        file_size = len(raw)

        doc_id = str(uuid.uuid4())
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.user_documents
                (id, user_id, user_role, category, name, file_url, file_size, mime_type, note, project_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (doc_id, user_id, user_role, category, file_name,
             file_url, file_size, mime_type, note, project_id or None),
        )
        conn.commit()
        conn.close()

        return ok({
            "id":            doc_id,
            "fileUrl":       file_url,
            "fileSize":      file_size,
            "fileSizeHuman": format_size(file_size),
            "name":          file_name,
            "category":      category,
            "categoryLabel": CATEGORIES.get(category, "Прочее"),
            "mimeType":      mime_type,
            "note":          note,
            "projectId":     project_id,
            "folder":        "",
            "isSigned":      False,
            "createdAt":     datetime.utcnow().isoformat(),
        })

    # ── POST update_note ──────────────────────────────────────────────────
    if method == "POST" and action == "update_note":
        body   = json.loads(event.get("body") or "{}")
        doc_id = body.get("id", "")
        note   = body.get("note", "")
        conn   = get_conn()
        cur    = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.user_documents SET note = %s WHERE id = %s AND user_id = %s",
            (note, doc_id, user_id),
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── POST update_folder ────────────────────────────────────────────────
    if method == "POST" and action == "update_folder":
        body   = json.loads(event.get("body") or "{}")
        doc_id = body.get("id", "")
        folder = body.get("folder", "")
        if not doc_id:
            return err("id обязателен")
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(
            f"SELECT id FROM {SCHEMA}.user_documents WHERE id = %s AND user_id = %s",
            (doc_id, user_id),
        )
        if not cur.fetchone():
            conn.close()
            return err("Документ не найден", 404)
        cur.execute(
            f"UPDATE {SCHEMA}.user_documents SET folder = %s WHERE id = %s AND user_id = %s",
            (folder, doc_id, user_id),
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── POST delete ────────────────────────────────────────────────────────
    if method == "POST" and action == "delete":
        body   = json.loads(event.get("body") or "{}")
        doc_id = body.get("id", "")
        conn   = get_conn()
        cur    = conn.cursor()
        cur.execute(
            f"SELECT id FROM {SCHEMA}.user_documents WHERE id = %s AND user_id = %s",
            (doc_id, user_id),
        )
        if not cur.fetchone():
            conn.close()
            return err("Документ не найден", 404)
        cur.execute(
            f"UPDATE {SCHEMA}.user_documents SET name = '[удалён]', file_url = '', file_size = 0 WHERE id = %s AND user_id = %s",
            (doc_id, user_id),
        )
        conn.commit()
        conn.close()
        return ok({"ok": True})

    return err("Неизвестное действие", 404)
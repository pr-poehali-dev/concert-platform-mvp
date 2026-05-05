"""
Внутренний чат GLOBAL LINK — сообщения между организаторами и площадками.

GET  ?action=conversations&user_id=X          — список диалогов пользователя
GET  ?action=messages&conversation_id=X       — сообщения диалога
POST ?action=start                            — начать диалог (организатор → площадка)
POST ?action=send                             — отправить сообщение (text и/или attachment)
POST ?action=send_file                        — отправить готовый файл из хранилища (по URL)
POST ?action=read                             — пометить сообщения прочитанными
POST ?action=upload_attachment                — загрузить файл в S3 и вернуть URL (base64)
"""
import json
import os
import base64
import uuid
import psycopg2
import boto3

SCHEMA = "t_p17532248_concert_platform_mvp"
NOTIF_URL = "https://functions.poehali.dev/68f4b989-d93d-4a45-af4c-d54ad6815826"

EXT_MAP = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "text/plain": "txt",
    "application/zip": "zip",
}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 МБ


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


def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} Б"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes // 1024} КБ"
    else:
        return f"{size_bytes / 1024 / 1024:.1f} МБ"


def notify(recipient_id: str, title: str, body: str, link_page: str = "chat"):
    import urllib.request
    payload = json.dumps({
        "userId": recipient_id,
        "type": "message",
        "title": title,
        "body": body,
        "linkPage": link_page,
    }).encode()
    req = urllib.request.Request(
        f"{NOTIF_URL}?action=create",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def msg_to_dict(r) -> dict:
    """r = (id, conv_id, sender_id, text, created_at, att_url, att_name, att_size, att_mime, sender_name, sender_role, sender_company)"""
    return {
        "id":             str(r[0]),
        "conversationId": str(r[1]),
        "senderId":       str(r[2]),
        "text":           r[3] or "",
        "createdAt":      str(r[4]),
        "attachmentUrl":  r[5] or "",
        "attachmentName": r[6] or "",
        "attachmentSize": r[7] or 0,
        "attachmentMime": r[8] or "",
        "attachmentSizeHuman": format_size(r[7] or 0) if (r[7] or 0) > 0 else "",
        "senderName":    r[9] if len(r) > 9 else "",
        "senderRole":    r[10] if len(r) > 10 else "",
        "senderCompany": r[11] if len(r) > 11 else "",
    }


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "conversations")

    # ── GET conversations ──────────────────────────────────────────────────
    if method == "GET" and action == "conversations":
        user_id = params.get("user_id", "")
        if not user_id:
            return err("user_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT c.id, c.organizer_id, c.venue_id, c.venue_user_id, c.venue_name,
                           c.last_message, c.last_message_at, c.organizer_unread, c.venue_unread, c.created_at,
                           COALESCE(uorg.name, 'Организатор') as organizer_name,
                           COALESCE(uorg.legal_name, uorg.name, 'Организатор') as organizer_company,
                           COALESCE(uvn.legal_name, uvn.name, c.venue_name) as venue_company
                    FROM {SCHEMA}.conversations c
                    LEFT JOIN {SCHEMA}.users uorg ON uorg.id = c.organizer_id
                    LEFT JOIN {SCHEMA}.users uvn  ON uvn.id  = c.venue_user_id
                    WHERE c.organizer_id = %s OR c.venue_user_id = %s
                    ORDER BY c.last_message_at DESC""",
                (user_id, user_id),
            )
            rows = cur.fetchall()
        finally:
            conn.close()

        result = []
        for r in rows:
            is_organizer = str(r[1]) == user_id
            unread = r[7] if is_organizer else r[8]
            # Название в сайдбаре: организатор видит компанию площадки, площадка — компанию организатора
            sidebar_name = r[12] if is_organizer else r[11]  # venue_company or organizer_company
            result.append({
                "id": str(r[0]),
                "organizerId": str(r[1]),
                "venueId": str(r[2]),
                "venueUserId": str(r[3]),
                "venueName": r[4],
                "lastMessage": r[5],
                "lastMessageAt": str(r[6]),
                "unread": unread,
                "isOrganizer": is_organizer,
                "organizerName": r[10],
                "organizerCompany": r[11],
                "venueCompany": r[12],
                "sidebarName": sidebar_name,
            })
        return ok({"conversations": result})

    # ── GET messages ───────────────────────────────────────────────────────
    if method == "GET" and action == "messages":
        conv_id = params.get("conversation_id", "")
        if not conv_id:
            return err("conversation_id required")
        limit = int(params.get("limit", 100))
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT m.id, m.conversation_id, m.sender_id, m.text, m.created_at,
                           m.attachment_url, m.attachment_name, m.attachment_size, m.attachment_mime,
                           m.sender_name, m.sender_role, m.sender_company
                    FROM {SCHEMA}.messages m
                    WHERE m.conversation_id = %s
                    ORDER BY m.created_at ASC LIMIT %s""",
                (conv_id, limit),
            )
            rows = cur.fetchall()
        finally:
            conn.close()
        return ok({"messages": [msg_to_dict(r) for r in rows]})

    # ── POST start ─────────────────────────────────────────────────────────
    if method == "POST" and action == "start":
        body = json.loads(event.get("body") or "{}")
        organizer_id  = body.get("organizerId", "")
        venue_id      = body.get("venueId", "")
        venue_user_id = body.get("venueUserId", "")
        venue_name    = (body.get("venueName") or "").strip()
        first_msg     = (body.get("message") or "").strip()
        organizer_name = (body.get("organizerName") or "Организатор").strip()

        if not organizer_id or not venue_user_id:
            return err("organizerId, venueUserId обязательны")

        conn = get_conn()
        try:
            cur = conn.cursor()

            # Подтягиваем venue_id и venue_name из таблицы venues если не переданы
            if not venue_id or not venue_name:
                cur.execute(
                    f"SELECT id, name FROM {SCHEMA}.venues WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
                    (venue_user_id,)
                )
                vrow = cur.fetchone()
                if vrow:
                    if not venue_id:
                        venue_id = str(vrow[0])
                    if not venue_name:
                        venue_name = vrow[1] or ""

            # Если venue_id всё ещё не определён — используем venue_user_id как fallback
            if not venue_id:
                venue_id = venue_user_id

            cur.execute(
                f"SELECT id FROM {SCHEMA}.conversations WHERE organizer_id = %s AND venue_id = %s",
                (organizer_id, venue_id),
            )
            row = cur.fetchone()

            if row:
                conv_id = str(row[0])
            else:
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.conversations
                        (organizer_id, venue_id, venue_user_id, venue_name, last_message, last_message_at)
                        VALUES (%s, %s, %s, %s, %s, NOW()) RETURNING id""",
                    (organizer_id, venue_id, venue_user_id, venue_name, first_msg or "Начало диалога"),
                )
                conv_id = str(cur.fetchone()[0])

            if first_msg:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.messages (conversation_id, sender_id, text) VALUES (%s, %s, %s)",
                    (conv_id, organizer_id, first_msg),
                )
                cur.execute(
                    f"""UPDATE {SCHEMA}.conversations
                        SET last_message = %s, last_message_at = NOW(), venue_unread = venue_unread + 1
                        WHERE id = %s""",
                    (first_msg, conv_id),
                )
                conn.commit()
            else:
                conn.commit()
        finally:
            conn.close()

        if first_msg:
            notify(venue_user_id, f"Новое сообщение от {organizer_name}", first_msg[:80])

        return ok({"conversationId": conv_id}, 201)

    # ── POST upload_attachment ─────────────────────────────────────────────
    if method == "POST" and action == "upload_attachment":
        """Загружает файл (base64) в S3 и возвращает URL — без сохранения в messages."""
        body      = json.loads(event.get("body") or "{}")
        file_data = body.get("fileData", "")
        file_name = body.get("fileName", "file")
        mime_type = body.get("mimeType", "application/octet-stream")

        if not file_data:
            return err("fileData обязателен")
        try:
            raw = base64.b64decode(file_data)
        except Exception:
            return err("Некорректный base64")
        if len(raw) > MAX_FILE_SIZE:
            return err("Файл слишком большой (максимум 20 МБ)")

        ext    = EXT_MAP.get(mime_type, "bin")
        s3_key = f"chat-attachments/{uuid.uuid4()}.{ext}"
        s3 = get_s3()
        s3.put_object(
            Bucket="files",
            Key=s3_key,
            Body=raw,
            ContentType=mime_type,
            ContentDisposition=f'attachment; filename="{file_name}"',
        )
        url = cdn_url(s3_key)
        return ok({
            "url":      url,
            "name":     file_name,
            "size":     len(raw),
            "sizeHuman": format_size(len(raw)),
            "mime":     mime_type,
        })

    # ── POST send ──────────────────────────────────────────────────────────
    if method == "POST" and action == "send":
        body           = json.loads(event.get("body") or "{}")
        conv_id        = body.get("conversationId", "")
        sender_id      = body.get("senderId", "")
        text           = (body.get("text") or "").strip()
        sender_name    = (body.get("senderName") or "").strip()
        sender_role    = (body.get("senderRole") or "").strip()
        sender_company = (body.get("senderCompany") or "").strip()
        att_url        = body.get("attachmentUrl", "")
        att_name       = body.get("attachmentName", "")
        att_size       = int(body.get("attachmentSize", 0))
        att_mime       = body.get("attachmentMime", "")

        if not conv_id or not sender_id:
            return err("conversationId, senderId обязательны")
        if not text and not att_url:
            return err("Нужен текст или вложение")

        conn = get_conn()
        try:
            cur = conn.cursor()

            sender_position = (body.get("senderPosition") or "").strip()

            # Подтягиваем из БД имя, роль, компанию и должность
            if not sender_name:
                cur.execute(
                    f"""SELECT name, role, COALESCE(legal_name, '') FROM {SCHEMA}.users WHERE id=%s""",
                    (sender_id,)
                )
                urow = cur.fetchone()
                if urow:
                    sender_name    = urow[0] or ""
                    sender_role    = sender_role or urow[1] or ""
                    sender_company = sender_company or urow[2] or ""

            # Проверяем — может это сотрудник? Подтягиваем должность из employees
            if not sender_position:
                cur.execute(
                    f"""SELECT e.role_in_company, u2.id as company_user_id,
                               COALESCE(u2.legal_name, u2.name, '') as company_name
                        FROM {SCHEMA}.employees e
                        JOIN {SCHEMA}.users u2 ON u2.id = e.company_user_id
                        WHERE LOWER(e.email) = (SELECT LOWER(email) FROM {SCHEMA}.users WHERE id=%s LIMIT 1)
                          AND e.is_active = true
                        LIMIT 1""",
                    (sender_id,)
                )
                emp_row = cur.fetchone()
                if emp_row:
                    sender_position = emp_row[0] or ""
                    if not sender_company:
                        sender_company = emp_row[2] or ""

            cur.execute(
                f"SELECT organizer_id, venue_user_id FROM {SCHEMA}.conversations WHERE id = %s",
                (conv_id,),
            )
            row = cur.fetchone()
            if not row:
                conn.close()
                return err("Диалог не найден", 404)

            organizer_id, venue_user_id = str(row[0]), str(row[1])
            is_organizer = sender_id == organizer_id
            recipient_id = venue_user_id if is_organizer else organizer_id

            cur.execute(
                f"""INSERT INTO {SCHEMA}.messages
                    (conversation_id, sender_id, text,
                     attachment_url, attachment_name, attachment_size, attachment_mime,
                     sender_name, sender_role, sender_company)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at""",
                (conv_id, sender_id, text or "",
                 att_url, att_name, att_size, att_mime,
                 sender_name, sender_role,
                 f"{sender_company}|{sender_position}" if sender_position else sender_company),
            )
            msg_row = cur.fetchone()
            msg_id     = str(msg_row[0])
            created_at = str(msg_row[1])

            last_msg_preview = text if text else f"📎 {att_name}"
            unread_col = "venue_unread" if is_organizer else "organizer_unread"

            cur.execute(
                f"""UPDATE {SCHEMA}.conversations
                    SET last_message = %s, last_message_at = NOW(), {unread_col} = {unread_col} + 1
                    WHERE id = %s""",
                (last_msg_preview[:200], conv_id),
            )
            conn.commit()
        finally:
            conn.close()

        notif_body = text[:80] if text else f"Прикреплён файл: {att_name}"
        notify(recipient_id, f"Новое сообщение от {sender_name or 'пользователя'}", notif_body)

        stored_company = f"{sender_company}|{sender_position}" if sender_position else sender_company
        return ok({
            "id":               msg_id,
            "conversationId":   conv_id,
            "senderId":         sender_id,
            "senderName":       sender_name,
            "senderRole":       sender_role,
            "senderCompany":    stored_company,
            "senderPosition":   sender_position,
            "text":             text or "",
            "createdAt":      created_at,
            "attachmentUrl":  att_url,
            "attachmentName": att_name,
            "attachmentSize": att_size,
            "attachmentMime": att_mime,
            "attachmentSizeHuman": format_size(att_size) if att_size > 0 else "",
        })

    # ── POST read ──────────────────────────────────────────────────────────
    if method == "POST" and action == "read":
        body    = json.loads(event.get("body") or "{}")
        conv_id = body.get("conversationId", "")
        user_id = body.get("userId", "")
        if not conv_id or not user_id:
            return err("conversationId, userId обязательны")

        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT organizer_id FROM {SCHEMA}.conversations WHERE id = %s", (conv_id,)
            )
            row = cur.fetchone()
            if row:
                is_organizer = str(row[0]) == user_id
                col_unread = "organizer_unread"      if is_organizer else "venue_unread"
                col_read   = "organizer_last_read_at" if is_organizer else "venue_last_read_at"
                cur.execute(
                    f"UPDATE {SCHEMA}.conversations SET {col_unread} = 0, {col_read} = NOW() WHERE id = %s",
                    (conv_id,),
                )
                conn.commit()
        finally:
            conn.close()
        return ok({"ok": True})

    # ── GET presence — онлайн-статус собеседника по диалогу ────────────────
    if method == "GET" and action == "presence":
        conv_id = params.get("conversation_id", "")
        user_id = params.get("user_id", "")
        if not conv_id or not user_id:
            return err("conversation_id, user_id обязательны")

        conn = get_conn()
        try:
            cur = conn.cursor()
            # Узнаём id собеседника
            cur.execute(
                f"""SELECT organizer_id, venue_user_id,
                           organizer_last_read_at, venue_last_read_at
                    FROM {SCHEMA}.conversations WHERE id = %s""",
                (conv_id,),
            )
            row = cur.fetchone()
            if not row:
                return err("Диалог не найден", 404)
            is_organizer = str(row[0]) == user_id
            other_id = str(row[1]) if is_organizer else str(row[0])
            # last_read_at собеседника — по нему отмечаем "прочитано" (две галочки)
            other_last_read = row[3] if is_organizer else row[2]

            # Самая свежая активность собеседника из sessions
            cur.execute(
                f"SELECT MAX(last_seen) FROM {SCHEMA}.sessions WHERE user_id = %s",
                (other_id,),
            )
            last_row = cur.fetchone()
            last_seen = last_row[0] if last_row else None
        finally:
            conn.close()

        return ok({
            "otherUserId":      other_id,
            "lastSeen":         str(last_seen) if last_seen else "",
            "otherLastReadAt":  str(other_last_read) if other_last_read else "",
        })

    return err("Неизвестное действие", 404)
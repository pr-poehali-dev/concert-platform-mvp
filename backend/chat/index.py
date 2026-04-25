"""
Внутренний чат GLOBAL LINK — сообщения между организаторами и площадками.

GET  ?action=conversations&user_id=X          — список диалогов пользователя
GET  ?action=messages&conversation_id=X       — сообщения диалога
POST ?action=start                            — начать диалог (организатор → площадка)
POST ?action=send                             — отправить сообщение
POST ?action=read&conversation_id=X&user_id=Y — пометить сообщения прочитанными
"""
import json
import os
import psycopg2

SCHEMA = "t_p17532248_concert_platform_mvp"
NOTIF_URL = "https://functions.poehali.dev/68f4b989-d93d-4a45-af4c-d54ad6815826"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


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


def notify(recipient_id: str, title: str, body: str, link_page: str = "chat"):
    """Создать уведомление через notifications API."""
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
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, organizer_id, venue_id, venue_user_id, venue_name,
                       last_message, last_message_at, organizer_unread, venue_unread, created_at
                FROM {SCHEMA}.conversations
                WHERE organizer_id = %s OR venue_user_id = %s
                ORDER BY last_message_at DESC""",
            (user_id, user_id),
        )
        rows = cur.fetchall()
        conn.close()

        result = []
        for r in rows:
            is_organizer = str(r[1]) == user_id
            unread = r[7] if is_organizer else r[8]
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
            })
        return ok({"conversations": result})

    # ── GET messages ───────────────────────────────────────────────────────
    if method == "GET" and action == "messages":
        conv_id = params.get("conversation_id", "")
        if not conv_id:
            return err("conversation_id required")
        limit = int(params.get("limit", 50))
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, conversation_id, sender_id, text, created_at
                FROM {SCHEMA}.messages
                WHERE conversation_id = %s
                ORDER BY created_at ASC LIMIT %s""",
            (conv_id, limit),
        )
        rows = cur.fetchall()
        conn.close()
        msgs = [
            {"id": str(r[0]), "conversationId": str(r[1]),
             "senderId": str(r[2]), "text": r[3], "createdAt": str(r[4])}
            for r in rows
        ]
        return ok({"messages": msgs})

    # ── POST start ─────────────────────────────────────────────────────────
    if method == "POST" and action == "start":
        body = json.loads(event.get("body") or "{}")
        organizer_id = body.get("organizerId", "")
        venue_id = body.get("venueId", "")
        venue_user_id = body.get("venueUserId", "")
        venue_name = (body.get("venueName") or "").strip()
        first_msg = (body.get("message") or "").strip()
        organizer_name = (body.get("organizerName") or "Организатор").strip()

        if not organizer_id or not venue_id or not venue_user_id:
            return err("organizerId, venueId, venueUserId обязательны")

        conn = get_conn()
        cur = conn.cursor()

        # Проверяем — диалог уже существует?
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

        # Если есть первое сообщение — сохраняем
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
            conn.close()
            notify(venue_user_id, f"Новое сообщение от {organizer_name}", first_msg[:80])
        else:
            conn.commit()
            conn.close()

        return ok({"conversationId": conv_id}, 201)

    # ── POST send ──────────────────────────────────────────────────────────
    if method == "POST" and action == "send":
        body = json.loads(event.get("body") or "{}")
        conv_id = body.get("conversationId", "")
        sender_id = body.get("senderId", "")
        text = (body.get("text") or "").strip()
        sender_name = (body.get("senderName") or "Пользователь").strip()

        if not conv_id or not sender_id or not text:
            return err("conversationId, senderId, text обязательны")

        conn = get_conn()
        cur = conn.cursor()

        # Получаем участников
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

        # Сохраняем сообщение
        cur.execute(
            f"INSERT INTO {SCHEMA}.messages (conversation_id, sender_id, text) VALUES (%s, %s, %s) RETURNING id, created_at",
            (conv_id, sender_id, text),
        )
        msg_row = cur.fetchone()
        msg_id = str(msg_row[0])
        created_at = str(msg_row[1])

        # Обновляем диалог
        unread_col = "venue_unread" if is_organizer else "organizer_unread"
        cur.execute(
            f"""UPDATE {SCHEMA}.conversations
                SET last_message = %s, last_message_at = NOW(), {unread_col} = {unread_col} + 1
                WHERE id = %s""",
            (text, conv_id),
        )
        conn.commit()
        conn.close()

        notify(recipient_id, f"Новое сообщение от {sender_name}", text[:80])

        return ok({
            "id": msg_id,
            "conversationId": conv_id,
            "senderId": sender_id,
            "text": text,
            "createdAt": created_at,
        }, 201)

    # ── POST read ──────────────────────────────────────────────────────────
    if method == "POST" and action == "read":
        body = json.loads(event.get("body") or "{}")
        conv_id = body.get("conversationId", "")
        user_id = body.get("userId", "")
        if not conv_id or not user_id:
            return err("conversationId и userId обязательны")

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT organizer_id FROM {SCHEMA}.conversations WHERE id = %s",
            (conv_id,),
        )
        row = cur.fetchone()
        if row:
            is_organizer = str(row[0]) == user_id
            col = "organizer_unread" if is_organizer else "venue_unread"
            cur.execute(
                f"UPDATE {SCHEMA}.conversations SET {col} = 0 WHERE id = %s",
                (conv_id,),
            )
            conn.commit()
        conn.close()
        return ok({"success": True})

    return err("Not found", 404)

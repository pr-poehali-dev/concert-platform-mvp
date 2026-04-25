"""
API уведомлений GLOBAL LINK.
GET  ?action=list&user_id=X       — список уведомлений пользователя
GET  ?action=unread_count&user_id=X — количество непрочитанных
POST ?action=read&id=X            — пометить уведомление прочитанным
POST ?action=read_all&user_id=X   — пометить все прочитанными
POST ?action=create               — создать уведомление (внутренний вызов)
"""
import json
import os
import psycopg2

SCHEMA = "t_p17532248_concert_platform_mvp"

ICONS = {
    "message": "💬",
    "booking": "📅",
    "review": "⭐",
    "system": "🔔",
    "tour": "🎸",
    "venue": "🏟️",
}


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


def row_to_notif(row) -> dict:
    return {
        "id": str(row[0]),
        "userId": str(row[1]),
        "type": row[2],
        "title": row[3],
        "body": row[4],
        "linkPage": row[5],
        "isRead": row[6],
        "createdAt": str(row[7]),
        "icon": ICONS.get(row[2], "🔔"),
    }


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "list")

    # GET ?action=list&user_id=X
    if method == "GET" and action == "list":
        user_id = params.get("user_id", "")
        if not user_id:
            return err("user_id required")
        limit = int(params.get("limit", 30))
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, user_id, type, title, body, link_page, is_read, created_at
                FROM {SCHEMA}.notifications
                WHERE user_id = %s
                ORDER BY created_at DESC LIMIT %s""",
            (user_id, limit),
        )
        rows = cur.fetchall()
        conn.close()
        return ok({"notifications": [row_to_notif(r) for r in rows]})

    # GET ?action=unread_count&user_id=X
    if method == "GET" and action == "unread_count":
        user_id = params.get("user_id", "")
        if not user_id:
            return err("user_id required")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT COUNT(*) FROM {SCHEMA}.notifications WHERE user_id = %s AND is_read = FALSE",
            (user_id,),
        )
        count = cur.fetchone()[0]
        conn.close()
        return ok({"count": count})

    # POST ?action=read
    if method == "POST" and action == "read":
        body = json.loads(event.get("body") or "{}")
        notif_id = body.get("id", "")
        if not notif_id:
            return err("id required")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.notifications SET is_read = TRUE WHERE id = %s",
            (notif_id,),
        )
        conn.commit()
        conn.close()
        return ok({"success": True})

    # POST ?action=read_all
    if method == "POST" and action == "read_all":
        body = json.loads(event.get("body") or "{}")
        user_id = body.get("userId", "")
        if not user_id:
            return err("userId required")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.notifications SET is_read = TRUE WHERE user_id = %s AND is_read = FALSE",
            (user_id,),
        )
        conn.commit()
        conn.close()
        return ok({"success": True})

    # POST ?action=create  (внутренний — создать уведомление)
    if method == "POST" and action == "create":
        body = json.loads(event.get("body") or "{}")
        user_id = body.get("userId", "")
        notif_type = body.get("type", "system")
        title = (body.get("title") or "").strip()
        notif_body = (body.get("body") or "").strip()
        link_page = body.get("linkPage", "")

        if not user_id or not title:
            return err("userId и title обязательны")

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.notifications (user_id, type, title, body, link_page)
                VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (user_id, notif_type, title, notif_body, link_page),
        )
        notif_id = str(cur.fetchone()[0])
        conn.commit()
        conn.close()
        return ok({"id": notif_id}, 201)

    return err("Not found", 404)

"""
API уведомлений GLOBAL LINK.
GET  ?action=list&user_id=X          — список уведомлений пользователя
GET  ?action=unread_count&user_id=X  — количество непрочитанных
GET  ?action=vapid_public_key        — публичный VAPID-ключ для подписки
POST ?action=read                    — пометить прочитанным
POST ?action=read_all                — пометить все прочитанными
POST ?action=create                  — создать уведомление + отправить push
POST ?action=push_subscribe          — сохранить push-подписку браузера
POST ?action=push_unsubscribe        — удалить push-подписку
"""
import json
import os
import base64
import struct
import hashlib
import hmac
import time
import urllib.request
import psycopg2

SCHEMA = "t_p17532248_concert_platform_mvp"

ICONS = {
    "message": "💬",
    "booking": "📅",
    "review":  "⭐",
    "system":  "🔔",
    "tour":    "🎸",
    "venue":   "🏟️",
    "task":    "📋",
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
    return {"statusCode": status,
            "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status,
            "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def row_to_notif(row) -> dict:
    return {
        "id":        str(row[0]),
        "userId":    str(row[1]),
        "type":      row[2],
        "title":     row[3],
        "body":      row[4],
        "linkPage":  row[5],
        "isRead":    row[6],
        "createdAt": str(row[7]),
        "icon":      ICONS.get(row[2], "🔔"),
    }


# ── VAPID helpers ──────────────────────────────────────────────────────────

def _b64u_decode(s: str) -> bytes:
    """Base64url decode без padding."""
    s = s.replace("-", "+").replace("_", "/")
    pad = 4 - len(s) % 4
    if pad != 4:
        s += "=" * pad
    return base64.b64decode(s)


def _b64u_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _make_vapid_jwt(audience: str, subject: str, private_key_b64: str) -> str:
    """Создаёт JWT для VAPID (ES256) без сторонних библиотек."""
    # Header + payload
    header  = _b64u_encode(json.dumps({"typ":"JWT","alg":"ES256"}).encode())
    now     = int(time.time())
    payload = _b64u_encode(json.dumps({
        "aud": audience,
        "exp": now + 12 * 3600,
        "sub": subject,
    }).encode())
    signing_input = f"{header}.{payload}".encode()

    # Подписываем через ECDSA P-256
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.backends import default_backend

        raw_key = _b64u_decode(private_key_b64)
        priv_key = ec.derive_private_key(
            int.from_bytes(raw_key, "big"),
            ec.SECP256R1(),
            default_backend(),
        )
        der_sig = priv_key.sign(signing_input, ec.ECDSA(hashes.SHA256()))

        # DER → raw R||S (64 bytes)
        from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
        r, s = decode_dss_signature(der_sig)
        sig_bytes = r.to_bytes(32, "big") + s.to_bytes(32, "big")
        return f"{header}.{payload}.{_b64u_encode(sig_bytes)}"
    except Exception as ex:
        print(f"[VAPID JWT] error: {ex}")
        return ""


def send_web_push(subscription: dict, payload: dict) -> bool:
    """Отправляет Web Push уведомление через VAPID (без шифрования payload — plaintext)."""
    vapid_pub  = os.environ.get("VAPID_PUBLIC_KEY", "")
    vapid_priv = os.environ.get("VAPID_PRIVATE_KEY", "")
    if not vapid_pub or not vapid_priv:
        return False

    endpoint = subscription.get("endpoint", "")
    if not endpoint:
        return False

    # VAPID audience — origin endpoint
    from urllib.parse import urlparse
    parsed   = urlparse(endpoint)
    audience = f"{parsed.scheme}://{parsed.netloc}"
    subject  = os.environ.get("APP_URL", "https://globallink.art")

    jwt = _make_vapid_jwt(audience, f"mailto:info@globallink.art", vapid_priv)
    if not jwt:
        return False

    body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    headers = {
        "Authorization": f"vapid t={jwt},k={vapid_pub}",
        "Content-Type":  "application/json",
        "TTL":           "86400",
    }

    req = urllib.request.Request(endpoint, data=body_bytes, headers=headers, method="POST")
    try:
        urllib.request.urlopen(req, timeout=10)
        return True
    except urllib.error.HTTPError as e:
        status = e.code
        if status in (404, 410):
            # Подписка устарела — удаляем
            try:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    cur.execute(f"DELETE FROM {SCHEMA}.push_subscriptions WHERE endpoint=%s", (endpoint,))
                    conn.commit()
                finally:
                    conn.close()
            except Exception:
                pass
        print(f"[push] HTTPError {status}: {e.reason}")
        return False
    except Exception as ex:
        print(f"[push] error: {ex}")
        return False


def push_to_user(user_id: str, title: str, body: str, link_page: str = "", notif_type: str = "system"):
    """Отправляет Web Push всем подпискам пользователя."""
    try:
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT endpoint, p256dh, auth FROM {SCHEMA}.push_subscriptions WHERE user_id=%s",
                (user_id,))
            rows = cur.fetchall()
        finally:
            conn.close()
    except Exception:
        return

    if not rows:
        return

    payload = {
        "title": title,
        "body":  body,
        "tag":   f"gl-{notif_type}",
        "data":  {"linkPage": link_page},
        "requireInteraction": notif_type == "task",
    }
    for endpoint, p256dh, auth in rows:
        send_web_push({"endpoint": endpoint, "p256dh": p256dh, "auth": auth}, payload)


# ── Handler ────────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """Уведомления и Web Push подписки GLOBAL LINK."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "list")

    # GET vapid_public_key — отдаём публичный ключ фронту
    if method == "GET" and action == "vapid_public_key":
        pub = os.environ.get("VAPID_PUBLIC_KEY", "")
        return ok({"publicKey": pub})

    # GET list — возвращает уведомления + unread_count в одном запросе
    if method == "GET" and action == "list":
        user_id = params.get("user_id", "")
        if not user_id: return err("user_id required")
        limit = min(int(params.get("limit", 30)), 100)
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT id, user_id, type, title, body, link_page, is_read, created_at,
                           COUNT(*) FILTER (WHERE is_read = FALSE) OVER () AS unread_count
                    FROM {SCHEMA}.notifications WHERE user_id=%s
                    ORDER BY created_at DESC LIMIT %s""",
                (user_id, limit))
            rows = cur.fetchall()
        finally:
            conn.close()
        if rows:
            notifs = [row_to_notif(r[:8]) for r in rows]
            unread_count = rows[0][8]
        else:
            notifs = []
            unread_count = 0
        return ok({"notifications": notifs, "unreadCount": unread_count})

    # GET unread_count (оставляем для совместимости)
    if method == "GET" and action == "unread_count":
        user_id = params.get("user_id", "")
        if not user_id: return err("user_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT COUNT(*) FROM {SCHEMA}.notifications WHERE user_id=%s AND is_read=FALSE",
                (user_id,))
            count = cur.fetchone()[0]
        finally:
            conn.close()
        return ok({"count": count})

    # POST read
    if method == "POST" and action == "read":
        body = json.loads(event.get("body") or "{}")
        notif_id = body.get("id", "")
        if not notif_id: return err("id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.notifications SET is_read=TRUE WHERE id=%s", (notif_id,))
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    # POST read_all
    if method == "POST" and action == "read_all":
        body = json.loads(event.get("body") or "{}")
        user_id = body.get("userId", "")
        if not user_id: return err("userId required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.notifications SET is_read=TRUE WHERE user_id=%s AND is_read=FALSE",
                (user_id,))
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    # POST create — создать уведомление + отправить push
    if method == "POST" and action == "create":
        body = json.loads(event.get("body") or "{}")
        user_id    = body.get("userId", "")
        notif_type = body.get("type", "system")
        title      = (body.get("title") or "").strip()
        notif_body = (body.get("body") or "").strip()
        link_page  = body.get("linkPage", "")
        send_push  = bool(body.get("sendPush", True))

        if not user_id or not title: return err("userId и title обязательны")

        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""INSERT INTO {SCHEMA}.notifications (user_id, type, title, body, link_page)
                    VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                (user_id, notif_type, title, notif_body, link_page))
            notif_id = str(cur.fetchone()[0])
            conn.commit()
        finally:
            conn.close()

        # Отправляем Web Push асинхронно (не блокируем ответ)
        if send_push:
            try:
                push_to_user(user_id, title, notif_body, link_page, notif_type)
            except Exception as ex:
                print(f"[push_to_user] {ex}")

        return ok({"id": notif_id}, 201)

    # POST push_subscribe — сохранить подписку
    if method == "POST" and action == "push_subscribe":
        body      = json.loads(event.get("body") or "{}")
        user_id   = body.get("userId", "")
        endpoint  = (body.get("endpoint") or "").strip()
        p256dh    = (body.get("p256dh") or "").strip()
        auth_key  = (body.get("auth") or "").strip()
        ua        = (body.get("userAgent") or "")[:200]

        if not user_id or not endpoint or not p256dh or not auth_key:
            return err("userId, endpoint, p256dh, auth required")

        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""INSERT INTO {SCHEMA}.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (endpoint) DO UPDATE
                    SET user_id=%s, p256dh=%s, auth=%s, user_agent=%s""",
                (user_id, endpoint, p256dh, auth_key, ua,
                 user_id, p256dh, auth_key, ua))
            conn.commit()
        finally:
            conn.close()
        return ok({"subscribed": True})

    # POST push_unsubscribe — удалить подписку
    if method == "POST" and action == "push_unsubscribe":
        body     = json.loads(event.get("body") or "{}")
        endpoint = (body.get("endpoint") or "").strip()
        if not endpoint: return err("endpoint required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {SCHEMA}.push_subscriptions WHERE endpoint=%s", (endpoint,))
            conn.commit()
        finally:
            conn.close()
        return ok({"unsubscribed": True})

    return err("Not found", 404)
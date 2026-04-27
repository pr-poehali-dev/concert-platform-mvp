"""
Модуль электронной подписи документов (ПЭП) для GLOBAL LINK.

GET  ?action=status&document_id=X     — статус подписей документа
POST ?action=request_code             — запросить код подтверждения на email (ПЭП)
POST ?action=confirm                  — подтвердить подпись кодом
POST ?action=decline                  — отклонить подпись
POST ?action=send_request             — отправить запрос на подпись другому пользователю
GET  ?action=my_requests              — входящие запросы на подпись
"""
import json, os, random, hashlib, string
import psycopg2
import urllib.request
from datetime import datetime, timezone

SCHEMA = "t_p17532248_concert_platform_mvp"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    }


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def get_session_user(session_id: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT user_data FROM {SCHEMA}.sessions WHERE session_id = %s AND last_seen > NOW() - INTERVAL '30 days'",
        (session_id,)
    )
    row = cur.fetchone()
    if row:
        cur.execute(f"UPDATE {SCHEMA}.sessions SET last_seen = NOW() WHERE session_id = %s", (session_id,))
        conn.commit()
    conn.close()
    if not row:
        return None
    data = row[0]
    return json.loads(data) if isinstance(data, str) else data


def gen_code() -> str:
    return "".join(random.choices(string.digits, k=6))


def doc_hash(doc_id: str, user_id: str, signed_at: str) -> str:
    raw = f"{doc_id}:{user_id}:{signed_at}:{os.environ.get('ADMIN_SECRET','')}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def send_code_email(to_email: str, name: str, doc_name: str, code: str):
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        return
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
  <tr><td style="padding-bottom:20px;text-align:center;">
    <span style="font-family:Arial,sans-serif;font-size:20px;font-weight:bold;color:#fff;letter-spacing:2px;">GLOBAL LINK</span>
  </td></tr>
  <tr><td style="background:#15152a;border-radius:16px;border:1px solid rgba(255,255,255,0.1);padding:32px;">
    <h2 style="color:#fff;font-size:18px;margin:0 0 8px;">Подписание документа</h2>
    <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 6px;">Привет, {name}!</p>
    <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 24px;line-height:1.6;">
      Вы запросили подписание документа <strong style="color:#fff;">«{doc_name}»</strong>.<br>
      Введите код для подтверждения простой электронной подписи (ПЭП):
    </p>
    <div style="background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.4);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
      <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#a855f7;">{code}</span>
    </div>
    <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;line-height:1.5;">
      Код действует 15 минут.<br>
      Если вы не запрашивали подписание — проигнорируйте это письмо.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>"""
    payload = json.dumps({
        "from": "GLOBAL LINK <noreply@globallink.art>",
        "to": [to_email],
        "subject": f"Код подписания документа «{doc_name}» — {code}",
        "html": html,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as ex:
        print(f"[sign] email error: {ex}")


def send_request_email(to_email: str, recipient_name: str, sender_name: str, doc_name: str, message: str, app_url: str):
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        return
    msg_block = f'<p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 16px;font-style:italic;">«{message}»</p>' if message else ""
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
  <tr><td style="padding-bottom:20px;text-align:center;">
    <span style="font-size:20px;font-weight:bold;color:#fff;letter-spacing:2px;">GLOBAL LINK</span>
  </td></tr>
  <tr><td style="background:#15152a;border-radius:16px;border:1px solid rgba(255,255,255,0.1);padding:32px;">
    <h2 style="color:#fff;font-size:18px;margin:0 0 8px;">Запрос на подписание</h2>
    <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 16px;line-height:1.6;">
      {recipient_name}, пользователь <strong style="color:#fff;">{sender_name}</strong> просит вас подписать документ:<br>
      <strong style="color:#22d3ee;">«{doc_name}»</strong>
    </p>
    {msg_block}
    <a href="{app_url}/documents" style="display:inline-block;background:linear-gradient(135deg,#a855f7,#22d3ee);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;font-size:14px;margin-bottom:20px;">
      Перейти к документу
    </a>
    <p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0;">
      Если вы не ожидали это письмо — проигнорируйте его.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>"""
    payload = json.dumps({
        "from": "GLOBAL LINK <noreply@globallink.art>",
        "to": [to_email],
        "subject": f"{sender_name} просит подписать документ «{doc_name}»",
        "html": html,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as ex:
        print(f"[sign] request email error: {ex}")


def handler(event: dict, context) -> dict:
    """Модуль ПЭП — подписание документов кодом из email."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method  = event.get("httpMethod", "GET")
    params  = event.get("queryStringParameters") or {}
    action  = params.get("action", "status")
    headers = event.get("headers") or {}
    session_id = headers.get("X-Session-Id", "") or headers.get("x-session-id", "")

    if not session_id:
        return err("Требуется авторизация", 401)
    user = get_session_user(session_id)
    if not user:
        return err("Сессия недействительна", 401)

    user_id    = user["id"]
    user_email = user.get("email", "")
    user_name  = user.get("name", "Пользователь")

    # ── GET status ────────────────────────────────────────────────────────
    if method == "GET" and action == "status":
        doc_id = params.get("document_id", "")
        if not doc_id:
            return err("document_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id, signer_user_id, signer_name, signer_email, sign_type,
                       status, signed_at, hash, created_at
                FROM {SCHEMA}.document_signatures
                WHERE document_id = %s ORDER BY created_at""",
            (doc_id,)
        )
        sigs = []
        for r in cur.fetchall():
            sigs.append({
                "id": str(r[0]), "signerUserId": str(r[1]),
                "signerName": r[2], "signerEmail": r[3],
                "signType": r[4], "status": r[5],
                "signedAt": r[6].isoformat() if r[6] else None,
                "hash": r[7], "createdAt": str(r[8]),
                "isMe": str(r[1]) == user_id,
            })
        # Запросы на подпись
        cur.execute(
            f"""SELECT id, recipient_email, recipient_name, status, created_at
                FROM {SCHEMA}.signature_requests
                WHERE document_id = %s ORDER BY created_at""",
            (doc_id,)
        )
        reqs = []
        for r in cur.fetchall():
            reqs.append({
                "id": str(r[0]), "recipientEmail": r[1],
                "recipientName": r[2], "status": r[3], "createdAt": str(r[4]),
            })
        conn.close()
        return ok({"signatures": sigs, "requests": reqs})

    # ── POST request_code — отправить код на email текущего юзера ─────────
    if method == "POST" and action == "request_code":
        b = json.loads(event.get("body") or "{}")
        doc_id = b.get("documentId", "")
        if not doc_id:
            return err("documentId required")

        conn = get_conn(); cur = conn.cursor()
        # Проверяем что документ существует
        cur.execute(f"SELECT name FROM {SCHEMA}.user_documents WHERE id = %s", (doc_id,))
        row = cur.fetchone()
        if not row:
            conn.close(); return err("Документ не найден", 404)
        doc_name = row[0]

        # Проверяем нет ли уже подписи от этого юзера
        cur.execute(
            f"SELECT id, status FROM {SCHEMA}.document_signatures WHERE document_id = %s AND signer_user_id = %s",
            (doc_id, user_id)
        )
        existing = cur.fetchone()
        if existing and existing[1] == "signed":
            conn.close(); return err("Вы уже подписали этот документ")

        # Создаём или обновляем запись подписи
        if existing:
            sig_id = str(existing[0])
            cur.execute(
                f"UPDATE {SCHEMA}.document_signatures SET status = 'pending' WHERE id = %s",
                (sig_id,)
            )
        else:
            cur.execute(
                f"""INSERT INTO {SCHEMA}.document_signatures
                    (document_id, signer_user_id, signer_name, signer_email, sign_type, status,
                     ip_address, user_agent)
                    VALUES (%s, %s, %s, %s, 'pep', 'pending', %s, %s) RETURNING id""",
                (doc_id, user_id, user_name, user_email,
                 (event.get("requestContext") or {}).get("identity", {}).get("sourceIp", ""),
                 (headers.get("User-Agent") or "")[:200])
            )
            sig_id = str(cur.fetchone()[0])

        # Инвалидируем старые коды
        cur.execute(
            f"UPDATE {SCHEMA}.signature_codes SET used = true WHERE signature_id = %s AND used = false",
            (sig_id,)
        )
        # Создаём новый код
        code = gen_code()
        cur.execute(
            f"INSERT INTO {SCHEMA}.signature_codes (signature_id, code) VALUES (%s, %s)",
            (sig_id, code)
        )
        conn.commit(); conn.close()

        send_code_email(user_email, user_name, doc_name, code)
        return ok({"signatureId": sig_id, "email": user_email})

    # ── POST confirm — подтвердить код ────────────────────────────────────
    if method == "POST" and action == "confirm":
        b = json.loads(event.get("body") or "{}")
        sig_id = b.get("signatureId", "")
        code   = b.get("code", "").strip()
        if not sig_id or not code:
            return err("signatureId и code обязательны")

        conn = get_conn(); cur = conn.cursor()
        # Проверяем код
        cur.execute(
            f"""SELECT id FROM {SCHEMA}.signature_codes
                WHERE signature_id = %s AND code = %s AND used = false AND expires_at > NOW()""",
            (sig_id, code)
        )
        code_row = cur.fetchone()
        if not code_row:
            conn.close(); return err("Неверный или устаревший код")

        # Отмечаем код использованным
        cur.execute(f"UPDATE {SCHEMA}.signature_codes SET used = true WHERE id = %s", (code_row[0],))

        # Получаем document_id для хеша
        cur.execute(f"SELECT document_id FROM {SCHEMA}.document_signatures WHERE id = %s", (sig_id,))
        doc_row = cur.fetchone()
        signed_at = datetime.now(timezone.utc).isoformat()
        h = doc_hash(str(doc_row[0]), user_id, signed_at)

        cur.execute(
            f"""UPDATE {SCHEMA}.document_signatures
                SET status = 'signed', signed_at = %s, hash = %s WHERE id = %s""",
            (signed_at, h, sig_id)
        )
        # Обновляем статус запроса если был
        cur.execute(
            f"""UPDATE {SCHEMA}.signature_requests
                SET status = 'signed'
                WHERE document_id = %s AND recipient_email = %s""",
            (str(doc_row[0]), user_email)
        )
        conn.commit(); conn.close()
        return ok({"signed": True, "signedAt": signed_at, "hash": h})

    # ── POST decline ──────────────────────────────────────────────────────
    if method == "POST" and action == "decline":
        b = json.loads(event.get("body") or "{}")
        sig_id = b.get("signatureId", "")
        if not sig_id:
            return err("signatureId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.document_signatures SET status = 'declined' WHERE id = %s AND signer_user_id = %s",
            (sig_id, user_id)
        )
        conn.commit(); conn.close()
        return ok({"declined": True})

    # ── POST send_request — отправить приглашение подписать ───────────────
    if method == "POST" and action == "send_request":
        b = json.loads(event.get("body") or "{}")
        doc_id         = b.get("documentId", "")
        recipient_email = b.get("recipientEmail", "").strip().lower()
        recipient_name  = b.get("recipientName", "").strip()
        message         = b.get("message", "").strip()[:500]

        if not doc_id:            return err("documentId required")
        if "@" not in recipient_email: return err("Некорректный email получателя")

        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"SELECT name, user_id FROM {SCHEMA}.user_documents WHERE id = %s", (doc_id,))
        doc_row = cur.fetchone()
        if not doc_row:
            conn.close(); return err("Документ не найден", 404)
        doc_name, doc_owner = doc_row[0], str(doc_row[1])
        if doc_owner != user_id:
            conn.close(); return err("Нет прав на этот документ", 403)

        # Находим получателя в системе если есть
        if not recipient_name:
            cur.execute(f"SELECT name FROM {SCHEMA}.users WHERE email = %s", (recipient_email,))
            u = cur.fetchone()
            recipient_name = u[0] if u else recipient_email

        cur.execute(
            f"""INSERT INTO {SCHEMA}.signature_requests
                (document_id, sender_user_id, recipient_email, recipient_name, message)
                VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (doc_id, user_id, recipient_email, recipient_name, message)
        )
        req_id = str(cur.fetchone()[0])
        conn.commit(); conn.close()

        app_url = os.environ.get("APP_URL", "https://globallink.art")
        send_request_email(recipient_email, recipient_name, user_name, doc_name, message, app_url)
        return ok({"requestId": req_id})

    # ── GET my_requests — входящие запросы на подпись ─────────────────────
    if method == "GET" and action == "my_requests":
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT sr.id, sr.document_id, sr.recipient_email, sr.status, sr.created_at,
                       ud.name, ud.file_url, ud.category,
                       u.name as sender_name
                FROM {SCHEMA}.signature_requests sr
                JOIN {SCHEMA}.user_documents ud ON ud.id = sr.document_id
                JOIN {SCHEMA}.users u ON u.id = sr.sender_user_id
                WHERE sr.recipient_email = %s
                ORDER BY sr.created_at DESC""",
            (user_email,)
        )
        rows = cur.fetchall()
        conn.close()
        return ok({"requests": [
            {
                "id": str(r[0]), "documentId": str(r[1]),
                "recipientEmail": r[2], "status": r[3], "createdAt": str(r[4]),
                "documentName": r[5], "fileUrl": r[6], "category": r[7],
                "senderName": r[8],
            } for r in rows
        ]})

    return err("Неизвестный action", 400)

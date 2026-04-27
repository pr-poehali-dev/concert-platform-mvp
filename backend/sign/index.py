"""
Модуль электронной подписи документов (ПЭП) для GLOBAL LINK.

GET  ?action=status&document_id=X     — статус подписей документа
POST ?action=request_code             — запросить код подтверждения на email (ПЭП)
POST ?action=confirm                  — подтвердить подпись кодом
POST ?action=decline                  — отклонить подпись
POST ?action=send_request             — отправить запрос на подпись другому пользователю
GET  ?action=my_requests              — входящие запросы на подпись
GET  ?action=download_signed          — сформировать страницу с печатью подписи и вернуть URL
POST ?action=send_internal            — отправить документ контрагенту внутри платформы
"""
import json, os, random, hashlib, string, uuid
import psycopg2, boto3
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

    # ── GET download_signed — HTML-страница с печатью подписей → S3 → URL ──
    if method == "GET" and action == "download_signed":
        doc_id = params.get("document_id", "")
        if not doc_id:
            return err("document_id required")

        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"SELECT name, file_url, mime_type FROM {SCHEMA}.user_documents WHERE id = %s",
            (doc_id,)
        )
        doc_row = cur.fetchone()
        if not doc_row:
            conn.close(); return err("Документ не найден", 404)
        doc_name, file_url, mime_type = doc_row

        cur.execute(
            f"""SELECT signer_name, signer_email, sign_type, status, signed_at, hash, ip_address
                FROM {SCHEMA}.document_signatures
                WHERE document_id = %s AND status = 'signed'
                ORDER BY signed_at""",
            (doc_id,)
        )
        sigs = cur.fetchall()
        conn.close()

        if not sigs:
            return err("Документ ещё не подписан")

        # Формируем HTML-страницу с печатью подписей
        sigs_html = ""
        for s in sigs:
            s_name, s_email, s_type, s_status, s_at, s_hash, s_ip = s
            s_dt = s_at.strftime("%d.%m.%Y %H:%M:%S UTC") if s_at else "—"
            sigs_html += f"""
            <div class="sig-block">
              <div class="sig-icon">✓</div>
              <div class="sig-info">
                <div class="sig-name">{s_name}</div>
                <div class="sig-email">{s_email}</div>
                <div class="sig-meta">
                  <span class="sig-type">{'Простая ЭП (ПЭП)' if s_type == 'pep' else 'КЭП'}</span>
                  <span>·</span>
                  <span>{s_dt}</span>
                  {'<span>· IP: ' + s_ip + '</span>' if s_ip else ''}
                </div>
                <div class="sig-hash">SHA-256: {s_hash}</div>
              </div>
            </div>"""

        generated_at = datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M:%S UTC")
        is_image = mime_type.startswith("image/")
        is_pdf   = mime_type == "application/pdf"

        preview_block = ""
        if is_pdf:
            preview_block = f'<div class="preview-link"><a href="{file_url}" target="_blank">📄 Открыть оригинальный документ</a></div>'
        elif is_image:
            preview_block = f'<img src="{file_url}" class="preview-img" alt="Документ" />'
        else:
            preview_block = f'<div class="preview-link"><a href="{file_url}" target="_blank">📎 Скачать оригинальный файл: {doc_name}</a></div>'

        html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Подписанный документ — {doc_name}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Arial', sans-serif; background: #0d0d1a; color: #fff; padding: 40px 20px; }}
  .container {{ max-width: 760px; margin: 0 auto; }}
  .header {{ text-align: center; margin-bottom: 32px; }}
  .brand {{ font-size: 22px; font-weight: bold; letter-spacing: 3px; color: #fff; margin-bottom: 8px; }}
  .title {{ font-size: 20px; color: #e2e2ff; margin-bottom: 4px; }}
  .doc-name {{ font-size: 16px; color: rgba(255,255,255,0.5); word-break: break-word; }}
  .badge {{ display: inline-flex; align-items: center; gap: 6px; background: rgba(34,211,238,0.1);
            border: 1px solid rgba(34,211,238,0.3); color: #22d3ee; border-radius: 20px;
            padding: 4px 14px; font-size: 13px; margin-top: 12px; }}
  .section {{ background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
              border-radius: 16px; padding: 24px; margin-bottom: 20px; }}
  .section-title {{ font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;
                    color: rgba(255,255,255,0.35); margin-bottom: 16px; }}
  .sig-block {{ display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }}
  .sig-block:last-child {{ border-bottom: none; padding-bottom: 0; }}
  .sig-icon {{ width: 36px; height: 36px; border-radius: 10px; background: rgba(34,211,238,0.15);
               border: 1px solid rgba(34,211,238,0.3); display: flex; align-items: center;
               justify-content: center; color: #22d3ee; font-size: 18px; flex-shrink: 0; }}
  .sig-name {{ font-size: 15px; font-weight: bold; color: #fff; }}
  .sig-email {{ font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 2px; }}
  .sig-meta {{ font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; }}
  .sig-type {{ background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3);
               color: #a855f7; border-radius: 6px; padding: 1px 8px; font-size: 11px; }}
  .sig-hash {{ font-family: monospace; font-size: 11px; color: rgba(255,255,255,0.2);
               margin-top: 6px; word-break: break-all; }}
  .preview-link {{ text-align: center; padding: 16px; }}
  .preview-link a {{ color: #22d3ee; text-decoration: none; font-size: 15px; }}
  .preview-img {{ width: 100%; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); }}
  .footer {{ text-align: center; color: rgba(255,255,255,0.2); font-size: 12px; margin-top: 24px; }}
  .seal {{ border: 2px solid rgba(34,211,238,0.4); border-radius: 50%; width: 120px; height: 120px;
           display: flex; flex-direction: column; align-items: center; justify-content: center;
           margin: 0 auto 24px; text-align: center; color: rgba(34,211,238,0.8); }}
  .seal-top {{ font-size: 9px; letter-spacing: 1px; text-transform: uppercase; }}
  .seal-check {{ font-size: 36px; line-height: 1; margin: 4px 0; }}
  .seal-bottom {{ font-size: 9px; letter-spacing: 1px; text-transform: uppercase; }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">GLOBAL LINK</div>
    <div class="title">Подписанный документ</div>
    <div class="doc-name">{doc_name}</div>
    <div class="badge">✓ Электронная подпись действительна</div>
  </div>

  <div class="seal">
    <div class="seal-top">GLOBAL</div>
    <div class="seal-check">✓</div>
    <div class="seal-bottom">LINK · ПЭП</div>
  </div>

  <div class="section">
    <div class="section-title">Подписи ({len(sigs)})</div>
    {sigs_html}
  </div>

  <div class="section">
    <div class="section-title">Документ</div>
    {preview_block}
  </div>

  <div class="footer">
    Сформировано платформой GLOBAL LINK · {generated_at}<br>
    Документ ID: {doc_id}
  </div>
</div>
</body>
</html>"""

        # Сохраняем в S3
        s3 = boto3.client("s3",
            endpoint_url="https://bucket.poehali.dev",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        )
        key = f"signed/{doc_id}/{uuid.uuid4()}.html"
        s3.put_object(Bucket="files", Key=key, Body=html.encode("utf-8"), ContentType="text/html; charset=utf-8")
        cdn = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return ok({"url": cdn, "signaturesCount": len(sigs)})

    # ── POST send_internal — отправить документ контрагенту внутри платформы
    if method == "POST" and action == "send_internal":
        b = json.loads(event.get("body") or "{}")
        doc_id          = b.get("documentId", "")
        recipient_email = b.get("recipientEmail", "").strip().lower()
        recipient_name  = b.get("recipientName", "").strip()
        message         = b.get("message", "").strip()[:500]

        if not doc_id:                 return err("documentId required")
        if "@" not in recipient_email: return err("Некорректный email получателя")

        conn = get_conn(); cur = conn.cursor()
        # Получаем данные документа
        cur.execute(
            f"SELECT name, file_url, file_size, mime_type, category FROM {SCHEMA}.user_documents WHERE id = %s",
            (doc_id,)
        )
        doc_row = cur.fetchone()
        if not doc_row:
            conn.close(); return err("Документ не найден", 404)
        doc_name, file_url, file_size, mime_type, category = doc_row

        # Находим получателя внутри платформы
        cur.execute(f"SELECT id, name FROM {SCHEMA}.users WHERE email = %s", (recipient_email,))
        recipient = cur.fetchone()

        # Копируем документ получателю (если он есть в системе)
        if recipient:
            rec_id, rec_name = str(recipient[0]), recipient[1]
            new_doc_id = str(uuid.uuid4())
            cur.execute(
                f"""INSERT INTO {SCHEMA}.user_documents
                    (id, user_id, user_role, category, name, file_url, file_size, mime_type, note)
                    VALUES (%s, %s, 'organizer', %s, %s, %s, %s, %s, %s)""",
                (new_doc_id, rec_id, category, doc_name, file_url, file_size, mime_type,
                 f"Получен от {user_name}" + (f": {message}" if message else ""))
            )
            recipient_name = rec_name
        else:
            recipient_name = recipient_name or recipient_email

        conn.commit(); conn.close()

        # Отправляем email
        app_url = os.environ.get("APP_URL", "https://globallink.art")
        api_key = os.environ.get("RESEND_API_KEY", "")
        msg_block = f'<p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 16px;font-style:italic;">«{message}»</p>' if message else ""
        platform_note = '<p style="color:rgba(34,211,238,0.8);font-size:13px;margin-top:12px;">✓ Документ добавлен в ваш раздел «Документы» на платформе</p>' if recipient else ""
        if api_key:
            html_email = f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 20px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
  <tr><td style="padding-bottom:20px;text-align:center;">
    <span style="font-size:20px;font-weight:bold;color:#fff;letter-spacing:2px;">GLOBAL LINK</span>
  </td></tr>
  <tr><td style="background:#15152a;border-radius:16px;border:1px solid rgba(255,255,255,0.1);padding:32px;">
    <h2 style="color:#fff;font-size:18px;margin:0 0 8px;">Вам отправили документ</h2>
    <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 16px;line-height:1.6;">
      <strong style="color:#fff;">{user_name}</strong> поделился документом с вами:<br>
      <strong style="color:#22d3ee;">«{doc_name}»</strong>
    </p>
    {msg_block}
    <a href="{file_url}" style="display:inline-block;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:14px;margin-bottom:16px;">
      📎 Открыть документ
    </a>
    {platform_note}
    <a href="{app_url}" style="display:block;margin-top:16px;text-align:center;background:linear-gradient(135deg,#a855f7,#22d3ee);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;font-size:14px;">
      Перейти в GLOBAL LINK
    </a>
  </td></tr>
</table></td></tr>
</table></body></html>"""
            payload = json.dumps({
                "from": "GLOBAL LINK <noreply@globallink.art>",
                "to": [recipient_email],
                "subject": f"{user_name} поделился документом «{doc_name}»",
                "html": html_email,
            }).encode("utf-8")
            req_http = urllib.request.Request(
                "https://api.resend.com/emails", data=payload,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                method="POST",
            )
            try: urllib.request.urlopen(req_http, timeout=10)
            except Exception as ex: print(f"[sign] send_internal email: {ex}")

        return ok({
            "sent": True,
            "recipientName": recipient_name,
            "isRegistered": bool(recipient),
        })

    return err("Неизвестный action", 400)
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
import json, os, random, hashlib, string, uuid, tempfile
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
    <a href="{app_url}" style="display:inline-block;background:linear-gradient(135deg,#a855f7,#22d3ee);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;font-size:14px;margin-bottom:20px;">
      Войти и подписать документ
    </a>
    <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:8px 0 0;">
      После входа перейдите в раздел <b style="color:#fff;">«Подписание»</b> в личном кабинете.
    </p>
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
        # Документ может существовать у отправителя или получателя (через signature_requests)
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
            ip = ""
            try:
                rc = event.get("requestContext") or {}
                ip = (rc.get("identity") or {}).get("sourceIp", "")
            except Exception:
                pass
            cur.execute(
                f"""INSERT INTO {SCHEMA}.document_signatures
                    (document_id, signer_user_id, signer_name, signer_email, sign_type, status,
                     ip_address, user_agent)
                    VALUES (%s, %s, %s, %s, 'pep', 'pending', %s, %s) RETURNING id""",
                (doc_id, user_id, user_name, user_email, ip,
                 (headers.get("User-Agent") or "")[:200])
            )
            sig_id = str(cur.fetchone()[0])

        # Инвалидируем старые коды
        cur.execute(
            f"UPDATE {SCHEMA}.signature_codes SET used = true WHERE signature_id = %s AND used = false",
            (sig_id,)
        )
        # Создаём новый код (expires_at явно ставим +15 минут)
        code = gen_code()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.signature_codes (signature_id, code, expires_at)
                VALUES (%s, %s, NOW() + INTERVAL '15 minutes')""",
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

        # Находим получателя в системе (регистронезависимо)
        cur.execute(
            f"SELECT id, name FROM {SCHEMA}.users WHERE LOWER(email) = LOWER(%s)",
            (recipient_email,)
        )
        recipient_row = cur.fetchone()
        # doc_id для signature_requests — оригинальный, но получатель будет видеть свою копию
        sig_doc_id = doc_id  # ID документа который подписывается (может быть копия)

        if recipient_row:
            rec_user_id, rec_name = str(recipient_row[0]), recipient_row[1]
            if not recipient_name:
                recipient_name = rec_name
            # Ищем уже существующую копию у получателя
            cur.execute(
                f"""SELECT id FROM {SCHEMA}.user_documents
                    WHERE file_url = (SELECT file_url FROM {SCHEMA}.user_documents WHERE id = %s)
                      AND user_id = %s""",
                (doc_id, rec_user_id)
            )
            existing_copy = cur.fetchone()
            if existing_copy:
                sig_doc_id = str(existing_copy[0])
            else:
                # Копируем документ получателю и используем ID копии
                cur.execute(
                    f"""SELECT category, name, file_url, file_size, mime_type
                        FROM {SCHEMA}.user_documents WHERE id = %s""",
                    (doc_id,)
                )
                orig = cur.fetchone()
                if orig:
                    cur.execute(
                        f"""INSERT INTO {SCHEMA}.user_documents
                            (user_id, user_role, category, name, file_url, file_size, mime_type, note)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                        (rec_user_id, 'organizer', orig[0], orig[1], orig[2], orig[3], orig[4],
                         f"Получен от {user_name} для подписания" + (f": {message}" if message else ""))
                    )
                    new_doc_row = cur.fetchone()
                    if new_doc_row:
                        sig_doc_id = str(new_doc_row[0])
        else:
            if not recipient_name:
                recipient_name = recipient_email

        cur.execute(
            f"""INSERT INTO {SCHEMA}.signature_requests
                (document_id, sender_user_id, recipient_email, recipient_name, message)
                VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (sig_doc_id, user_id, recipient_email, recipient_name, message)
        )
        req_id = str(cur.fetchone()[0])
        conn.commit(); conn.close()

        app_url = os.environ.get("APP_URL", "https://globallink.art")
        send_request_email(recipient_email, recipient_name, user_name, doc_name, message, app_url)
        return ok({"requestId": req_id, "recipientIsRegistered": bool(recipient_row)})

    # ── GET my_requests — входящие запросы на подпись ─────────────────────
    if method == "GET" and action == "my_requests":
        conn = get_conn(); cur = conn.cursor()
        # Получаем актуальный email из таблицы users (на случай расхождения с сессией)
        cur.execute(f"SELECT email FROM {SCHEMA}.users WHERE id = %s", (user_id,))
        urow = cur.fetchone()
        actual_email = urow[0].strip().lower() if urow else user_email.strip().lower()

        cur.execute(
            f"""SELECT sr.id, sr.document_id, sr.recipient_email, sr.status, sr.created_at,
                       ud.name, ud.file_url, ud.category, ud.mime_type,
                       u.name as sender_name
                FROM {SCHEMA}.signature_requests sr
                JOIN {SCHEMA}.user_documents ud ON ud.id = sr.document_id
                JOIN {SCHEMA}.users u ON u.id = sr.sender_user_id
                WHERE LOWER(TRIM(sr.recipient_email)) = LOWER(TRIM(%s))
                   OR LOWER(TRIM(sr.recipient_email)) = LOWER(TRIM(%s))
                ORDER BY sr.created_at DESC""",
            (actual_email, user_email)
        )
        rows = cur.fetchall()
        conn.close()
        # Убираем дубли по id
        seen = set()
        result = []
        for r in rows:
            if r[0] not in seen:
                seen.add(r[0])
                result.append({
                    "id": str(r[0]), "documentId": str(r[1]),
                    "recipientEmail": r[2], "status": r[3], "createdAt": str(r[4]),
                    "documentName": r[5], "fileUrl": r[6], "category": r[7],
                    "mimeType": r[8] or "application/pdf",
                    "senderName": r[9],
                })
        return ok({"requests": result})

    # ── GET download_signed — PDF оригинал + лист подписей → S3 → URL ───────
    if method == "GET" and action == "download_signed":
        import io
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from pypdf import PdfWriter, PdfReader

        # ── Регистрируем TTF-шрифт с кириллицей (DejaVu) ─────────────────
        FONT_URLS = {
            "DejaVu":      "https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans.ttf",
            "DejaVu-Bold": "https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans-Bold.ttf",
        }
        fonts_ok = False
        try:
            tmpdir = tempfile.mkdtemp()
            for fname, furl in FONT_URLS.items():
                fpath = os.path.join(tmpdir, f"{fname}.ttf")
                r = urllib.request.Request(furl, headers={"User-Agent": "GLOBALLINK/1.0"})
                with urllib.request.urlopen(r, timeout=15) as resp:
                    with open(fpath, "wb") as f:
                        f.write(resp.read())
                pdfmetrics.registerFont(TTFont(fname, fpath))
            F_NORMAL = "DejaVu"
            F_BOLD   = "DejaVu-Bold"
            F_MONO   = "Courier"
            fonts_ok = True
        except Exception as e:
            print(f"[sign] font load error: {e}")
            F_NORMAL = "Helvetica"
            F_BOLD   = "Helvetica-Bold"
            F_MONO   = "Courier"

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
            f"""SELECT signer_name, signer_email, sign_type, signed_at, hash, ip_address
                FROM {SCHEMA}.document_signatures
                WHERE document_id = %s AND status = 'signed'
                ORDER BY signed_at""",
            (doc_id,)
        )
        sigs = cur.fetchall()
        conn.close()

        if not sigs:
            return err("Документ ещё не подписан")

        generated_at = datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M:%S UTC")

        # ── Генерируем лист подписей (PDF) через ReportLab ─────────────
        sig_buf = io.BytesIO()
        doc_rl = SimpleDocTemplate(
            sig_buf, pagesize=A4,
            leftMargin=20*mm, rightMargin=20*mm,
            topMargin=20*mm, bottomMargin=20*mm,
        )

        styles = getSampleStyleSheet()
        story  = []

        # Стили с кириллическим шрифтом
        title_style = ParagraphStyle("title", parent=styles["Normal"],
            fontSize=18, fontName=F_BOLD, textColor=colors.HexColor("#1a1a2e"),
            spaceAfter=4, alignment=TA_CENTER)
        sub_style = ParagraphStyle("sub", parent=styles["Normal"],
            fontSize=11, fontName=F_NORMAL, textColor=colors.HexColor("#555577"),
            spaceAfter=2, alignment=TA_CENTER)
        label_style = ParagraphStyle("label", parent=styles["Normal"],
            fontSize=8, fontName=F_NORMAL, textColor=colors.HexColor("#888899"),
            spaceAfter=1)
        value_style = ParagraphStyle("value", parent=styles["Normal"],
            fontSize=10, fontName=F_BOLD, textColor=colors.HexColor("#1a1a2e"),
            spaceAfter=2)
        mono_style = ParagraphStyle("mono", parent=styles["Normal"],
            fontSize=7, fontName=F_MONO, textColor=colors.HexColor("#888899"),
            spaceAfter=6, wordWrap="CJK")
        footer_style = ParagraphStyle("footer", parent=styles["Normal"],
            fontSize=7, fontName=F_NORMAL, textColor=colors.HexColor("#aaaacc"),
            alignment=TA_CENTER)
        header_sig_style = ParagraphStyle("sh", parent=styles["Normal"],
            fontSize=9, fontName=F_BOLD, textColor=colors.HexColor("#4444aa"))

        # Заголовок
        story.append(Paragraph("GLOBAL LINK", title_style))
        story.append(Paragraph("Лист электронной подписи", sub_style))
        story.append(Paragraph(f"Документ: {doc_name}", sub_style))
        story.append(Spacer(1, 6*mm))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#ddddee")))
        story.append(Spacer(1, 4*mm))

        # Блок каждой подписи
        for i, s in enumerate(sigs, 1):
            s_name, s_email, s_type, s_at, s_hash, s_ip = s
            s_dt = s_at.strftime("%d.%m.%Y %H:%M:%S UTC") if s_at else "-"
            sign_label = "Простая электронная подпись (ПЭП)" if s_type == "pep" else "Квалифицированная ЭП (КЭП)"

            data = [
                [Paragraph(f"Подпись #{i} — {sign_label}", header_sig_style)],
                [Table([
                    [Paragraph("Подписант:", label_style), Paragraph(s_name, value_style)],
                    [Paragraph("Email:", label_style),     Paragraph(s_email, value_style)],
                    [Paragraph("Дата и время:", label_style), Paragraph(s_dt, value_style)],
                    [Paragraph("IP-адрес:", label_style),  Paragraph(s_ip or "-", value_style)],
                    [Paragraph("Контрольная сумма SHA-256:", label_style),
                     Paragraph(s_hash, mono_style)],
                ], colWidths=[45*mm, None],
                   style=TableStyle([
                       ("VALIGN",       (0,0), (-1,-1), "TOP"),
                       ("LEFTPADDING",  (0,0), (-1,-1), 0),
                       ("RIGHTPADDING", (0,0), (-1,-1), 0),
                       ("BOTTOMPADDING",(0,0), (-1,-1), 2),
                   ]))],
            ]
            tbl = Table(data, colWidths=["100%"],
                style=TableStyle([
                    ("BOX",         (0,0), (-1,-1), 0.5, colors.HexColor("#ccccee")),
                    ("BACKGROUND",  (0,0), (-1,0),  colors.HexColor("#f0f0fa")),
                    ("BACKGROUND",  (0,1), (-1,1),  colors.HexColor("#fafafa")),
                    ("LEFTPADDING", (0,0), (-1,-1),  6),
                    ("RIGHTPADDING",(0,0), (-1,-1),  6),
                    ("TOPPADDING",  (0,0), (-1,-1),  5),
                    ("BOTTOMPADDING",(0,0),(-1,-1),  5),
                ]))
            story.append(tbl)
            story.append(Spacer(1, 3*mm))

        story.append(Spacer(1, 4*mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#ddddee")))
        story.append(Spacer(1, 3*mm))
        story.append(Paragraph(
            f"Сформировано платформой GLOBAL LINK | {generated_at} | ID: {doc_id}",
            footer_style
        ))
        story.append(Paragraph(
            "Настоящий лист является неотъемлемой частью документа и подтверждает факт подписания "
            "простой электронной подписью в соответствии с ФЗ-63 Об электронной подписи.",
            ParagraphStyle("law", parent=footer_style, fontName=F_NORMAL, fontSize=6, spaceAfter=0)
        ))

        doc_rl.build(story)
        sig_pdf_bytes = sig_buf.getvalue()

        # ── Объединяем с оригинальным PDF если он есть ─────────────────
        is_pdf = mime_type == "application/pdf"
        writer = PdfWriter()

        if is_pdf:
            try:
                # Скачиваем оригинал
                orig_req = urllib.request.Request(file_url, headers={"User-Agent": "GLOBALLINK/1.0"})
                with urllib.request.urlopen(orig_req, timeout=15) as resp:
                    orig_bytes = resp.read()
                orig_reader = PdfReader(io.BytesIO(orig_bytes))
                for page in orig_reader.pages:
                    writer.add_page(page)
            except Exception as e:
                print(f"[sign] could not fetch original PDF: {e}")
                # Если не удалось скачать — просто лист подписей

        # Добавляем лист подписей
        sig_reader = PdfReader(io.BytesIO(sig_pdf_bytes))
        for page in sig_reader.pages:
            writer.add_page(page)

        # Метаданные
        writer.add_metadata({
            "/Title": f"{doc_name} — подписано",
            "/Author": "GLOBAL LINK",
            "/Subject": "Электронная подпись (ПЭП)",
            "/Creator": "GLOBAL LINK Platform",
        })

        out_buf = io.BytesIO()
        writer.write(out_buf)
        final_pdf = out_buf.getvalue()

        # ── Сохраняем в S3 ─────────────────────────────────────────────
        s3 = boto3.client("s3",
            endpoint_url="https://bucket.poehali.dev",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        )
        key = f"signed/{doc_id}/{uuid.uuid4()}.pdf"
        s3.put_object(Bucket="files", Key=key, Body=final_pdf,
                      ContentType="application/pdf",
                      ContentDisposition=f'attachment; filename="signed_{doc_name}.pdf"')
        cdn = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return ok({"url": cdn, "signaturesCount": len(sigs), "isPdf": True})

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
        # Получаем данные документа — проверяем владение
        cur.execute(
            f"SELECT name, file_url, file_size, mime_type, category, user_id FROM {SCHEMA}.user_documents WHERE id = %s",
            (doc_id,)
        )
        doc_row = cur.fetchone()
        if not doc_row:
            conn.close(); return err("Документ не найден", 404)
        doc_name, file_url, file_size, mime_type, category, doc_owner = doc_row
        if str(doc_owner) != user_id:
            conn.close(); return err("Нет прав на этот документ", 403)

        # Находим получателя внутри платформы (регистронезависимо)
        cur.execute(f"SELECT id, name FROM {SCHEMA}.users WHERE LOWER(email) = LOWER(%s)", (recipient_email,))
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
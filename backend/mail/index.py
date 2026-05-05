"""
Почтовый клиент: IMAP (чтение) + SMTP (отправка).
Поддерживает несколько аккаунтов на пользователя, шифрование паролей,
кэш заголовков писем.

Actions:
  GET  ?action=accounts&user_id=...                       — список почтовых аккаунтов
  POST ?action=add_account                                — добавить аккаунт (тест IMAP+SMTP)
  POST ?action=delete_account                             — отключить аккаунт
  GET  ?action=folders&account_id=...                     — список IMAP-папок
  GET  ?action=list&account_id=...&folder=INBOX&limit=50  — список писем папки
  GET  ?action=read&account_id=...&folder=...&uid=...     — открыть письмо целиком
  POST ?action=send                                       — отправить письмо (SMTP)
"""
import json
import os
import base64
import hashlib
import imaplib
import smtplib
import email
import email.header
import email.utils
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timezone

import psycopg2
from cryptography.fernet import Fernet


SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")


def cors() -> dict:
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, X-Session-Id",
        "Access-Control-Max-Age": "86400",
    }


def ok(body: dict, status: int = 200) -> dict:
    return {
        "statusCode": status,
        "headers": {**cors(), "Content-Type": "application/json"},
        "isBase64Encoded": False,
        "body": json.dumps(body, ensure_ascii=False),
    }


def err(message: str, status: int = 400) -> dict:
    return ok({"error": message}, status)


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_fernet() -> Fernet:
    """Превращаем MAIL_ENCRYPTION_KEY (любая строка) в 32-байтовый ключ для Fernet."""
    raw = os.environ.get("MAIL_ENCRYPTION_KEY", "default-mail-key-change-me-please-32b").encode()
    digest = hashlib.sha256(raw).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_password(plain: str) -> str:
    return get_fernet().encrypt(plain.encode()).decode()


def decrypt_password(token: str) -> str:
    return get_fernet().decrypt(token.encode()).decode()


def decode_header_str(value) -> str:
    """Безопасно декодирует MIME-заголовок (Subject, From и т.п.)."""
    if not value:
        return ""
    try:
        parts = email.header.decode_header(value)
        result = []
        for txt, charset in parts:
            if isinstance(txt, bytes):
                try:
                    result.append(txt.decode(charset or "utf-8", errors="replace"))
                except Exception:
                    result.append(txt.decode("utf-8", errors="replace"))
            else:
                result.append(txt)
        return "".join(result)
    except Exception:
        return str(value)


def parse_address(raw: str) -> tuple:
    """Возвращает (имя, email) из заголовка From."""
    if not raw:
        return ("", "")
    name, addr = email.utils.parseaddr(raw)
    return (decode_header_str(name), addr)


def imap_connect(account: dict):
    """Открывает IMAP-соединение по аккаунту (dict с расшифрованным паролем)."""
    if account["imap_ssl"]:
        m = imaplib.IMAP4_SSL(account["imap_host"], account["imap_port"])
    else:
        m = imaplib.IMAP4(account["imap_host"], account["imap_port"])
    m.login(account["username"], account["password"])
    return m


def smtp_connect(account: dict):
    """Открывает SMTP-соединение."""
    if account["smtp_ssl"]:
        s = smtplib.SMTP_SSL(account["smtp_host"], account["smtp_port"], timeout=20)
    else:
        s = smtplib.SMTP(account["smtp_host"], account["smtp_port"], timeout=20)
        s.starttls()
    s.login(account["username"], account["password"])
    return s


def get_account(conn, account_id: str, user_id: str | None = None) -> dict | None:
    cur = conn.cursor()
    if user_id:
        cur.execute(
            f"""SELECT id, user_id, email, display_name, imap_host, imap_port, imap_ssl,
                       smtp_host, smtp_port, smtp_ssl, username, password_encrypted, is_active
                FROM {SCHEMA}.mail_accounts WHERE id = %s AND user_id = %s""",
            (account_id, user_id),
        )
    else:
        cur.execute(
            f"""SELECT id, user_id, email, display_name, imap_host, imap_port, imap_ssl,
                       smtp_host, smtp_port, smtp_ssl, username, password_encrypted, is_active
                FROM {SCHEMA}.mail_accounts WHERE id = %s""",
            (account_id,),
        )
    row = cur.fetchone()
    if not row:
        return None
    return {
        "id":            str(row[0]),
        "user_id":       str(row[1]),
        "email":         row[2],
        "display_name":  row[3],
        "imap_host":     row[4],
        "imap_port":     row[5],
        "imap_ssl":      row[6],
        "smtp_host":     row[7],
        "smtp_port":     row[8],
        "smtp_ssl":      row[9],
        "username":      row[10],
        "password":      decrypt_password(row[11]),
        "is_active":     row[12],
    }


def extract_body(msg) -> tuple:
    """Извлекает (text, html, attachments) из email.message.Message."""
    text = ""
    html = ""
    attachments = []
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = str(part.get("Content-Disposition") or "")
            if "attachment" in disp.lower():
                fname = decode_header_str(part.get_filename() or "file")
                attachments.append({
                    "name": fname,
                    "size": len(part.get_payload(decode=True) or b""),
                    "mime": ctype,
                })
                continue
            if ctype == "text/plain" and not text:
                payload = part.get_payload(decode=True) or b""
                text = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
            elif ctype == "text/html" and not html:
                payload = part.get_payload(decode=True) or b""
                html = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
    else:
        payload = msg.get_payload(decode=True) or b""
        body = payload.decode(msg.get_content_charset() or "utf-8", errors="replace")
        if msg.get_content_type() == "text/html":
            html = body
        else:
            text = body
    return text, html, attachments


def handler(event: dict, context) -> dict:
    """
    Почтовый клиент IMAP/SMTP: подключение аккаунтов, чтение и отправка писем.
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")

    # ── GET accounts ───────────────────────────────────────────────────────
    if method == "GET" and action == "accounts":
        user_id = params.get("user_id", "")
        if not user_id:
            return err("user_id обязателен")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT id, email, display_name, imap_host, smtp_host, is_active, created_at
                    FROM {SCHEMA}.mail_accounts WHERE user_id = %s ORDER BY created_at""",
                (user_id,),
            )
            rows = cur.fetchall()
        finally:
            conn.close()
        return ok({"accounts": [{
            "id":           str(r[0]),
            "email":        r[1],
            "displayName":  r[2],
            "imapHost":     r[3],
            "smtpHost":     r[4],
            "isActive":     r[5],
            "createdAt":    str(r[6]),
        } for r in rows]})

    # ── POST check_connection — проверить IMAP/SMTP без сохранения ────────
    if method == "POST" and action == "check_connection":
        body      = json.loads(event.get("body") or "{}")
        imap_host = (body.get("imapHost") or "").strip()
        imap_port = int(body.get("imapPort") or 993)
        imap_ssl  = bool(body.get("imapSsl", True))
        smtp_host = (body.get("smtpHost") or "").strip()
        smtp_port = int(body.get("smtpPort") or 465)
        smtp_ssl  = bool(body.get("smtpSsl", True))
        username  = (body.get("username") or body.get("email") or "").strip()
        password  = body.get("password") or ""

        if not imap_host or not smtp_host or not username or not password:
            return err("Заполните email, пароль и серверы")

        test_acc = {
            "imap_host": imap_host, "imap_port": imap_port, "imap_ssl": imap_ssl,
            "smtp_host": smtp_host, "smtp_port": smtp_port, "smtp_ssl": smtp_ssl,
            "username": username, "password": password,
        }
        imap_ok = False
        smtp_ok = False
        imap_err = ""
        smtp_err = ""

        try:
            imap = imap_connect(test_acc)
            imap.logout()
            imap_ok = True
        except Exception as e:
            imap_err = str(e)[:200]

        try:
            smtp = smtp_connect(test_acc)
            smtp.quit()
            smtp_ok = True
        except Exception as e:
            smtp_err = str(e)[:200]

        return ok({
            "imapOk": imap_ok,
            "smtpOk": smtp_ok,
            "imapError": imap_err,
            "smtpError": smtp_err,
            "allOk": imap_ok and smtp_ok,
        })

    # ── POST add_account ───────────────────────────────────────────────────
    if method == "POST" and action == "add_account":
        body = json.loads(event.get("body") or "{}")
        user_id   = body.get("userId", "")
        em        = (body.get("email") or "").strip().lower()
        display   = (body.get("displayName") or "").strip()
        imap_host = (body.get("imapHost") or "").strip()
        imap_port = int(body.get("imapPort") or 993)
        imap_ssl  = bool(body.get("imapSsl", True))
        smtp_host = (body.get("smtpHost") or "").strip()
        smtp_port = int(body.get("smtpPort") or 465)
        smtp_ssl  = bool(body.get("smtpSsl", True))
        username  = (body.get("username") or em).strip()
        password  = body.get("password") or ""

        if not user_id or not em or not imap_host or not smtp_host or not password:
            return err("Все поля обязательны")

        # Проверяем подключение к IMAP и SMTP
        try:
            test_acc = {
                "imap_host": imap_host, "imap_port": imap_port, "imap_ssl": imap_ssl,
                "smtp_host": smtp_host, "smtp_port": smtp_port, "smtp_ssl": smtp_ssl,
                "username":  username,  "password":  password,
            }
            imap = imap_connect(test_acc)
            imap.logout()
        except Exception as e:
            return err(f"Не удалось подключиться к IMAP: {str(e)[:200]}")

        try:
            smtp = smtp_connect(test_acc)
            smtp.quit()
        except Exception as e:
            return err(f"Не удалось подключиться к SMTP: {str(e)[:200]}")

        encrypted = encrypt_password(password)
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""INSERT INTO {SCHEMA}.mail_accounts
                    (user_id, email, display_name, imap_host, imap_port, imap_ssl,
                     smtp_host, smtp_port, smtp_ssl, username, password_encrypted)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, email) DO UPDATE SET
                      display_name = EXCLUDED.display_name,
                      imap_host = EXCLUDED.imap_host, imap_port = EXCLUDED.imap_port, imap_ssl = EXCLUDED.imap_ssl,
                      smtp_host = EXCLUDED.smtp_host, smtp_port = EXCLUDED.smtp_port, smtp_ssl = EXCLUDED.smtp_ssl,
                      username = EXCLUDED.username, password_encrypted = EXCLUDED.password_encrypted,
                      is_active = TRUE
                    RETURNING id""",
                (user_id, em, display, imap_host, imap_port, imap_ssl,
                 smtp_host, smtp_port, smtp_ssl, username, encrypted),
            )
            new_id = str(cur.fetchone()[0])
            conn.commit()
        finally:
            conn.close()
        return ok({"id": new_id, "email": em}, 201)

    # ── POST delete_account ────────────────────────────────────────────────
    if method == "POST" and action == "delete_account":
        body = json.loads(event.get("body") or "{}")
        account_id = body.get("id", "")
        user_id    = body.get("userId", "")
        if not account_id or not user_id:
            return err("id и userId обязательны")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.mail_accounts SET is_active = FALSE "
                f"WHERE id = %s AND user_id = %s",
                (account_id, user_id),
            )
            conn.commit()
        finally:
            conn.close()
        return ok({"ok": True})

    # ── GET folders ────────────────────────────────────────────────────────
    if method == "GET" and action == "folders":
        account_id = params.get("account_id", "")
        if not account_id:
            return err("account_id обязателен")
        conn = get_conn()
        try:
            account = get_account(conn, account_id)
        finally:
            conn.close()
        if not account:
            return err("Аккаунт не найден", 404)
        try:
            imap = imap_connect(account)
            status, folders_raw = imap.list()
            imap.logout()
        except Exception as e:
            return err(f"IMAP error: {str(e)[:200]}", 500)
        result = []
        for f in folders_raw or []:
            try:
                line = f.decode() if isinstance(f, bytes) else str(f)
                # Формат: (\HasNoChildren) "/" "INBOX"
                parts = line.rsplit(" ", 1)
                name = parts[-1].strip().strip('"') if parts else ""
                if name:
                    result.append(name)
            except Exception:
                pass
        return ok({"folders": result})

    # ── GET list ───────────────────────────────────────────────────────────
    if method == "GET" and action == "list":
        account_id = params.get("account_id", "")
        folder     = params.get("folder", "INBOX")
        limit      = int(params.get("limit", 30))
        offset     = int(params.get("offset", 0))
        search_q   = (params.get("q") or "").strip()
        f_unread   = params.get("filter_unread") == "1"
        f_attach   = params.get("filter_attach") == "1"
        if not account_id:
            return err("account_id обязателен")
        conn = get_conn()
        try:
            account = get_account(conn, account_id)
        finally:
            conn.close()
        if not account:
            return err("Аккаунт не найден", 404)
        try:
            imap = imap_connect(account)
            try:
                imap.select(f'"{folder}"', readonly=True)
            except Exception:
                imap.select(folder, readonly=True)
            # Собираем критерии поиска
            criteria_parts = []
            if f_unread:
                criteria_parts.append("UNSEEN")
            if f_attach:
                # >50KB обычно содержит вложение (грубо, но без BODYSTRUCTURE никак)
                criteria_parts.append("LARGER")
                criteria_parts.append("50000")
            if search_q:
                try:
                    encoded = search_q.encode("utf-8")
                    args = ["search", "CHARSET", "UTF-8"]
                    args += criteria_parts
                    args += ["OR", "OR", "SUBJECT", encoded, "FROM", encoded, "BODY", encoded]
                    typ, data = imap.uid(*args)
                except Exception:
                    safe = search_q.replace('"', "")
                    crit = " ".join(criteria_parts) + (" " if criteria_parts else "")
                    typ, data = imap.uid(
                        "search", None,
                        f'{crit}OR OR SUBJECT "{safe}" FROM "{safe}" BODY "{safe}"',
                    )
            elif criteria_parts:
                args = ["search", None] + criteria_parts
                typ, data = imap.uid(*args)
            else:
                typ, data = imap.uid("search", None, "ALL")
            all_uids = (data[0] or b"").split()
            total = len(all_uids)
            # Берём срез (новые сначала): offset считается от конца
            end = total - offset
            start = max(0, end - limit)
            page_uids = all_uids[start:end]
            uids = list(reversed(page_uids))
            messages = []
            for u in uids:
                try:
                    status, msg_data = imap.uid("fetch", u, "(BODY.PEEK[HEADER] FLAGS)")
                    if not msg_data or not isinstance(msg_data[0], tuple):
                        continue
                    raw_header = msg_data[0][1]
                    flags_line = msg_data[1] if len(msg_data) > 1 else b""
                    flags_str = flags_line.decode() if isinstance(flags_line, bytes) else str(flags_line)
                    is_seen = "\\Seen" in flags_str
                    msg = email.message_from_bytes(raw_header)
                    name, addr = parse_address(msg.get("From", ""))
                    subj = decode_header_str(msg.get("Subject", ""))
                    date_raw = msg.get("Date", "")
                    try:
                        dt = email.utils.parsedate_to_datetime(date_raw)
                        if dt and dt.tzinfo is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        date_iso = dt.isoformat() if dt else ""
                    except Exception:
                        date_iso = ""
                    messages.append({
                        "uid":        u.decode() if isinstance(u, bytes) else str(u),
                        "subject":    subj,
                        "fromName":   name,
                        "fromEmail":  addr,
                        "date":       date_iso,
                        "isRead":     is_seen,
                    })
                except Exception:
                    continue
            imap.logout()
        except Exception as e:
            return err(f"IMAP error: {str(e)[:200]}", 500)
        return ok({
            "messages": messages,
            "folder":   folder,
            "total":    total,
            "offset":   offset,
            "limit":    limit,
            "hasMore":  (offset + limit) < total,
        })

    # ── GET read ───────────────────────────────────────────────────────────
    if method == "GET" and action == "read":
        account_id = params.get("account_id", "")
        folder     = params.get("folder", "INBOX")
        uid        = params.get("uid", "")
        if not account_id or not uid:
            return err("account_id и uid обязательны")
        conn = get_conn()
        try:
            account = get_account(conn, account_id)
        finally:
            conn.close()
        if not account:
            return err("Аккаунт не найден", 404)
        try:
            imap = imap_connect(account)
            try:
                imap.select(f'"{folder}"')
            except Exception:
                imap.select(folder)
            status, data = imap.uid("fetch", uid, "(RFC822)")
            if not data or not isinstance(data[0], tuple):
                imap.logout()
                return err("Письмо не найдено", 404)
            raw = data[0][1]
            msg = email.message_from_bytes(raw)
            name, addr = parse_address(msg.get("From", ""))
            subj = decode_header_str(msg.get("Subject", ""))
            to_raw = msg.get("To", "")
            text, html, atts = extract_body(msg)
            date_iso = ""
            try:
                dt = email.utils.parsedate_to_datetime(msg.get("Date", ""))
                if dt and dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                date_iso = dt.isoformat() if dt else ""
            except Exception:
                pass
            # Помечаем как прочитанное
            try:
                imap.uid("store", uid, "+FLAGS", "\\Seen")
            except Exception:
                pass
            imap.logout()
        except Exception as e:
            return err(f"IMAP error: {str(e)[:200]}", 500)
        return ok({
            "uid":         uid,
            "subject":     subj,
            "fromName":    name,
            "fromEmail":   addr,
            "to":          decode_header_str(to_raw),
            "date":        date_iso,
            "text":        text,
            "html":        html,
            "attachments": atts,
        })

    # ── POST send ──────────────────────────────────────────────────────────
    if method == "POST" and action == "send":
        body = json.loads(event.get("body") or "{}")
        account_id = body.get("accountId", "")
        to_addr    = (body.get("to") or "").strip()
        subject    = (body.get("subject") or "").strip()
        text_body  = body.get("text") or ""
        html_body  = body.get("html") or ""
        cc         = (body.get("cc") or "").strip()
        if not account_id or not to_addr:
            return err("accountId и to обязательны")
        conn = get_conn()
        try:
            account = get_account(conn, account_id)
        finally:
            conn.close()
        if not account:
            return err("Аккаунт не найден", 404)

        msg = MIMEMultipart("alternative")
        from_header = email.utils.formataddr((account["display_name"] or "", account["email"]))
        msg["From"] = from_header
        msg["To"] = to_addr
        if cc:
            msg["Cc"] = cc
        msg["Subject"] = subject
        msg["Date"] = email.utils.formatdate(localtime=True)
        msg["Message-ID"] = email.utils.make_msgid()

        if text_body:
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
        if html_body:
            msg.attach(MIMEText(html_body, "html", "utf-8"))
        if not text_body and not html_body:
            msg.attach(MIMEText("", "plain", "utf-8"))

        recipients = [r.strip() for r in to_addr.split(",") if r.strip()]
        if cc:
            recipients += [r.strip() for r in cc.split(",") if r.strip()]

        try:
            smtp = smtp_connect(account)
            smtp.sendmail(account["email"], recipients, msg.as_string())
            smtp.quit()
        except Exception as e:
            return err(f"SMTP error: {str(e)[:200]}", 500)
        return ok({"sent": True})

    # ── POST mark_read — пометить несколько писем прочит./непрочит. ────────
    if method == "POST" and action == "mark_read":
        body = json.loads(event.get("body") or "{}")
        account_id = body.get("accountId", "")
        folder     = body.get("folder", "INBOX")
        uids       = body.get("uids", [])
        is_read    = bool(body.get("isRead", True))
        if not account_id or not uids:
            return err("accountId и uids обязательны")
        conn = get_conn()
        try:
            account = get_account(conn, account_id)
        finally:
            conn.close()
        if not account:
            return err("Аккаунт не найден", 404)
        try:
            imap = imap_connect(account)
            try: imap.select(f'"{folder}"')
            except Exception: imap.select(folder)
            uid_list = ",".join(str(u) for u in uids)
            flag_op = "+FLAGS" if is_read else "-FLAGS"
            imap.uid("store", uid_list, flag_op, "\\Seen")
            imap.logout()
        except Exception as e:
            return err(f"IMAP error: {str(e)[:200]}", 500)
        return ok({"updated": len(uids)})

    # ── POST move — переместить письма в другую папку ──────────────────────
    if method == "POST" and action == "move":
        body = json.loads(event.get("body") or "{}")
        account_id = body.get("accountId", "")
        folder     = body.get("folder", "INBOX")
        target     = body.get("target", "")
        uids       = body.get("uids", [])
        if not account_id or not uids or not target:
            return err("accountId, uids и target обязательны")
        conn = get_conn()
        try:
            account = get_account(conn, account_id)
        finally:
            conn.close()
        if not account:
            return err("Аккаунт не найден", 404)
        try:
            imap = imap_connect(account)
            try: imap.select(f'"{folder}"')
            except Exception: imap.select(folder)
            uid_list = ",".join(str(u) for u in uids)
            # MOVE если поддерживается (быстро), иначе COPY+DELETE
            try:
                imap.uid("move", uid_list, f'"{target}"')
            except Exception:
                imap.uid("copy", uid_list, f'"{target}"')
                imap.uid("store", uid_list, "+FLAGS", "\\Deleted")
                imap.expunge()
            imap.logout()
        except Exception as e:
            return err(f"IMAP error: {str(e)[:200]}", 500)
        return ok({"moved": len(uids)})

    # ── POST delete — удалить письма (в корзину, либо навсегда) ────────────
    if method == "POST" and action == "delete":
        body = json.loads(event.get("body") or "{}")
        account_id = body.get("accountId", "")
        folder     = body.get("folder", "INBOX")
        uids       = body.get("uids", [])
        if not account_id or not uids:
            return err("accountId и uids обязательны")
        conn = get_conn()
        try:
            account = get_account(conn, account_id)
        finally:
            conn.close()
        if not account:
            return err("Аккаунт не найден", 404)
        try:
            imap = imap_connect(account)
            try: imap.select(f'"{folder}"')
            except Exception: imap.select(folder)
            uid_list = ",".join(str(u) for u in uids)
            imap.uid("store", uid_list, "+FLAGS", "\\Deleted")
            try: imap.expunge()
            except Exception: pass
            imap.logout()
        except Exception as e:
            return err(f"IMAP error: {str(e)[:200]}", 500)
        return ok({"deleted": len(uids)})

    return err("Неизвестное действие", 404)
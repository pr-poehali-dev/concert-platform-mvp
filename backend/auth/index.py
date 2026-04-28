"""
Авторизация и регистрация пользователей GLOBAL LINK. v2
POST ?action=register           — создать аккаунт + отправить письмо подтверждения
GET  ?action=verify_email       — подтвердить email по токену из письма
POST ?action=resend_verification— повторно отправить письмо подтверждения
POST ?action=login              — войти (пользователь или сотрудник)
POST ?action=update_profile     — обновить профиль/реквизиты/логотип
GET  ?action=me                 — данные по session_id
GET  ?action=status             — проверить статус верификации
"""
import json, os, hashlib, secrets, random, base64, uuid
import psycopg2
import boto3
import urllib.request, urllib.error


def resend_send(api_key: str, to: str, subject: str, html: str, from_addr: str = "GLOBAL LINK <noreply@globallink.art>") -> bool:
    """Отправляет письмо через Resend API с корректными заголовками."""
    payload = json.dumps({"from": from_addr, "to": [to], "subject": subject, "html": html}).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; GLOBALLINK/2.0)",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        print(f"[Resend] OK status={resp.status} to={to}")
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"[Resend] HTTPError {e.code}: {body}")
        return False
    except Exception as ex:
        print(f"[Resend] Exception: {ex}")
        return False

SCHEMA = "t_p17532248_concert_platform_mvp"
NOTIF_URL = "https://functions.poehali.dev/68f4b989-d93d-4a45-af4c-d54ad6815826"

AVATAR_COLORS = [
    "from-neon-purple to-neon-cyan",
    "from-neon-cyan to-neon-green",
    "from-neon-pink to-neon-purple",
    "from-neon-green to-neon-cyan",
]

_sessions: dict = {}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def save_session_db(conn, session_id: str, user_id: str, user_data: dict):
    """Сохраняет сессию в БД для доступа из других функций."""
    try:
        cur = conn.cursor()
        user_json = json.dumps(user_data, ensure_ascii=False)
        cur.execute(
            f"""INSERT INTO {SCHEMA}.sessions (session_id, user_id, user_data)
                VALUES (%s, %s, %s::jsonb)
                ON CONFLICT (session_id) DO UPDATE
                SET user_data = EXCLUDED.user_data, last_seen = NOW()""",
            (session_id, user_id, user_json),
        )
    except Exception as e:
        print(f"[auth] save_session_db error: {e}")


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def cdn_url(key: str) -> str:
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


PBKDF2_ITERATIONS = 120_000


def hash_pw(pw: str) -> str:
    """PBKDF2-HMAC-SHA256 с уникальной солью.
    Формат: pbkdf2$<iterations>$<salt_hex>$<hash_hex>"""
    salt = secrets.token_bytes(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2${PBKDF2_ITERATIONS}${salt.hex()}${h.hex()}"


def verify_pw(pw: str, stored: str) -> bool:
    """Проверяет пароль. Поддерживает старый формат SHA256 для миграции."""
    if not stored:
        return False
    if stored.startswith("pbkdf2$"):
        try:
            _, iters, salt_hex, hash_hex = stored.split("$")
            h = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt_hex), int(iters))
            return secrets.compare_digest(h.hex(), hash_hex)
        except Exception:
            return False
    return secrets.compare_digest(hashlib.sha256(pw.encode()).hexdigest(), stored)


def initials(name: str) -> str:
    parts = name.strip().split()
    s = "".join(p[0].upper() for p in parts if p)
    return s[:2] if s else "??"


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    }


def ok(data: dict, status: int = 200) -> dict:
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False)}


def err(msg: str, status: int = 400) -> dict:
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def build_user(row) -> dict:
    """row: id,name,email,role,city,verified,avatar,avatar_color,status,
             company_type,legal_name,inn,kpp,ogrn,legal_address,actual_address,
             bank_name,bank_account,bank_bik,logo_url,phone,email_notifications_enabled,
             twofa_enabled,email_confirmed,display_id"""
    return {
        "id": str(row[0]), "name": row[1], "email": row[2],
        "role": row[3], "city": row[4], "verified": row[5],
        "avatar": row[6], "avatarColor": row[7],
        "status": row[8] or "approved",
        "companyType": row[9] or "individual",
        "legalName": row[10] or "",
        "inn": row[11] or "",
        "kpp": row[12] or "",
        "ogrn": row[13] or "",
        "legalAddress": row[14] or "",
        "actualAddress": row[15] or "",
        "bankName": row[16] or "",
        "bankAccount": row[17] or "",
        "bankBik": row[18] or "",
        "logoUrl": row[19] or "",
        "phone": row[20] or "",
        "emailNotificationsEnabled": row[21] if len(row) > 21 and row[21] is not None else True,
        "twofaEnabled": row[22] if len(row) > 22 and row[22] is not None else False,
        "emailConfirmed": row[23] if len(row) > 23 and row[23] is not None else False,
        "displayId": str(row[24]) if len(row) > 24 and row[24] is not None else None,
    }


USER_SELECT = f"""
    SELECT id, name, email, role, city, verified, avatar, avatar_color, status,
           company_type, legal_name, inn, kpp, ogrn, legal_address, actual_address,
           bank_name, bank_account, bank_bik, logo_url, phone, email_notifications_enabled,
           twofa_enabled, email_confirmed, display_id
    FROM {SCHEMA}.users
"""


APP_URL = os.environ.get("APP_URL", "https://preview--concert-platform-mvp.poehali.dev").rstrip("/")


def send_2fa_email(email: str, name: str, code: str) -> bool:
    """Отправляет письмо с кодом двухфакторной аутентификации."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        # Не логируем код в открытом виде — это критическая утечка
        print(f"[auth] 2FA email skipped for {email}: RESEND_API_KEY not set")
        return False

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:2px;">GLOBAL LINK</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Двухфакторная аутентификация</p>
        </td></tr>
        <tr><td style="padding:36px 32px;text-align:center;">
          <p style="margin:0 0 20px;color:rgba(255,255,255,0.6);font-size:15px;">Привет, {name}! Ваш код входа:</p>
          <div style="background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.3);border-radius:12px;padding:20px;margin:0 auto;display:inline-block;">
            <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#fff;font-family:monospace;">{code}</span>
          </div>
          <p style="margin:20px 0 0;color:rgba(255,255,255,0.4);font-size:13px;">Код действителен 10 минут. Не передавайте его никому.</p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.2);font-size:12px;">Если вы не пытались войти, проигнорируйте это письмо.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return resend_send(api_key, email, f"Код входа: {code}", html)


def send_verification_email(email: str, name: str, token: str) -> bool:
    """Отправляет письмо с ссылкой подтверждения через Resend API."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        return False

    verify_url = f"{APP_URL}/verify?token={token}"

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:2px;">GLOBAL LINK</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Концертная платформа</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px 32px;">
          <h2 style="margin:0 0 16px;color:#fff;font-size:22px;">Привет, {name}! 👋</h2>
          <p style="margin:0 0 24px;color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;">
            Спасибо за регистрацию на платформе GLOBAL LINK.<br>
            Для завершения регистрации подтвердите ваш email-адрес.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="{verify_url}"
               style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#7c3aed,#06b6d4);
                      color:#fff;text-decoration:none;border-radius:12px;font-size:16px;
                      font-weight:700;letter-spacing:0.5px;">
              ✉️ Подтвердить email
            </a>
          </div>
          <p style="margin:24px 0 0;color:rgba(255,255,255,0.35);font-size:13px;text-align:center;">
            Ссылка действительна 24 часа.<br>
            Если вы не регистрировались на GLOBAL LINK — просто проигнорируйте это письмо.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.2);font-size:12px;">© 2025 GLOBAL LINK · Концертная платформа</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return resend_send(api_key, email, "Подтвердите ваш email — GLOBAL LINK", html)


def create_verification_token(conn, user_id: str, email: str) -> str:
    """Создаёт токен подтверждения в БД и возвращает его."""
    token = secrets.token_urlsafe(48)
    cur = conn.cursor()
    # Удаляем старые неиспользованные токены этого пользователя
    cur.execute(
        f"DELETE FROM {SCHEMA}.email_verifications WHERE user_id = %s AND used_at IS NULL",
        (user_id,)
    )
    cur.execute(
        f"""INSERT INTO {SCHEMA}.email_verifications (user_id, token, email)
            VALUES (%s, %s, %s)""",
        (user_id, token, email)
    )
    return token


def notify_admins(conn, title: str, body: str):
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE is_admin = TRUE")
    admin_ids = [str(r[0]) for r in cur.fetchall()]
    for admin_id in admin_ids:
        try:
            payload = json.dumps({
                "userId": admin_id, "type": "system",
                "title": title, "body": body, "linkPage": "admin",
            }).encode()
            req = urllib.request.Request(
                f"{NOTIF_URL}?action=create", data=payload,
                headers={"Content-Type": "application/json"}, method="POST",
            )
            urllib.request.urlopen(req, timeout=3)
        except Exception:
            pass


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    headers = event.get("headers") or {}

    # ── POST register ─────────────────────────────────────────────────────
    if method == "POST" and action == "register":
        b = json.loads(event.get("body") or "{}")
        name  = (b.get("name") or "").strip()
        email = (b.get("email") or "").strip().lower()
        password = b.get("password") or ""
        role  = b.get("role") or "organizer"
        city  = (b.get("city") or "").strip()
        company_type  = b.get("companyType") or "individual"
        legal_name    = (b.get("legalName") or "").strip()
        inn           = (b.get("inn") or "").strip()
        kpp           = (b.get("kpp") or "").strip()
        ogrn          = (b.get("ogrn") or "").strip()
        legal_address = (b.get("legalAddress") or "").strip()
        actual_address= (b.get("actualAddress") or "").strip()
        phone         = (b.get("phone") or "").strip()

        if not name:            return err("Введите имя")
        if "@" not in email:    return err("Некорректный email")
        if len(password) < 6:  return err("Пароль минимум 6 символов")
        if role not in ("organizer", "venue"): return err("Неверная роль")
        if company_type not in ("individual","ip","ooo","other"):
            company_type = "individual"

        avatar       = initials(name)
        avatar_color = random.choice(AVATAR_COLORS)
        pw_hash      = hash_pw(password)

        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close()
            return err("Пользователь с таким email уже существует")

        cur.execute(
            f"""INSERT INTO {SCHEMA}.users
                (name, email, password_hash, role, city, avatar, avatar_color, status,
                 company_type, legal_name, inn, kpp, ogrn, legal_address, actual_address, phone)
                VALUES (%s,%s,%s,%s,%s,%s,%s,'pending',%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id, display_id""",
            (name, email, pw_hash, role, city, avatar, avatar_color,
             company_type, legal_name, inn, kpp, ogrn, legal_address, actual_address, phone),
        )
        reg_row = cur.fetchone()
        user_id = str(reg_row[0])
        display_id = str(reg_row[1]) if reg_row[1] else None

        # Создаём токен подтверждения и отправляем письмо
        token = create_verification_token(conn, user_id, email)
        conn.commit()

        email_sent = send_verification_email(email, name, token)

        role_label = "Организатор" if role == "organizer" else "Площадка"
        notify_admins(conn, "Новая заявка на регистрацию",
                      f"{role_label} — {name} ({email})")
        conn.close()

        user_data = {
            "id": user_id, "name": name, "email": email,
            "role": role, "city": city, "verified": False,
            "status": "pending", "emailConfirmed": False, "avatar": avatar,
            "avatarColor": avatar_color,
            "companyType": company_type, "legalName": legal_name, "inn": inn,
            "kpp": kpp, "ogrn": ogrn, "legalAddress": legal_address,
            "actualAddress": actual_address, "phone": phone,
            "bankName": "", "bankAccount": "", "bankBik": "", "logoUrl": "",
            "displayId": display_id,
        }
        session_id = secrets.token_hex(32)
        _sessions[session_id] = user_data
        conn2 = get_conn()
        save_session_db(conn2, session_id, user_id, user_data)
        conn2.commit()
        conn2.close()
        return ok({
            "sessionId": session_id,
            "user": user_data,
            "emailSent": email_sent,
            "requiresEmailConfirmation": True,
        }, 201)

    # ── POST login ────────────────────────────────────────────────────────
    if method == "POST" and action == "login":
        b = json.loads(event.get("body") or "{}")
        email    = (b.get("email") or "").strip().lower()
        password = b.get("password") or ""
        if not email or not password:
            return err("Введите email и пароль")

        conn = get_conn(); cur = conn.cursor()

        # Пробуем как основной пользователь — сначала достаём хеш, проверяем через verify_pw
        cur.execute(f"SELECT password_hash FROM {SCHEMA}.users WHERE email = %s", (email,))
        pw_row = cur.fetchone()
        row = None
        if pw_row and verify_pw(password, pw_row[0]):
            cur.execute(USER_SELECT + " WHERE email = %s", (email,))
            row = cur.fetchone()
        if row:
            user = build_user(row)

            # Если 2FA включена — создаём временную сессию и шлём код
            if user.get("twofaEnabled"):
                import random as _rnd
                code = "".join([str(_rnd.randint(0, 9)) for _ in range(6)])
                temp_id = secrets.token_hex(24)
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.twofa_codes
                        (temp_session_id, user_id, user_data, code)
                        VALUES (%s, %s, %s::jsonb, %s)""",
                    (temp_id, user["id"], json.dumps(user), code),
                )
                conn.commit()
                conn.close()
                send_2fa_email(email, user["name"], code)
                return ok({"requires2fa": True, "tempSessionId": temp_id})

            session_id = secrets.token_hex(32)
            _sessions[session_id] = user
            save_session_db(conn, session_id, user["id"], user)
            conn.commit()
            conn.close()
            return ok({"sessionId": session_id, "user": user})

        # Пробуем как сотрудник компании — сначала проверяем пароль через verify_pw
        cur.execute(
            f"SELECT password_hash FROM {SCHEMA}.employees WHERE email = %s AND is_active = TRUE",
            (email,),
        )
        emp_pw = cur.fetchone()
        if not emp_pw or not verify_pw(password, emp_pw[0]):
            conn.close()
            return err("Неверный email или пароль", 401)

        cur.execute(
            f"""SELECT e.id, e.name, e.email, e.role_in_company, e.company_user_id,
                       e.avatar, e.avatar_color,
                       u.name as company_name, u.role as company_role,
                       u.verified, u.status, u.logo_url, u.city,
                       u.company_type, u.legal_name, u.inn, u.kpp, u.ogrn,
                       u.legal_address, u.actual_address, u.bank_name,
                       u.bank_account, u.bank_bik, u.phone,
                       e.access_permissions
                FROM {SCHEMA}.employees e
                JOIN {SCHEMA}.users u ON u.id = e.company_user_id
                WHERE e.email = %s AND e.is_active = TRUE""",
            (email,),
        )
        emp = cur.fetchone()
        conn.close()

        if not emp:
            return err("Неверный email или пароль", 401)

        # Парсим access_permissions
        raw_perms = emp[24]
        if isinstance(raw_perms, dict):
            access_permissions = raw_perms
        elif isinstance(raw_perms, str):
            try:
                access_permissions = json.loads(raw_perms)
            except Exception:
                access_permissions = {"canViewExpenses": True, "canViewIncome": True, "canViewSummary": True, "canEditExpenses": True, "canEditIncome": True}
        else:
            access_permissions = {"canViewExpenses": True, "canViewIncome": True, "canViewSummary": True, "canEditExpenses": True, "canEditIncome": True}

        user = {
            "id": str(emp[4]),  # company_user_id — работаем от имени компании
            "employeeId": str(emp[0]),
            "name": emp[1],
            "email": emp[2],
            "roleInCompany": emp[3],
            "role": emp[8],  # company_role
            "city": emp[12] or "",
            "avatar": emp[5], "avatarColor": emp[6],
            "verified": emp[9], "status": emp[10] or "approved",
            "companyName": emp[7],
            "logoUrl": emp[11] or "",
            "isEmployee": True,
            "accessPermissions": access_permissions,
            "companyType": emp[13] or "individual",
            "legalName": emp[14] or "", "inn": emp[15] or "", "kpp": emp[16] or "",
            "ogrn": emp[17] or "", "legalAddress": emp[18] or "", "actualAddress": emp[19] or "",
            "bankName": emp[20] or "", "bankAccount": emp[21] or "", "bankBik": emp[22] or "",
            "phone": emp[23] or "",
        }
        session_id = secrets.token_hex(32)
        _sessions[session_id] = user
        save_session_db(conn, session_id, str(emp[4]), user)
        conn.commit()
        conn.close()
        return ok({"sessionId": session_id, "user": user})

    # ── POST update_profile ───────────────────────────────────────────────
    if method == "POST" and action == "update_profile":
        session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
        if not session_id:
            return err("Не авторизован", 401)

        # in-memory сначала, затем БД
        if session_id in _sessions:
            user = _sessions[session_id]
        else:
            conn_s = get_conn(); cur_s = conn_s.cursor()
            cur_s.execute(
                f"SELECT user_data FROM {SCHEMA}.sessions WHERE session_id = %s AND last_seen > NOW() - INTERVAL '30 days'",
                (session_id,)
            )
            sr = cur_s.fetchone()
            conn_s.close()
            if not sr:
                return err("Не авторизован", 401)
            user = sr[0] if isinstance(sr[0], dict) else json.loads(sr[0])
            _sessions[session_id] = user

        b = json.loads(event.get("body") or "{}")
        uid  = user["id"]

        field_map = {
            "name": "name", "city": "city", "phone": "phone",
            "companyType": "company_type", "legalName": "legal_name",
            "inn": "inn", "kpp": "kpp", "ogrn": "ogrn",
            "legalAddress": "legal_address", "actualAddress": "actual_address",
            "bankName": "bank_name", "bankAccount": "bank_account", "bankBik": "bank_bik",
            "logoUrl": "logo_url",
            "emailNotificationsEnabled": "email_notifications_enabled",
        }
        fields = {col: b[fk] for fk, col in field_map.items() if fk in b}
        if not fields:
            return err("Нет данных для обновления")

        set_clause = ", ".join(f"{c} = %s" for c in fields)
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.users SET {set_clause} WHERE id = %s",
                    list(fields.values()) + [uid])
        conn.commit()

        # Обновляем сессию
        for fk, col in field_map.items():
            if fk in b:
                user[fk] = b[fk]
        _sessions[session_id] = user

        # Возвращаем свежие данные
        cur.execute(USER_SELECT + " WHERE id = %s", (uid,))
        row = cur.fetchone()
        conn.close()
        if row:
            fresh = build_user(row)
            _sessions[session_id] = fresh
            return ok({"user": fresh})
        return ok({"user": user})

    # ── GET me ────────────────────────────────────────────────────────────
    if method == "GET" and action == "me":
        session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
        if not session_id:
            return err("Не авторизован", 401)

        # in-memory → sessions таблица → 401
        if session_id in _sessions:
            user = _sessions[session_id]
        else:
            conn_s = get_conn(); cur_s = conn_s.cursor()
            cur_s.execute(
                f"SELECT user_data FROM {SCHEMA}.sessions WHERE session_id = %s AND last_seen > NOW() - INTERVAL '30 days'",
                (session_id,)
            )
            sr = cur_s.fetchone()
            if sr:
                cur_s.execute(f"UPDATE {SCHEMA}.sessions SET last_seen = NOW() WHERE session_id = %s", (session_id,))
                conn_s.commit()
            conn_s.close()
            if not sr:
                return err("Не авторизован", 401)
            user = sr[0] if isinstance(sr[0], dict) else json.loads(sr[0])
            _sessions[session_id] = user

        conn = get_conn(); cur = conn.cursor()
        cur.execute(USER_SELECT + " WHERE id = %s", (user["id"],))
        row = cur.fetchone()
        conn.close()
        if row:
            fresh = build_user(row)
            # Сохраняем employee-флаги если они были
            for k in ("employeeId","roleInCompany","companyName","isEmployee","accessPermissions"):
                if k in user:
                    fresh[k] = user[k]
            _sessions[session_id] = fresh
            return ok({"user": fresh})
        return ok({"user": user})

    # ── POST upload_logo ──────────────────────────────────────────────────
    if method == "POST" and action == "upload_logo":
        session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
        if not session_id:
            return err("Не авторизован", 401)
        if session_id not in _sessions:
            conn_s = get_conn(); cur_s = conn_s.cursor()
            cur_s.execute(f"SELECT user_data FROM {SCHEMA}.sessions WHERE session_id = %s AND last_seen > NOW() - INTERVAL '30 days'", (session_id,))
            sr = cur_s.fetchone(); conn_s.close()
            if not sr: return err("Не авторизован", 401)
            _sessions[session_id] = sr[0] if isinstance(sr[0], dict) else json.loads(sr[0])
        b = json.loads(event.get("body") or "{}")
        logo_b64  = b.get("logoBase64", "")
        logo_mime = b.get("logoMime", "image/png")
        if not logo_b64:
            return err("logoBase64 required")

        # Определяем расширение по mime
        ext_map = {"image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
                   "image/webp": "webp", "image/svg+xml": "svg"}
        ext = ext_map.get(logo_mime, "png")

        # Загружаем в S3
        raw = base64.b64decode(logo_b64)
        key = f"logos/{uuid.uuid4()}.{ext}"
        s3 = get_s3()
        s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=logo_mime)
        logo_url = cdn_url(key)

        # Сохраняем в БД
        user = _sessions[session_id]
        uid  = user["id"]
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.users SET logo_url = %s WHERE id = %s", (logo_url, uid))
        conn.commit()
        conn.close()

        # Обновляем сессию
        user["logoUrl"] = logo_url
        _sessions[session_id] = user
        return ok({"logoUrl": logo_url})

    # ── POST change_password ──────────────────────────────────────────────
    if method == "POST" and action == "change_password":
        session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
        if not session_id:
            return err("Не авторизован", 401)
        if session_id not in _sessions:
            conn_s = get_conn(); cur_s = conn_s.cursor()
            cur_s.execute(f"SELECT user_data FROM {SCHEMA}.sessions WHERE session_id = %s AND last_seen > NOW() - INTERVAL '30 days'", (session_id,))
            sr = cur_s.fetchone(); conn_s.close()
            if not sr: return err("Не авторизован", 401)
            _sessions[session_id] = sr[0] if isinstance(sr[0], dict) else json.loads(sr[0])
        user = _sessions[session_id]
        uid  = user["id"]
        b = json.loads(event.get("body") or "{}")
        current_pw  = b.get("currentPassword") or ""
        new_pw      = b.get("newPassword") or ""
        if not current_pw or not new_pw:
            return err("Заполните все поля")
        if len(new_pw) < 6:
            return err("Новый пароль минимум 6 символов")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"SELECT password_hash FROM {SCHEMA}.users WHERE id = %s", (uid,))
        row = cur.fetchone()
        if not row or not verify_pw(current_pw, row[0]):
            conn.close()
            return err("Неверный текущий пароль")
        cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s",
                    (hash_pw(new_pw), uid))
        conn.commit()
        conn.close()
        return ok({"ok": True})

    # ── GET verify_email — подтверждение email по токену ─────────────────
    if action == "verify_email":
        token = params.get("token", "")
        if not token:
            return err("Токен не указан")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id, user_id, email, expires_at, used_at
                FROM {SCHEMA}.email_verifications
                WHERE token = %s""",
            (token,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Ссылка недействительна или уже использована", 400)
        ver_id, user_id, email, expires_at, used_at = row
        if used_at:
            conn.close()
            return err("Ссылка уже была использована", 400)

        import datetime
        if expires_at.replace(tzinfo=None) < datetime.datetime.utcnow():
            conn.close()
            return err("Ссылка устарела. Запросите новое письмо.", 400)

        # Помечаем токен использованным и подтверждаем email
        cur.execute(
            f"UPDATE {SCHEMA}.email_verifications SET used_at = NOW() WHERE id = %s",
            (str(ver_id),)
        )
        cur.execute(
            f"UPDATE {SCHEMA}.users SET email_confirmed = TRUE WHERE id = %s RETURNING name",
            (str(user_id),)
        )
        name_row = cur.fetchone()
        conn.commit(); conn.close()

        user_name = name_row[0] if name_row else ""
        return ok({"confirmed": True, "userId": str(user_id), "name": user_name})

    # ── POST resend_verification — повторно отправить письмо ──────────────
    if method == "POST" and action == "resend_verification":
        b = json.loads(event.get("body") or "{}")
        email = (b.get("email") or "").strip().lower()
        if not email:
            return err("email required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"SELECT id, name, email_confirmed FROM {SCHEMA}.users WHERE email = %s",
            (email,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return ok({"sent": False, "reason": "not_found"})
        user_id, name, already_confirmed = str(row[0]), row[1], row[2]
        if already_confirmed:
            conn.close()
            return ok({"sent": False, "reason": "already_confirmed"})

        token = create_verification_token(conn, user_id, email)
        conn.commit(); conn.close()

        sent = send_verification_email(email, name, token)
        return ok({"sent": sent})

    # ── POST verify_2fa ───────────────────────────────────────────────────
    if method == "POST" and action == "verify_2fa":
        b = json.loads(event.get("body") or "{}")
        temp_id = b.get("tempSessionId", "")
        code    = (b.get("code") or "").strip()
        if not temp_id or not code:
            return err("tempSessionId и code обязательны")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id, user_id, user_data, code, expires_at, used
                FROM {SCHEMA}.twofa_codes
                WHERE temp_session_id = %s""",
            (temp_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Неверный или истёкший код", 400)
        _, user_id, user_data_raw, db_code, expires_at, used = row
        if used:
            conn.close()
            return err("Код уже использован", 400)
        import datetime
        if expires_at.replace(tzinfo=None) < datetime.datetime.utcnow():
            conn.close()
            return err("Код истёк. Войдите снова.", 400)
        if code != db_code:
            conn.close()
            return err("Неверный код", 400)

        # Помечаем использованным
        cur.execute(f"UPDATE {SCHEMA}.twofa_codes SET used = TRUE WHERE temp_session_id = %s", (temp_id,))

        # Получаем свежие данные пользователя
        cur.execute(USER_SELECT + " WHERE id = %s", (str(user_id),))
        user_row = cur.fetchone()
        if user_row:
            user = build_user(user_row)
        else:
            user = user_data_raw if isinstance(user_data_raw, dict) else json.loads(user_data_raw)

        session_id = secrets.token_hex(32)
        _sessions[session_id] = user
        save_session_db(conn, session_id, str(user_id), user)
        conn.commit(); conn.close()
        return ok({"sessionId": session_id, "user": user})

    # ── POST resend_2fa ───────────────────────────────────────────────────
    if method == "POST" and action == "resend_2fa":
        b = json.loads(event.get("body") or "{}")
        temp_id = b.get("tempSessionId", "")
        if not temp_id:
            return err("tempSessionId обязателен")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT u.email, u.name
                FROM {SCHEMA}.twofa_codes tc
                JOIN {SCHEMA}.users u ON u.id = tc.user_id
                WHERE tc.temp_session_id = %s AND tc.used = FALSE""",
            (temp_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Сессия не найдена", 400)
        email, name = row[0], row[1]
        import random as _rnd
        new_code = "".join([str(_rnd.randint(0, 9)) for _ in range(6)])
        cur.execute(
            f"""UPDATE {SCHEMA}.twofa_codes
                SET code = %s, expires_at = NOW() + INTERVAL '10 minutes'
                WHERE temp_session_id = %s""",
            (new_code, temp_id)
        )
        conn.commit(); conn.close()
        send_2fa_email(email, name, new_code)
        return ok({"sent": True})

    # ── POST toggle_2fa ───────────────────────────────────────────────────
    if method == "POST" and action == "toggle_2fa":
        session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
        if not session_id:
            return err("Не авторизован", 401)

        # Получаем uid: сначала из in-memory, потом из sessions БД
        uid = None
        if session_id in _sessions:
            uid = _sessions[session_id].get("id")

        conn = get_conn(); cur = conn.cursor()

        if not uid:
            cur.execute(
                f"SELECT user_data FROM {SCHEMA}.sessions WHERE session_id = %s AND last_seen > NOW() - INTERVAL '30 days'",
                (session_id,)
            )
            sess_row = cur.fetchone()
            if not sess_row:
                conn.close()
                return err("Сессия не найдена. Войдите снова.", 401)
            user_data_raw = sess_row[0]
            user_data = user_data_raw if isinstance(user_data_raw, dict) else json.loads(user_data_raw)
            uid = user_data.get("id")

        if not uid:
            conn.close()
            return err("Не авторизован", 401)

        b = json.loads(event.get("body") or "{}")
        enable = bool(b.get("enable", False))

        # Проверяем email_confirmed прямо в БД (единственный достоверный источник)
        if enable:
            cur.execute(f"SELECT email_confirmed FROM {SCHEMA}.users WHERE id = %s", (uid,))
            row = cur.fetchone()
            if not row or not row[0]:
                conn.close()
                return err("Для включения 2FA подтвердите email — проверьте почту или запросите письмо повторно")

        cur.execute(f"UPDATE {SCHEMA}.users SET twofa_enabled = %s WHERE id = %s", (enable, uid))

        # Обновляем in-memory сессию
        if session_id in _sessions:
            _sessions[session_id]["twofaEnabled"] = enable

        # Обновляем sessions в БД
        cur.execute(
            f"""UPDATE {SCHEMA}.sessions
                SET user_data = jsonb_set(COALESCE(user_data, '{{}}'), '{{twofaEnabled}}', %s::jsonb)
                WHERE session_id = %s""",
            (json.dumps(enable), session_id)
        )
        conn.commit(); conn.close()
        return ok({"twofaEnabled": enable})

    # ── GET status ────────────────────────────────────────────────────────
    if method == "GET" and action == "status":
        session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
        if not session_id or session_id not in _sessions:
            return err("Не авторизован", 401)
        user = _sessions[session_id]
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"SELECT verified, status FROM {SCHEMA}.users WHERE id = %s", (user["id"],))
        row = cur.fetchone()
        conn.close()
        if row:
            user["verified"] = row[0]
            user["status"] = row[1] or "approved"
            _sessions[session_id] = user
            return ok({"status": row[1], "verified": row[0]})
        return err("Пользователь не найден", 404)

    # ── GET search_by_id ──────────────────────────────────────────────────
    if action == "search_by_id":
        query = (event.get("queryStringParameters") or {})
        display_id = (query.get("display_id") or "").strip()
        if not display_id:
            return err("display_id обязателен")
        if not display_id.isdigit():
            return err("ID должен быть числом")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            USER_SELECT + " WHERE display_id = %s",
            (int(display_id),)
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return err("Пользователь не найден", 404)
        u = build_user(row)
        return ok({
            "id": u["id"],
            "displayId": u["displayId"],
            "name": u["name"],
            "role": u["role"],
            "city": u["city"],
            "avatar": u["avatar"],
            "avatarColor": u["avatarColor"],
            "verified": u["verified"],
            "legalName": u["legalName"],
        })

    return err("Not found", 404)
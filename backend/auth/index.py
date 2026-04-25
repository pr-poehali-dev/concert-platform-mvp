"""
Авторизация и регистрация пользователей GLOBAL LINK.
POST ?action=register       — создать аккаунт (pending)
POST ?action=login          — войти (пользователь или сотрудник)
POST ?action=update_profile — обновить профиль/реквизиты/логотип
GET  ?action=me             — данные по session_id
GET  ?action=status         — проверить статус верификации
"""
import json, os, hashlib, secrets, random, base64, uuid
import psycopg2
import boto3

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


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def cdn_url(key: str) -> str:
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


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
             bank_name,bank_account,bank_bik,logo_url,phone"""
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
    }


USER_SELECT = f"""
    SELECT id, name, email, role, city, verified, avatar, avatar_color, status,
           company_type, legal_name, inn, kpp, ogrn, legal_address, actual_address,
           bank_name, bank_account, bank_bik, logo_url, phone
    FROM {SCHEMA}.users
"""


def notify_admins(conn, title: str, body: str):
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE is_admin = TRUE")
    admin_ids = [str(r[0]) for r in cur.fetchall()]
    for admin_id in admin_ids:
        try:
            import urllib.request
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
                RETURNING id""",
            (name, email, pw_hash, role, city, avatar, avatar_color,
             company_type, legal_name, inn, kpp, ogrn, legal_address, actual_address, phone),
        )
        user_id = str(cur.fetchone()[0])
        conn.commit()

        role_label = "Организатор" if role == "organizer" else "Площадка"
        notify_admins(conn, "Новая заявка на регистрацию",
                      f"{role_label} — {name} ({email})")
        conn.close()

        user_data = {
            "id": user_id, "name": name, "email": email,
            "role": role, "city": city, "verified": False,
            "status": "pending", "avatar": avatar, "avatarColor": avatar_color,
            "companyType": company_type, "legalName": legal_name, "inn": inn,
            "kpp": kpp, "ogrn": ogrn, "legalAddress": legal_address,
            "actualAddress": actual_address, "phone": phone,
            "bankName": "", "bankAccount": "", "bankBik": "", "logoUrl": "",
        }
        session_id = secrets.token_hex(32)
        _sessions[session_id] = user_data
        return ok({"sessionId": session_id, "user": user_data}, 201)

    # ── POST login ────────────────────────────────────────────────────────
    if method == "POST" and action == "login":
        b = json.loads(event.get("body") or "{}")
        email    = (b.get("email") or "").strip().lower()
        password = b.get("password") or ""
        if not email or not password:
            return err("Введите email и пароль")

        pw_hash = hash_pw(password)
        conn = get_conn(); cur = conn.cursor()

        # Пробуем как основной пользователь
        cur.execute(USER_SELECT + " WHERE email = %s AND password_hash = %s",
                    (email, pw_hash))
        row = cur.fetchone()
        if row:
            user = build_user(row)
            conn.close()
            session_id = secrets.token_hex(32)
            _sessions[session_id] = user
            return ok({"sessionId": session_id, "user": user})

        # Пробуем как сотрудник компании
        cur.execute(
            f"""SELECT e.id, e.name, e.email, e.role_in_company, e.company_user_id,
                       e.avatar, e.avatar_color,
                       u.name as company_name, u.role as company_role,
                       u.verified, u.status, u.logo_url, u.city,
                       u.company_type, u.legal_name, u.inn, u.kpp, u.ogrn,
                       u.legal_address, u.actual_address, u.bank_name,
                       u.bank_account, u.bank_bik, u.phone
                FROM {SCHEMA}.employees e
                JOIN {SCHEMA}.users u ON u.id = e.company_user_id
                WHERE e.email = %s AND e.password_hash = %s AND e.is_active = TRUE""",
            (email, pw_hash),
        )
        emp = cur.fetchone()
        conn.close()

        if not emp:
            return err("Неверный email или пароль", 401)

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
            "companyType": emp[13] or "individual",
            "legalName": emp[14] or "", "inn": emp[15] or "", "kpp": emp[16] or "",
            "ogrn": emp[17] or "", "legalAddress": emp[18] or "", "actualAddress": emp[19] or "",
            "bankName": emp[20] or "", "bankAccount": emp[21] or "", "bankBik": emp[22] or "",
            "phone": emp[23] or "",
        }
        session_id = secrets.token_hex(32)
        _sessions[session_id] = user
        return ok({"sessionId": session_id, "user": user})

    # ── POST update_profile ───────────────────────────────────────────────
    if method == "POST" and action == "update_profile":
        session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
        if not session_id or session_id not in _sessions:
            return err("Не авторизован", 401)
        b = json.loads(event.get("body") or "{}")
        user = _sessions[session_id]
        uid  = user["id"]

        field_map = {
            "name": "name", "city": "city", "phone": "phone",
            "companyType": "company_type", "legalName": "legal_name",
            "inn": "inn", "kpp": "kpp", "ogrn": "ogrn",
            "legalAddress": "legal_address", "actualAddress": "actual_address",
            "bankName": "bank_name", "bankAccount": "bank_account", "bankBik": "bank_bik",
            "logoUrl": "logo_url",
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
        if not session_id or session_id not in _sessions:
            return err("Не авторизован", 401)
        user = _sessions[session_id]
        conn = get_conn(); cur = conn.cursor()
        cur.execute(USER_SELECT + " WHERE id = %s", (user["id"],))
        row = cur.fetchone()
        conn.close()
        if row:
            fresh = build_user(row)
            # Сохраняем employee-флаги если они были
            for k in ("employeeId","roleInCompany","companyName","isEmployee"):
                if k in user:
                    fresh[k] = user[k]
            _sessions[session_id] = fresh
            return ok({"user": fresh})
        return ok({"user": user})

    # ── POST upload_logo ──────────────────────────────────────────────────
    if method == "POST" and action == "upload_logo":
        session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
        if not session_id or session_id not in _sessions:
            return err("Не авторизован", 401)
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

    return err("Not found", 404)
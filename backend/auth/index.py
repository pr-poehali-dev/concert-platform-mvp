"""
Авторизация и регистрация пользователей TourLink.
POST ?action=register — создать аккаунт
POST ?action=login    — войти
GET  ?action=me       — данные текущего пользователя по session_id
"""
import json
import os
import hashlib
import secrets
import random
import psycopg2

SCHEMA = "t_p17532248_concert_platform_mvp"

AVATAR_COLORS = [
    "from-neon-purple to-neon-cyan",
    "from-neon-cyan to-neon-green",
    "from-neon-pink to-neon-purple",
    "from-neon-green to-neon-cyan",
]

_sessions: dict = {}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def make_initials(name: str) -> str:
    parts = name.strip().split()
    initials = "".join(p[0].upper() for p in parts if p)
    return initials[:2] if initials else "??"


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    }


def ok(data: dict, status: int = 200) -> dict:
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False)}


def err(message: str, status: int = 400) -> dict:
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"}, "body": json.dumps({"error": message}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    headers = event.get("headers") or {}

    # POST ?action=register
    if method == "POST" and action == "register":
        body = json.loads(event.get("body") or "{}")
        name = (body.get("name") or "").strip()
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        role = body.get("role") or "organizer"
        city = (body.get("city") or "").strip()

        if not name:
            return err("Введите имя")
        if "@" not in email:
            return err("Некорректный email")
        if len(password) < 6:
            return err("Пароль минимум 6 символов")
        if role not in ("organizer", "venue"):
            return err("Неверная роль")

        avatar = make_initials(name)
        avatar_color = random.choice(AVATAR_COLORS)
        pw_hash = hash_password(password)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close()
            return err("Пользователь с таким email уже существует")

        cur.execute(
            f"""INSERT INTO {SCHEMA}.users (name, email, password_hash, role, city, avatar, avatar_color)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (name, email, pw_hash, role, city, avatar, avatar_color),
        )
        user_id = str(cur.fetchone()[0])
        conn.commit()
        conn.close()

        session_id = secrets.token_hex(32)
        _sessions[session_id] = {
            "id": user_id, "name": name, "email": email,
            "role": role, "city": city, "verified": False,
            "avatar": avatar, "avatarColor": avatar_color,
        }
        return ok({"sessionId": session_id, "user": _sessions[session_id]}, 201)

    # POST ?action=login
    if method == "POST" and action == "login":
        body = json.loads(event.get("body") or "{}")
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""

        if not email or not password:
            return err("Введите email и пароль")

        pw_hash = hash_password(password)
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, name, email, role, city, verified, avatar, avatar_color FROM {SCHEMA}.users WHERE email = %s AND password_hash = %s",
            (email, pw_hash),
        )
        row = cur.fetchone()
        conn.close()

        if not row:
            return err("Неверный email или пароль", 401)

        user = {
            "id": str(row[0]), "name": row[1], "email": row[2],
            "role": row[3], "city": row[4], "verified": row[5],
            "avatar": row[6], "avatarColor": row[7],
        }
        session_id = secrets.token_hex(32)
        _sessions[session_id] = user
        return ok({"sessionId": session_id, "user": user})

    # GET ?action=me
    if method == "GET" and action == "me":
        session_id = headers.get("X-Session-Id") or headers.get("x-session-id")
        if not session_id or session_id not in _sessions:
            return err("Не авторизован", 401)
        return ok({"user": _sessions[session_id]})

    return err("Not found", 404)

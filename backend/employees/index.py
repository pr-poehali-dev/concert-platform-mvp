"""
Управление сотрудниками компании GLOBAL LINK.
GET  ?action=list&company_user_id=X   — список сотрудников
POST ?action=add                      — добавить сотрудника
POST ?action=update                   — обновить роль/имя
POST ?action=deactivate               — деактивировать
POST ?action=activate                 — восстановить
"""
import json, os, hashlib, secrets, random
import psycopg2

SCHEMA = "t_p17532248_concert_platform_mvp"

AVATAR_COLORS = [
    "from-neon-purple to-neon-cyan", "from-neon-cyan to-neon-green",
    "from-neon-pink to-neon-purple", "from-neon-green to-neon-cyan",
]

ROLES = ["employee", "manager", "accountant", "admin"]


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


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


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def row_to_emp(row) -> dict:
    return {
        "id": str(row[0]),
        "companyUserId": str(row[1]),
        "name": row[2],
        "email": row[3],
        "roleInCompany": row[4],
        "avatar": row[5],
        "avatarColor": row[6],
        "isActive": row[7],
        "createdAt": str(row[8]),
    }


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "list")

    # ── GET list ──────────────────────────────────────────────────────────
    if method == "GET" and action == "list":
        cid = params.get("company_user_id", "")
        if not cid:
            return err("company_user_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id, company_user_id, name, email, role_in_company,
                       avatar, avatar_color, is_active, created_at
                FROM {SCHEMA}.employees WHERE company_user_id = %s
                ORDER BY created_at""",
            (cid,)
        )
        rows = cur.fetchall(); conn.close()
        return ok({"employees": [row_to_emp(r) for r in rows]})

    # ── POST add ──────────────────────────────────────────────────────────
    if method == "POST" and action == "add":
        b = json.loads(event.get("body") or "{}")
        cid      = b.get("companyUserId", "")
        name     = (b.get("name") or "").strip()
        email    = (b.get("email") or "").strip().lower()
        password = b.get("password") or ""
        role_c   = b.get("roleInCompany") or "employee"

        if not cid:            return err("companyUserId required")
        if not name:           return err("Введите имя сотрудника")
        if "@" not in email:   return err("Некорректный email")
        if len(password) < 6:  return err("Пароль минимум 6 символов")
        if role_c not in ROLES: role_c = "employee"

        pw_hash      = hash_pw(password)
        avatar       = initials(name)
        avatar_color = random.choice(AVATAR_COLORS)

        conn = get_conn(); cur = conn.cursor()

        # Проверяем уникальность email среди пользователей и сотрудников
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close(); return err("Email уже занят другим пользователем")
        cur.execute(f"SELECT id FROM {SCHEMA}.employees WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close(); return err("Сотрудник с таким email уже существует")

        cur.execute(
            f"""INSERT INTO {SCHEMA}.employees
                (company_user_id, name, email, password_hash, role_in_company, avatar, avatar_color)
                VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (cid, name, email, pw_hash, role_c, avatar, avatar_color),
        )
        emp_id = str(cur.fetchone()[0])
        conn.commit(); conn.close()
        return ok({"id": emp_id}, 201)

    # ── POST update ───────────────────────────────────────────────────────
    if method == "POST" and action == "update":
        b = json.loads(event.get("body") or "{}")
        emp_id = b.get("id", "")
        if not emp_id: return err("id required")

        fields = {}
        if "name" in b:           fields["name"] = b["name"]
        if "roleInCompany" in b:  fields["role_in_company"] = b["roleInCompany"]
        if not fields:            return err("Нет данных")

        set_clause = ", ".join(f"{c} = %s" for c in fields)
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.employees SET {set_clause} WHERE id = %s",
                    list(fields.values()) + [emp_id])
        conn.commit(); conn.close()
        return ok({"success": True})

    # ── POST deactivate / activate ────────────────────────────────────────
    if method == "POST" and action in ("deactivate", "activate"):
        b = json.loads(event.get("body") or "{}")
        emp_id = b.get("id", "")
        if not emp_id: return err("id required")
        active = action == "activate"
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.employees SET is_active = %s WHERE id = %s", (active, emp_id))
        conn.commit(); conn.close()
        return ok({"isActive": active})

    return err("Not found", 404)

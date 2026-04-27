"""
Управление сотрудниками компании GLOBAL LINK.
GET  ?action=list&company_user_id=X   — список сотрудников
POST ?action=add                      — добавить сотрудника (+ accessPermissions)
POST ?action=update                   — обновить роль/имя/accessPermissions
POST ?action=update_permissions       — обновить только права доступа
POST ?action=deactivate               — деактивировать
POST ?action=activate                 — восстановить
"""
import json, os, hashlib, random, urllib.request
import psycopg2

SCHEMA = "t_p17532248_concert_platform_mvp"

AVATAR_COLORS = [
    "from-neon-purple to-neon-cyan", "from-neon-cyan to-neon-green",
    "from-neon-pink to-neon-purple", "from-neon-green to-neon-cyan",
]

ROLES = ["employee", "manager", "accountant", "admin"]

DEFAULT_PERMISSIONS = {
    "canViewExpenses": True, "canViewIncome": True, "canViewSummary": True,
    "canEditExpenses": True, "canEditIncome": True,
}


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


def send_employee_invite(to_email: str, emp_name: str, company_name: str, password: str):
    """Отправляет письмо сотруднику с логином и паролем."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    app_url = os.environ.get("APP_URL", "https://globallink.ru")
    if not api_key or not to_email:
        return
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
  <tr><td style="padding-bottom:24px;text-align:center;">
    <span style="font-family:Arial,sans-serif;font-size:22px;font-weight:bold;color:#fff;letter-spacing:2px;">GLOBAL LINK</span>
  </td></tr>
  <tr><td style="background:#15152a;border-radius:16px;border:1px solid rgba(255,255,255,0.1);padding:32px;">
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px;">Привет, {emp_name}!</h2>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px;line-height:1.6;">
      Тебя добавили в команду <strong style="color:#fff;">{company_name}</strong> на платформе GLOBAL LINK.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <p style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Данные для входа</p>
        <table width="100%" cellpadding="4" cellspacing="0">
          <tr>
            <td style="color:rgba(255,255,255,0.4);font-size:13px;width:80px;">Логин:</td>
            <td style="color:#22d3ee;font-size:14px;font-weight:bold;">{to_email}</td>
          </tr>
          <tr>
            <td style="color:rgba(255,255,255,0.4);font-size:13px;">Пароль:</td>
            <td style="color:#a855f7;font-size:14px;font-weight:bold;">{password}</td>
          </tr>
        </table>
      </td></tr>
    </table>
    <a href="{app_url}" style="display:inline-block;background:linear-gradient(135deg,#a855f7,#22d3ee);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;font-size:14px;">
      Войти в GLOBAL LINK
    </a>
    <p style="color:rgba(255,255,255,0.3);font-size:12px;margin-top:24px;line-height:1.5;">
      Рекомендуем сменить пароль после первого входа.<br>
      Если вы не ожидали это письмо — просто проигнорируйте его.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>"""
    payload = json.dumps({
        "from": "GLOBAL LINK <noreply@globallink.art>",
        "to": [to_email],
        "subject": f"Вас добавили в команду {company_name} — GLOBAL LINK",
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
        print(f"[Email invite] {to_email}: {ex}")


def row_to_emp(row) -> dict:
    # row: id, company_user_id, name, email, role_in_company, avatar, avatar_color, is_active, created_at, access_permissions
    raw_perms = row[9] if len(row) > 9 else None
    if isinstance(raw_perms, dict):
        perms = raw_perms
    elif isinstance(raw_perms, str):
        try:
            perms = json.loads(raw_perms)
        except Exception:
            perms = DEFAULT_PERMISSIONS.copy()
    else:
        perms = DEFAULT_PERMISSIONS.copy()
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
        "accessPermissions": perms,
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
                       avatar, avatar_color, is_active, created_at, access_permissions
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
        perms    = b.get("accessPermissions") or DEFAULT_PERMISSIONS.copy()
        # Валидируем и дополняем permissions
        for k, v in DEFAULT_PERMISSIONS.items():
            if k not in perms:
                perms[k] = v

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
                (company_user_id, name, email, password_hash, role_in_company, avatar, avatar_color, access_permissions)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (cid, name, email, pw_hash, role_c, avatar, avatar_color, json.dumps(perms)),
        )
        emp_id = str(cur.fetchone()[0])
        # Получаем название компании для письма
        cur.execute(f"SELECT name FROM {SCHEMA}.users WHERE id = %s", (cid,))
        owner_row = cur.fetchone()
        company_name = owner_row[0] if owner_row else "компании"
        conn.commit(); conn.close()
        # Отправляем письмо сотруднику
        send_employee_invite(email, name, company_name, password)
        return ok({"id": emp_id}, 201)

    # ── POST update ───────────────────────────────────────────────────────
    if method == "POST" and action == "update":
        b = json.loads(event.get("body") or "{}")
        emp_id = b.get("id", "")
        if not emp_id: return err("id required")

        fields = {}
        if "name" in b:           fields["name"] = b["name"]
        if "roleInCompany" in b:  fields["role_in_company"] = b["roleInCompany"]
        if "accessPermissions" in b:
            perms = b["accessPermissions"]
            for k, v in DEFAULT_PERMISSIONS.items():
                if k not in perms:
                    perms[k] = v
            fields["access_permissions"] = json.dumps(perms)
        if not fields:            return err("Нет данных")

        set_clause = ", ".join(f"{c} = %s" for c in fields)
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.employees SET {set_clause} WHERE id = %s",
                    list(fields.values()) + [emp_id])
        conn.commit(); conn.close()
        return ok({"success": True})

    # ── POST update_permissions ───────────────────────────────────────────
    if method == "POST" and action == "update_permissions":
        b = json.loads(event.get("body") or "{}")
        emp_id = b.get("id", "")
        perms  = b.get("accessPermissions")
        if not emp_id: return err("id required")
        if not perms:  return err("accessPermissions required")
        for k, v in DEFAULT_PERMISSIONS.items():
            if k not in perms:
                perms[k] = v
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.employees SET access_permissions = %s WHERE id = %s RETURNING id",
            (json.dumps(perms), emp_id)
        )
        conn.commit(); conn.close()
        return ok({"success": True, "accessPermissions": perms})

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

    # ── GET company_messages — сообщения внутреннего чата компании ─────────
    if method == "GET" and action == "company_messages":
        company_user_id = params.get("company_user_id", "")
        if not company_user_id: return err("company_user_id required")
        limit = int(params.get("limit", 100))
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id, sender_id, sender_type, sender_name, sender_avatar,
                       sender_color, text, created_at
                FROM {SCHEMA}.company_messages
                WHERE company_user_id = %s
                ORDER BY created_at ASC LIMIT %s""",
            (company_user_id, limit))
        rows = cur.fetchall(); conn.close()
        return ok({"messages": [
            {"id": str(r[0]), "senderId": str(r[1]), "senderType": r[2],
             "senderName": r[3], "senderAvatar": r[4], "senderColor": r[5],
             "text": r[6], "createdAt": str(r[7])}
            for r in rows
        ]})

    # ── POST company_send — отправить сообщение в чат компании ─────────────
    if method == "POST" and action == "company_send":
        b = json.loads(event.get("body") or "{}")
        company_user_id = b.get("companyUserId", "")
        sender_id       = b.get("senderId", "")
        sender_type     = b.get("senderType", "user")   # "user" | "employee"
        text            = (b.get("text") or "").strip()
        if not company_user_id or not sender_id or not text:
            return err("companyUserId, senderId, text обязательны")
        # Получаем имя и аватар отправителя
        conn = get_conn(); cur = conn.cursor()
        sender_name = ""; sender_avatar = ""; sender_color = "from-neon-purple to-neon-cyan"
        if sender_type == "employee":
            cur.execute(f"SELECT name, avatar, avatar_color FROM {SCHEMA}.employees WHERE id=%s", (sender_id,))
            row = cur.fetchone()
            if row: sender_name, sender_avatar, sender_color = row[0], row[1], row[2]
        else:
            cur.execute(f"SELECT name, avatar, avatar_color FROM {SCHEMA}.users WHERE id=%s", (sender_id,))
            row = cur.fetchone()
            if row: sender_name, sender_avatar, sender_color = row[0], row[1], row[2]
        cur.execute(
            f"""INSERT INTO {SCHEMA}.company_messages
                (company_user_id, sender_id, sender_type, sender_name, sender_avatar, sender_color, text)
                VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id, created_at""",
            (company_user_id, sender_id, sender_type, sender_name, sender_avatar, sender_color, text))
        row = cur.fetchone()
        conn.commit(); conn.close()
        return ok({
            "id": str(row[0]), "senderId": sender_id, "senderType": sender_type,
            "senderName": sender_name, "senderAvatar": sender_avatar, "senderColor": sender_color,
            "text": text, "createdAt": str(row[1]),
        }, 201)

    # ── GET dm_messages — личные сообщения между владельцем и сотрудником ──
    if method == "GET" and action == "dm_messages":
        company_user_id = params.get("company_user_id", "")
        employee_id     = params.get("employee_id", "")
        if not company_user_id or not employee_id: return err("company_user_id и employee_id обязательны")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id, sender_id, sender_type, sender_name, sender_avatar,
                       sender_color, text, created_at
                FROM {SCHEMA}.direct_messages
                WHERE company_user_id = %s
                  AND (
                    (sender_id = %s AND recipient_id = %s)
                    OR (sender_id = %s AND recipient_id = %s)
                  )
                ORDER BY created_at ASC LIMIT 200""",
            (company_user_id, company_user_id, employee_id, employee_id, company_user_id))
        rows = cur.fetchall(); conn.close()
        return ok({"messages": [
            {"id": str(r[0]), "senderId": str(r[1]), "senderType": r[2],
             "senderName": r[3], "senderAvatar": r[4], "senderColor": r[5],
             "text": r[6], "createdAt": str(r[7])}
            for r in rows
        ]})

    # ── POST dm_send — отправить личное сообщение ───────────────────────────
    if method == "POST" and action == "dm_send":
        b = json.loads(event.get("body") or "{}")
        company_user_id = b.get("companyUserId", "")
        sender_id       = b.get("senderId", "")
        sender_type     = b.get("senderType", "user")
        recipient_id    = b.get("recipientId", "")
        text            = (b.get("text") or "").strip()
        if not company_user_id or not sender_id or not recipient_id or not text:
            return err("companyUserId, senderId, recipientId, text обязательны")
        conn = get_conn(); cur = conn.cursor()
        sender_name = ""; sender_avatar = ""; sender_color = "from-neon-purple to-neon-cyan"
        if sender_type == "employee":
            cur.execute(f"SELECT name, avatar, avatar_color FROM {SCHEMA}.employees WHERE id=%s", (sender_id,))
            row = cur.fetchone()
            if row: sender_name, sender_avatar, sender_color = row[0], row[1], row[2]
        else:
            cur.execute(f"SELECT name, avatar, avatar_color FROM {SCHEMA}.users WHERE id=%s", (sender_id,))
            row = cur.fetchone()
            if row: sender_name, sender_avatar, sender_color = row[0], row[1], row[2]
        cur.execute(
            f"""INSERT INTO {SCHEMA}.direct_messages
                (company_user_id, sender_id, sender_type, sender_name, sender_avatar, sender_color, recipient_id, text)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id, created_at""",
            (company_user_id, sender_id, sender_type, sender_name, sender_avatar, sender_color, recipient_id, text))
        row = cur.fetchone()
        conn.commit(); conn.close()
        return ok({
            "id": str(row[0]), "senderId": sender_id, "senderType": sender_type,
            "senderName": sender_name, "senderAvatar": sender_avatar, "senderColor": sender_color,
            "text": text, "createdAt": str(row[1]),
        }, 201)

    return err("Not found", 404)
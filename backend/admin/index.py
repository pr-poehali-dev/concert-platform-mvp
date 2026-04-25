"""
Административная панель GLOBAL LINK.
POST ?action=login                  — вход по ADMIN_SECRET
GET  ?action=stats                  — общая статистика + кол-во pending
GET  ?action=pending                — список заявок на верификацию
GET  ?action=users&page=1&search=X  — список всех пользователей
GET  ?action=venues&page=1&search=X — список площадок
POST ?action=approve                — одобрить аккаунт
POST ?action=reject                 — отклонить аккаунт
POST ?action=verify_user            — переключить verified флаг
POST ?action=verify_venue           — переключить verified флаг площадки
POST ?action=toggle_admin           — выдать/снять права администратора
"""
import json
import os
import psycopg2
import urllib.request

SCHEMA = "t_p17532248_concert_platform_mvp"
PAGE_SIZE = 20
NOTIF_URL = "https://functions.poehali.dev/68f4b989-d93d-4a45-af4c-d54ad6815826"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
    }


def ok(data, status=200):
    return {
        "statusCode": status,
        "headers": {**cors(), "Content-Type": "application/json"},
        "body": json.dumps(data, ensure_ascii=False, default=str),
    }


def err(msg, status=400):
    return {
        "statusCode": status,
        "headers": {**cors(), "Content-Type": "application/json"},
        "body": json.dumps({"error": msg}, ensure_ascii=False),
    }


def check_token(headers: dict) -> bool:
    token = headers.get("X-Admin-Token") or headers.get("x-admin-token") or ""
    secret = os.environ.get("ADMIN_SECRET", "")
    return bool(secret) and token == secret


def send_notification(user_id: str, notif_type: str, title: str, body: str, link_page: str = ""):
    payload = json.dumps({
        "userId": user_id, "type": notif_type,
        "title": title, "body": body, "linkPage": link_page,
    }).encode()
    req = urllib.request.Request(
        f"{NOTIF_URL}?action=create", data=payload,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=4)
    except Exception:
        pass


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    headers = event.get("headers") or {}

    # ── POST login ────────────────────────────────────────────────────────
    if method == "POST" and action == "login":
        body = json.loads(event.get("body") or "{}")
        secret = os.environ.get("ADMIN_SECRET", "")
        if not secret:
            return err("ADMIN_SECRET не настроен", 500)
        if body.get("password") != secret:
            return err("Неверный пароль", 401)
        return ok({"token": secret})

    # ── Все остальные требуют токена ──────────────────────────────────────
    if not check_token(headers):
        return err("Нет доступа", 403)

    # ── GET stats ─────────────────────────────────────────────────────────
    if method == "GET" and action == "stats":
        conn = get_conn()
        cur = conn.cursor()

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users")
        total_users = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE role = 'organizer'")
        organizers = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE role = 'venue'")
        venue_owners = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE verified = TRUE")
        verified_users = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE status = 'pending'")
        pending_count = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.venues")
        total_venues = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.venues WHERE verified = TRUE")
        verified_venues = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.conversations")
        total_convs = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages")
        total_messages = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE created_at >= NOW() - INTERVAL '7 days'")
        new_users_week = cur.fetchone()[0]

        cur.execute(
            f"SELECT id, name, email, role, city, verified, status, created_at FROM {SCHEMA}.users ORDER BY created_at DESC LIMIT 5"
        )
        recent = [
            {"id": str(r[0]), "name": r[1], "email": r[2], "role": r[3],
             "city": r[4], "verified": r[5], "status": r[6], "createdAt": str(r[7])}
            for r in cur.fetchall()
        ]
        conn.close()
        return ok({
            "totalUsers": total_users, "organizers": organizers, "venueOwners": venue_owners,
            "verifiedUsers": verified_users, "pendingCount": pending_count,
            "totalVenues": total_venues, "verifiedVenues": verified_venues,
            "totalConversations": total_convs, "totalMessages": total_messages,
            "newUsersWeek": new_users_week, "recentUsers": recent,
        })

    # ── GET pending ───────────────────────────────────────────────────────
    if method == "GET" and action == "pending":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, name, email, role, city, avatar, avatar_color, created_at
                FROM {SCHEMA}.users WHERE status = 'pending'
                ORDER BY created_at ASC"""
        )
        rows = cur.fetchall()
        conn.close()
        result = [
            {
                "id": str(r[0]), "name": r[1], "email": r[2], "role": r[3],
                "city": r[4], "avatar": r[5], "avatarColor": r[6], "createdAt": str(r[7]),
                "status": "pending",
            }
            for r in rows
        ]
        return ok({"users": result, "total": len(result)})

    # ── POST approve ──────────────────────────────────────────────────────
    if method == "POST" and action == "approve":
        body = json.loads(event.get("body") or "{}")
        uid = body.get("id", "")
        if not uid:
            return err("id required")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.users SET status = 'approved', verified = TRUE WHERE id = %s RETURNING name, email",
            (uid,),
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        if row:
            send_notification(
                uid, "system",
                "Ваш аккаунт одобрен!",
                "Добро пожаловать в GLOBAL LINK. Теперь вы можете пользоваться всеми возможностями платформы.",
                "home",
            )
        return ok({"status": "approved", "verified": True})

    # ── POST reject ───────────────────────────────────────────────────────
    if method == "POST" and action == "reject":
        body = json.loads(event.get("body") or "{}")
        uid = body.get("id", "")
        reason = (body.get("reason") or "").strip()
        if not uid:
            return err("id required")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.users SET status = 'rejected', verified = FALSE WHERE id = %s RETURNING name, email",
            (uid,),
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        if row:
            msg = f"К сожалению, ваша заявка отклонена."
            if reason:
                msg += f" Причина: {reason}"
            send_notification(uid, "system", "Заявка отклонена", msg, "")
        return ok({"status": "rejected"})

    # ── GET users ─────────────────────────────────────────────────────────
    if method == "GET" and action == "users":
        page = max(1, int(params.get("page", 1) or 1))
        search = (params.get("search") or "").strip()
        role_filter = params.get("role") or ""
        status_filter = params.get("status") or ""
        offset = (page - 1) * PAGE_SIZE

        conn = get_conn()
        cur = conn.cursor()

        where = "WHERE 1=1"
        args = []
        if search:
            where += " AND (name ILIKE %s OR email ILIKE %s)"
            args += [f"%{search}%", f"%{search}%"]
        if role_filter:
            where += " AND role = %s"
            args.append(role_filter)
        if status_filter:
            where += " AND status = %s"
            args.append(status_filter)

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users {where}", args)
        total = cur.fetchone()[0]

        cur.execute(
            f"""SELECT id, name, email, role, city, verified, is_admin, avatar, avatar_color, created_at, status
                FROM {SCHEMA}.users {where}
                ORDER BY created_at DESC LIMIT %s OFFSET %s""",
            args + [PAGE_SIZE, offset],
        )
        rows = cur.fetchall()

        user_ids = [str(r[0]) for r in rows]
        venue_counts = {}
        if user_ids:
            placeholders = ",".join(["%s"] * len(user_ids))
            cur.execute(
                f"SELECT user_id, COUNT(*) FROM {SCHEMA}.venues WHERE user_id IN ({placeholders}) GROUP BY user_id",
                user_ids,
            )
            for vc in cur.fetchall():
                venue_counts[str(vc[0])] = vc[1]
        conn.close()

        users = []
        for r in rows:
            uid = str(r[0])
            users.append({
                "id": uid, "name": r[1], "email": r[2], "role": r[3],
                "city": r[4], "verified": r[5], "isAdmin": r[6],
                "avatar": r[7], "avatarColor": r[8], "createdAt": str(r[9]),
                "status": r[10] or "approved",
                "venuesCount": venue_counts.get(uid, 0),
            })

        return ok({"users": users, "total": total, "page": page,
                   "pages": (total + PAGE_SIZE - 1) // PAGE_SIZE})

    # ── GET venues ────────────────────────────────────────────────────────
    if method == "GET" and action == "venues":
        page = max(1, int(params.get("page", 1) or 1))
        search = (params.get("search") or "").strip()
        offset = (page - 1) * PAGE_SIZE

        conn = get_conn()
        cur = conn.cursor()

        where = "WHERE 1=1"
        args = []
        if search:
            where += " AND (v.name ILIKE %s OR v.city ILIKE %s)"
            args += [f"%{search}%", f"%{search}%"]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.venues v {where}", args)
        total = cur.fetchone()[0]

        cur.execute(
            f"""SELECT v.id, v.name, v.city, v.venue_type, v.capacity, v.price_from,
                       v.verified, v.rating, v.reviews_count, v.created_at,
                       u.name, u.email
                FROM {SCHEMA}.venues v
                LEFT JOIN {SCHEMA}.users u ON u.id = v.user_id
                {where} ORDER BY v.created_at DESC LIMIT %s OFFSET %s""",
            args + [PAGE_SIZE, offset],
        )
        rows = cur.fetchall()
        conn.close()

        venues = [
            {"id": str(r[0]), "name": r[1], "city": r[2], "venueType": r[3],
             "capacity": r[4], "priceFrom": r[5], "verified": r[6],
             "rating": float(r[7]) if r[7] else 0, "reviewsCount": r[8],
             "createdAt": str(r[9]), "ownerName": r[10] or "—", "ownerEmail": r[11] or "—"}
            for r in rows
        ]
        return ok({"venues": venues, "total": total, "page": page,
                   "pages": (total + PAGE_SIZE - 1) // PAGE_SIZE})

    # ── POST verify_user ──────────────────────────────────────────────────
    if method == "POST" and action == "verify_user":
        body = json.loads(event.get("body") or "{}")
        uid = body.get("id", "")
        if not uid:
            return err("id required")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.users SET verified = NOT verified WHERE id = %s RETURNING verified",
            (uid,),
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return ok({"verified": row[0] if row else False})

    # ── POST verify_venue ─────────────────────────────────────────────────
    if method == "POST" and action == "verify_venue":
        body = json.loads(event.get("body") or "{}")
        vid = body.get("id", "")
        if not vid:
            return err("id required")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.venues SET verified = NOT verified WHERE id = %s RETURNING verified",
            (vid,),
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return ok({"verified": row[0] if row else False})

    # ── POST toggle_admin ─────────────────────────────────────────────────
    if method == "POST" and action == "toggle_admin":
        body = json.loads(event.get("body") or "{}")
        uid = body.get("id", "")
        if not uid:
            return err("id required")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.users SET is_admin = NOT is_admin WHERE id = %s RETURNING is_admin",
            (uid,),
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return ok({"isAdmin": row[0] if row else False})

    return err("Not found", 404)

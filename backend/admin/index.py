"""
Административная панель GLOBAL LINK.
POST ?action=login                  — вход по ADMIN_SECRET
GET  ?action=stats                  — общая статистика + кол-во pending
GET  ?action=pending                — список заявок на верификацию
GET  ?action=users&page=1&search=X  — список всех пользователей (включая lastSeen)
GET  ?action=venues&page=1&search=X — список площадок
POST ?action=approve                — одобрить аккаунт
POST ?action=reject                 — отклонить аккаунт
POST ?action=verify_user            — переключить verified флаг
POST ?action=verify_venue           — переключить verified флаг площадки
POST ?action=toggle_admin           — выдать/снять права администратора
POST ?action=test_email             — отправить тестовое письмо через Resend
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


def ok_no_auth(data, status=200):
    """Ответ без проверки авторизации — для публичных endpoints поддержки."""
    return {
        "statusCode": status,
        "headers": {**cors(), "Content-Type": "application/json"},
        "body": json.dumps(data, ensure_ascii=False, default=str),
    }


def check_auth(event: dict):
    """Возвращает 403 если токен неверный, иначе None."""
    headers = event.get("headers") or {}
    if not check_token(headers):
        return ok_no_auth({"error": "Forbidden"}, 403)
    return None


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

    # ── Публичные endpoints поддержки (без токена) ────────────────────────
    PUBLIC_SUPPORT = {"support_send", "support_history", "support_unread_count"}
    if action in PUBLIC_SUPPORT:
        pass  # продолжаем — обработаны ниже перед return err("Not found")
    elif not check_token(headers):
        # ── Все остальные требуют токена ──────────────────────────────────
        return err("Нет доступа", 403)

    # ── POST test_email — отправить тестовое письмо ─────────────────────────
    if method == "POST" and action == "test_email":
        body = json.loads(event.get("body") or "{}")
        to_email = (body.get("email") or "").strip().lower()
        if "@" not in to_email:
            return err("Введите корректный email")
        api_key = os.environ.get("RESEND_API_KEY", "")
        if not api_key:
            return err("RESEND_API_KEY не настроен в секретах", 500)
        from_address = os.environ.get(
            "EMAIL_FROM", "GLOBAL LINK <noreply@globallink.art>"
        )
        html = (
            "<div style=\"font-family:Arial,sans-serif;background:#0d0d1a;color:#fff;"
            "padding:32px;border-radius:16px;max-width:480px;margin:auto;\">"
            "<h2 style=\"margin:0 0 12px;\">GLOBAL LINK</h2>"
            "<p style=\"color:rgba(255,255,255,0.7);font-size:14px;\">"
            "Это тестовое письмо. Если ты его видишь — отправка email работает.</p>"
            "</div>"
        )

        def _send(from_addr: str):
            payload = json.dumps({
                "from": from_addr, "to": [to_email],
                "subject": "GLOBAL LINK — тест отправки писем",
                "html": html,
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.resend.com/emails", data=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    return resp.status, resp.read().decode("utf-8", errors="ignore")
            except urllib.error.HTTPError as he:
                return he.code, he.read().decode("utf-8", errors="ignore")
            except Exception as ex:
                return 0, str(ex)

        status, resp_body = _send(from_address)
        if status == 200:
            return ok({
                "success": True, "from": from_address,
                "message": f"Письмо отправлено на {to_email}",
            })
        # Фоллбек на проверенный домен Resend если основной отклонён
        if status in (401, 403, 422) and "resend.dev" not in from_address:
            fallback = "GLOBAL LINK <onboarding@resend.dev>"
            s2, b2 = _send(fallback)
            if s2 == 200:
                return ok({
                    "success": True, "from": fallback, "fallback": True,
                    "message": (
                        f"Письмо отправлено через {fallback}. "
                        f"Основной домен ({from_address}) не верифицирован в Resend "
                        f"({status}: {resp_body[:120]})"
                    ),
                })
            return err(
                f"Resend отклонил письмо. Основной: {status} {resp_body[:200]}. "
                f"Фоллбек: {s2} {b2[:200]}",
                502,
            )
        return err(
            f"Resend ответил {status}: {resp_body[:300]}", 502 if status else 500
        )

    # ── GET stats ─────────────────────────────────────────────────────────
    if method == "GET" and action == "stats":
        conn = get_conn()
        try:
            cur = conn.cursor()
            # Один запрос вместо 10 — агрегируем всё через FILTER
            cur.execute(f"""
                SELECT
                    COUNT(*)                                                       AS total_users,
                    COUNT(*) FILTER (WHERE role = 'organizer')                    AS organizers,
                    COUNT(*) FILTER (WHERE role = 'venue')                        AS venue_owners,
                    COUNT(*) FILTER (WHERE verified = TRUE)                       AS verified_users,
                    COUNT(*) FILTER (WHERE status = 'pending')                    AS pending_count,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_users_week
                FROM {SCHEMA}.users
            """)
            u = cur.fetchone()
            cur.execute(f"""
                SELECT COUNT(*), COUNT(*) FILTER (WHERE verified = TRUE) FROM {SCHEMA}.venues
            """)
            v = cur.fetchone()
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.conversations")
            total_convs = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages")
            total_messages = cur.fetchone()[0]
            cur.execute(
                f"SELECT id, name, email, role, city, verified, status, created_at FROM {SCHEMA}.users ORDER BY created_at DESC LIMIT 5"
            )
            recent = [
                {"id": str(r[0]), "name": r[1], "email": r[2], "role": r[3],
                 "city": r[4], "verified": r[5], "status": r[6], "createdAt": str(r[7])}
                for r in cur.fetchall()
            ]
        finally:
            conn.close()
        return ok({
            "totalUsers": u[0], "organizers": u[1], "venueOwners": u[2],
            "verifiedUsers": u[3], "pendingCount": u[4], "newUsersWeek": u[5],
            "totalVenues": v[0], "verifiedVenues": v[1],
            "totalConversations": total_convs, "totalMessages": total_messages,
            "recentUsers": recent,
        })

    # ── GET pending ───────────────────────────────────────────────────────
    if method == "GET" and action == "pending":
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT id, name, email, role, city, avatar, avatar_color, created_at
                    FROM {SCHEMA}.users WHERE status = 'pending'
                    ORDER BY created_at ASC"""
            )
            rows = cur.fetchall()
        finally:
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
        try:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.users SET status = 'approved', verified = TRUE WHERE id = %s RETURNING name, email",
                (uid,),
            )
            row = cur.fetchone()
            conn.commit()
        finally:
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
        try:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.users SET status = 'rejected', verified = FALSE WHERE id = %s RETURNING name, email",
                (uid,),
            )
            row = cur.fetchone()
            conn.commit()
        finally:
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
        try:
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
            last_seen_map = {}
            if user_ids:
                placeholders = ",".join(["%s"] * len(user_ids))
                cur.execute(
                    f"SELECT user_id, COUNT(*) FROM {SCHEMA}.venues WHERE user_id IN ({placeholders}) GROUP BY user_id",
                    user_ids,
                )
                for vc in cur.fetchall():
                    venue_counts[str(vc[0])] = vc[1]
                # Последний онлайн — максимум по сессиям пользователя
                cur.execute(
                    f"SELECT user_id, MAX(last_seen) FROM {SCHEMA}.sessions "
                    f"WHERE user_id IN ({placeholders}) GROUP BY user_id",
                    user_ids,
                )
                for ls in cur.fetchall():
                    last_seen_map[str(ls[0])] = str(ls[1]) if ls[1] else ""
        finally:
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
                "lastSeen": last_seen_map.get(uid, ""),
            })

        return ok({"users": users, "total": total, "page": page,
                   "pages": (total + PAGE_SIZE - 1) // PAGE_SIZE})

    # ── GET venues ────────────────────────────────────────────────────────
    if method == "GET" and action == "venues":
        page = max(1, int(params.get("page", 1) or 1))
        search = (params.get("search") or "").strip()
        offset = (page - 1) * PAGE_SIZE

        conn = get_conn()
        try:
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
        finally:
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
        try:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.users SET verified = NOT verified WHERE id = %s RETURNING verified",
                (uid,),
            )
            row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        return ok({"verified": row[0] if row else False})

    # ── POST verify_venue ─────────────────────────────────────────────────
    if method == "POST" and action == "verify_venue":
        body = json.loads(event.get("body") or "{}")
        vid = body.get("id", "")
        if not vid:
            return err("id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.venues SET verified = NOT verified WHERE id = %s RETURNING verified",
                (vid,),
            )
            row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        return ok({"verified": row[0] if row else False})

    # ── POST toggle_admin ─────────────────────────────────────────────────
    if method == "POST" and action == "toggle_admin":
        body = json.loads(event.get("body") or "{}")
        uid = body.get("id", "")
        if not uid:
            return err("id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.users SET is_admin = NOT is_admin WHERE id = %s RETURNING is_admin",
                (uid,),
            )
            row = cur.fetchone()
            conn.commit()
        finally:
            conn.close()
        return ok({"isAdmin": row[0] if row else False})

    # ── POST delete_user ──────────────────────────────────────────────────
    if method == "POST" and action == "delete_user":
        body = json.loads(event.get("body") or "{}")
        uid = body.get("id", "")
        if not uid:
            return err("id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            # Площадки пользователя — удаляем вместе со всеми зависимостями
            cur.execute(f"SELECT id FROM {SCHEMA}.venues WHERE user_id = %s", (uid,))
            venue_ids = [str(r[0]) for r in cur.fetchall()]
            for vid in venue_ids:
                # Бронирования площадки — задачи, чеклист, файлы
                cur.execute(f"SELECT id FROM {SCHEMA}.venue_bookings WHERE venue_id = %s", (vid,))
                bids = [str(r[0]) for r in cur.fetchall()]
                for bid in bids:
                    cur.execute(f"DELETE FROM {SCHEMA}.booking_tasks WHERE booking_id = %s", (bid,))
                    cur.execute(f"DELETE FROM {SCHEMA}.booking_checklist WHERE booking_id = %s", (bid,))
                    cur.execute(f"DELETE FROM {SCHEMA}.booking_files WHERE booking_id = %s", (bid,))
                cur.execute(f"DELETE FROM {SCHEMA}.venue_bookings WHERE venue_id = %s", (vid,))
                cur.execute(f"DELETE FROM {SCHEMA}.venue_busy_dates WHERE venue_id = %s", (vid,))
                cur.execute(f"DELETE FROM {SCHEMA}.venue_photos WHERE venue_id = %s", (vid,))
                cur.execute(f"DELETE FROM {SCHEMA}.venues WHERE id = %s", (vid,))
            # Бронирования как организатора
            cur.execute(f"SELECT id FROM {SCHEMA}.venue_bookings WHERE organizer_id = %s OR venue_user_id = %s", (uid, uid))
            bids = [str(r[0]) for r in cur.fetchall()]
            for bid in bids:
                cur.execute(f"DELETE FROM {SCHEMA}.booking_tasks WHERE booking_id = %s", (bid,))
                cur.execute(f"DELETE FROM {SCHEMA}.booking_checklist WHERE booking_id = %s", (bid,))
                cur.execute(f"DELETE FROM {SCHEMA}.booking_files WHERE booking_id = %s", (bid,))
            cur.execute(f"DELETE FROM {SCHEMA}.venue_bookings WHERE organizer_id = %s OR venue_user_id = %s", (uid, uid))
            # Диалоги и сообщения
            cur.execute(f"SELECT id FROM {SCHEMA}.conversations WHERE organizer_id = %s OR venue_user_id = %s", (uid, uid))
            conv_ids = [str(r[0]) for r in cur.fetchall()]
            for cid in conv_ids:
                cur.execute(f"DELETE FROM {SCHEMA}.messages WHERE conversation_id = %s", (cid,))
            cur.execute(f"DELETE FROM {SCHEMA}.conversations WHERE organizer_id = %s OR venue_user_id = %s", (uid, uid))
            # Уведомления и сотрудники
            cur.execute(f"DELETE FROM {SCHEMA}.notifications WHERE user_id = %s", (uid,))
            cur.execute(f"DELETE FROM {SCHEMA}.employees WHERE company_user_id = %s", (uid,))
            # Проекты пользователя
            cur.execute(f"SELECT id FROM {SCHEMA}.projects WHERE user_id = %s", (uid,))
            project_ids = [str(r[0]) for r in cur.fetchall()]
            for pid in project_ids:
                cur.execute(f"DELETE FROM {SCHEMA}.project_expenses WHERE project_id = %s", (pid,))
                cur.execute(f"DELETE FROM {SCHEMA}.project_income_lines WHERE project_id = %s", (pid,))
                cur.execute(f"DELETE FROM {SCHEMA}.projects WHERE id = %s", (pid,))
            # Удаляем пользователя
            cur.execute(f"DELETE FROM {SCHEMA}.users WHERE id = %s", (uid,))
            conn.commit()
        finally:
            conn.close()
        return ok({"deleted": True})

    # ── POST send_notification ────────────────────────────────────────────
    if method == "POST" and action == "send_notification":
        body = json.loads(event.get("body") or "{}")
        uid   = body.get("userId", "")
        title = (body.get("title") or "").strip()
        text  = (body.get("body") or "").strip()
        if not uid or not title or not text:
            return err("userId, title и body обязательны")
        send_notification(uid, "system", title, text, "")
        return ok({"sent": True})

    # ── GET user_details ──────────────────────────────────────────────────
    if method == "GET" and action == "user_details":
        uid = params.get("id", "")
        if not uid:
            return err("id required")
        conn = get_conn()
        try:
            cur = conn.cursor()

            # Базовые данные пользователя
            cur.execute(
                f"""SELECT id, name, email, role, city, verified, is_admin, avatar, avatar_color,
                           created_at, status, phone, legal_name, inn, company_type
                    FROM {SCHEMA}.users WHERE id = %s""",
                (uid,),
            )
            row = cur.fetchone()
            if not row:
                return err("Пользователь не найден", 404)

            user = {
                "id": str(row[0]), "name": row[1], "email": row[2], "role": row[3],
                "city": row[4], "verified": row[5], "isAdmin": row[6],
                "avatar": row[7], "avatarColor": row[8], "createdAt": str(row[9]),
                "status": row[10] or "approved", "phone": row[11] or "",
                "legalName": row[12] or "", "inn": row[13] or "", "companyType": row[14] or "",
            }

            # Проекты с финансами
            cur.execute(
                f"""SELECT id, title, artist, status, city, date_start,
                           total_income_plan, total_income_fact,
                           total_expenses_plan, total_expenses_fact, created_at
                    FROM {SCHEMA}.projects WHERE user_id = %s
                    ORDER BY created_at DESC""",
                (uid,),
            )
            projects = []
            for p in cur.fetchall():
                projects.append({
                    "id": str(p[0]), "title": p[1], "artist": p[2], "status": p[3],
                    "city": p[4], "dateStart": str(p[5]) if p[5] else "",
                    "incomePlan": float(p[6] or 0), "incomeFact": float(p[7] or 0),
                    "expensesPlan": float(p[8] or 0), "expensesFact": float(p[9] or 0),
                    "createdAt": str(p[10]),
                })

            # Сводные финансы по всем проектам
            total_income_plan = sum(p["incomePlan"] for p in projects)
            total_income_fact = sum(p["incomeFact"] for p in projects)
            total_expenses_plan = sum(p["expensesPlan"] for p in projects)
            total_expenses_fact = sum(p["expensesFact"] for p in projects)

            # Сотрудники
            cur.execute(
                f"""SELECT id, name, email, role_in_company, is_active, created_at
                    FROM {SCHEMA}.employees WHERE company_user_id = %s
                    ORDER BY created_at DESC""",
                (uid,),
            )
            employees = [
                {
                    "id": str(e[0]), "name": e[1], "email": e[2],
                    "roleInCompany": e[3], "isActive": e[4], "createdAt": str(e[5]),
                }
                for e in cur.fetchall()
            ]

            # Площадки (для venue-пользователей)
            cur.execute(
                f"""SELECT id, name, city, venue_type, capacity, price_from, verified, rating
                    FROM {SCHEMA}.venues WHERE user_id = %s ORDER BY created_at DESC""",
                (uid,),
            )
            venues = [
                {
                    "id": str(v[0]), "name": v[1], "city": v[2], "venueType": v[3],
                    "capacity": v[4], "priceFrom": float(v[5] or 0),
                    "verified": v[6], "rating": float(v[7] or 0),
                }
                for v in cur.fetchall()
            ]

            # Бронирования площадок (как организатор)
            cur.execute(
                f"""SELECT vb.id, vb.status, v.name, vb.event_date, vb.rental_amount
                    FROM {SCHEMA}.venue_bookings vb
                    LEFT JOIN {SCHEMA}.venues v ON v.id = vb.venue_id
                    WHERE vb.organizer_id = %s
                    ORDER BY vb.created_at DESC LIMIT 10""",
                (uid,),
            )
            bookings = [
                {
                    "id": str(b[0]), "status": b[1], "venueName": b[2] or "—",
                    "eventDate": str(b[3]) if b[3] else "",
                    "rentalAmount": float(b[4]) if b[4] else None,
                }
                for b in cur.fetchall()
            ]
        finally:
            conn.close()
        return ok({
            "user": user,
            "projects": projects,
            "projectsCount": len(projects),
            "employees": employees,
            "employeesCount": len(employees),
            "venues": venues,
            "bookings": bookings,
            "finance": {
                "totalIncomePlan": total_income_plan,
                "totalIncomeFact": total_income_fact,
                "totalExpensesPlan": total_expenses_plan,
                "totalExpensesFact": total_expenses_fact,
                "totalProfitFact": total_income_fact - total_expenses_fact,
            },
        })

    # ── POST delete_venue ─────────────────────────────────────────────────
    if method == "POST" and action == "delete_venue":
        body = json.loads(event.get("body") or "{}")
        vid = body.get("id", "")
        if not vid:
            return err("id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            # Бронирования площадки — сначала все зависимости
            cur.execute(f"SELECT id FROM {SCHEMA}.venue_bookings WHERE venue_id = %s", (vid,))
            bids = [str(r[0]) for r in cur.fetchall()]
            for bid in bids:
                cur.execute(f"DELETE FROM {SCHEMA}.booking_tasks WHERE booking_id = %s", (bid,))
                cur.execute(f"DELETE FROM {SCHEMA}.booking_checklist WHERE booking_id = %s", (bid,))
                cur.execute(f"DELETE FROM {SCHEMA}.booking_files WHERE booking_id = %s", (bid,))
            cur.execute(f"DELETE FROM {SCHEMA}.venue_bookings WHERE venue_id = %s", (vid,))
            # Диалоги площадки
            cur.execute(f"SELECT id FROM {SCHEMA}.conversations WHERE venue_id = %s", (vid,))
            conv_ids = [str(r[0]) for r in cur.fetchall()]
            for cid in conv_ids:
                cur.execute(f"DELETE FROM {SCHEMA}.messages WHERE conversation_id = %s", (cid,))
            cur.execute(f"DELETE FROM {SCHEMA}.conversations WHERE venue_id = %s", (vid,))
            cur.execute(f"DELETE FROM {SCHEMA}.venue_busy_dates WHERE venue_id = %s", (vid,))
            cur.execute(f"DELETE FROM {SCHEMA}.venue_photos WHERE venue_id = %s", (vid,))
            cur.execute(f"DELETE FROM {SCHEMA}.venues WHERE id = %s", (vid,))
            conn.commit()
        finally:
            conn.close()
        return ok({"deleted": True})

    # ── POST support_send — пользователь или админ отправляет сообщение ────
    if action == "support_send":
        body = json.loads(event.get("body") or "{}")
        user_id = body.get("userId", "")
        text    = (body.get("text") or "").strip()
        sender  = body.get("sender", "user")   # "user" | "admin"
        if not user_id or not text:
            return ok_no_auth({"error": "userId и text обязательны"}, 400)
        conn = get_conn(); cur = conn.cursor()
        is_read_by_admin = sender == "admin"
        is_read_by_user  = sender == "user"
        cur.execute(
            f"""INSERT INTO {SCHEMA}.support_messages
                (user_id, sender, text, is_read_by_admin, is_read_by_user)
                VALUES (%s,%s,%s,%s,%s) RETURNING id, created_at""",
            (user_id, sender, text, is_read_by_admin, is_read_by_user))
        row = cur.fetchone()
        conn.commit(); conn.close()
        return ok_no_auth({"id": str(row[0]), "createdAt": str(row[1])}, 201)

    # ── GET support_history — история диалога пользователя ─────────────────
    if method == "GET" and action == "support_history":
        user_id = params.get("user_id", "")
        if not user_id:
            return ok_no_auth({"error": "user_id required"}, 400)
        conn = get_conn(); cur = conn.cursor()
        # Помечаем сообщения от пользователя прочитанными (если запрашивает пользователь)
        cur.execute(
            f"UPDATE {SCHEMA}.support_messages SET is_read_by_user=true WHERE user_id=%s AND sender='admin'",
            (user_id,))
        cur.execute(
            f"""SELECT id, sender, text, is_read_by_admin, created_at
                FROM {SCHEMA}.support_messages WHERE user_id=%s ORDER BY created_at ASC""",
            (user_id,))
        rows = cur.fetchall()
        conn.commit(); conn.close()
        return ok_no_auth({"messages": [
            {"id": str(r[0]), "sender": r[1], "text": r[2],
             "isReadByAdmin": r[3], "createdAt": str(r[4])}
            for r in rows
        ]})

    # ── GET support_unread_count — кол-во непрочитанных (для пользователя) ─
    if method == "GET" and action == "support_unread_count":
        user_id = params.get("user_id", "")
        if not user_id:
            return ok_no_auth({"count": 0})
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"SELECT COUNT(*) FROM {SCHEMA}.support_messages WHERE user_id=%s AND sender='admin' AND is_read_by_user=false",
            (user_id,))
        count = cur.fetchone()[0]
        conn.close()
        return ok_no_auth({"count": count})

    # ── Ниже — только для авторизованных ───────────────────────────────────
    # ── GET support_dialogs — список всех диалогов для админа ──────────────
    if method == "GET" and action == "support_dialogs":
        auth_result = check_auth(event)
        if auth_result: return auth_result
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT sm.user_id, u.name, u.email, u.role,
                       MAX(sm.created_at) as last_at,
                       SUM(CASE WHEN sm.sender='user' AND sm.is_read_by_admin=false THEN 1 ELSE 0 END) as unread,
                       (SELECT text FROM {SCHEMA}.support_messages
                        WHERE user_id=sm.user_id ORDER BY created_at DESC LIMIT 1) as last_msg
                FROM {SCHEMA}.support_messages sm
                LEFT JOIN {SCHEMA}.users u ON u.id=sm.user_id
                GROUP BY sm.user_id, u.name, u.email, u.role
                ORDER BY last_at DESC""")
        rows = cur.fetchall(); conn.close()
        return ok({"dialogs": [
            {"userId": str(r[0]), "userName": r[1] or "Неизвестный", "userEmail": r[2] or "",
             "userRole": r[3] or "", "lastAt": str(r[4]), "unread": int(r[5]), "lastMessage": r[6] or ""}
            for r in rows
        ]})

    # ── GET support_dialog — сообщения конкретного пользователя для админа ─
    if method == "GET" and action == "support_dialog":
        auth_result = check_auth(event)
        if auth_result: return auth_result
        user_id = params.get("user_id", "")
        if not user_id: return err("user_id required")
        conn = get_conn(); cur = conn.cursor()
        # Помечаем как прочитанные админом
        cur.execute(
            f"UPDATE {SCHEMA}.support_messages SET is_read_by_admin=true WHERE user_id=%s AND sender='user'",
            (user_id,))
        cur.execute(
            f"""SELECT id, sender, text, is_read_by_admin, is_read_by_user, created_at
                FROM {SCHEMA}.support_messages WHERE user_id=%s ORDER BY created_at ASC""",
            (user_id,))
        rows = cur.fetchall()
        conn.commit(); conn.close()
        return ok({"messages": [
            {"id": str(r[0]), "sender": r[1], "text": r[2],
             "isReadByAdmin": r[3], "isReadByUser": r[4], "createdAt": str(r[5])}
            for r in rows
        ]})

    return err("Not found", 404)
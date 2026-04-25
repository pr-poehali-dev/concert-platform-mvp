"""Финансовый учёт проектов GLOBAL LINK."""
import json
import urllib.request
from helpers import (
    get_conn, cors, serial, recalc_totals, row_to_project,
    SCHEMA, DEFAULT_EXPENSE_CATEGORIES
)

NOTIF_URL = "https://functions.poehali.dev/68f4b989-d93d-4a45-af4c-d54ad6815826"


def send_notification(user_id: str, notif_type: str, title: str, body: str, link_page: str = ""):
    try:
        payload = json.dumps({
            "userId": user_id, "type": notif_type,
            "title": title, "body": body, "linkPage": link_page,
        }).encode()
        req = urllib.request.Request(
            f"{NOTIF_URL}?action=create", data=payload,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=serial)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "list")

    # GET list
    if method == "GET" and action == "list":
        uid = params.get("user_id", "")
        if not uid: return err("user_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id,user_id,title,artist,project_type,status,date_start,date_end,
                       city,venue_name,description,tax_system,total_expenses_plan,
                       total_expenses_fact,total_income_plan,total_income_fact,created_at,updated_at
                FROM {SCHEMA}.projects WHERE user_id=%s ORDER BY created_at DESC""", (uid,))
        rows = cur.fetchall(); conn.close()
        return ok({"projects": [row_to_project(r) for r in rows]})

    # GET detail
    if method == "GET" and action == "detail":
        pid = params.get("project_id", "")
        if not pid: return err("project_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id,user_id,title,artist,project_type,status,date_start,date_end,
                       city,venue_name,description,tax_system,total_expenses_plan,
                       total_expenses_fact,total_income_plan,total_income_fact,created_at,updated_at
                FROM {SCHEMA}.projects WHERE id=%s""", (pid,))
        row = cur.fetchone()
        if not row: conn.close(); return err("Проект не найден", 404)
        project = row_to_project(row)
        cur.execute(
            f"SELECT id,category,title,amount_plan,amount_fact,note,sort_order FROM {SCHEMA}.project_expenses WHERE project_id=%s ORDER BY sort_order,created_at",
            (pid,))
        project["expenses"] = [{"id":str(r[0]),"category":r[1],"title":r[2],"amountPlan":float(r[3]),"amountFact":float(r[4]),"note":r[5],"sortOrder":r[6]} for r in cur.fetchall()]
        cur.execute(
            f"SELECT id,category,ticket_count,ticket_price,sold_count,note,sort_order FROM {SCHEMA}.project_income_lines WHERE project_id=%s ORDER BY sort_order,created_at",
            (pid,))
        project["incomeLines"] = [{"id":str(r[0]),"category":r[1],"ticketCount":r[2],"ticketPrice":float(r[3]),"soldCount":r[4],"note":r[5],"sortOrder":r[6],"totalPlan":r[2]*float(r[3]),"totalFact":r[4]*float(r[3])} for r in cur.fetchall()]
        conn.close()
        return ok({"project": project, "expenseCategories": DEFAULT_EXPENSE_CATEGORIES})

    # POST create
    if method == "POST" and action == "create":
        b = json.loads(event.get("body") or "{}")
        uid, title = b.get("userId",""), (b.get("title") or "").strip()
        if not uid: return err("userId required")
        if not title: return err("Введите название проекта")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.projects
                (user_id,title,artist,project_type,status,date_start,date_end,city,venue_name,description,tax_system)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (uid,title,b.get("artist",""),b.get("projectType","single"),b.get("status","planning"),
             b.get("dateStart") or None,b.get("dateEnd") or None,
             b.get("city",""),b.get("venueName",""),b.get("description",""),b.get("taxSystem","none")))
        pid = str(cur.fetchone()[0])
        def to_float(v, default=0.0):
            try: return float(v)
            except (TypeError, ValueError): return default
        def to_int(v, default=0):
            try: return int(v)
            except (TypeError, ValueError): return default
        for i,exp in enumerate(b.get("expenses") or []):
            cur.execute(
                f"INSERT INTO {SCHEMA}.project_expenses (project_id,category,title,amount_plan,amount_fact,note,sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (pid,exp.get("category","Прочее"),exp.get("title",""),to_float(exp.get("amountPlan")),to_float(exp.get("amountFact")),exp.get("note",""),i))
        for i,inc in enumerate(b.get("incomeLines") or []):
            cur.execute(
                f"INSERT INTO {SCHEMA}.project_income_lines (project_id,category,ticket_count,ticket_price,sold_count,note,sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (pid,inc.get("category","Стандарт"),to_int(inc.get("ticketCount")),to_float(inc.get("ticketPrice")),to_int(inc.get("soldCount")),inc.get("note",""),i))
        recalc_totals(cur, pid); conn.commit(); conn.close()
        return ok({"projectId": pid}, 201)

    # POST update
    if method == "POST" and action == "update":
        b = json.loads(event.get("body") or "{}")
        pid = b.get("projectId","")
        if not pid: return err("projectId required")
        key_map = {"title":"title","artist":"artist","projectType":"project_type","status":"status",
                   "dateStart":"date_start","dateEnd":"date_end","city":"city","venueName":"venue_name",
                   "description":"description","taxSystem":"tax_system"}
        fields = {col: (b[fk] or None if fk in ("dateStart","dateEnd") else b[fk]) for fk,col in key_map.items() if fk in b}
        if fields:
            set_clause = ", ".join(f"{c}=%s" for c in fields) + ", updated_at=NOW()"
            conn = get_conn(); cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.projects SET {set_clause} WHERE id=%s", list(fields.values())+[pid])
            conn.commit(); conn.close()
        return ok({"success": True})

    # POST delete
    if method == "POST" and action == "delete":
        b = json.loads(event.get("body") or "{}")
        pid = b.get("projectId","")
        if not pid: return err("projectId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.project_expenses WHERE project_id=%s",(pid,))
        cur.execute(f"DELETE FROM {SCHEMA}.project_income_lines WHERE project_id=%s",(pid,))
        cur.execute(f"DELETE FROM {SCHEMA}.projects WHERE id=%s",(pid,))
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST add_expense
    if method == "POST" and action == "add_expense":
        b = json.loads(event.get("body") or "{}")
        pid, title = b.get("projectId",""), (b.get("title") or "").strip()
        if not pid: return err("projectId required")
        if not title: return err("Введите название статьи")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"SELECT COALESCE(MAX(sort_order),0)+1 FROM {SCHEMA}.project_expenses WHERE project_id=%s",(pid,))
        order = cur.fetchone()[0]
        def _f(v):
            try: return float(v)
            except (TypeError, ValueError): return 0.0
        cur.execute(
            f"INSERT INTO {SCHEMA}.project_expenses (project_id,category,title,amount_plan,amount_fact,note,sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (pid,b.get("category","Прочее"),title,_f(b.get("amountPlan")),_f(b.get("amountFact")),b.get("note",""),order))
        eid = str(cur.fetchone()[0]); recalc_totals(cur, pid); conn.commit(); conn.close()
        return ok({"id": eid}, 201)

    # POST update_expense
    if method == "POST" and action == "update_expense":
        b = json.loads(event.get("body") or "{}")
        eid = b.get("id","")
        if not eid: return err("id required")
        fmap = {"category":"category","title":"title","amountPlan":"amount_plan","amountFact":"amount_fact","note":"note"}
        fields = {col: b[fk] for fk,col in fmap.items() if fk in b}
        if not fields: return err("Нет данных")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.project_expenses SET {', '.join(f'{c}=%s' for c in fields)} WHERE id=%s RETURNING project_id",
                    list(fields.values())+[eid])
        row = cur.fetchone()
        if row: recalc_totals(cur, str(row[0]))
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST delete_expense
    if method == "POST" and action == "delete_expense":
        b = json.loads(event.get("body") or "{}")
        eid = b.get("id","")
        if not eid: return err("id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.project_expenses WHERE id=%s RETURNING project_id",(eid,))
        row = cur.fetchone()
        if row: recalc_totals(cur, str(row[0]))
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST add_income
    if method == "POST" and action == "add_income":
        b = json.loads(event.get("body") or "{}")
        pid = b.get("projectId","")
        if not pid: return err("projectId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"SELECT COALESCE(MAX(sort_order),0)+1 FROM {SCHEMA}.project_income_lines WHERE project_id=%s",(pid,))
        order = cur.fetchone()[0]
        cur.execute(
            f"INSERT INTO {SCHEMA}.project_income_lines (project_id,category,ticket_count,ticket_price,sold_count,note,sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (pid,b.get("category","Стандарт"),int(b.get("ticketCount",0)),float(b.get("ticketPrice",0)),int(b.get("soldCount",0)),b.get("note",""),order))
        iid = str(cur.fetchone()[0]); recalc_totals(cur, pid); conn.commit(); conn.close()
        return ok({"id": iid}, 201)

    # POST update_income
    if method == "POST" and action == "update_income":
        b = json.loads(event.get("body") or "{}")
        iid = b.get("id","")
        if not iid: return err("id required")
        fmap = {"category":"category","ticketCount":"ticket_count","ticketPrice":"ticket_price","soldCount":"sold_count","note":"note"}
        fields = {col: b[fk] for fk,col in fmap.items() if fk in b}
        if not fields: return err("Нет данных")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.project_income_lines SET {', '.join(f'{c}=%s' for c in fields)} WHERE id=%s RETURNING project_id",
                    list(fields.values())+[iid])
        row = cur.fetchone()
        if row: recalc_totals(cur, str(row[0]))
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST delete_income
    if method == "POST" and action == "delete_income":
        b = json.loads(event.get("body") or "{}")
        iid = b.get("id","")
        if not iid: return err("id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.project_income_lines WHERE id=%s RETURNING project_id",(iid,))
        row = cur.fetchone()
        if row: recalc_totals(cur, str(row[0]))
        conn.commit(); conn.close()
        return ok({"success": True})

    # GET venues_list — список площадок для выбора в проекте
    if method == "GET" and action == "venues_list":
        city = params.get("city", "")
        conn = get_conn(); cur = conn.cursor()
        q = f"SELECT id, user_id, name, city, venue_type, capacity, price_from, photo_url FROM {SCHEMA}.venues WHERE 1=1"
        args = []
        if city:
            q += " AND city=%s"; args.append(city)
        q += " ORDER BY name"
        cur.execute(q, args)
        rows = cur.fetchall(); conn.close()
        return ok({"venues": [
            {"id": str(r[0]), "userId": str(r[1]), "name": r[2], "city": r[3],
             "venueType": r[4], "capacity": r[5], "priceFrom": r[6], "photoUrl": r[7]}
            for r in rows
        ]})

    # GET booked_dates — занятые даты площадки
    if method == "GET" and action == "booked_dates":
        vid = params.get("venue_id", "")
        if not vid: return err("venue_id required")
        conn = get_conn(); cur = conn.cursor()
        # Из venue_busy_dates
        cur.execute(f"SELECT busy_date, note FROM {SCHEMA}.venue_busy_dates WHERE venue_id=%s", (vid,))
        busy = [{"date": str(r[0]), "note": r[1], "source": "manual"} for r in cur.fetchall()]
        # Из подтверждённых бронирований
        cur.execute(f"SELECT event_date, artist FROM {SCHEMA}.venue_bookings WHERE venue_id=%s AND status='confirmed'", (vid,))
        for r in cur.fetchall():
            busy.append({"date": str(r[0]), "note": r[1] or "Забронировано", "source": "booking"})
        conn.close()
        return ok({"bookedDates": busy})

    # POST request_booking — запрос на бронирование площадки
    if method == "POST" and action == "request_booking":
        b = json.loads(event.get("body") or "{}")
        project_id  = b.get("projectId", "")
        venue_id    = b.get("venueId", "")
        organizer_id = b.get("organizerId", "")
        venue_user_id = b.get("venueUserId", "")
        event_date  = b.get("eventDate", "")
        event_time  = b.get("eventTime", "")
        artist      = b.get("artist", "")
        age_limit   = b.get("ageLimit", "")
        expected_guests = int(b.get("expectedGuests", 0))
        if not all([project_id, venue_id, organizer_id, venue_user_id, event_date]):
            return err("Не заполнены обязательные поля")
        conn = get_conn(); cur = conn.cursor()
        # Проверяем, не занята ли дата
        cur.execute(f"SELECT id FROM {SCHEMA}.venue_busy_dates WHERE venue_id=%s AND busy_date=%s", (venue_id, event_date))
        if cur.fetchone():
            conn.close(); return err("Эта дата уже занята на площадке")
        cur.execute(f"SELECT id FROM {SCHEMA}.venue_bookings WHERE venue_id=%s AND event_date=%s AND status IN ('pending','confirmed')", (venue_id, event_date))
        if cur.fetchone():
            conn.close(); return err("На эту дату уже есть запрос бронирования")
        cur.execute(
            f"""INSERT INTO {SCHEMA}.venue_bookings
                (project_id,venue_id,organizer_id,venue_user_id,event_date,event_time,artist,age_limit,expected_guests,status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'pending') RETURNING id""",
            (project_id, venue_id, organizer_id, venue_user_id, event_date, event_time, artist, age_limit, expected_guests))
        booking_id = str(cur.fetchone()[0])
        # Получаем название площадки и имя организатора
        cur.execute(f"SELECT name FROM {SCHEMA}.venues WHERE id=%s", (venue_id,))
        vrow = cur.fetchone(); venue_name = vrow[0] if vrow else "Площадка"
        cur.execute(f"SELECT name FROM {SCHEMA}.users WHERE id=%s", (organizer_id,))
        orow = cur.fetchone(); org_name = orow[0] if orow else "Организатор"
        conn.commit(); conn.close()
        # Уведомление площадке
        body_text = (f"Дата: {event_date}" + (f" {event_time}" if event_time else "") +
                     (f" | Артист: {artist}" if artist else "") +
                     (f" | Возраст: {age_limit}+" if age_limit else "") +
                     (f" | Гостей: {expected_guests}" if expected_guests else "") +
                     f" | Организатор: {org_name}")
        send_notification(venue_user_id, "booking",
                          f"Запрос на бронирование от {org_name}", body_text, "notifications")
        return ok({"bookingId": booking_id}, 201)

    # POST venue_respond — площадка отвечает на запрос
    if method == "POST" and action == "venue_respond":
        b = json.loads(event.get("body") or "{}")
        booking_id     = b.get("bookingId", "")
        response       = b.get("response", "")  # "confirmed" / "rejected"
        rental_amount  = b.get("rentalAmount")
        venue_conditions = b.get("venueConditions", "")
        if not booking_id or response not in ("confirmed", "rejected"):
            return err("Некорректные данные")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""UPDATE {SCHEMA}.venue_bookings
                SET status=%s, rental_amount=%s, venue_conditions=%s, updated_at=NOW()
                WHERE id=%s
                RETURNING organizer_id, venue_id, event_date, artist""",
            (response, rental_amount, venue_conditions, booking_id))
        row = cur.fetchone()
        if not row: conn.close(); return err("Бронирование не найдено", 404)
        organizer_id, vid, edate, artist = str(row[0]), str(row[1]), str(row[2]), row[3]
        cur.execute(f"SELECT name FROM {SCHEMA}.venues WHERE id=%s", (vid,))
        vrow = cur.fetchone(); venue_name = vrow[0] if vrow else "Площадка"
        conn.commit(); conn.close()
        if response == "confirmed":
            rent_str = f" | Аренда: {int(rental_amount):,} ₽".replace(",", " ") if rental_amount else ""
            cond_str = f" | Условия: {venue_conditions}" if venue_conditions else ""
            send_notification(organizer_id, "booking",
                              f"Площадка «{venue_name}» подтвердила бронирование",
                              f"Дата: {edate}" + rent_str + cond_str, "notifications")
        else:
            send_notification(organizer_id, "booking",
                              f"Площадка «{venue_name}» отклонила запрос",
                              f"Дата: {edate}" + (f" | {venue_conditions}" if venue_conditions else ""), "notifications")
        return ok({"success": True})

    # POST organizer_respond — организатор принимает/отклоняет условия
    if method == "POST" and action == "organizer_respond":
        b = json.loads(event.get("body") or "{}")
        booking_id = b.get("bookingId", "")
        response   = b.get("response", "")  # "accepted" / "cancelled"
        if not booking_id or response not in ("accepted", "cancelled"):
            return err("Некорректные данные")
        conn = get_conn(); cur = conn.cursor()
        new_status = "accepted" if response == "accepted" else "cancelled"
        cur.execute(
            f"UPDATE {SCHEMA}.venue_bookings SET status=%s, organizer_response=%s, updated_at=NOW() WHERE id=%s RETURNING venue_user_id, venue_id, event_date",
            (new_status, response, booking_id))
        row = cur.fetchone()
        if not row: conn.close(); return err("Не найдено", 404)
        venue_user_id, vid, edate = str(row[0]), str(row[1]), str(row[2])
        cur.execute(f"SELECT name FROM {SCHEMA}.venues WHERE id=%s", (vid,))
        vrow = cur.fetchone(); venue_name = vrow[0] if vrow else "Площадка"
        conn.commit(); conn.close()
        if response == "accepted":
            send_notification(venue_user_id, "booking",
                              "Организатор принял условия бронирования",
                              f"Дата {edate} — бронирование подтверждено с обеих сторон", "notifications")
        else:
            send_notification(venue_user_id, "booking",
                              "Организатор отменил бронирование",
                              f"Запрос на дату {edate} отменён", "notifications")
        return ok({"success": True})

    # GET booking_by_project — бронирования по проекту
    if method == "GET" and action == "booking_by_project":
        pid = params.get("project_id", "")
        if not pid: return err("project_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT b.id, b.venue_id, v.name, b.event_date, b.event_time,
                       b.artist, b.age_limit, b.expected_guests, b.status,
                       b.rental_amount, b.venue_conditions, b.organizer_response
                FROM {SCHEMA}.venue_bookings b
                JOIN {SCHEMA}.venues v ON v.id=b.venue_id
                WHERE b.project_id=%s ORDER BY b.created_at DESC""", (pid,))
        rows = cur.fetchall(); conn.close()
        return ok({"bookings": [
            {"id": str(r[0]), "venueId": str(r[1]), "venueName": r[2],
             "eventDate": str(r[3]), "eventTime": r[4], "artist": r[5],
             "ageLimit": r[6], "expectedGuests": r[7], "status": r[8],
             "rentalAmount": float(r[9]) if r[9] else None,
             "venueConditions": r[10], "organizerResponse": r[11]}
            for r in rows
        ]})

    # GET bookings_for_organizer — бронирования организатора (все проекты)
    if method == "GET" and action == "bookings_for_organizer":
        organizer_id = params.get("organizer_id", "")
        if not organizer_id: return err("organizer_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT b.id, b.venue_id, v.name, b.project_id, p.title,
                       b.event_date, b.event_time, b.artist, b.age_limit,
                       b.expected_guests, b.status, b.rental_amount, b.venue_conditions,
                       b.organizer_id, '' as org_name
                FROM {SCHEMA}.venue_bookings b
                JOIN {SCHEMA}.venues v ON v.id=b.venue_id
                JOIN {SCHEMA}.projects p ON p.id=b.project_id
                WHERE b.organizer_id=%s ORDER BY b.created_at DESC""", (organizer_id,))
        rows = cur.fetchall(); conn.close()
        return ok({"bookings": [
            {"id": str(r[0]), "venueId": str(r[1]), "venueName": r[2],
             "projectId": str(r[3]), "projectTitle": r[4],
             "eventDate": str(r[5]), "eventTime": r[6], "artist": r[7],
             "ageLimit": r[8], "expectedGuests": r[9], "status": r[10],
             "rentalAmount": float(r[11]) if r[11] else None,
             "venueConditions": r[12], "organizerId": str(r[13])}
            for r in rows
        ]})

    # GET bookings_for_venue — входящие запросы для площадки
    if method == "GET" and action == "bookings_for_venue":
        venue_user_id = params.get("venue_user_id", "")
        if not venue_user_id: return err("venue_user_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT b.id, b.venue_id, v.name, b.project_id, p.title,
                       b.event_date, b.event_time, b.artist, b.age_limit,
                       b.expected_guests, b.status, b.rental_amount, b.venue_conditions,
                       b.organizer_id, u.name
                FROM {SCHEMA}.venue_bookings b
                JOIN {SCHEMA}.venues v ON v.id=b.venue_id
                JOIN {SCHEMA}.projects p ON p.id=b.project_id
                JOIN {SCHEMA}.users u ON u.id=b.organizer_id
                WHERE b.venue_user_id=%s ORDER BY b.created_at DESC""", (venue_user_id,))
        rows = cur.fetchall(); conn.close()
        return ok({"bookings": [
            {"id": str(r[0]), "venueId": str(r[1]), "venueName": r[2],
             "projectId": str(r[3]), "projectTitle": r[4],
             "eventDate": str(r[5]), "eventTime": r[6], "artist": r[7],
             "ageLimit": r[8], "expectedGuests": r[9], "status": r[10],
             "rentalAmount": float(r[11]) if r[11] else None,
             "venueConditions": r[12], "organizerId": str(r[13]), "organizerName": r[14]}
            for r in rows
        ]})

    return err("Not found", 404)
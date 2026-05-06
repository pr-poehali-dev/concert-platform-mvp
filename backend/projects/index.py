"""Финансовый учёт проектов GLOBAL LINK."""
import json
import os
import uuid
import urllib.request
from helpers import (
    get_conn, cors, serial, recalc_totals, row_to_project, calc_finance,
    SCHEMA, DEFAULT_EXPENSE_CATEGORIES
)
from booking_emails import confirm_email, reject_email

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
        conn = get_conn()
        try:
            cur = conn.cursor()
            # Свои проекты
            cur.execute(
                f"""SELECT id,user_id,title,artist,project_type,status,date_start,date_end,
                           city,venue_name,description,tax_system,total_expenses_plan,
                           total_expenses_fact,total_income_plan,total_income_fact,created_at,updated_at,
                           group_id
                    FROM {SCHEMA}.projects WHERE user_id=%s ORDER BY created_at DESC""", (uid,))
            own_rows = cur.fetchall()
            own_ids = {str(r[0]) for r in own_rows}

            # Проекты где пользователь — партнёр (включаем group_id чтобы группировать)
            cur.execute(
                f"""SELECT p.id,p.user_id,p.title,p.artist,p.project_type,p.status,p.date_start,p.date_end,
                           p.city,p.venue_name,p.description,p.tax_system,p.total_expenses_plan,
                           p.total_expenses_fact,p.total_income_plan,p.total_income_fact,p.created_at,p.updated_at,
                           p.group_id
                    FROM {SCHEMA}.projects p
                    JOIN {SCHEMA}.project_members pm ON pm.project_id = p.id
                    WHERE pm.user_id=%s AND pm.role != 'removed'
                    ORDER BY p.created_at DESC""", (uid,))
            partner_rows = cur.fetchall()

            cur.execute(
                f"""SELECT DISTINCT project_id FROM {SCHEMA}.project_tasks
                    WHERE status NOT IN ('done') AND due_date IS NOT NULL AND due_date < CURRENT_DATE
                      AND project_id IN (SELECT id FROM {SCHEMA}.projects WHERE user_id=%s)""", (uid,))
            overdue_ids = {str(r[0]) for r in cur.fetchall()}

            # Имена владельцев партнёрских проектов
            partner_owner_ids = [str(r[1]) for r in partner_rows if str(r[0]) not in own_ids]
            owner_names = {}
            if partner_owner_ids:
                placeholders = ",".join(["%s"] * len(partner_owner_ids))
                cur.execute(f"SELECT id, name FROM {SCHEMA}.users WHERE id IN ({placeholders})", partner_owner_ids)
                for row in cur.fetchall():
                    owner_names[str(row[0])] = row[1]
        finally:
            conn.close()
        projects = []
        for r in own_rows:
            p = row_to_project(r)
            p["hasOverdueTasks"] = p["id"] in overdue_ids
            p["isPartner"] = False
            p["ownerName"] = None
            p["groupId"] = str(r[18]) if len(r) > 18 and r[18] else None
            projects.append(p)
        for r in partner_rows:
            if str(r[0]) in own_ids:
                continue
            p = row_to_project(r)
            p["hasOverdueTasks"] = False
            p["isPartner"] = True
            p["ownerName"] = owner_names.get(str(r[1]), "")
            p["groupId"] = str(r[18]) if len(r) > 18 and r[18] else None
            projects.append(p)
        return ok({"projects": projects})

    # GET detail
    if method == "GET" and action == "detail":
        pid = params.get("project_id", "")
        if not pid: return err("project_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
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
        finally:
            conn.close()
        return ok({"project": project, "expenseCategories": DEFAULT_EXPENSE_CATEGORIES})

    # POST create
    if method == "POST" and action == "create":
        b = json.loads(event.get("body") or "{}")
        uid, title = b.get("userId",""), (b.get("title") or "").strip()
        if not uid: return err("userId required")
        if not title: return err("Введите название проекта")
        conn = get_conn()
        try:
            cur = conn.cursor()
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
            recalc_totals(cur, pid); conn.commit()
        finally:
            conn.close()
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
            conn = get_conn()
            try:
                cur = conn.cursor()
                cur.execute(f"UPDATE {SCHEMA}.projects SET {set_clause} WHERE id=%s", list(fields.values())+[pid])
                conn.commit()
            finally:
                conn.close()
        return ok({"success": True})

    # POST delete
    if method == "POST" and action == "delete":
        b = json.loads(event.get("body") or "{}")
        pid = b.get("projectId","")
        if not pid: return err("projectId required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {SCHEMA}.project_expenses WHERE project_id=%s",(pid,))
            cur.execute(f"DELETE FROM {SCHEMA}.project_income_lines WHERE project_id=%s",(pid,))
            cur.execute(f"DELETE FROM {SCHEMA}.projects WHERE id=%s",(pid,))
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    # POST add_expense
    if method == "POST" and action == "add_expense":
        b = json.loads(event.get("body") or "{}")
        pid, title = b.get("projectId",""), (b.get("title") or "").strip()
        if not pid: return err("projectId required")
        if not title: return err("Введите название статьи")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"SELECT COALESCE(MAX(sort_order),0)+1 FROM {SCHEMA}.project_expenses WHERE project_id=%s",(pid,))
            order = cur.fetchone()[0]
            def _f(v):
                try: return float(v)
                except (TypeError, ValueError): return 0.0
            cur.execute(
                f"INSERT INTO {SCHEMA}.project_expenses (project_id,category,title,amount_plan,amount_fact,note,sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (pid,b.get("category","Прочее"),title,_f(b.get("amountPlan")),_f(b.get("amountFact")),b.get("note",""),order))
            eid = str(cur.fetchone()[0]); recalc_totals(cur, pid); conn.commit()
        finally:
            conn.close()
        return ok({"id": eid}, 201)

    # POST update_expense
    if method == "POST" and action == "update_expense":
        b = json.loads(event.get("body") or "{}")
        eid = b.get("id","")
        if not eid: return err("id required")
        fmap = {"category":"category","title":"title","amountPlan":"amount_plan","amountFact":"amount_fact","note":"note"}
        fields = {col: b[fk] for fk,col in fmap.items() if fk in b}
        if not fields: return err("Нет данных")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.project_expenses SET {', '.join(f'{c}=%s' for c in fields)} WHERE id=%s RETURNING project_id",
                        list(fields.values())+[eid])
            row = cur.fetchone()
            if row: recalc_totals(cur, str(row[0]))
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    # POST delete_expense
    if method == "POST" and action == "delete_expense":
        b = json.loads(event.get("body") or "{}")
        eid = b.get("id","")
        if not eid: return err("id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {SCHEMA}.project_expenses WHERE id=%s RETURNING project_id",(eid,))
            row = cur.fetchone()
            if row: recalc_totals(cur, str(row[0]))
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    # POST add_income
    if method == "POST" and action == "add_income":
        b = json.loads(event.get("body") or "{}")
        pid = b.get("projectId","")
        if not pid: return err("projectId required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"SELECT COALESCE(MAX(sort_order),0)+1 FROM {SCHEMA}.project_income_lines WHERE project_id=%s",(pid,))
            order = cur.fetchone()[0]
            cur.execute(
                f"INSERT INTO {SCHEMA}.project_income_lines (project_id,category,ticket_count,ticket_price,sold_count,note,sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (pid,b.get("category","Стандарт"),int(b.get("ticketCount",0)),float(b.get("ticketPrice",0)),int(b.get("soldCount",0)),b.get("note",""),order))
            iid = str(cur.fetchone()[0]); recalc_totals(cur, pid); conn.commit()
        finally:
            conn.close()
        return ok({"id": iid}, 201)

    # POST update_income
    if method == "POST" and action == "update_income":
        b = json.loads(event.get("body") or "{}")
        iid = b.get("id","")
        if not iid: return err("id required")
        fmap = {"category":"category","ticketCount":"ticket_count","ticketPrice":"ticket_price","soldCount":"sold_count","note":"note"}
        fields = {col: b[fk] for fk,col in fmap.items() if fk in b}
        if not fields: return err("Нет данных")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.project_income_lines SET {', '.join(f'{c}=%s' for c in fields)} WHERE id=%s RETURNING project_id",
                        list(fields.values())+[iid])
            row = cur.fetchone()
            if row: recalc_totals(cur, str(row[0]))
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    # POST delete_income
    if method == "POST" and action == "delete_income":
        b = json.loads(event.get("body") or "{}")
        iid = b.get("id","")
        if not iid: return err("id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {SCHEMA}.project_income_lines WHERE id=%s RETURNING project_id",(iid,))
            row = cur.fetchone()
            if row: recalc_totals(cur, str(row[0]))
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    # GET booking_checklist — чеклист площадки по бронированию
    if method == "GET" and action == "booking_checklist":
        booking_id   = params.get("booking_id", "")
        venue_id     = params.get("venue_id", "")      # venue_user_id площадки
        if not booking_id and not venue_id: return err("booking_id или venue_id required")
        conn = get_conn(); cur = conn.cursor()
        if booking_id:
            cur.execute(
                f"SELECT id,booking_id,venue_id,step_key,step_title,is_done,note,sort_order FROM {SCHEMA}.booking_checklist WHERE booking_id=%s ORDER BY sort_order",
                (booking_id,))
        else:
            # venue_id — это venue_user_id (ID пользователя-площадки), ищем через venue_bookings
            cur.execute(
                f"""SELECT c.id, c.booking_id, c.venue_id, c.step_key, c.step_title, c.is_done, c.note, c.sort_order,
                           b.event_date, b.project_id, COALESCE(p.title, b.artist, 'Мероприятие'),
                           b.rental_amount, b.venue_conditions,
                           b.organizer_id, COALESCE(u.name, 'Организатор'),
                           b.event_time, b.artist, b.status, b.conversation_id
                    FROM {SCHEMA}.booking_checklist c
                    JOIN {SCHEMA}.venue_bookings b ON b.id = c.booking_id
                    LEFT JOIN {SCHEMA}.projects p ON p.id = b.project_id
                    LEFT JOIN {SCHEMA}.users u ON u.id = b.organizer_id
                    WHERE b.venue_user_id = %s
                    ORDER BY b.event_date ASC, c.sort_order ASC""",
                (venue_id,))
        rows = cur.fetchall(); conn.close()
        if venue_id:
            # Группируем по booking_id
            bookings_map = {}
            for r in rows:
                bid = str(r[1])
                if bid not in bookings_map:
                    bookings_map[bid] = {
                        "bookingId": bid,
                        "eventDate": str(r[8]),
                        "projectId": str(r[9]),
                        "projectTitle": r[10],
                        "rentalAmount": float(r[11]) if r[11] else None,
                        "venueConditions": r[12] or "",
                        "organizerId": str(r[13]),
                        "organizerName": r[14],
                        "eventTime": r[15] or "",
                        "artist": r[16] or "",
                        "status": r[17],
                        "conversationId": str(r[18]) if r[18] else "",
                        "checklist": [],
                    }
                bookings_map[bid]["checklist"].append({
                    "id": str(r[0]), "stepKey": r[3], "stepTitle": r[4],
                    "isDone": r[5], "note": r[6], "sortOrder": r[7]
                })
            return ok({"bookings": list(bookings_map.values())})
        return ok({"checklist": [
            {"id": str(r[0]), "bookingId": str(r[1]), "venueId": str(r[2]),
             "stepKey": r[3], "stepTitle": r[4], "isDone": r[5], "note": r[6], "sortOrder": r[7]}
            for r in rows
        ]})

    # POST update_checklist — отметить шаг чеклиста
    if method == "POST" and action == "update_checklist":
        b = json.loads(event.get("body") or "{}")
        item_id = b.get("itemId", "")
        is_done = b.get("isDone", False)
        note    = b.get("note", "")
        if not item_id: return err("itemId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.booking_checklist SET is_done=%s, note=%s, updated_at=NOW() WHERE id=%s",
            (is_done, note, item_id))
        conn.commit(); conn.close()
        return ok({"success": True})

    # GET booking_detail — полное бронирование с задачами и чеклистом
    if method == "GET" and action == "booking_detail":
        booking_id = params.get("booking_id", "")
        if not booking_id: return err("booking_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT b.id, b.venue_id, v.name, b.project_id, COALESCE(p.title, b.artist, 'Мероприятие'),
                       b.event_date, b.event_time, b.artist, b.age_limit,
                       b.expected_guests, b.status, b.rental_amount, b.venue_conditions,
                       b.organizer_id, b.venue_user_id, b.conversation_id,
                       COALESCE(u.name, 'Организатор')
                FROM {SCHEMA}.venue_bookings b
                JOIN {SCHEMA}.venues v ON v.id=b.venue_id
                LEFT JOIN {SCHEMA}.projects p ON p.id=b.project_id
                LEFT JOIN {SCHEMA}.users u ON u.id=b.organizer_id
                WHERE b.id=%s""", (booking_id,))
        row = cur.fetchone()
        if not row: conn.close(); return err("Не найдено", 404)
        booking = {
            "id": str(row[0]), "venueId": str(row[1]), "venueName": row[2],
            "projectId": str(row[3]), "projectTitle": row[4],
            "eventDate": str(row[5]), "eventTime": row[6] or "", "artist": row[7] or "",
            "ageLimit": row[8] or "", "expectedGuests": row[9], "status": row[10],
            "rentalAmount": float(row[11]) if row[11] else None,
            "venueConditions": row[12] or "", "organizerId": str(row[13]),
            "venueUserId": str(row[14]),
            "conversationId": str(row[15]) if row[15] else "",
            "organizerName": row[16],
        }
        cur.execute(
            f"SELECT id,title,description,status,sort_order FROM {SCHEMA}.booking_tasks WHERE booking_id=%s ORDER BY sort_order",
            (booking_id,))
        booking["tasks"] = [
            {"id": str(r[0]), "title": r[1], "description": r[2], "status": r[3], "sortOrder": r[4]}
            for r in cur.fetchall()
        ]
        conn.close()
        return ok({"booking": booking})

    # POST create_missing_chat — создать чат для бронирования если его нет
    if method == "POST" and action == "create_missing_chat":
        b = json.loads(event.get("body") or "{}")
        booking_id = b.get("bookingId", "")
        if not booking_id: return err("bookingId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT b.organizer_id, b.venue_id, b.venue_user_id, b.event_date, b.event_time,
                       b.artist, b.rental_amount, b.venue_conditions, b.conversation_id,
                       v.name, b.project_id
                FROM {SCHEMA}.venue_bookings b
                JOIN {SCHEMA}.venues v ON v.id = b.venue_id
                WHERE b.id=%s AND b.status IN ('confirmed','accepted')""", (booking_id,))
        row = cur.fetchone()
        if not row: conn.close(); return err("Не найдено", 404)
        organizer_id, vid, venue_user_id = str(row[0]), str(row[1]), str(row[2])
        edate, event_time, artist = str(row[3]), row[4] or "", row[5] or ""
        rental_amount, venue_conditions = row[6], row[7] or ""
        existing_conv = row[8]
        venue_name = row[9]
        conn.close()

        if existing_conv:
            return ok({"conversationId": str(existing_conv)})

        rent_str = f"{int(rental_amount):,} ₽".replace(",", " ") if rental_amount else "не указана"
        chat_text = (
            f"Бронирование подтверждено!\n\n"
            f"Площадка: {venue_name}\n"
            f"Дата: {edate}" + (f" {event_time}" if event_time else "") + "\n"
            + (f"Артист: {artist}\n" if artist else "")
            + f"Аренда: {rent_str}\n"
            + (f"Условия: {venue_conditions}\n" if venue_conditions else "")
            + "\nПо всем вопросам пишите в этот чат."
        )
        conversation_id = start_chat(organizer_id, vid, venue_user_id, venue_name, chat_text, "Система")
        if conversation_id:
            conn2 = get_conn(); cur2 = conn2.cursor()
            cur2.execute(
                f"UPDATE {SCHEMA}.venue_bookings SET conversation_id=%s WHERE id=%s",
                (conversation_id, booking_id))
            conn2.commit(); conn2.close()
        return ok({"conversationId": conversation_id})

    # POST upload_booking_file — загрузить документ к бронированию
    if method == "POST" and action == "upload_booking_file":
        b = json.loads(event.get("body") or "{}")
        booking_id  = b.get("bookingId", "")
        uploaded_by = b.get("uploadedBy", "")
        step_key    = b.get("stepKey", "")
        file_name   = b.get("fileName", "file")
        file_data   = b.get("fileData", "")   # base64
        mime_type   = b.get("mimeType", "application/octet-stream")
        if not booking_id or not uploaded_by or not file_data:
            return err("bookingId, uploadedBy, fileData обязательны")
        raw = base64.b64decode(file_data)
        file_size = len(raw)
        ext = file_name.rsplit(".", 1)[-1] if "." in file_name else "bin"
        key = f"booking-docs/{booking_id}/{uuid.uuid4()}.{ext}"
        s3 = get_s3()
        s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=mime_type)
        url = cdn_url(key)
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.booking_files (booking_id, uploaded_by, step_key, file_name, file_url, file_size, mime_type) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (booking_id, uploaded_by, step_key, file_name, url, file_size, mime_type))
        file_id = str(cur.fetchone()[0])
        conn.commit(); conn.close()
        return ok({"id": file_id, "fileUrl": url, "fileName": file_name}, 201)

    # GET booking_files — список документов бронирования
    if method == "GET" and action == "booking_files":
        booking_id = params.get("booking_id", "")
        if not booking_id: return err("booking_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT f.id, f.step_key, f.file_name, f.file_url, f.file_size, f.mime_type, f.created_at,
                       COALESCE(u.name, 'Пользователь')
                FROM {SCHEMA}.booking_files f
                LEFT JOIN {SCHEMA}.users u ON u.id = f.uploaded_by
                WHERE f.booking_id = %s ORDER BY f.created_at DESC""",
            (booking_id,))
        rows = cur.fetchall(); conn.close()
        return ok({"files": [
            {"id": str(r[0]), "stepKey": r[1], "fileName": r[2], "fileUrl": r[3],
             "fileSize": r[4], "mimeType": r[5], "createdAt": str(r[6]), "uploadedBy": r[7]}
            for r in rows
        ]})

    # POST delete_booking_file — удалить документ
    if method == "POST" and action == "delete_booking_file":
        b = json.loads(event.get("body") or "{}")
        file_id = b.get("fileId", "")
        if not file_id: return err("fileId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.booking_files WHERE id=%s", (file_id,))
        conn.commit(); conn.close()
        return ok({"success": True})

    # ── CRM Задачи проекта ────────────────────────────────────────────────

    # GET project_tasks_list — задачи проекта (для владельца) или только своей задачи (для сотрудника)
    if method == "GET" and action == "project_tasks_list":
        project_id     = params.get("project_id", "")
        company_uid    = params.get("company_user_id", "")   # для владельца
        employee_id    = params.get("employee_id", "")       # для сотрудника
        if not project_id: return err("project_id required")
        conn = get_conn(); cur = conn.cursor()
        if employee_id:
            # Сотрудник видит только свои задачи
            cur.execute(
                f"""SELECT t.id, t.project_id, t.company_user_id, t.assigned_to,
                           t.created_by, t.title, t.description, t.status, t.priority,
                           t.due_date, t.sort_order, t.created_at,
                           COALESCE(e.name, u.name, 'Не назначено') as assignee_name,
                           COALESCE(e2.name, u2.name, 'Неизвестно') as creator_name
                    FROM {SCHEMA}.project_tasks t
                    LEFT JOIN {SCHEMA}.employees e ON e.id = t.assigned_to
                    LEFT JOIN {SCHEMA}.users u ON u.id = t.assigned_to
                    LEFT JOIN {SCHEMA}.employees e2 ON e2.id = t.created_by
                    LEFT JOIN {SCHEMA}.users u2 ON u2.id = t.created_by
                    WHERE t.project_id=%s AND t.assigned_to=%s
                    ORDER BY t.priority DESC, t.due_date ASC NULLS LAST, t.sort_order""",
                (project_id, employee_id))
        else:
            # Владелец видит все задачи
            cur.execute(
                f"""SELECT t.id, t.project_id, t.company_user_id, t.assigned_to,
                           t.created_by, t.title, t.description, t.status, t.priority,
                           t.due_date, t.sort_order, t.created_at,
                           COALESCE(e.name, u.name, 'Не назначено') as assignee_name,
                           COALESCE(e2.name, u2.name, 'Неизвестно') as creator_name
                    FROM {SCHEMA}.project_tasks t
                    LEFT JOIN {SCHEMA}.employees e ON e.id = t.assigned_to
                    LEFT JOIN {SCHEMA}.users u ON u.id = t.assigned_to
                    LEFT JOIN {SCHEMA}.employees e2 ON e2.id = t.created_by
                    LEFT JOIN {SCHEMA}.users u2 ON u2.id = t.created_by
                    WHERE t.project_id=%s
                    ORDER BY t.priority DESC, t.due_date ASC NULLS LAST, t.sort_order""",
                (project_id,))
        rows = cur.fetchall(); conn.close()
        def task_row(r):
            return {
                "id": str(r[0]), "projectId": str(r[1]), "companyUserId": str(r[2]),
                "assignedTo": str(r[3]) if r[3] else None,
                "createdBy": str(r[4]), "title": r[5], "description": r[6],
                "status": r[7], "priority": r[8],
                "dueDate": str(r[9]) if r[9] else None,
                "sortOrder": r[10], "createdAt": str(r[11]),
                "assigneeName": r[12], "creatorName": r[13],
            }
        return ok({"tasks": [task_row(r) for r in rows]})

    # POST project_task_create — создать задачу
    if method == "POST" and action == "project_task_create":
        b = json.loads(event.get("body") or "{}")
        project_id   = b.get("projectId", "")
        company_uid  = b.get("companyUserId", "")
        created_by   = b.get("createdBy", "")
        title        = (b.get("title") or "").strip()
        description  = b.get("description", "")
        assigned_to  = b.get("assignedTo") or None
        priority     = b.get("priority", "medium")
        due_date     = b.get("dueDate") or None
        if not project_id or not company_uid or not created_by or not title:
            return err("projectId, companyUserId, createdBy, title обязательны")
        if priority not in ("low", "medium", "high", "urgent"):
            priority = "medium"
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"SELECT COALESCE(MAX(sort_order),0)+1 FROM {SCHEMA}.project_tasks WHERE project_id=%s",
            (project_id,))
        order = cur.fetchone()[0]
        cur.execute(
            f"""INSERT INTO {SCHEMA}.project_tasks
                (project_id, company_user_id, assigned_to, created_by, title, description,
                 priority, due_date, sort_order)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (project_id, company_uid, assigned_to, created_by, title, description,
             priority, due_date, order))
        task_id = str(cur.fetchone()[0])
        conn.commit(); conn.close()
        # Отправить DM и уведомление сотруднику если назначен
        if assigned_to:
            conn2 = get_conn(); cur2 = conn2.cursor()
            cur2.execute(f"SELECT name, avatar, avatar_color FROM {SCHEMA}.employees WHERE id=%s", (assigned_to,))
            emp = cur2.fetchone()
            # Имя и аватар владельца
            cur2.execute(f"SELECT name, avatar, avatar_color FROM {SCHEMA}.users WHERE id=%s", (company_uid,))
            owner = cur2.fetchone()
            conn2.close()
            if emp:
                PRIORITY_LABELS = {"low": "Низкий", "medium": "Средний", "high": "Высокий", "urgent": "Срочно!"}
                due_str = f"\n📅 Срок: {due_date}" if due_date else ""
                desc_str = f"\n📝 {description}" if description else ""
                dm_text = (
                    f"📋 Тебе назначена новая задача:\n\n"
                    f"*{title}*{desc_str}\n\n"
                    f"⚡ Приоритет: {PRIORITY_LABELS.get(priority, priority)}{due_str}\n\n"
                    f"Пожалуйста, возьми задачу в работу."
                )
                # Отправляем DM через employees функцию
                EMPLOYEES_URL = "https://functions.poehali.dev/cc27106d-e3a4-4d7a-b6c2-47eb9365104e"
                owner_name = owner[0] if owner else "Руководитель"
                owner_avatar = owner[1] if owner else ""
                owner_color = owner[2] if owner else "from-neon-purple to-neon-cyan"
                dm_payload = json.dumps({
                    "companyUserId": company_uid,
                    "senderId": company_uid,
                    "senderType": "user",
                    "recipientId": assigned_to,
                    "text": dm_text,
                }).encode()
                try:
                    req = urllib.request.Request(
                        f"{EMPLOYEES_URL}?action=dm_send",
                        data=dm_payload,
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    urllib.request.urlopen(req, timeout=8)
                except Exception as e:
                    print(f"[DM] send error: {e}")
                send_notification(company_uid, "booking",
                    f"Новая задача: {title}",
                    f"Назначена на {emp[0]}", "projects")
        return ok({"taskId": task_id}, 201)

    # GET check_overdue_tasks — напоминания по задачам не взятым в работу (вызывается по расписанию)
    if method == "GET" and action == "check_overdue_tasks":
        conn = get_conn(); cur = conn.cursor()
        # Задачи в статусе todo старше 12 часов, с назначенным исполнителем
        cur.execute(
            f"""SELECT t.id, t.company_user_id, t.assigned_to, t.title, t.description,
                       t.priority, t.due_date, t.created_at,
                       e.name as emp_name, e.avatar, e.avatar_color,
                       p.title as proj_title
                FROM {SCHEMA}.project_tasks t
                JOIN {SCHEMA}.employees e ON e.id = t.assigned_to
                LEFT JOIN {SCHEMA}.projects p ON p.id = t.project_id
                WHERE t.status = 'todo'
                  AND t.assigned_to IS NOT NULL
                  AND t.created_at < NOW() - INTERVAL '12 hours'
                  AND (t.last_reminder_at IS NULL OR t.last_reminder_at < NOW() - INTERVAL '12 hours')
            """)
        rows = cur.fetchall()
        reminded = 0
        EMPLOYEES_URL_INNER = "https://functions.poehali.dev/cc27106d-e3a4-4d7a-b6c2-47eb9365104e"
        PRIORITY_LABELS = {"low": "Низкий", "medium": "Средний", "high": "Высокий", "urgent": "Срочно!"}
        for r in rows:
            task_id_r, company_uid_r, assigned_to_r = str(r[0]), str(r[1]), str(r[2])
            t_title, t_desc, t_priority, t_due = r[3], r[4], r[5], r[6]
            due_str = f"\n📅 Срок: {t_due}" if t_due else ""
            reminder_text = (
                f"⏰ Напоминание: задача всё ещё ожидает тебя!\n\n"
                f"*{t_title}*{due_str}\n\n"
                f"⚡ Приоритет: {PRIORITY_LABELS.get(t_priority, t_priority)}\n\n"
                f"Пожалуйста, возьми задачу в работу."
            )
            try:
                dm_payload = json.dumps({
                    "companyUserId": company_uid_r,
                    "senderId": company_uid_r,
                    "senderType": "user",
                    "recipientId": assigned_to_r,
                    "text": reminder_text,
                }).encode()
                req = urllib.request.Request(
                    f"{EMPLOYEES_URL_INNER}?action=dm_send",
                    data=dm_payload,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                urllib.request.urlopen(req, timeout=8)
                # Обновляем время последнего напоминания
                cur.execute(
                    f"UPDATE {SCHEMA}.project_tasks SET last_reminder_at = NOW() WHERE id = %s",
                    (task_id_r,))
                reminded += 1
            except Exception as e:
                print(f"[Reminder] {task_id_r}: {e}")
        conn.commit(); conn.close()
        return ok({"reminded": reminded})

    # POST project_task_update — обновить задачу
    if method == "POST" and action == "project_task_update":
        b = json.loads(event.get("body") or "{}")
        task_id = b.get("taskId", "")
        if not task_id: return err("taskId required")
        fmap = {
            "title": "title", "description": "description", "status": "status",
            "priority": "priority", "dueDate": "due_date", "assignedTo": "assigned_to",
            "estimatedHours": "estimated_hours", "actualHours": "actual_hours",
            "goalId": "goal_id",
        }
        fields = {}
        for fk, col in fmap.items():
            if fk in b:
                fields[col] = b[fk] if b[fk] != "" else None
        if not fields: return err("Нет данных для обновления")
        set_clause = ", ".join(f"{c}=%s" for c in fields) + ", updated_at=NOW()"
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.project_tasks SET {set_clause} WHERE id=%s",
                    list(fields.values()) + [task_id])
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST project_task_delete — удалить задачу
    if method == "POST" and action == "project_task_delete":
        b = json.loads(event.get("body") or "{}")
        task_id = b.get("taskId", "")
        if not task_id: return err("taskId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.project_tasks WHERE id=%s", (task_id,))
        conn.commit(); conn.close()
        return ok({"success": True})

    # ── CRM Задачи бронирования площадки ─────────────────────────────────

    def vbt_row(r) -> dict:
        return {
            "id": str(r[0]), "bookingId": str(r[1]), "venueUserId": str(r[2]),
            "assignedTo": str(r[3]) if r[3] else None,
            "createdBy": str(r[4]), "title": r[5], "description": r[6],
            "status": r[7], "priority": r[8],
            "dueDate": str(r[9]) if r[9] else None,
            "sortOrder": r[10], "createdAt": str(r[11]),
            "assigneeName": r[12], "creatorName": r[13],
        }

    # GET venue_booking_tasks_list
    if method == "GET" and action == "venue_booking_tasks_list":
        booking_id  = params.get("booking_id", "")
        employee_id = params.get("employee_id", "")
        if not booking_id: return err("booking_id required")
        conn = get_conn(); cur = conn.cursor()
        where_extra = "AND t.assigned_to=%s" if employee_id else ""
        args = [booking_id] + ([employee_id] if employee_id else [])
        cur.execute(
            f"""SELECT t.id, t.booking_id, t.venue_user_id, t.assigned_to,
                       t.created_by, t.title, t.description, t.status, t.priority,
                       t.due_date, t.sort_order, t.created_at,
                       COALESCE(e.name, u.name, 'Не назначено') as assignee_name,
                       COALESCE(e2.name, u2.name, 'Неизвестно') as creator_name
                FROM {SCHEMA}.venue_booking_tasks t
                LEFT JOIN {SCHEMA}.employees e ON e.id = t.assigned_to
                LEFT JOIN {SCHEMA}.users u ON u.id = t.assigned_to
                LEFT JOIN {SCHEMA}.employees e2 ON e2.id = t.created_by
                LEFT JOIN {SCHEMA}.users u2 ON u2.id = t.created_by
                WHERE t.booking_id=%s {where_extra}
                ORDER BY t.priority DESC, t.due_date ASC NULLS LAST, t.sort_order""",
            args)
        rows = cur.fetchall(); conn.close()
        return ok({"tasks": [vbt_row(r) for r in rows]})

    # POST venue_booking_task_create
    if method == "POST" and action == "venue_booking_task_create":
        b = json.loads(event.get("body") or "{}")
        booking_id   = b.get("bookingId", "")
        venue_uid    = b.get("venueUserId", "")
        created_by   = b.get("createdBy", "")
        title        = (b.get("title") or "").strip()
        description  = b.get("description", "")
        assigned_to  = b.get("assignedTo") or None
        priority     = b.get("priority", "medium")
        due_date     = b.get("dueDate") or None
        if not booking_id or not venue_uid or not created_by or not title:
            return err("bookingId, venueUserId, createdBy, title обязательны")
        if priority not in ("low", "medium", "high", "urgent"): priority = "medium"
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"SELECT COALESCE(MAX(sort_order),0)+1 FROM {SCHEMA}.venue_booking_tasks WHERE booking_id=%s",
            (booking_id,))
        order = cur.fetchone()[0]
        cur.execute(
            f"""INSERT INTO {SCHEMA}.venue_booking_tasks
                (booking_id, venue_user_id, assigned_to, created_by, title, description,
                 priority, due_date, sort_order)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (booking_id, venue_uid, assigned_to, created_by, title, description,
             priority, due_date, order))
        task_id = str(cur.fetchone()[0])
        conn.commit(); conn.close()
        return ok({"taskId": task_id}, 201)

    # POST venue_booking_task_update
    if method == "POST" and action == "venue_booking_task_update":
        b = json.loads(event.get("body") or "{}")
        task_id = b.get("taskId", "")
        if not task_id: return err("taskId required")
        fmap = {
            "title": "title", "description": "description", "status": "status",
            "priority": "priority", "dueDate": "due_date", "assignedTo": "assigned_to",
        }
        fields = {}
        for fk, col in fmap.items():
            if fk in b:
                fields[col] = b[fk] if b[fk] != "" else None
        if not fields: return err("Нет данных для обновления")
        set_clause = ", ".join(f"{c}=%s" for c in fields) + ", updated_at=NOW()"
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.venue_booking_tasks SET {set_clause} WHERE id=%s",
                    list(fields.values()) + [task_id])
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST venue_booking_task_delete
    if method == "POST" and action == "venue_booking_task_delete":
        b = json.loads(event.get("body") or "{}")
        task_id = b.get("taskId", "")
        if not task_id: return err("taskId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.venue_booking_tasks WHERE id=%s", (task_id,))
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST create_share_link — создать публичную ссылку на проект
    if method == "POST" and action == "create_share_link":
        b = json.loads(event.get("body") or "{}")
        project_id = b.get("projectId", "")
        show_files  = bool(b.get("showFiles", False))
        if not project_id: return err("projectId required")
        link_id = uuid.uuid4().hex
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.share_links (id, project_id, show_files) VALUES (%s, %s, %s)",
            (link_id, project_id, show_files))
        conn.commit(); conn.close()
        return ok({"linkId": link_id}, 201)

    # GET get_shared_project — публичные данные проекта по share link
    if method == "GET" and action == "get_shared_project":
        link_id = params.get("link_id", "")
        if not link_id: return err("link_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"SELECT project_id, show_files FROM {SCHEMA}.share_links WHERE id=%s",
            (link_id,))
        link_row = cur.fetchone()
        if not link_row: conn.close(); return err("Ссылка не найдена", 404)
        pid, show_files = str(link_row[0]), bool(link_row[1])
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
            f"SELECT id,category,ticket_count,ticket_price,sold_count,note FROM {SCHEMA}.project_income_lines WHERE project_id=%s ORDER BY created_at",
            (pid,))
        project["incomeLines"] = [{"id":str(r[0]),"category":r[1],"ticketCount":r[2],"ticketPrice":float(r[3]),"soldCount":r[4],"note":r[5],"totalPlan":r[2]*float(r[3]),"totalFact":r[4]*float(r[3])} for r in cur.fetchall()]
        if show_files:
            cur.execute(
                f"""SELECT d.id, d.file_name, d.file_url, d.file_size, d.mime_type, d.created_at
                    FROM {SCHEMA}.user_documents d
                    WHERE d.user_id=(SELECT user_id FROM {SCHEMA}.projects WHERE id=%s)
                    ORDER BY d.created_at DESC""", (pid,))
            project["documents"] = [
                {"id":str(r[0]),"fileName":r[1],"fileUrl":r[2],"fileSize":r[3],"mimeType":r[4],"createdAt":str(r[5])}
                for r in cur.fetchall()
            ]
        else:
            project["documents"] = []
        conn.close()
        return ok({"project": project, "showFiles": show_files})

    # ── GET members — список участников проекта ───────────────────────────
    if method == "GET" and action == "members":
        project_id = params.get("project_id", "")
        user_id    = params.get("user_id", "")
        if not project_id: return err("project_id required")
        conn = get_conn(); cur = conn.cursor()
        # Проверяем доступ: владелец или участник
        cur.execute(
            f"""SELECT 1 FROM {SCHEMA}.projects WHERE id=%s AND user_id=%s
                UNION
                SELECT 1 FROM {SCHEMA}.project_members WHERE project_id=%s AND user_id=%s""",
            (project_id, user_id, project_id, user_id)
        )
        if not cur.fetchone(): conn.close(); return err("Нет доступа", 403)

        cur.execute(
            f"""SELECT pm.id, pm.user_id, pm.role, pm.invited_at,
                       u.name, u.email, u.role as user_role,
                       COALESCE(u.legal_name, '') as company,
                       COALESCE(u.logo_url, '') as logo_url,
                       COALESCE(u.avatar, '') as avatar
                FROM {SCHEMA}.project_members pm
                JOIN {SCHEMA}.users u ON u.id = pm.user_id
                WHERE pm.project_id = %s
                ORDER BY pm.invited_at""",
            (project_id,)
        )
        members = [{"id":str(r[0]),"userId":str(r[1]),"role":r[2],"invitedAt":str(r[3]),
                    "name":r[4],"email":r[5],"userRole":r[6],"company":r[7],
                    "logoUrl":r[8],"avatar":r[9]} for r in cur.fetchall()]

        # Также добавляем владельца
        cur.execute(
            f"""SELECT u.id, u.name, u.email, u.role, COALESCE(u.legal_name,'') as company,
                       COALESCE(u.logo_url,'') as logo_url, COALESCE(u.avatar,'') as avatar
                FROM {SCHEMA}.projects p JOIN {SCHEMA}.users u ON u.id=p.user_id
                WHERE p.id=%s""",
            (project_id,)
        )
        owner_row = cur.fetchone()
        conn.close()
        owner = None
        if owner_row:
            owner = {"userId":str(owner_row[0]),"name":owner_row[1],"email":owner_row[2],
                     "userRole":owner_row[3],"company":owner_row[4],
                     "logoUrl":owner_row[5],"avatar":owner_row[6],"role":"owner"}
        return ok({"members": members, "owner": owner})

    # ── POST invite_member — пригласить партнёра в проект ─────────────────
    if method == "POST" and action == "invite_member":
        b = json.loads(event.get("body") or "{}")
        project_id     = b.get("projectId", "")
        inviter_id     = b.get("userId", "")
        partner_email  = (b.get("email") or "").strip().lower()
        partner_role   = b.get("role", "partner")  # partner | viewer

        if not project_id: return err("projectId required")
        if "@" not in partner_email: return err("Некорректный email")

        conn = get_conn(); cur = conn.cursor()
        # Только владелец может приглашать
        cur.execute(f"SELECT title, user_id FROM {SCHEMA}.projects WHERE id=%s", (project_id,))
        proj_row = cur.fetchone()
        if not proj_row: conn.close(); return err("Проект не найден", 404)
        proj_title, owner_id = proj_row[0], str(proj_row[1])
        if owner_id != inviter_id: conn.close(); return err("Только владелец может приглашать участников", 403)

        # Находим партнёра
        cur.execute(f"SELECT id, name FROM {SCHEMA}.users WHERE LOWER(email)=%s", (partner_email,))
        partner = cur.fetchone()
        if not partner: conn.close(); return err("Пользователь с таким email не найден на платформе", 404)
        partner_id, partner_name = str(partner[0]), partner[1]

        if partner_id == inviter_id: conn.close(); return err("Нельзя пригласить самого себя")

        # Не добавляем дубли
        cur.execute(
            f"SELECT id FROM {SCHEMA}.project_members WHERE project_id=%s AND user_id=%s",
            (project_id, partner_id)
        )
        if cur.fetchone(): conn.close(); return err("Этот пользователь уже участник проекта")

        cur.execute(
            f"""INSERT INTO {SCHEMA}.project_members (project_id, user_id, role, invited_by)
                VALUES (%s, %s, %s, %s) RETURNING id""",
            (project_id, partner_id, partner_role, inviter_id)
        )
        member_id = str(cur.fetchone()[0])

        # Получаем имя пригласившего
        cur.execute(f"SELECT name FROM {SCHEMA}.users WHERE id=%s", (inviter_id,))
        inviter_row = cur.fetchone()
        inviter_name = inviter_row[0] if inviter_row else "Организатор"

        # Уведомление партнёру
        cur.execute(
            f"""INSERT INTO {SCHEMA}.notifications (user_id, type, title, body, link_page)
                VALUES (%s, 'system', %s, %s, 'projects')""",
            (partner_id,
             "Вас добавили в проект",
             f"{inviter_name} открыл вам доступ к проекту «{proj_title}»")
        )
        conn.commit(); conn.close()
        return ok({"memberId": member_id, "partnerName": partner_name})

    # ── POST remove_member — удалить участника из проекта ─────────────────
    if method == "POST" and action == "remove_member":
        b = json.loads(event.get("body") or "{}")
        project_id = b.get("projectId", "")
        user_id    = b.get("userId", "")
        member_id  = b.get("memberId", "")
        if not all([project_id, user_id, member_id]): return err("projectId, userId, memberId required")

        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"SELECT user_id FROM {SCHEMA}.projects WHERE id=%s", (project_id,))
        proj_row = cur.fetchone()
        if not proj_row: conn.close(); return err("Проект не найден", 404)
        owner_id = str(proj_row[0])
        if owner_id != user_id: conn.close(); return err("Только владелец может удалять участников", 403)

        cur.execute(
            f"UPDATE {SCHEMA}.project_members SET role='removed' WHERE id=%s AND project_id=%s",
            (member_id, project_id)
        )
        conn.commit(); conn.close()
        return ok({"removed": True})

    # ── Подзадачи ──────────────────────────────────────────────────────────

    # GET subtasks_list
    if method == "GET" and action == "subtasks_list":
        task_id = params.get("task_id", "")
        if not task_id: return err("task_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT s.id, s.task_id, s.title, s.is_done, s.done_by, s.done_at,
                       s.comment, s.sort_order,
                       COALESCE(e.name, u.name, '') as done_by_name
                FROM {SCHEMA}.project_task_subtasks s
                LEFT JOIN {SCHEMA}.employees e ON e.id = s.done_by
                LEFT JOIN {SCHEMA}.users u ON u.id = s.done_by
                WHERE s.task_id = %s ORDER BY s.sort_order""",
            (task_id,))
        rows = cur.fetchall(); conn.close()
        subtasks = [{"id": str(r[0]), "taskId": str(r[1]), "title": r[2],
                     "isDone": r[3], "doneBy": str(r[4]) if r[4] else None,
                     "doneAt": str(r[5]) if r[5] else None, "comment": r[6],
                     "sortOrder": r[7], "doneByName": r[8]} for r in rows]
        return ok({"subtasks": subtasks})

    # POST subtask_create
    if method == "POST" and action == "subtask_create":
        b = json.loads(event.get("body") or "{}")
        task_id = b.get("taskId", ""); title = (b.get("title") or "").strip()
        sort_order = b.get("sortOrder", 0)
        if not task_id or not title: return err("taskId and title required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.project_task_subtasks (task_id, title, sort_order)
                VALUES (%s, %s, %s) RETURNING id, task_id, title, is_done, done_by, done_at, comment, sort_order""",
            (task_id, title, sort_order))
        r = cur.fetchone(); conn.commit(); conn.close()
        return ok({"id": str(r[0]), "taskId": str(r[1]), "title": r[2],
                   "isDone": r[3], "doneBy": None, "doneAt": None, "comment": r[6],
                   "sortOrder": r[7], "doneByName": ""}, 201)

    # POST subtask_toggle
    if method == "POST" and action == "subtask_toggle":
        b = json.loads(event.get("body") or "{}")
        subtask_id = b.get("subtaskId", ""); is_done = bool(b.get("isDone", False))
        done_by    = b.get("doneBy") or None; comment = b.get("comment", "")
        if not subtask_id: return err("subtaskId required")
        conn = get_conn(); cur = conn.cursor()
        if is_done:
            cur.execute(
                f"""UPDATE {SCHEMA}.project_task_subtasks
                    SET is_done=%s, done_by=%s, done_at=NOW(), comment=%s
                    WHERE id=%s RETURNING id, task_id, title, is_done, done_by, done_at, comment, sort_order""",
                (True, done_by, comment, subtask_id))
        else:
            cur.execute(
                f"""UPDATE {SCHEMA}.project_task_subtasks
                    SET is_done=false, done_by=NULL, done_at=NULL, comment=''
                    WHERE id=%s RETURNING id, task_id, title, is_done, done_by, done_at, comment, sort_order""",
                (subtask_id,))
        r = cur.fetchone()
        # Подтягиваем имя
        done_by_name = ""
        if r and r[4]:
            cur.execute(
                f"SELECT COALESCE(e.name, u.name, '') FROM {SCHEMA}.employees e FULL JOIN {SCHEMA}.users u ON false WHERE e.id=%s OR u.id=%s LIMIT 1",
                (r[4], r[4]))
            nr = cur.fetchone(); done_by_name = nr[0] if nr else ""
        conn.commit(); conn.close()
        if not r: return err("Подзадача не найдена", 404)
        return ok({"id": str(r[0]), "taskId": str(r[1]), "title": r[2],
                   "isDone": r[3], "doneBy": str(r[4]) if r[4] else None,
                   "doneAt": str(r[5]) if r[5] else None, "comment": r[6],
                   "sortOrder": r[7], "doneByName": done_by_name})

    # ── Комментарии к задачам ───────────────────────────────────────────────

    # GET task_comments_list
    if method == "GET" and action == "task_comments_list":
        task_id = params.get("task_id", "")
        if not task_id: return err("task_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id, task_id, author_id, author_name, text, created_at
                FROM {SCHEMA}.project_task_comments
                WHERE task_id=%s ORDER BY created_at""",
            (task_id,))
        rows = cur.fetchall(); conn.close()
        comments = [{"id": str(r[0]), "taskId": str(r[1]), "authorId": str(r[2]),
                     "authorName": r[3], "text": r[4], "createdAt": str(r[5])} for r in rows]
        return ok({"comments": comments})

    # POST task_comment_create
    if method == "POST" and action == "task_comment_create":
        b = json.loads(event.get("body") or "{}")
        task_id = b.get("taskId", ""); author_id = b.get("authorId", "")
        author_name = b.get("authorName", ""); text = (b.get("text") or "").strip()
        if not task_id or not author_id or not text: return err("taskId, authorId, text required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.project_task_comments (task_id, author_id, author_name, text)
                VALUES (%s, %s, %s, %s) RETURNING id, task_id, author_id, author_name, text, created_at""",
            (task_id, author_id, author_name, text))
        r = cur.fetchone(); conn.commit(); conn.close()
        return ok({"id": str(r[0]), "taskId": str(r[1]), "authorId": str(r[2]),
                   "authorName": r[3], "text": r[4], "createdAt": str(r[5])}, 201)

    # ── Цели проекта ───────────────────────────────────────────────────────

    # GET project_goals_list
    if method == "GET" and action == "project_goals_list":
        project_id = params.get("project_id", "")
        if not project_id: return err("project_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id, title, description, target_value, current_value, unit, status, deadline, color
                FROM {SCHEMA}.crm_goals
                WHERE user_id = (SELECT user_id FROM {SCHEMA}.projects WHERE id=%s LIMIT 1)
                ORDER BY created_at""",
            (project_id,))
        rows = cur.fetchall(); conn.close()
        goals = [{"id": str(r[0]), "title": r[1], "description": r[2],
                  "targetValue": float(r[3]) if r[3] else None,
                  "currentValue": float(r[4]), "unit": r[5], "status": r[6],
                  "deadline": str(r[7]) if r[7] else None, "color": r[8]} for r in rows]
        return ok({"goals": goals})

    # POST project_goal_create
    if method == "POST" and action == "project_goal_create":
        b = json.loads(event.get("body") or "{}")
        project_id = b.get("projectId", ""); user_id = b.get("userId", "")
        title = (b.get("title") or "").strip()
        if not project_id or not user_id or not title: return err("projectId, userId, title required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.crm_goals (user_id, title, description, target_value, unit, deadline)
                VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""",
            (user_id, title, b.get("description",""),
             b.get("targetValue") or None, b.get("unit",""), b.get("deadline") or None))
        gid = str(cur.fetchone()[0]); conn.commit(); conn.close()
        return ok({"goalId": gid}, 201)

    # POST project_goal_update
    if method == "POST" and action == "project_goal_update":
        b = json.loads(event.get("body") or "{}")
        goal_id = b.get("goalId", "")
        if not goal_id: return err("goalId required")
        conn = get_conn(); cur = conn.cursor()
        if "currentValue" in b:
            cur.execute(f"UPDATE {SCHEMA}.crm_goals SET current_value=%s WHERE id=%s",
                        (b["currentValue"], goal_id))
        if "status" in b:
            cur.execute(f"UPDATE {SCHEMA}.crm_goals SET status=%s WHERE id=%s",
                        (b["status"], goal_id))
        conn.commit(); conn.close()
        return ok({"success": True})

    # Folder update for documents
    if method == "POST" and action == "update_folder":
        b = json.loads(event.get("body") or "{}")
        doc_id = b.get("id", ""); folder = b.get("folder", "")
        if not doc_id: return err("id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.user_documents SET folder=%s WHERE id=%s", (folder, doc_id))
        conn.commit(); conn.close()
        return ok({"success": True})

    # ── ЛОГИСТИКА ПРОЕКТА ─────────────────────────────────────────────────

    # GET logistics_list
    if method == "GET" and action == "logistics_list":
        project_id = params.get("project_id", "")
        if not project_id: return err("project_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id, project_id, person_name, person_role, type, status,
                       route_from, route_to, date_depart, date_return,
                       booking_ref, price, notes, file_url, file_name, created_at
                FROM {SCHEMA}.project_logistics
                WHERE project_id = %s
                ORDER BY date_depart ASC NULLS LAST, created_at""",
            (project_id,))
        rows = cur.fetchall(); conn.close()
        items = [{"id": str(r[0]), "projectId": str(r[1]), "personName": r[2],
                  "personRole": r[3], "type": r[4], "status": r[5],
                  "routeFrom": r[6], "routeTo": r[7],
                  "dateDepart": str(r[8]) if r[8] else None,
                  "dateReturn": str(r[9]) if r[9] else None,
                  "bookingRef": r[10], "price": float(r[11]),
                  "notes": r[12], "fileUrl": r[13], "fileName": r[14],
                  "createdAt": str(r[15])} for r in rows]
        return ok({"items": items})

    # POST logistics_create
    if method == "POST" and action == "logistics_create":
        b = json.loads(event.get("body") or "{}")
        project_id = b.get("projectId", "")
        if not project_id: return err("projectId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.project_logistics
                (project_id, person_name, person_role, type, status,
                 route_from, route_to, date_depart, date_return,
                 booking_ref, price, notes, created_by)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id""",
            (project_id, b.get("personName",""), b.get("personRole",""),
             b.get("type","flight"), b.get("status","needed"),
             b.get("routeFrom",""), b.get("routeTo",""),
             b.get("dateDepart") or None, b.get("dateReturn") or None,
             b.get("bookingRef",""), float(b.get("price",0) or 0),
             b.get("notes",""), b.get("createdBy") or None))
        item_id = str(cur.fetchone()[0]); conn.commit(); conn.close()
        return ok({"id": item_id}, 201)

    # POST logistics_update
    if method == "POST" and action == "logistics_update":
        b = json.loads(event.get("body") or "{}")
        item_id = b.get("id", "")
        if not item_id: return err("id required")
        fmap = {
            "personName": "person_name", "personRole": "person_role",
            "type": "type", "status": "status",
            "routeFrom": "route_from", "routeTo": "route_to",
            "dateDepart": "date_depart", "dateReturn": "date_return",
            "bookingRef": "booking_ref", "price": "price",
            "notes": "notes", "fileUrl": "file_url", "fileName": "file_name",
        }
        fields = {}
        for fk, col in fmap.items():
            if fk in b:
                fields[col] = b[fk] if b[fk] != "" else None
        if not fields: return err("No data")
        set_clause = ", ".join(f"{c}=%s" for c in fields) + ", updated_at=NOW()"
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.project_logistics SET {set_clause} WHERE id=%s",
                    list(fields.values()) + [item_id])
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST logistics_delete
    if method == "POST" and action == "logistics_delete":
        b = json.loads(event.get("body") or "{}")
        item_id = b.get("id", "")
        if not item_id: return err("id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.project_logistics SET status='cancelled' WHERE id=%s", (item_id,))
        conn.commit(); conn.close()
        return ok({"success": True})

    # ── ЭДО: ДОГОВОРЫ И СЧЕТА ────────────────────────────────────────────

    # POST generate_contract — создать договор из бронирования
    if method == "POST" and action == "generate_contract":
        b = json.loads(event.get("body") or "{}")
        booking_id = b.get("bookingId", "")
        if not booking_id: return err("bookingId required")
        conn = get_conn(); cur = conn.cursor()

        # Проверяем — нет ли уже договора
        cur.execute(f"SELECT id, status FROM {SCHEMA}.contracts WHERE booking_id=%s LIMIT 1", (booking_id,))
        existing = cur.fetchone()
        if existing:
            conn.close()
            return ok({"contractId": str(existing[0]), "status": existing[1], "existed": True})

        # Данные бронирования + шаблон договора из venues
        cur.execute(
            f"""SELECT b.organizer_id, b.venue_user_id, b.venue_id,
                       b.event_date, b.event_time, b.artist, b.rental_amount, b.venue_conditions,
                       b.project_id, v.name, v.contract_template, v.contract_subject
                FROM {SCHEMA}.venue_bookings b
                JOIN {SCHEMA}.venues v ON v.id = b.venue_id
                WHERE b.id=%s""", (booking_id,))
        row = cur.fetchone()
        if not row: conn.close(); return err("Бронирование не найдено", 404)
        organizer_id = str(row[0])
        venue_user_id = str(row[1])
        event_date = row[3]
        event_time = row[4] or ""
        artist = row[5] or ""
        rental_amount = float(row[6]) if row[6] else 0
        venue_conditions = row[7] or ""
        project_id = str(row[8]) if row[8] else None
        venue_name = row[9]
        raw_template = row[10] or ""
        contract_subject = row[11] or ""

        # Реквизиты организатора
        cur.execute(
            f"""SELECT legal_name, inn, kpp, ogrn, legal_address,
                       bank_name, bank_account, bank_bik, phone, name
                FROM {SCHEMA}.users WHERE id=%s""", (organizer_id,))
        org = cur.fetchone() or ("","","","","","","","","","")

        # Реквизиты площадки
        cur.execute(
            f"""SELECT legal_name, inn, kpp, ogrn, legal_address,
                       bank_name, bank_account, bank_bik, phone
                FROM {SCHEMA}.users WHERE id=%s""", (venue_user_id,))
        ven = cur.fetchone() or ("","","","","","","","","")

        # Подставляем переменные в шаблон
        organizer_display = org[0] or org[9] or "Организатор"
        rental_fmt = f"{int(rental_amount):,}".replace(",", " ") + " руб." if rental_amount else ""
        contract_template_filled = (raw_template
            .replace("{venue_name}", venue_name)
            .replace("{event_date}", str(event_date))
            .replace("{rental_amount}", rental_fmt)
            .replace("{organizer_name}", organizer_display)
            .replace("{artist}", artist)
            .replace("{event_time}", event_time)
            .replace("{venue_conditions}", venue_conditions)
        )

        import random, string
        contract_number = "GL-" + "".join(random.choices(string.digits, k=8))

        cur.execute(
            f"""INSERT INTO {SCHEMA}.contracts
                (booking_id, project_id, organizer_id, venue_user_id,
                 organizer_legal_name, organizer_inn, organizer_kpp, organizer_ogrn, organizer_address,
                 organizer_bank_name, organizer_bank_account, organizer_bank_bik, organizer_phone,
                 venue_legal_name, venue_inn, venue_kpp, venue_ogrn, venue_address,
                 venue_bank_name, venue_bank_account, venue_bank_bik, venue_phone,
                 venue_name, event_date, event_time, artist, rental_amount, venue_conditions,
                 contract_number, status, contract_template, contract_subject)
                VALUES (%s,%s,%s,%s, %s,%s,%s,%s,%s, %s,%s,%s,%s, %s,%s,%s,%s,%s, %s,%s,%s,%s,
                        %s,%s,%s,%s,%s,%s, %s,'draft', %s,%s)
                RETURNING id""",
            (booking_id, project_id, organizer_id, venue_user_id,
             org[0],org[1],org[2],org[3],org[4], org[5],org[6],org[7],org[8],
             ven[0],ven[1],ven[2],ven[3],ven[4], ven[5],ven[6],ven[7],ven[8],
             venue_name, event_date, event_time, artist, rental_amount, venue_conditions,
             contract_number, contract_template_filled, contract_subject))
        contract_id = str(cur.fetchone()[0])
        conn.commit(); conn.close()

        send_notification(
            venue_user_id, "contract",
            f"Новый договор №{contract_number}",
            f"Организатор сформировал договор на мероприятие {str(event_date)} в {venue_name}. Ожидается ваша подпись.",
            "notifications"
        )
        return ok({"contractId": contract_id, "contractNumber": contract_number, "status": "draft"}, 201)

    # GET contract_detail — данные договора
    if method == "GET" and action == "contract_detail":
        contract_id = params.get("contract_id", "")
        booking_id  = params.get("booking_id", "")
        if not contract_id and not booking_id: return err("contract_id or booking_id required")
        conn = get_conn(); cur = conn.cursor()
        if contract_id:
            cur.execute(f"SELECT * FROM {SCHEMA}.contracts WHERE id=%s", (contract_id,))
        else:
            cur.execute(f"SELECT * FROM {SCHEMA}.contracts WHERE booking_id=%s ORDER BY created_at DESC LIMIT 1", (booking_id,))
        row = cur.fetchone()
        conn.close()
        if not row: return err("Не найдено", 404)
        cols = [d[0] for d in cur.description]
        data = dict(zip(cols, row))
        data = {k: str(v) if v is not None else "" for k, v in data.items()}
        return ok({"contract": data})

    # POST sign_contract — подписать договор (сторона: organizer | venue)
    if method == "POST" and action == "sign_contract":
        b = json.loads(event.get("body") or "{}")
        contract_id = b.get("contractId", "")
        side        = b.get("side", "")       # organizer | venue
        user_id     = b.get("userId", "")
        if not contract_id or side not in ("organizer","venue"): return err("contractId + side required")

        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id, status, organizer_id, venue_user_id, organizer_signed_at, venue_signed_at,
                       contract_number, venue_name, event_date, rental_amount,
                       organizer_legal_name, organizer_inn, organizer_bank_name, organizer_bank_account, organizer_bank_bik,
                       venue_legal_name, venue_inn, booking_id
                FROM {SCHEMA}.contracts WHERE id=%s""", (contract_id,))
        row = cur.fetchone()
        if not row: conn.close(); return err("Не найдено", 404)

        cstatus = row[1]
        organizer_id   = str(row[2])
        venue_user_id  = str(row[3])
        org_signed     = row[4]
        ven_signed     = row[5]
        contract_number= row[6]
        venue_name     = row[7]
        event_date     = str(row[8])
        rental_amount  = float(row[9]) if row[9] else 0
        org_legal      = row[10]; org_inn = row[11]
        org_bank       = row[12]; org_acc = row[13]; org_bik = row[14]
        ven_legal      = row[15]; ven_inn = row[16]
        booking_id     = str(row[17])

        if side == "organizer":
            if org_signed: conn.close(); return ok({"already": True})
            cur.execute(f"UPDATE {SCHEMA}.contracts SET organizer_signed_at=NOW(), updated_at=NOW() WHERE id=%s", (contract_id,))
            new_status = "signed" if ven_signed else "signed_organizer"
        else:
            if ven_signed: conn.close(); return ok({"already": True})
            cur.execute(f"UPDATE {SCHEMA}.contracts SET venue_signed_at=NOW(), updated_at=NOW() WHERE id=%s", (contract_id,))
            new_status = "signed" if org_signed else "signed_venue"

        cur.execute(f"UPDATE {SCHEMA}.contracts SET status=%s WHERE id=%s", (new_status, contract_id))

        invoice_id = None
        invoice_number = None
        # Если оба подписали — генерируем счёт
        if new_status == "signed":
            import random, string as strmod
            invoice_number = "INV-" + "".join(random.choices(strmod.digits, k=8))
            from datetime import date, timedelta
            due = date.today() + timedelta(days=14)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.invoices
                    (contract_id, booking_id, invoice_number,
                     payer_legal_name, payer_inn,
                     payee_legal_name, payee_inn,
                     payee_bank_name, payee_bank_account, payee_bank_bik,
                     amount, description, due_date, status)
                    VALUES (%s,%s,%s, %s,%s, %s,%s, %s,%s,%s, %s,%s,%s,'issued')
                    RETURNING id""",
                (contract_id, booking_id, invoice_number,
                 org_legal, org_inn,
                 ven_legal, ven_inn,
                 org_bank, org_acc, org_bik,
                 rental_amount,
                 f"Аренда площадки {venue_name} {event_date} · Договор №{contract_number}",
                 due))
            invoice_id = str(cur.fetchone()[0])

            notify_user = organizer_id if side == "venue" else venue_user_id
            send_notification(
                notify_user, "contract",
                f"Договор №{contract_number} подписан обеими сторонами",
                f"Счёт №{invoice_number} на сумму {int(rental_amount):,} ₽ сформирован и доступен в платформе.".replace(",", " "),
                "notifications"
            )
        else:
            notify_user = organizer_id if side == "venue" else venue_user_id
            send_notification(
                notify_user, "contract",
                f"Договор №{contract_number} подписан",
                f"{'Площадка' if side=='venue' else 'Организатор'} подписал(а) договор. Ожидается ваша подпись.",
                "notifications"
            )

        conn.commit(); conn.close()
        return ok({"status": new_status, "invoiceId": invoice_id, "invoiceNumber": invoice_number})

    # GET invoice_detail — данные счёта
    if method == "GET" and action == "invoice_detail":
        invoice_id  = params.get("invoice_id", "")
        contract_id = params.get("contract_id", "")
        booking_id  = params.get("booking_id", "")
        conn = get_conn(); cur = conn.cursor()
        if invoice_id:
            cur.execute(f"SELECT * FROM {SCHEMA}.invoices WHERE id=%s", (invoice_id,))
        elif contract_id:
            cur.execute(f"SELECT * FROM {SCHEMA}.invoices WHERE contract_id=%s ORDER BY created_at DESC LIMIT 1", (contract_id,))
        else:
            cur.execute(f"SELECT * FROM {SCHEMA}.invoices WHERE booking_id=%s ORDER BY created_at DESC LIMIT 1", (booking_id,))
        row = cur.fetchone()
        conn.close()
        if not row: return err("Счёт не найден", 404)
        cols = [d[0] for d in cur.description]
        data = {k: str(v) if v is not None else "" for k, v in zip(cols, row)}
        return ok({"invoice": data})

    # POST mark_invoice_paid
    if method == "POST" and action == "mark_invoice_paid":
        b = json.loads(event.get("body") or "{}")
        invoice_id = b.get("invoiceId", "")
        if not invoice_id: return err("invoiceId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.invoices SET status='paid', paid_at=NOW() WHERE id=%s RETURNING contract_id",
            (invoice_id,))
        row = cur.fetchone()
        if row:
            cur.execute(f"UPDATE {SCHEMA}.contracts SET status='paid', updated_at=NOW() WHERE id=%s", (row[0],))
        conn.commit(); conn.close()
        return ok({"success": True})

    # ── GET groups_list ───────────────────────────────────────────────────
    if method == "GET" and action == "groups_list":
        uid = params.get("user_id", "")
        if not uid: return err("user_id required")
        conn = get_conn(); cur = conn.cursor()
        try:
            # Свои группы
            cur.execute(
                f"""SELECT id, title, description, color, created_at, user_id
                    FROM {SCHEMA}.project_groups
                    WHERE user_id=%s ORDER BY created_at DESC""", (uid,))
            own_groups_raw = cur.fetchall()

            # Группы, в которые пользователь приглашён как партнёр
            cur.execute(
                f"""SELECT pg.id, pg.title, pg.description, pg.color, pg.created_at, pg.user_id
                    FROM {SCHEMA}.project_groups pg
                    JOIN {SCHEMA}.group_members gm ON gm.group_id = pg.id
                    WHERE gm.user_id=%s ORDER BY pg.created_at DESC""", (uid,))
            partner_groups_raw = cur.fetchall()

            own_group_ids = {str(r[0]) for r in own_groups_raw}
            # Объединяем, избегая дублей
            groups_raw = list(own_groups_raw) + [r for r in partner_groups_raw if str(r[0]) not in own_group_ids]

            # Агрегаты для своих групп (по своим проектам)
            cur.execute(
                f"""SELECT p.group_id,
                           COUNT(*) as cnt,
                           SUM(p.total_income_plan) as ip,
                           SUM(p.total_income_fact) as iF,
                           SUM(p.total_expenses_plan) as ep,
                           SUM(p.total_expenses_fact) as ef,
                           MIN(p.date_start) as date_start,
                           MAX(p.date_end) as date_end
                    FROM {SCHEMA}.projects p
                    WHERE p.user_id=%s AND p.group_id IS NOT NULL
                    GROUP BY p.group_id""", (uid,))
            agg_own = {str(r[0]): r[1:] for r in cur.fetchall()}

            # Агрегаты для партнёрских групп (по всем проектам группы)
            if partner_groups_raw:
                partner_gids = [str(r[0]) for r in partner_groups_raw if str(r[0]) not in own_group_ids]
                if partner_gids:
                    placeholders = ",".join(["%s"] * len(partner_gids))
                    cur.execute(
                        f"""SELECT p.group_id,
                                   COUNT(*) as cnt,
                                   SUM(p.total_income_plan) as ip,
                                   SUM(p.total_income_fact) as iF,
                                   SUM(p.total_expenses_plan) as ep,
                                   SUM(p.total_expenses_fact) as ef,
                                   MIN(p.date_start) as date_start,
                                   MAX(p.date_end) as date_end
                            FROM {SCHEMA}.projects p
                            WHERE p.group_id IN ({placeholders})
                            GROUP BY p.group_id""", partner_gids)
                    for row in cur.fetchall():
                        gid_str = str(row[0])
                        if gid_str not in agg_own:
                            agg_own[gid_str] = row[1:]

            # Имена владельцев партнёрских групп
            owner_ids = list({str(r[5]) for r in partner_groups_raw if str(r[0]) not in own_group_ids})
            owner_names = {}
            if owner_ids:
                placeholders = ",".join(["%s"] * len(owner_ids))
                cur.execute(f"SELECT id, name FROM {SCHEMA}.users WHERE id IN ({placeholders})", owner_ids)
                for row in cur.fetchall():
                    owner_names[str(row[0])] = row[1]
        finally:
            conn.close()

        groups = []
        for r in groups_raw:
            gid = str(r[0])
            a = agg_own.get(gid)
            cnt = int(a[0]) if a else 0
            ip  = float(a[1] or 0) if a else 0.0
            iF  = float(a[2] or 0) if a else 0.0
            ep  = float(a[3] or 0) if a else 0.0
            ef  = float(a[4] or 0) if a else 0.0
            ds  = str(a[5]) if a and a[5] else None
            de  = str(a[6]) if a and a[6] else None
            is_partner_group = gid not in own_group_ids
            groups.append({
                "id": gid, "title": r[1], "description": r[2],
                "color": r[3], "createdAt": str(r[4]),
                "projectCount": cnt,
                "totalIncomePlan": ip, "totalIncomeFact": iF,
                "totalExpensesPlan": ep, "totalExpensesFact": ef,
                "dateStart": ds, "dateEnd": de,
                "finance": calc_finance(ip, iF, ep, ef, "none"),
                "isPartner": is_partner_group,
                "ownerName": owner_names.get(str(r[5]), "") if is_partner_group else None,
            })
        return ok({"groups": groups})

    # ── POST group_create ─────────────────────────────────────────────────
    if method == "POST" and action == "group_create":
        b = json.loads(event.get("body") or "{}")
        uid   = b.get("userId", "")
        title = (b.get("title") or "").strip()
        if not uid or not title: return err("userId и title обязательны")
        color = b.get("color", "neon-purple")
        desc  = b.get("description", "")
        conn = get_conn(); cur = conn.cursor()
        try:
            cur.execute(
                f"""INSERT INTO {SCHEMA}.project_groups (user_id, title, description, color)
                    VALUES (%s,%s,%s,%s) RETURNING id""",
                (uid, title, desc, color))
            gid = str(cur.fetchone()[0])
            for pid in (b.get("projectIds") or []):
                cur.execute(
                    f"UPDATE {SCHEMA}.projects SET group_id=%s WHERE id=%s AND user_id=%s",
                    (gid, pid, uid))
            conn.commit()
        finally:
            conn.close()
        return ok({"id": gid}, 201)

    # ── POST group_update ─────────────────────────────────────────────────
    if method == "POST" and action == "group_update":
        b   = json.loads(event.get("body") or "{}")
        gid = b.get("id", "")
        uid = b.get("userId", "")
        if not gid or not uid: return err("id и userId обязательны")
        fmap = {"title": "title", "description": "description", "color": "color"}
        fields = {col: b[fk] for fk, col in fmap.items() if fk in b and b[fk] is not None}
        conn = get_conn(); cur = conn.cursor()
        try:
            if fields:
                set_clause = ", ".join(f"{c}=%s" for c in fields) + ", updated_at=NOW()"
                cur.execute(
                    f"UPDATE {SCHEMA}.project_groups SET {set_clause} WHERE id=%s AND user_id=%s",
                    list(fields.values()) + [gid, uid])
            if "projectIds" in b:
                cur.execute(
                    f"UPDATE {SCHEMA}.projects SET group_id=NULL WHERE group_id=%s AND user_id=%s",
                    (gid, uid))
                for pid in (b["projectIds"] or []):
                    cur.execute(
                        f"UPDATE {SCHEMA}.projects SET group_id=%s WHERE id=%s AND user_id=%s",
                        (gid, pid, uid))
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    # ── POST group_delete ─────────────────────────────────────────────────
    if method == "POST" and action == "group_delete":
        b   = json.loads(event.get("body") or "{}")
        gid = b.get("id", "")
        uid = b.get("userId", "")
        if not gid or not uid: return err("id и userId обязательны")
        conn = get_conn(); cur = conn.cursor()
        try:
            cur.execute(
                f"UPDATE {SCHEMA}.projects SET group_id=NULL WHERE group_id=%s AND user_id=%s",
                (gid, uid))
            cur.execute(
                f"UPDATE {SCHEMA}.project_groups SET title='' WHERE id=%s AND user_id=%s",
                (gid, uid))
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    # ── GET group_projects ────────────────────────────────────────────────
    if method == "GET" and action == "group_projects":
        gid = params.get("group_id", "")
        uid = params.get("user_id", "")
        if not gid or not uid: return err("group_id и user_id обязательны")
        conn = get_conn(); cur = conn.cursor()
        try:
            cur.execute(
                f"""SELECT id,user_id,title,artist,project_type,status,date_start,date_end,
                           city,venue_name,description,tax_system,total_expenses_plan,
                           total_expenses_fact,total_income_plan,total_income_fact,created_at,updated_at
                    FROM {SCHEMA}.projects
                    WHERE group_id=%s AND user_id=%s
                    ORDER BY date_start, created_at""", (gid, uid))
            rows = cur.fetchall()
            cur.execute(
                f"""SELECT DISTINCT project_id FROM {SCHEMA}.project_tasks
                    WHERE status NOT IN ('done') AND due_date IS NOT NULL AND due_date < CURRENT_DATE
                      AND project_id IN (SELECT id FROM {SCHEMA}.projects WHERE group_id=%s)""", (gid,))
            overdue_ids = {str(r[0]) for r in cur.fetchall()}
            cur.execute(
                f"SELECT id, title, description, color FROM {SCHEMA}.project_groups WHERE id=%s", (gid,))
            g = cur.fetchone()
        finally:
            conn.close()
        projects = []
        for r in rows:
            p = row_to_project(r)
            p["hasOverdueTasks"] = p["id"] in overdue_ids
            p["isPartner"] = False
            p["ownerName"] = None
            projects.append(p)
        group_info = {
            "id": gid,
            "title": g[1] if g else "",
            "description": g[2] if g else "",
            "color": g[3] if g else "neon-purple",
        } if g else {}
        return ok({"projects": projects, "group": group_info})

    # ── GET group_members — список участников группы ──────────────────────────
    if method == "GET" and action == "group_members":
        group_id = params.get("group_id", "")
        user_id  = params.get("user_id", "")
        if not group_id or not user_id: return err("group_id и user_id обязательны")
        conn = get_conn(); cur = conn.cursor()
        try:
            # Проверяем что запрашивающий — владелец группы
            cur.execute(f"SELECT id FROM {SCHEMA}.project_groups WHERE id=%s AND user_id=%s", (group_id, user_id))
            if not cur.fetchone(): return err("Группа не найдена или нет прав", 404)

            cur.execute(
                f"""SELECT gm.id, gm.user_id, gm.role, gm.created_at,
                           u.name, u.email,
                           COALESCE(u.legal_name, '') as company,
                           COALESCE(u.logo_url, '') as logo_url,
                           COALESCE(u.avatar, '') as avatar
                    FROM {SCHEMA}.group_members gm
                    JOIN {SCHEMA}.users u ON u.id = gm.user_id
                    WHERE gm.group_id=%s
                    ORDER BY gm.created_at""",
                (group_id,)
            )
            rows = cur.fetchall()
        finally:
            conn.close()
        return ok({"members": [
            {
                "id":        str(r[0]),
                "userId":    str(r[1]),
                "role":      r[2],
                "invitedAt": r[3].isoformat() if r[3] else "",
                "name":      r[4] or "",
                "email":     r[5] or "",
                "company":   r[6],
                "logoUrl":   r[7],
                "avatar":    r[8],
            }
            for r in rows
        ]})

    # ── POST remove_group_member — удалить партнёра из группы и всех её проектов ──
    if method == "POST" and action == "remove_group_member":
        b          = json.loads(event.get("body") or "{}")
        group_id   = b.get("groupId", "")
        owner_id   = b.get("userId", "")
        member_id  = b.get("memberId", "")   # id строки в group_members
        if not group_id or not owner_id or not member_id: return err("groupId, userId, memberId обязательны")

        conn = get_conn(); cur = conn.cursor()
        try:
            # Только владелец группы может удалять
            cur.execute(f"SELECT id FROM {SCHEMA}.project_groups WHERE id=%s AND user_id=%s", (group_id, owner_id))
            if not cur.fetchone(): return err("Группа не найдена или нет прав", 404)

            # Получаем partner_user_id из group_members
            cur.execute(f"SELECT user_id FROM {SCHEMA}.group_members WHERE id=%s AND group_id=%s", (member_id, group_id))
            row = cur.fetchone()
            if not row: return err("Участник не найден", 404)
            partner_user_id = str(row[0])

            # Удаляем из всех проектов группы
            cur.execute(
                f"""DELETE FROM {SCHEMA}.project_members
                    WHERE user_id=%s AND project_id IN (
                        SELECT id FROM {SCHEMA}.projects WHERE group_id=%s AND user_id=%s
                    )""",
                (partner_user_id, group_id, owner_id)
            )
            removed_projects = cur.rowcount

            # Удаляем из group_members
            cur.execute(f"DELETE FROM {SCHEMA}.group_members WHERE id=%s", (member_id,))
            conn.commit()
        finally:
            conn.close()

        return ok({"removed": True, "removedFromProjects": removed_projects})

    # ── POST invite_group_member — пригласить партнёра сразу в все проекты группы ──
    if method == "POST" and action == "invite_group_member":
        b             = json.loads(event.get("body") or "{}")
        group_id      = b.get("groupId", "")
        inviter_id    = b.get("userId", "")
        partner_email = (b.get("email") or "").strip().lower()
        partner_role  = b.get("role", "partner")

        if not group_id or not inviter_id: return err("groupId и userId обязательны")
        if "@" not in partner_email: return err("Некорректный email")

        conn = get_conn(); cur = conn.cursor()
        try:
            # Проверяем что группа принадлежит inviter_id
            cur.execute(
                f"SELECT title FROM {SCHEMA}.project_groups WHERE id=%s AND user_id=%s",
                (group_id, inviter_id)
            )
            group_row = cur.fetchone()
            if not group_row: conn.close(); return err("Группа не найдена или нет прав", 404)
            group_title = group_row[0]

            # Ищем партнёра
            cur.execute(f"SELECT id, name FROM {SCHEMA}.users WHERE LOWER(email)=%s", (partner_email,))
            partner = cur.fetchone()
            if not partner: conn.close(); return err("Пользователь с таким email не найден на платформе", 404)
            partner_id, partner_name = str(partner[0]), partner[1]
            if partner_id == inviter_id: conn.close(); return err("Нельзя пригласить самого себя")

            # Имя пригласившего
            cur.execute(f"SELECT name FROM {SCHEMA}.users WHERE id=%s", (inviter_id,))
            inviter_row = cur.fetchone()
            inviter_name = inviter_row[0] if inviter_row else "Организатор"

            # Все проекты группы
            cur.execute(
                f"SELECT id, title FROM {SCHEMA}.projects WHERE group_id=%s AND user_id=%s",
                (group_id, inviter_id)
            )
            group_projects = cur.fetchall()

            added = 0
            skipped = 0
            for proj_id, proj_title in group_projects:
                proj_id = str(proj_id)
                # Пропускаем если уже участник
                cur.execute(
                    f"SELECT id FROM {SCHEMA}.project_members WHERE project_id=%s AND user_id=%s",
                    (proj_id, partner_id)
                )
                if cur.fetchone():
                    skipped += 1
                    continue
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.project_members (project_id, user_id, role, invited_by)
                        VALUES (%s, %s, %s, %s)""",
                    (proj_id, partner_id, partner_role, inviter_id)
                )
                added += 1

            # Сохраняем партнёра в group_members (для обратного отображения группы у партнёра)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.group_members (group_id, user_id, invited_by, role)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (group_id, user_id) DO UPDATE SET role=EXCLUDED.role""",
                (group_id, partner_id, inviter_id, partner_role)
            )

            # Одно уведомление на всю группу
            if added > 0:
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.notifications (user_id, type, title, body, link_page)
                        VALUES (%s, 'system', %s, %s, 'projects')""",
                    (partner_id,
                     f"Вас добавили в группу «{group_title}»",
                     f"{inviter_name} открыл вам доступ к {added} проектам группы «{group_title}»")
                )
            conn.commit()
        finally:
            conn.close()

        return ok({
            "success": True,
            "partnerName": partner_name,
            "added": added,
            "skipped": skipped,
        })

    return err("Not found", 404)
"""Запросы на бронирование: создание, ответы площадки и организатора."""
import json
import os
import psycopg2
from decimal import Decimal

from email_templates import request_email, confirm_email, reject_email
from booking_data import BOOKING_TASKS, VENUE_CHECKLIST
from notifiers import start_chat, send_notification, send_email

SCHEMA = "t_p17532248_concert_platform_mvp"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    }


def serial(o):
    if isinstance(o, Decimal):
        return float(o)
    return str(o)


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=serial)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def _request_booking(b):
    project_id = b.get("projectId", "")
    venue_id = b.get("venueId", "")
    organizer_id = b.get("organizerId", "")
    venue_user_id = b.get("venueUserId", "")
    event_date = b.get("eventDate", "")
    event_time = b.get("eventTime", "")
    artist = b.get("artist", "")
    age_limit = b.get("ageLimit", "")
    expected_guests = int(b.get("expectedGuests", 0))
    if not all([project_id, venue_id, organizer_id, venue_user_id, event_date]):
        return err("Не заполнены обязательные поля")
    conn = get_conn()
    try:
        cur = conn.cursor()
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
        cur.execute(f"SELECT name FROM {SCHEMA}.venues WHERE id=%s", (venue_id,))
        vrow = cur.fetchone(); venue_name = vrow[0] if vrow else "Площадка"
        cur.execute(f"SELECT name FROM {SCHEMA}.users WHERE id=%s", (organizer_id,))
        orow = cur.fetchone(); org_name = orow[0] if orow else "Организатор"
        cur.execute(f"SELECT email, name, email_notifications_enabled FROM {SCHEMA}.users WHERE id=%s", (venue_user_id,))
        vurow = cur.fetchone()
        venue_email = vurow[0] if vurow else ""
        venue_user_name = vurow[1] if vurow else ""
        venue_email_ok = bool(vurow[2]) if vurow else True
        conn.commit()
    finally:
        conn.close()

    body_text = (f"Дата: {event_date}" + (f" {event_time}" if event_time else "") +
                 (f" | Артист: {artist}" if artist else "") +
                 (f" | Возраст: {age_limit}+" if age_limit else "") +
                 (f" | Гостей: {expected_guests}" if expected_guests else "") +
                 f" | Организатор: {org_name}")
    send_notification(venue_user_id, "booking",
                      f"Запрос на бронирование от {org_name}", body_text, "notifications")

    if venue_email_ok and venue_email:
        date_str = event_date + (f" в {event_time}" if event_time else "")
        html = request_email(venue_user_name, venue_name, org_name, date_str, artist, age_limit, expected_guests)
        send_email(venue_email, f"Новый запрос на бронирование от {org_name} — {date_str}", html)

    return ok({"bookingId": booking_id}, 201)


def _venue_respond(b):
    booking_id = b.get("bookingId", "")
    response = b.get("response", "")
    rental_amount = b.get("rentalAmount")
    venue_conditions = b.get("venueConditions", "")
    if not booking_id or response not in ("confirmed", "rejected"):
        return err("Некорректные данные")

    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            f"""UPDATE {SCHEMA}.venue_bookings
                SET status=%s, rental_amount=%s, venue_conditions=%s, updated_at=NOW()
                WHERE id=%s
                RETURNING organizer_id, venue_id, venue_user_id, event_date, event_time,
                          artist, project_id""",
            (response, rental_amount, venue_conditions, booking_id))
        row = cur.fetchone()
        if not row:
            return err("Бронирование не найдено", 404)
        organizer_id = str(row[0]); vid = str(row[1]); venue_user_id = str(row[2])
        edate = str(row[3]); event_time = row[4] or ""; artist = row[5] or ""
        project_id = str(row[6])
        cur.execute(f"SELECT name FROM {SCHEMA}.venues WHERE id=%s", (vid,))
        vrow = cur.fetchone(); venue_name = vrow[0] if vrow else "Площадка"

        if response == "confirmed":
            cur.execute(f"SELECT id FROM {SCHEMA}.booking_tasks WHERE booking_id=%s", (booking_id,))
            if not cur.fetchone():
                for i, (key, title, desc) in enumerate(BOOKING_TASKS):
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.booking_tasks (booking_id, project_id, title, description, sort_order) VALUES (%s,%s,%s,%s,%s)",
                        (booking_id, project_id, title, desc, i))
            cur.execute(f"SELECT id FROM {SCHEMA}.booking_checklist WHERE booking_id=%s", (booking_id,))
            if not cur.fetchone():
                for i, (step_key, step_title) in enumerate(VENUE_CHECKLIST):
                    is_done = step_key == "date_confirmed"
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.booking_checklist (booking_id, venue_id, step_key, step_title, is_done, sort_order) VALUES (%s,%s,%s,%s,%s,%s)",
                        (booking_id, vid, step_key, step_title, is_done, i))
            conn.commit()
    finally:
        conn.close()

    conversation_id = ""
    if response == "confirmed":
        rent_str = f"{int(rental_amount):,} ₽".replace(",", " ") if rental_amount else "не указана"
        chat_text = (
            f"Бронирование подтверждено площадкой!\n\nПлощадка: {venue_name}\nДата: {edate}"
            + (f" {event_time}" if event_time else "") + "\n"
            + (f"Артист: {artist}\n" if artist else "")
            + f"Аренда: {rent_str}\n"
            + (f"Условия: {venue_conditions}\n" if venue_conditions else "")
            + "\nПо всем вопросам пишите в этот чат."
        )
        conversation_id = start_chat(organizer_id, vid, venue_user_id, venue_name, chat_text, "Система")
        if conversation_id:
            conn2 = get_conn()
            try:
                cur2 = conn2.cursor()
                cur2.execute(f"UPDATE {SCHEMA}.venue_bookings SET conversation_id=%s WHERE id=%s",
                             (conversation_id, booking_id))
                conn2.commit()
            finally:
                conn2.close()
        rent_str_n = f" | Аренда: {int(rental_amount):,} ₽".replace(",", " ") if rental_amount else ""
        cond_str = f" | Условия: {venue_conditions}" if venue_conditions else ""
        send_notification(organizer_id, "booking",
                          f"Площадка «{venue_name}» подтвердила бронирование",
                          f"Дата: {edate}" + rent_str_n + cond_str + " — создан чат и задачи.", "chat")
        # Email
        conn3 = get_conn()
        try:
            cur3 = conn3.cursor()
            cur3.execute(f"SELECT email, name, email_notifications_enabled FROM {SCHEMA}.users WHERE id=%s", (organizer_id,))
            org_row = cur3.fetchone()
        finally:
            conn3.close()
        if org_row and org_row[2]:
            date_str = edate + (f" в {event_time}" if event_time else "")
            html = confirm_email(org_row[1], venue_name, date_str, rental_amount, venue_conditions)
            send_email(org_row[0], f"Площадка «{venue_name}» подтвердила бронирование на {date_str}", html)
    else:
        send_notification(organizer_id, "booking",
                          f"Площадка «{venue_name}» отклонила запрос",
                          f"Дата: {edate}" + (f" | {venue_conditions}" if venue_conditions else ""), "notifications")
        conn4 = get_conn()
        try:
            cur4 = conn4.cursor()
            cur4.execute(f"SELECT email, name, email_notifications_enabled FROM {SCHEMA}.users WHERE id=%s", (organizer_id,))
            org_row2 = cur4.fetchone()
        finally:
            conn4.close()
        if org_row2 and org_row2[2]:
            html = reject_email(org_row2[1], venue_name, edate, venue_conditions)
            send_email(org_row2[0], f"Площадка «{venue_name}» отклонила запрос на {edate}", html)

    return ok({"success": True, "conversationId": conversation_id})


def _organizer_respond(b):
    booking_id = b.get("bookingId", "")
    response = b.get("response", "")
    organizer_name = b.get("organizerName", "Организатор")
    if not booking_id or response not in ("accepted", "cancelled"):
        return err("Некорректные данные")

    conn = get_conn(); cur = conn.cursor()
    new_status = "accepted" if response == "accepted" else "cancelled"
    cur.execute(
        f"""UPDATE {SCHEMA}.venue_bookings SET status=%s, organizer_response=%s, updated_at=NOW()
            WHERE id=%s
            RETURNING venue_user_id, venue_id, event_date, organizer_id, project_id,
                      rental_amount, venue_conditions, event_time, artist""",
        (new_status, response, booking_id))
    row = cur.fetchone()
    if not row: conn.close(); return err("Не найдено", 404)
    venue_user_id = str(row[0]); vid = str(row[1]); edate = str(row[2])
    organizer_id = str(row[3]); project_id = str(row[4])
    rental_amount = row[5]; venue_conditions = row[6] or ""
    event_time = row[7] or ""; artist = row[8] or ""
    cur.execute(f"SELECT name FROM {SCHEMA}.venues WHERE id=%s", (vid,))
    vrow = cur.fetchone(); venue_name = vrow[0] if vrow else "Площадка"
    cur.execute(f"SELECT title FROM {SCHEMA}.projects WHERE id=%s", (project_id,))
    prow = cur.fetchone(); project_title = prow[0] if prow else ""

    conversation_id = ""
    if response == "accepted":
        cur.execute(f"SELECT id FROM {SCHEMA}.booking_tasks WHERE booking_id=%s", (booking_id,))
        if not cur.fetchone():
            for i, (key, title, desc) in enumerate(BOOKING_TASKS):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.booking_tasks (booking_id, project_id, title, description, sort_order) VALUES (%s,%s,%s,%s,%s)",
                    (booking_id, project_id, title, desc, i))
        cur.execute(f"SELECT id FROM {SCHEMA}.booking_checklist WHERE booking_id=%s", (booking_id,))
        if not cur.fetchone():
            for i, (step_key, step_title) in enumerate(VENUE_CHECKLIST):
                is_done = step_key == "date_confirmed"
                cur.execute(
                    f"INSERT INTO {SCHEMA}.booking_checklist (booking_id, venue_id, step_key, step_title, is_done, sort_order) VALUES (%s,%s,%s,%s,%s,%s)",
                    (booking_id, vid, step_key, step_title, is_done, i))
        conn.commit()
    conn.close()

    if response == "accepted":
        rent_str = f"{int(rental_amount):,} ₽".replace(",", " ") if rental_amount else "не указана"
        chat_text = (
            f"Бронирование подтверждено!\n\nПлощадка: {venue_name}\nДата: {edate}"
            + (f" {event_time}" if event_time else "") + "\n"
            + (f"Артист: {artist}\n" if artist else "")
            + f"Аренда: {rent_str}\n"
            + (f"Условия: {venue_conditions}\n" if venue_conditions else "")
            + "\nЖдём вас на площадке!"
        )
        conversation_id = start_chat(organizer_id, vid, venue_user_id, venue_name, chat_text, organizer_name)
        if conversation_id:
            conn2 = get_conn(); cur2 = conn2.cursor()
            cur2.execute(f"UPDATE {SCHEMA}.venue_bookings SET conversation_id=%s WHERE id=%s",
                         (conversation_id, booking_id))
            conn2.commit(); conn2.close()
        # Автоматически добавляем дату в busy_dates
        note_text = project_title or (artist if artist else f"Бронирование #{booking_id[:8]}")
        conn_bd = get_conn(); cur_bd = conn_bd.cursor()
        cur_bd.execute(f"SELECT id FROM {SCHEMA}.venue_busy_dates WHERE venue_id=%s AND busy_date=%s", (vid, edate))
        if not cur_bd.fetchone():
            cur_bd.execute(
                f"INSERT INTO {SCHEMA}.venue_busy_dates (venue_id, busy_date, note) VALUES (%s, %s, %s)",
                (vid, edate, note_text))
            conn_bd.commit()
        conn_bd.close()

        send_notification(venue_user_id, "booking",
                          "Организатор принял условия бронирования",
                          f"Дата {edate} — бронирование подтверждено. Создан общий чат.", "chat")
        send_notification(organizer_id, "booking",
                          f"Площадка «{venue_name}» — бронирование активно!",
                          f"Дата {edate} подтверждена. Задачи добавлены в проект.", "projects")
    else:
        send_notification(venue_user_id, "booking",
                          "Организатор отменил бронирование",
                          f"Запрос на дату {edate} отменён", "notifications")

    return ok({"success": True, "conversationId": conversation_id})


def handler(event: dict, context) -> dict:
    """Обработка запросов на бронирование."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")

    if method == "POST" and action == "request_booking":
        return _request_booking(json.loads(event.get("body") or "{}"))
    if method == "POST" and action == "venue_respond":
        return _venue_respond(json.loads(event.get("body") or "{}"))
    if method == "POST" and action == "organizer_respond":
        return _organizer_respond(json.loads(event.get("body") or "{}"))

    return err("Unknown action", 404)
"""Чтение данных бронирований: списки, детали, занятые даты."""
import json
import os
import urllib.request
import psycopg2
from decimal import Decimal

SCHEMA = "t_p17532248_concert_platform_mvp"
CHAT_URL = "https://functions.poehali.dev/85035195-bd7b-44ce-b77c-db1255f711b5"


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


def start_chat(organizer_id, venue_id, venue_user_id, venue_name, message, organizer_name="Организатор"):
    payload = json.dumps({
        "organizerId": organizer_id, "venueId": venue_id,
        "venueUserId": venue_user_id, "venueName": venue_name,
        "message": message, "organizerName": organizer_name,
    }).encode()
    req = urllib.request.Request(
        f"{CHAT_URL}?action=start", data=payload,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read()).get("conversationId", "")
    except Exception:
        return ""


def handler(event: dict, context) -> dict:
    """Чтение данных бронирований и площадок."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")

    # GET venues_list — список площадок для выбора
    if method == "GET" and action == "venues_list":
        city = params.get("city", "")
        conn = get_conn()
        try:
            cur = conn.cursor()
            q = f"SELECT id, user_id, name, city, venue_type, capacity, price_from, photo_url FROM {SCHEMA}.venues WHERE 1=1"
            args = []
            if city:
                q += " AND city=%s"; args.append(city)
            q += " ORDER BY name"
            cur.execute(q, args)
            rows = cur.fetchall()
        finally:
            conn.close()
        return ok({"venues": [
            {"id": str(r[0]), "userId": str(r[1]), "name": r[2], "city": r[3],
             "venueType": r[4], "capacity": r[5], "priceFrom": r[6], "photoUrl": r[7]}
            for r in rows
        ]})

    # GET booked_dates — занятые даты площадки
    if method == "GET" and action == "booked_dates":
        vid = params.get("venue_id", "")
        if not vid: return err("venue_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"SELECT busy_date, note FROM {SCHEMA}.venue_busy_dates WHERE venue_id=%s", (vid,))
            busy = [{"date": str(r[0]), "note": r[1], "source": "manual"} for r in cur.fetchall()]
            cur.execute(f"SELECT event_date, artist FROM {SCHEMA}.venue_bookings WHERE venue_id=%s AND status='confirmed'", (vid,))
            for r in cur.fetchall():
                busy.append({"date": str(r[0]), "note": r[1] or "Забронировано", "source": "booking"})
        finally:
            conn.close()
        return ok({"bookedDates": busy})

    # GET booking_by_project — бронирования по проекту
    if method == "GET" and action == "booking_by_project":
        pid = params.get("project_id", "")
        if not pid: return err("project_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT b.id, b.venue_id, v.name, b.event_date, b.event_time,
                       b.artist, b.age_limit, b.expected_guests, b.status,
                       b.rental_amount, b.venue_conditions, b.organizer_response,
                       b.conversation_id
                FROM {SCHEMA}.venue_bookings b
                LEFT JOIN {SCHEMA}.venues v ON v.id=b.venue_id
                WHERE b.project_id=%s ORDER BY b.created_at DESC""", (pid,))
        rows = cur.fetchall(); conn.close()
        return ok({"bookings": [
            {"id": str(r[0]), "venueId": str(r[1]), "venueName": r[2] or "",
             "eventDate": str(r[3]), "eventTime": r[4] or "", "artist": r[5] or "",
             "ageLimit": r[6] or "", "expectedGuests": r[7], "status": r[8],
             "rentalAmount": float(r[9]) if r[9] else None,
             "venueConditions": r[10] or "", "organizerResponse": r[11] or "",
             "conversationId": str(r[12]) if r[12] else ""}
            for r in rows
        ]})

    # GET bookings_for_organizer
    if method == "GET" and action == "bookings_for_organizer":
        organizer_id = params.get("organizer_id", "")
        if not organizer_id: return err("organizer_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT b.id, b.venue_id, COALESCE(v.name, ''), b.project_id, COALESCE(p.title, b.artist, 'Мероприятие'),
                       b.event_date, b.event_time, b.artist, b.age_limit,
                       b.expected_guests, b.status, b.rental_amount, b.venue_conditions,
                       b.organizer_id, b.conversation_id
                FROM {SCHEMA}.venue_bookings b
                LEFT JOIN {SCHEMA}.venues v ON v.id=b.venue_id
                LEFT JOIN {SCHEMA}.projects p ON p.id=b.project_id
                WHERE b.organizer_id=%s ORDER BY b.created_at DESC""", (organizer_id,))
        rows = cur.fetchall(); conn.close()
        return ok({"bookings": [
            {"id": str(r[0]), "venueId": str(r[1]), "venueName": r[2],
             "projectId": str(r[3]), "projectTitle": r[4],
             "eventDate": str(r[5]), "eventTime": r[6] or "", "artist": r[7] or "",
             "ageLimit": r[8] or "", "expectedGuests": r[9], "status": r[10],
             "rentalAmount": float(r[11]) if r[11] else None,
             "venueConditions": r[12] or "", "organizerId": str(r[13]),
             "conversationId": str(r[14]) if r[14] else ""}
            for r in rows
        ]})

    # GET bookings_for_venue
    if method == "GET" and action == "bookings_for_venue":
        venue_user_id = params.get("venue_user_id", "")
        if not venue_user_id: return err("venue_user_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT b.id, b.venue_id, COALESCE(v.name, ''), b.project_id, COALESCE(p.title, b.artist, 'Мероприятие'),
                       b.event_date, b.event_time, b.artist, b.age_limit,
                       b.expected_guests, b.status, b.rental_amount, b.venue_conditions,
                       b.organizer_id, COALESCE(u.name, 'Организатор'), b.conversation_id
                FROM {SCHEMA}.venue_bookings b
                LEFT JOIN {SCHEMA}.venues v ON v.id=b.venue_id
                LEFT JOIN {SCHEMA}.projects p ON p.id=b.project_id
                LEFT JOIN {SCHEMA}.users u ON u.id=b.organizer_id
                WHERE b.venue_user_id=%s ORDER BY b.created_at DESC""", (venue_user_id,))
        rows = cur.fetchall(); conn.close()
        return ok({"bookings": [
            {"id": str(r[0]), "venueId": str(r[1]), "venueName": r[2],
             "projectId": str(r[3]), "projectTitle": r[4],
             "eventDate": str(r[5]), "eventTime": r[6] or "", "artist": r[7] or "",
             "ageLimit": r[8] or "", "expectedGuests": r[9], "status": r[10],
             "rentalAmount": float(r[11]) if r[11] else None,
             "venueConditions": r[12] or "", "organizerId": str(r[13]), "organizerName": r[14],
             "conversationId": str(r[15]) if r[15] else ""}
            for r in rows
        ]})

    # GET booking_detail — полное бронирование
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

    # POST create_missing_chat
    if method == "POST" and action == "create_missing_chat":
        b = json.loads(event.get("body") or "{}")
        booking_id = b.get("bookingId", "")
        if not booking_id: return err("bookingId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT b.organizer_id, b.venue_id, b.venue_user_id, b.event_date, b.event_time,
                       b.artist, b.rental_amount, b.venue_conditions, b.conversation_id,
                       v.name
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
            f"Бронирование подтверждено!\n\nПлощадка: {venue_name}\nДата: {edate}"
            + (f" {event_time}" if event_time else "") + "\n"
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

    return err("Unknown action", 404)

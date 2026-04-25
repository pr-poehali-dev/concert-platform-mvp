"""
API для управления концертными площадками GLOBAL LINK.
GET  ?action=list          — список всех площадок (с фильтрами)
GET  ?action=my&user_id=X  — площадки текущего пользователя
POST ?action=create        — создать площадку (с фото и райдером base64)
POST ?action=update        — обновить площадку
"""
import json
import os
import base64
import uuid
import psycopg2
import boto3

SCHEMA = "t_p17532248_concert_platform_mvp"


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


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    }


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"}, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def row_to_venue(row) -> dict:
    return {
        "id": str(row[0]),
        "userId": str(row[1]),
        "name": row[2],
        "city": row[3],
        "address": row[4],
        "venueType": row[5],
        "capacity": row[6],
        "priceFrom": row[7],
        "description": row[8],
        "photoUrl": row[9],
        "riderUrl": row[10],
        "riderName": row[11],
        "tags": list(row[12]) if row[12] else [],
        "rating": float(row[13]) if row[13] else 0,
        "reviewsCount": row[14],
        "verified": row[15],
        "createdAt": str(row[16]),
    }


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "list")

    # GET ?action=list
    if method == "GET" and action == "list":
        city = params.get("city", "")
        venue_type = params.get("type", "")
        capacity_min = int(params.get("capacity_min", 0) or 0)

        conn = get_conn()
        cur = conn.cursor()
        query = f"""SELECT id, user_id, name, city, address, venue_type, capacity, price_from,
                           description, photo_url, rider_url, rider_name, tags, rating, reviews_count, verified, created_at
                    FROM {SCHEMA}.venues WHERE 1=1"""
        args = []
        if city:
            query += " AND city = %s"; args.append(city)
        if venue_type:
            query += " AND venue_type = %s"; args.append(venue_type)
        if capacity_min:
            query += " AND capacity >= %s"; args.append(capacity_min)
        query += " ORDER BY rating DESC, created_at DESC LIMIT 50"
        cur.execute(query, args)
        rows = cur.fetchall()
        conn.close()
        return ok({"venues": [row_to_venue(r) for r in rows]})

    # GET ?action=my&user_id=X
    if method == "GET" and action == "my":
        user_id = params.get("user_id", "")
        if not user_id:
            return err("user_id required")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, user_id, name, city, address, venue_type, capacity, price_from,
                       description, photo_url, rider_url, rider_name, tags, rating, reviews_count, verified, created_at
                FROM {SCHEMA}.venues WHERE user_id = %s ORDER BY created_at DESC""",
            (user_id,)
        )
        rows = cur.fetchall()

        # busy dates
        venue_ids = [str(r[0]) for r in rows]
        busy = {}
        if venue_ids:
            placeholders = ",".join(["%s"] * len(venue_ids))
            cur.execute(
                f"SELECT venue_id, busy_date, note FROM {SCHEMA}.venue_busy_dates WHERE venue_id IN ({placeholders})",
                venue_ids
            )
            for bd in cur.fetchall():
                vid = str(bd[0])
                busy.setdefault(vid, []).append({"date": str(bd[1]), "note": bd[2]})
        conn.close()

        venues = []
        for r in rows:
            v = row_to_venue(r)
            v["busyDates"] = busy.get(v["id"], [])
            venues.append(v)
        return ok({"venues": venues})

    # POST ?action=create
    if method == "POST" and action == "create":
        body = json.loads(event.get("body") or "{}")
        user_id = body.get("userId", "")
        name = (body.get("name") or "").strip()
        city = (body.get("city") or "").strip()
        address = (body.get("address") or "").strip()
        venue_type = body.get("venueType") or "Клуб"
        capacity = int(body.get("capacity") or 0)
        price_from = int(body.get("priceFrom") or 0)
        description = (body.get("description") or "").strip()
        tags = body.get("tags") or []
        busy_dates = body.get("busyDates") or []

        if not name: return err("Введите название")
        if not city: return err("Укажите город")
        if not user_id: return err("userId required")

        photo_url = ""
        rider_url = ""
        rider_name = ""

        s3 = get_s3()

        # Upload photo
        photo_b64 = body.get("photoBase64", "")
        photo_mime = body.get("photoMime", "image/jpeg")
        if photo_b64:
            photo_data = base64.b64decode(photo_b64)
            photo_key = f"venues/{uuid.uuid4()}.jpg"
            s3.put_object(Bucket="files", Key=photo_key, Body=photo_data, ContentType=photo_mime)
            photo_url = cdn_url(photo_key)

        # Upload rider
        rider_b64 = body.get("riderBase64", "")
        rider_mime = body.get("riderMime", "application/pdf")
        rider_orig_name = body.get("riderFileName", "rider.pdf")
        if rider_b64:
            rider_data = base64.b64decode(rider_b64)
            ext = rider_orig_name.rsplit(".", 1)[-1] if "." in rider_orig_name else "pdf"
            rider_key = f"riders/{uuid.uuid4()}.{ext}"
            s3.put_object(Bucket="files", Key=rider_key, Body=rider_data, ContentType=rider_mime)
            rider_url = cdn_url(rider_key)
            rider_name = rider_orig_name

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.venues
                (user_id, name, city, address, venue_type, capacity, price_from, description, photo_url, rider_url, rider_name, tags)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (user_id, name, city, address, venue_type, capacity, price_from, description,
             photo_url, rider_url, rider_name, tags)
        )
        venue_id = str(cur.fetchone()[0])

        for bd in busy_dates:
            if bd.get("date"):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.venue_busy_dates (venue_id, busy_date, note) VALUES (%s, %s, %s)",
                    (venue_id, bd["date"], bd.get("note", ""))
                )
        conn.commit()
        conn.close()
        return ok({"venueId": venue_id}, 201)

    # POST ?action=update
    if method == "POST" and action == "update":
        body = json.loads(event.get("body") or "{}")
        venue_id = body.get("venueId", "")
        user_id = body.get("userId", "")
        if not venue_id or not user_id:
            return err("venueId и userId обязательны")

        fields = {}
        for key, col in [("name","name"),("city","city"),("address","address"),("venueType","venue_type"),
                         ("capacity","capacity"),("priceFrom","price_from"),("description","description"),("tags","tags")]:
            if key in body:
                fields[col] = body[key]

        if not fields:
            return err("Нет данных для обновления")

        set_clause = ", ".join(f"{c} = %s" for c in fields)
        values = list(fields.values()) + [venue_id, user_id]

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.venues SET {set_clause} WHERE id = %s AND user_id = %s", values)
        conn.commit()
        conn.close()
        return ok({"success": True})

    return err("Not found", 404)

"""
API для управления концертными площадками GLOBAL LINK.
GET  ?action=list           — список всех площадок (с фильтрами)
GET  ?action=my&user_id=X   — площадки текущего пользователя
POST ?action=create         — создать площадку (фото[], схема, райдер base64)
POST ?action=update         — обновить площадку
POST ?action=add_photos     — добавить фото к существующей площадке
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
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


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
        "schemaUrl": row[17] if len(row) > 17 else "",
        "schemaName": row[18] if len(row) > 18 else "",
        "phone": row[19] if len(row) > 19 else "",
        "website": row[20] if len(row) > 20 else "",
        "importedFrom": row[21] if len(row) > 21 else "",
        "ownerUserId": str(row[22]) if len(row) > 22 and row[22] else "",
    }


def upload_file(s3, data_b64: str, mime: str, folder: str, ext: str) -> str:
    """Декодирует base64, загружает в S3, возвращает CDN URL."""
    raw = base64.b64decode(data_b64)
    key = f"{folder}/{uuid.uuid4()}.{ext}"
    s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=mime)
    return cdn_url(key)


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "list")

    # ── GET list ──────────────────────────────────────────────────────────
    if method == "GET" and action == "list":
        city = params.get("city", "")
        venue_type = params.get("type", "")
        capacity_min = int(params.get("capacity_min", 0) or 0)

        conn = get_conn()
        cur = conn.cursor()
        query = f"""SELECT id, user_id, name, city, address, venue_type, capacity, price_from,
                           description, photo_url, rider_url, rider_name, tags, rating,
                           reviews_count, verified, created_at, schema_url, schema_name,
                           phone, website, imported_from, owner_user_id
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

        # Подтягиваем все фото для этих площадок
        venue_ids = [str(r[0]) for r in rows]
        photos_map: dict = {}
        if venue_ids:
            placeholders = ",".join(["%s"] * len(venue_ids))
            cur.execute(
                f"SELECT venue_id, photo_url FROM {SCHEMA}.venue_photos WHERE venue_id IN ({placeholders}) ORDER BY sort_order ASC",
                venue_ids,
            )
            for pr in cur.fetchall():
                photos_map.setdefault(str(pr[0]), []).append(pr[1])
        conn.close()

        result = []
        for r in rows:
            v = row_to_venue(r)
            v["photos"] = photos_map.get(v["id"], [v["photoUrl"]] if v["photoUrl"] else [])
            result.append(v)
        return ok({"venues": result})

    # ── GET my ────────────────────────────────────────────────────────────
    if method == "GET" and action == "my":
        user_id = params.get("user_id", "")
        if not user_id:
            return err("user_id required")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, user_id, name, city, address, venue_type, capacity, price_from,
                       description, photo_url, rider_url, rider_name, tags, rating,
                       reviews_count, verified, created_at, schema_url, schema_name,
                       phone, website, imported_from, owner_user_id
                FROM {SCHEMA}.venues WHERE user_id = %s ORDER BY created_at DESC""",
            (user_id,)
        )
        rows = cur.fetchall()

        venue_ids = [str(r[0]) for r in rows]
        photos_map: dict = {}
        busy_map: dict = {}

        if venue_ids:
            placeholders = ",".join(["%s"] * len(venue_ids))
            cur.execute(
                f"SELECT venue_id, photo_url FROM {SCHEMA}.venue_photos WHERE venue_id IN ({placeholders}) ORDER BY sort_order ASC",
                venue_ids,
            )
            for pr in cur.fetchall():
                photos_map.setdefault(str(pr[0]), []).append(pr[1])
            cur.execute(
                f"SELECT venue_id, busy_date, note FROM {SCHEMA}.venue_busy_dates WHERE venue_id IN ({placeholders})",
                venue_ids,
            )
            for bd in cur.fetchall():
                busy_map.setdefault(str(bd[0]), []).append({"date": str(bd[1]), "note": bd[2]})

        conn.close()
        venues = []
        for r in rows:
            v = row_to_venue(r)
            v["photos"] = photos_map.get(v["id"], [v["photoUrl"]] if v["photoUrl"] else [])
            v["busyDates"] = busy_map.get(v["id"], [])
            venues.append(v)
        return ok({"venues": venues})

    # ── POST create ───────────────────────────────────────────────────────
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

        s3 = get_s3()

        # ── Главное фото (первое из массива или отдельный ключ) ────────────
        photo_url = ""
        photos_b64 = body.get("photosBase64") or []  # [{data, mime}]
        if not photos_b64 and body.get("photoBase64"):
            photos_b64 = [{"data": body["photoBase64"], "mime": body.get("photoMime", "image/jpeg")}]

        uploaded_photos = []
        for ph in photos_b64:
            if not ph.get("data"): continue
            ext = ph.get("mime", "image/jpeg").split("/")[-1].replace("jpeg", "jpg")
            url = upload_file(s3, ph["data"], ph.get("mime", "image/jpeg"), "venues", ext)
            uploaded_photos.append(url)
        if uploaded_photos:
            photo_url = uploaded_photos[0]

        # ── Технический райдер ─────────────────────────────────────────────
        rider_url = ""
        rider_name = ""
        if body.get("riderBase64"):
            rider_orig = body.get("riderFileName", "rider.pdf")
            ext = rider_orig.rsplit(".", 1)[-1] if "." in rider_orig else "pdf"
            rider_url = upload_file(s3, body["riderBase64"], body.get("riderMime", "application/pdf"), "riders", ext)
            rider_name = rider_orig

        # ── Схема площадки ─────────────────────────────────────────────────
        schema_url = ""
        schema_name = ""
        if body.get("schemaBase64"):
            schema_orig = body.get("schemaFileName", "schema.pdf")
            ext = schema_orig.rsplit(".", 1)[-1] if "." in schema_orig else "pdf"
            schema_url = upload_file(s3, body["schemaBase64"], body.get("schemaMime", "application/pdf"), "schemas", ext)
            schema_name = schema_orig

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.venues
                (user_id, name, city, address, venue_type, capacity, price_from, description,
                 photo_url, rider_url, rider_name, tags, schema_url, schema_name)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (user_id, name, city, address, venue_type, capacity, price_from, description,
             photo_url, rider_url, rider_name, tags, schema_url, schema_name)
        )
        venue_id = str(cur.fetchone()[0])

        # Сохраняем все фото в venue_photos
        for i, url in enumerate(uploaded_photos):
            cur.execute(
                f"INSERT INTO {SCHEMA}.venue_photos (venue_id, photo_url, sort_order) VALUES (%s, %s, %s)",
                (venue_id, url, i)
            )

        # Занятые даты
        for bd in busy_dates:
            if bd.get("date"):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.venue_busy_dates (venue_id, busy_date, note) VALUES (%s, %s, %s)",
                    (venue_id, bd["date"], bd.get("note", ""))
                )
        conn.commit()
        conn.close()
        return ok({"venueId": venue_id}, 201)

    # ── POST add_photos ───────────────────────────────────────────────────
    if method == "POST" and action == "add_photos":
        body = json.loads(event.get("body") or "{}")
        venue_id = body.get("venueId", "")
        user_id = body.get("userId", "")
        photos_b64 = body.get("photosBase64") or []
        if not venue_id or not user_id:
            return err("venueId и userId обязательны")

        s3 = get_s3()
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT MAX(sort_order) FROM {SCHEMA}.venue_photos WHERE venue_id = %s", (venue_id,))
        row = cur.fetchone()
        start_order = (row[0] or -1) + 1

        urls = []
        for i, ph in enumerate(photos_b64):
            if not ph.get("data"): continue
            ext = ph.get("mime", "image/jpeg").split("/")[-1].replace("jpeg", "jpg")
            url = upload_file(s3, ph["data"], ph.get("mime", "image/jpeg"), "venues", ext)
            cur.execute(
                f"INSERT INTO {SCHEMA}.venue_photos (venue_id, photo_url, sort_order) VALUES (%s, %s, %s)",
                (venue_id, url, start_order + i)
            )
            urls.append(url)

        # Если у площадки нет главного фото — ставим первое
        cur.execute(f"SELECT photo_url FROM {SCHEMA}.venues WHERE id = %s", (venue_id,))
        vrow = cur.fetchone()
        if vrow and not vrow[0] and urls:
            cur.execute(f"UPDATE {SCHEMA}.venues SET photo_url = %s WHERE id = %s", (urls[0], venue_id))

        conn.commit()
        conn.close()
        return ok({"added": len(urls), "urls": urls})

    # ── POST update ───────────────────────────────────────────────────────
    if method == "POST" and action == "update":
        body    = json.loads(event.get("body") or "{}")
        venue_id = body.get("venueId", "")
        user_id  = body.get("userId", "")
        if not venue_id:
            return err("venueId обязателен")

        conn = get_conn(); cur = conn.cursor()

        # Проверяем владение (userId опционален — используем сессию если не передан)
        owner_check = user_id if user_id else None
        if owner_check:
            cur.execute(f"SELECT id FROM {SCHEMA}.venues WHERE id = %s AND user_id = %s", (venue_id, owner_check))
        else:
            cur.execute(f"SELECT id FROM {SCHEMA}.venues WHERE id = %s", (venue_id,))
        if not cur.fetchone():
            conn.close(); return err("Площадка не найдена или нет прав", 403)

        # Основные поля
        fields = {}
        for key, col in [("name","name"),("city","city"),("address","address"),("venueType","venue_type"),
                         ("capacity","capacity"),("priceFrom","price_from"),("description","description"),("tags","tags")]:
            if key in body:
                fields[col] = body[key]

        s3 = get_s3()

        # Новые фотографии
        new_photos_b64 = body.get("photosBase64") or []
        uploaded_photo_urls = []
        for ph in new_photos_b64:
            if not ph.get("data"): continue
            ext = ph.get("mime", "image/jpeg").split("/")[-1].replace("jpeg", "jpg")
            url = upload_file(s3, ph["data"], ph.get("mime", "image/jpeg"), "venues", ext)
            uploaded_photo_urls.append(url)

        # Существующие фото (те что оставил пользователь)
        existing_photos = body.get("existingPhotos") or []
        all_photos = existing_photos + uploaded_photo_urls

        # Обновляем главное фото
        if all_photos:
            fields["photo_url"] = all_photos[0]
        elif body.get("existingPhotos") is not None:
            fields["photo_url"] = ""

        # Райдер
        if body.get("riderBase64"):
            rider_orig = body.get("riderFileName", "rider.pdf")
            ext = rider_orig.rsplit(".", 1)[-1] if "." in rider_orig else "pdf"
            fields["rider_url"]  = upload_file(s3, body["riderBase64"], body.get("riderMime", "application/pdf"), "riders", ext)
            fields["rider_name"] = rider_orig
        elif body.get("clearRider"):
            fields["rider_url"]  = ""
            fields["rider_name"] = ""

        # Схема
        if body.get("schemaBase64"):
            schema_orig = body.get("schemaFileName", "schema.pdf")
            ext = schema_orig.rsplit(".", 1)[-1] if "." in schema_orig else "pdf"
            fields["schema_url"]  = upload_file(s3, body["schemaBase64"], body.get("schemaMime", "application/pdf"), "schemas", ext)
            fields["schema_name"] = schema_orig
        elif body.get("clearSchema"):
            fields["schema_url"]  = ""
            fields["schema_name"] = ""

        # Сохраняем основные поля
        if fields:
            set_clause = ", ".join(f"{c} = %s" for c in fields)
            cur.execute(f"UPDATE {SCHEMA}.venues SET {set_clause} WHERE id = %s", list(fields.values()) + [venue_id])

        # Обновляем фото в venue_photos
        if body.get("existingPhotos") is not None or uploaded_photo_urls:
            cur.execute(f"DELETE FROM {SCHEMA}.venue_photos WHERE venue_id = %s", (venue_id,))
            for i, url in enumerate(all_photos):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.venue_photos (venue_id, photo_url, sort_order) VALUES (%s, %s, %s)",
                    (venue_id, url, i)
                )

        # Обновляем занятые даты
        if "busyDates" in body:
            cur.execute(f"DELETE FROM {SCHEMA}.venue_busy_dates WHERE venue_id = %s", (venue_id,))
            for bd in (body["busyDates"] or []):
                if bd.get("date"):
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.venue_busy_dates (venue_id, busy_date, note) VALUES (%s, %s, %s)",
                        (venue_id, bd["date"], bd.get("note", ""))
                    )

        conn.commit(); conn.close()
        return ok({"success": True})

    # ── GET home_stats — реальная статистика для главной страницы ─────────
    if method == "GET" and action == "home_stats":
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.venues")
        total_venues = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE role = 'organizer'")
        total_organizers = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(DISTINCT city) FROM {SCHEMA}.venues WHERE city != ''")
        total_cities = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users")
        total_users = cur.fetchone()[0]
        conn.close()
        return ok({
            "venues": total_venues,
            "organizers": total_organizers,
            "cities": total_cities,
            "totalUsers": total_users,
        })

    # ── GET top — топ площадки для главной (реальные из БД) ───────────────
    if method == "GET" and action == "top":
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id, name, city, venue_type, capacity, price_from,
                       photo_url, rating, tags
                FROM {SCHEMA}.venues
                ORDER BY rating DESC, created_at DESC LIMIT 3""",
        )
        rows = cur.fetchall()
        # Фото из venue_photos
        venue_ids = [str(r[0]) for r in rows]
        photos_map: dict = {}
        if venue_ids:
            placeholders = ",".join(["%s"] * len(venue_ids))
            cur.execute(
                f"SELECT venue_id, photo_url FROM {SCHEMA}.venue_photos WHERE venue_id IN ({placeholders}) ORDER BY sort_order ASC",
                venue_ids,
            )
            for pr in cur.fetchall():
                photos_map.setdefault(str(pr[0]), []).append(pr[1])
        conn.close()
        venues = []
        for r in rows:
            vid = str(r[0])
            photos = photos_map.get(vid, [r[6]] if r[6] else [])
            venues.append({
                "id": vid, "name": r[1], "city": r[2], "venueType": r[3],
                "capacity": r[4], "priceFrom": float(r[5] or 0),
                "photoUrl": photos[0] if photos else "",
                "rating": float(r[7] or 0),
                "tags": list(r[8]) if r[8] else [],
            })
        return ok({"venues": venues})

    return err("Not found", 404)
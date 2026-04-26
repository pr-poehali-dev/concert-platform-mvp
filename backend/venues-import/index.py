"""
API для поиска и импорта концертных площадок через OpenStreetMap (Overpass API).
GET  ?action=search&city=Москва&type=club  — поиск через OSM
POST ?action=import                         — импорт выбранных площадок в БД (admin)
POST ?action=claim                          — заявка на владение площадкой (venue owner)
POST ?action=approve_claim                  — одобрить заявку (admin)
GET  ?action=claims                         — список заявок (admin)
"""
import json
import os
import uuid
import psycopg2
import urllib.request
import urllib.parse

SCHEMA = "t_p17532248_concert_platform_mvp"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

CITY_COORDS = {
    "Москва":           (55.7558, 37.6173, 30000),
    "Санкт-Петербург":  (59.9343, 30.3351, 25000),
    "Екатеринбург":     (56.8389, 60.6057, 20000),
    "Новосибирск":      (54.9884, 82.9357, 20000),
    "Казань":           (55.8304, 49.0661, 18000),
    "Краснодар":        (45.0355, 38.9753, 18000),
    "Нижний Новгород":  (56.2965, 43.9361, 18000),
    "Ростов-на-Дону":   (47.2357, 39.7015, 18000),
    "Уфа":              (54.7388, 55.9721, 18000),
    "Самара":           (53.2001, 50.1500, 18000),
    "Челябинск":        (55.1644, 61.4368, 18000),
    "Омск":             (54.9885, 73.3242, 18000),
    "Воронеж":          (51.6755, 39.2088, 15000),
    "Пермь":            (58.0105, 56.2502, 18000),
    "Волгоград":        (48.7080, 44.5133, 18000),
}

OSM_VENUE_TAGS = [
    '["amenity"="nightclub"]',
    '["amenity"="music_venue"]',
    '["amenity"="theatre"]',
    '["leisure"="music_venue"]',
    '["venue"="concert_hall"]',
    '["venue"="music_venue"]',
    '["venue"="nightclub"]',
]

TYPE_FILTER_MAP = {
    "club":    ['["amenity"="nightclub"]', '["venue"="nightclub"]'],
    "concert": ['["amenity"="music_venue"]', '["leisure"="music_venue"]', '["venue"="concert_hall"]', '["venue"="music_venue"]'],
    "theatre": ['["amenity"="theatre"]'],
    "all":     OSM_VENUE_TAGS,
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id, X-Admin-Secret, X-User-Id",
    }


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def osm_search(lat: float, lon: float, radius: int, tag_filters: list) -> list:
    """Запрос к Overpass API OpenStreetMap."""
    tag_queries = "\n".join([
        f'  node{tf}(around:{radius},{lat},{lon});\n  way{tf}(around:{radius},{lat},{lon});'
        for tf in tag_filters
    ])
    query = f"""[out:json][timeout:25];
(
{tag_queries}
);
out body center 50;"""

    data = urllib.parse.urlencode({"data": query}).encode()
    req = urllib.request.Request(
        OVERPASS_URL,
        data=data,
        headers={"User-Agent": "GlobalLink-ConcertPlatform/1.0 (contact@globallink.ru)"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode())
    return result.get("elements", [])


def parse_osm_element(el: dict, city: str) -> dict | None:
    """Преобразует OSM элемент в нашу структуру."""
    tags = el.get("tags", {})
    name = tags.get("name") or tags.get("name:ru", "")
    if not name:
        return None

    # Координаты (node или center of way)
    if el.get("type") == "node":
        lat = el.get("lat")
        lon = el.get("lon")
    else:
        center = el.get("center", {})
        lat = center.get("lat")
        lon = center.get("lon")

    # Адрес
    addr_parts = []
    if tags.get("addr:street"):
        addr_parts.append(tags["addr:street"])
        if tags.get("addr:housenumber"):
            addr_parts[-1] += f", {tags['addr:housenumber']}"
    address = ", ".join(addr_parts) if addr_parts else tags.get("addr:full", "")

    # Контакты
    phone = tags.get("phone") or tags.get("contact:phone", "")
    website = tags.get("website") or tags.get("contact:website", "")

    # Вместимость
    capacity = 0
    cap_str = tags.get("capacity", "")
    if cap_str and cap_str.isdigit():
        capacity = int(cap_str)

    # Тип
    amenity = tags.get("amenity", "")
    venue_tag = tags.get("venue", "")
    venue_type = _detect_osm_type(amenity, venue_tag, tags)

    # Теги/жанры
    genre = tags.get("music") or tags.get("genre", "")
    osm_tags = []
    if genre:
        osm_tags = [g.strip() for g in genre.replace(";", ",").split(",") if g.strip()]

    osm_id = f"osm:{el.get('type', 'n')}:{el.get('id', '')}"

    return {
        "osmId": osm_id,
        "name": name,
        "city": city,
        "address": address,
        "phone": phone,
        "website": website,
        "tags": osm_tags,
        "capacity": capacity,
        "latitude": lat,
        "longitude": lon,
        "venueType": venue_type,
        "alreadyImported": False,
    }


def _detect_osm_type(amenity: str, venue: str, tags: dict) -> str:
    combined = f"{amenity} {venue}".lower()
    if "nightclub" in combined:
        return "Клуб"
    if "concert_hall" in combined or "music_venue" in combined:
        return "Концертный зал"
    if "theatre" in combined:
        return "Театр"
    if "stadium" in combined or "arena" in combined:
        return "Стадион"
    if tags.get("amenity") == "bar":
        return "Бар"
    return "Площадка"


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "search")

    # ── GET search — поиск через OpenStreetMap ────────────────────────────
    if method == "GET" and action == "search":
        city = params.get("city", "Москва")
        osm_type = params.get("type", "all")

        coords = CITY_COORDS.get(city)
        if not coords:
            return err(f"Город «{city}» не поддерживается")

        lat, lon, radius = coords
        tag_filters = TYPE_FILTER_MAP.get(osm_type, OSM_VENUE_TAGS)

        try:
            elements = osm_search(lat, lon, radius, tag_filters)
        except Exception as e:
            return err(f"Ошибка OpenStreetMap: {str(e)}")

        results = []
        seen_names = set()
        for el in elements:
            parsed = parse_osm_element(el, city)
            if parsed and parsed["name"] not in seen_names:
                seen_names.add(parsed["name"])
                results.append(parsed)

        # Проверяем какие уже есть в БД
        if results:
            conn = get_conn()
            cur = conn.cursor()
            osm_ids = [r["osmId"] for r in results]
            placeholders = ",".join([f"'{oid}'" for oid in osm_ids])
            cur.execute(f"SELECT yandex_org_id FROM {SCHEMA}.venues WHERE yandex_org_id IN ({placeholders})")
            existing = {row[0] for row in cur.fetchall()}
            conn.close()
            for r in results:
                r["alreadyImported"] = r["osmId"] in existing

        results.sort(key=lambda x: (x["alreadyImported"], -x["capacity"]))
        return ok({"results": results, "city": city, "total": len(results)})

    # ── POST import — импорт в БД (только admin) ──────────────────────────
    if method == "POST" and action == "import":
        body = json.loads(event.get("body") or "{}")
        venues_data = body.get("venues", [])
        admin_secret = event.get("headers", {}).get("X-Admin-Secret", "")

        if admin_secret != os.environ.get("ADMIN_SECRET", ""):
            return err("Доступ запрещён", 403)

        if not venues_data:
            return err("Нет площадок для импорта")

        conn = get_conn()
        cur = conn.cursor()
        imported = 0
        skipped = 0

        for v in venues_data:
            osm_id = v.get("osmId", "")
            if osm_id:
                cur.execute(f"SELECT id FROM {SCHEMA}.venues WHERE yandex_org_id = '{osm_id}'")
                if cur.fetchone():
                    skipped += 1
                    continue

            tags_arr = "{" + ",".join([f'"{t}"' for t in (v.get("tags") or [])]) + "}"
            lat = v.get("latitude")
            lon = v.get("longitude")
            lat_val = str(lat) if lat is not None else "NULL"
            lon_val = str(lon) if lon is not None else "NULL"
            cap = int(v.get("capacity") or 0)

            def esc(s): return str(s or "").replace("'", "''")

            cur.execute(f"""
                INSERT INTO {SCHEMA}.venues
                    (user_id, name, city, address, venue_type, capacity, price_from,
                     description, photo_url, rider_url, rider_name, tags, rating,
                     reviews_count, verified, schema_url, schema_name,
                     yandex_org_id, phone, website, latitude, longitude, imported_from)
                VALUES
                    ('{uuid.uuid4()}', '{esc(v.get("name"))}', '{esc(v.get("city"))}',
                     '{esc(v.get("address"))}', '{esc(v.get("venueType", "Площадка"))}',
                     {cap}, 0, '', '', '', '', '{tags_arr}',
                     0, 0, false, '', '',
                     '{esc(osm_id)}', '{esc(v.get("phone"))}', '{esc(v.get("website"))}',
                     {lat_val}, {lon_val}, 'openstreetmap')
            """)
            imported += 1

        conn.commit()
        conn.close()
        return ok({"imported": imported, "skipped": skipped})

    # ── POST claim — заявка на владение площадкой ─────────────────────────
    if method == "POST" and action == "claim":
        body = json.loads(event.get("body") or "{}")
        venue_id = body.get("venueId", "")
        user_id = body.get("userId", "")
        if not venue_id or not user_id:
            return err("venueId и userId обязательны")

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id, name, owner_user_id, claim_requested FROM {SCHEMA}.venues WHERE id = '{venue_id}'")
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Площадка не найдена", 404)
        if row[2]:
            conn.close()
            return err("У этой площадки уже есть подтверждённый владелец")
        if row[3]:
            conn.close()
            return err("Заявка на эту площадку уже отправлена и ожидает проверки")

        cur.execute(f"""
            UPDATE {SCHEMA}.venues
            SET claim_requested = true, owner_user_id = '{user_id}'
            WHERE id = '{venue_id}'
        """)
        conn.commit()
        conn.close()
        return ok({"success": True, "venueName": row[1]})

    # ── GET claims — список заявок (admin) ────────────────────────────────
    if method == "GET" and action == "claims":
        admin_secret = event.get("headers", {}).get("X-Admin-Secret", "")
        if admin_secret != os.environ.get("ADMIN_SECRET", ""):
            return err("Доступ запрещён", 403)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            SELECT v.id, v.name, v.city, v.address, v.venue_type,
                   u.id, u.name, u.email, u.phone
            FROM {SCHEMA}.venues v
            JOIN {SCHEMA}.users u ON u.id = v.owner_user_id
            WHERE v.claim_requested = true
            ORDER BY v.created_at DESC
        """)
        rows = cur.fetchall()
        conn.close()
        claims = [{
            "venueId": str(r[0]), "venueName": r[1], "city": r[2],
            "address": r[3], "venueType": r[4],
            "userId": str(r[5]), "userName": r[6], "userEmail": r[7], "userPhone": r[8],
        } for r in rows]
        return ok({"claims": claims})

    # ── POST approve_claim — одобрить заявку (admin) ──────────────────────
    if method == "POST" and action == "approve_claim":
        body = json.loads(event.get("body") or "{}")
        venue_id = body.get("venueId", "")
        approve = body.get("approve", True)
        admin_secret = event.get("headers", {}).get("X-Admin-Secret", "")

        if admin_secret != os.environ.get("ADMIN_SECRET", ""):
            return err("Доступ запрещён", 403)

        conn = get_conn()
        cur = conn.cursor()
        if approve:
            cur.execute(f"""
                UPDATE {SCHEMA}.venues
                SET claim_requested = false, verified = true
                WHERE id = '{venue_id}'
            """)
        else:
            cur.execute(f"""
                UPDATE {SCHEMA}.venues
                SET claim_requested = false, owner_user_id = NULL
                WHERE id = '{venue_id}'
            """)
        conn.commit()
        conn.close()
        return ok({"success": True, "approved": approve})

    return err("Неизвестное действие", 404)

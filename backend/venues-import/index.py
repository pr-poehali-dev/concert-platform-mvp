"""
API для поиска и импорта концертных площадок через Яндекс Places API.
GET  ?action=search&query=клуб&city=Москва  — поиск площадок в Яндексе
POST ?action=import                          — импорт выбранных площадок в БД
GET  ?action=claim&venue_id=X&user_id=Y     — запрос на владение площадкой
POST ?action=approve_claim                   — одобрить владение (только admin)
"""
import json
import os
import uuid
import psycopg2
import urllib.request
import urllib.parse

SCHEMA = "t_p17532248_concert_platform_mvp"
YANDEX_API = "https://search-maps.yandex.ru/v1/"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id, X-Admin-Secret",
    }


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def yandex_search(query: str, city: str, results: int = 20) -> list:
    """Поиск организаций через Яндекс Places API."""
    api_key = os.environ.get("YANDEX_PLACES_API_KEY", "")
    full_query = f"{query} {city}".strip()
    params = urllib.parse.urlencode({
        "text": full_query,
        "type": "biz",
        "lang": "ru_RU",
        "results": results,
        "apikey": api_key,
    })
    url = f"{YANDEX_API}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "GlobalLink/1.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
    return data.get("features", [])


def parse_yandex_feature(feature: dict) -> dict:
    """Преобразует объект из Яндекс API в нашу структуру."""
    props = feature.get("properties", {})
    geo = feature.get("geometry", {})
    coords = geo.get("coordinates", [None, None])

    company_meta = props.get("CompanyMetaData", {})
    name = company_meta.get("name", "")
    address = company_meta.get("address", "")
    url = company_meta.get("url", "")
    org_id = company_meta.get("id", "")

    # Телефоны
    phones = company_meta.get("Phones", [])
    phone = phones[0].get("formatted", "") if phones else ""

    # Категории
    categories = company_meta.get("Categories", [])
    tags = [c.get("name", "") for c in categories if c.get("name")]

    # Город из адреса
    city = ""
    address_details = company_meta.get("address_components", [])
    for comp in address_details:
        if "locality" in comp.get("kinds", []):
            city = comp.get("name", "")
            break
    if not city and address:
        parts = address.split(",")
        if len(parts) >= 2:
            city = parts[0].strip()

    return {
        "yandexOrgId": org_id,
        "name": name,
        "city": city,
        "address": address,
        "phone": phone,
        "website": url,
        "tags": tags,
        "latitude": coords[1] if coords[1] else None,
        "longitude": coords[0] if coords[0] else None,
        "venueType": _detect_type(tags),
    }


def _detect_type(tags: list) -> str:
    tags_lower = " ".join(tags).lower()
    if "клуб" in tags_lower:
        return "Клуб"
    if "концертный зал" in tags_lower or "филармония" in tags_lower:
        return "Концертный зал"
    if "стадион" in tags_lower or "арена" in tags_lower:
        return "Стадион"
    if "бар" in tags_lower:
        return "Бар"
    return "Площадка"


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "search")

    # ── GET search ────────────────────────────────────────────────────────
    if method == "GET" and action == "search":
        query = params.get("query", "концертный клуб")
        city = params.get("city", "Москва")
        try:
            features = yandex_search(query, city, results=20)
        except Exception as e:
            return err(f"Ошибка Яндекс API: {str(e)}")

        results = []
        for f in features:
            parsed = parse_yandex_feature(f)
            if parsed["name"]:
                results.append(parsed)

        # Проверяем какие уже есть в БД
        if results:
            conn = get_conn()
            cur = conn.cursor()
            org_ids = [r["yandexOrgId"] for r in results if r["yandexOrgId"]]
            if org_ids:
                placeholders = ",".join([f"'{oid}'" for oid in org_ids])
                cur.execute(
                    f"SELECT yandex_org_id FROM {SCHEMA}.venues WHERE yandex_org_id IN ({placeholders})"
                )
                existing = {row[0] for row in cur.fetchall()}
                for r in results:
                    r["alreadyImported"] = r["yandexOrgId"] in existing
            conn.close()

        return ok({"results": results, "city": city, "query": query})

    # ── POST import ───────────────────────────────────────────────────────
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
            org_id = v.get("yandexOrgId", "")
            if org_id:
                cur.execute(
                    f"SELECT id FROM {SCHEMA}.venues WHERE yandex_org_id = '{org_id}'"
                )
                if cur.fetchone():
                    skipped += 1
                    continue

            tags_arr = "{" + ",".join([f'"{t}"' for t in (v.get("tags") or [])]) + "}"
            lat = v.get("latitude")
            lon = v.get("longitude")
            lat_val = f"{lat}" if lat is not None else "NULL"
            lon_val = f"{lon}" if lon is not None else "NULL"
            org_id_val = v.get("yandexOrgId", "").replace("'", "''")
            name_val = v.get("name", "").replace("'", "''")
            city_val = v.get("city", "").replace("'", "''")
            addr_val = v.get("address", "").replace("'", "''")
            phone_val = v.get("phone", "").replace("'", "''")
            website_val = v.get("website", "").replace("'", "''")
            vtype_val = v.get("venueType", "Площадка").replace("'", "''")

            cur.execute(f"""
                INSERT INTO {SCHEMA}.venues
                    (user_id, name, city, address, venue_type, capacity, price_from,
                     description, photo_url, rider_url, rider_name, tags, rating,
                     reviews_count, verified, schema_url, schema_name,
                     yandex_org_id, phone, website, latitude, longitude, imported_from)
                VALUES
                    ('{uuid.uuid4()}', '{name_val}', '{city_val}', '{addr_val}',
                     '{vtype_val}', 0, 0, '', '', '', '', '{tags_arr}',
                     0, 0, false, '', '',
                     '{org_id_val}', '{phone_val}', '{website_val}',
                     {lat_val}, {lon_val}, 'yandex')
            """)
            imported += 1

        conn.commit()
        conn.close()
        return ok({"imported": imported, "skipped": skipped})

    # ── GET claim — запрос на владение площадкой ─────────────────────────
    if method == "POST" and action == "claim":
        body = json.loads(event.get("body") or "{}")
        venue_id = body.get("venueId", "")
        user_id = body.get("userId", "")
        if not venue_id or not user_id:
            return err("venueId и userId обязательны")

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, name, owner_user_id FROM {SCHEMA}.venues WHERE id = '{venue_id}'"
        )
        row = cur.fetchone()
        if not row:
            return err("Площадка не найдена", 404)
        if row[2]:
            conn.close()
            return err("У этой площадки уже есть владелец")

        cur.execute(
            f"UPDATE {SCHEMA}.venues SET claim_requested = true WHERE id = '{venue_id}'"
        )
        conn.commit()
        conn.close()
        return ok({"success": True, "message": f"Заявка на площадку «{row[1]}» отправлена. Мы проверим и откроем доступ."})

    # ── POST approve_claim — одобрить владение (admin) ────────────────────
    if method == "POST" and action == "approve_claim":
        body = json.loads(event.get("body") or "{}")
        venue_id = body.get("venueId", "")
        user_id = body.get("userId", "")
        admin_secret = event.get("headers", {}).get("X-Admin-Secret", "")

        if admin_secret != os.environ.get("ADMIN_SECRET", ""):
            return err("Доступ запрещён", 403)

        if not venue_id or not user_id:
            return err("venueId и userId обязательны")

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            UPDATE {SCHEMA}.venues
            SET owner_user_id = '{user_id}',
                user_id = '{user_id}',
                claim_requested = false,
                verified = true
            WHERE id = '{venue_id}'
        """)
        conn.commit()
        conn.close()
        return ok({"success": True})

    return err("Неизвестное действие", 404)

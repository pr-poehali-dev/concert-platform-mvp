"""
Поиск компании по ИНН через бесплатное API ФНС (egrul.nalog.ru) — ключи не нужны.
GET ?inn=1234567890 — вернуть данные компании из ЕГРЮЛ/ЕГРИП
"""
import json, urllib.request, urllib.error, urllib.parse


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def ok(data):
    return {"statusCode": 200, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def search_egrul(inn: str) -> dict | None:
    """Запрос к открытому API ФНС ЕГРЮЛ/ЕГРИП — полностью бесплатно, ключи не нужны."""
    url = f"https://egrul.nalog.ru/search-result/{urllib.parse.quote(inn)}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; GLOBALLINK/2.0)",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read().decode("utf-8"))
        rows = data.get("rows", [])
        if not rows:
            return None
        return rows[0]
    except Exception as e:
        print(f"[inn-lookup] egrul error: {e}")
        return None


def search_egrul_post(inn: str) -> dict | None:
    """Альтернативный POST-запрос к ФНС."""
    payload = urllib.parse.urlencode({"query": inn, "region": ""}).encode("utf-8")
    req = urllib.request.Request(
        "https://egrul.nalog.ru/",
        data=payload,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; GLOBALLINK/2.0)",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
        },
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read().decode("utf-8"))
        token = data.get("t", "")
        if not token:
            return None

        # Второй запрос — получаем результаты по токену
        result_url = f"https://egrul.nalog.ru/search-result/{token}"
        req2 = urllib.request.Request(
            result_url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; GLOBALLINK/2.0)",
                "Accept": "application/json",
            },
        )
        resp2 = urllib.request.urlopen(req2, timeout=10)
        result = json.loads(resp2.read().decode("utf-8"))
        rows = result.get("rows", [])
        return rows[0] if rows else None
    except Exception as e:
        print(f"[inn-lookup] egrul POST error: {e}")
        return None


def handler(event: dict, context) -> dict:
    """Поиск компании по ИНН через бесплатный API ФНС ЕГРЮЛ/ЕГРИП."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    params = event.get("queryStringParameters") or {}
    inn = (params.get("inn") or "").strip().replace(" ", "")

    if not inn:
        return err("inn обязателен")
    if not inn.isdigit() or len(inn) not in (10, 12):
        return err("ИНН должен содержать 10 или 12 цифр")

    # Пробуем через POST (токен) — основной способ
    row = search_egrul_post(inn)

    # Если не получилось — пробуем напрямую через GET
    if not row:
        row = search_egrul(inn)

    if not row:
        return err("Компания с таким ИНН не найдена в ЕГРЮЛ/ЕГРИП", 404)

    # ФНС возвращает: n — название, g — ОГРН, r — регион, a — адрес,
    # i — ИНН, p — КПП, e — дата прекращения, c — статус
    name    = row.get("n", "") or row.get("name", "")
    ogrn    = row.get("g", "") or row.get("ogrn", "")
    kpp     = row.get("p", "") or row.get("kpp", "")
    address = row.get("a", "") or row.get("address", "")
    status  = row.get("e", "")  # дата ликвидации если есть

    if status:
        return err(f"Организация ликвидирована ({status})", 404)

    return ok({
        "name":      name,
        "fullName":  name,
        "shortName": name,
        "inn":       inn,
        "kpp":       kpp,
        "ogrn":      ogrn,
        "address":   address,
    })

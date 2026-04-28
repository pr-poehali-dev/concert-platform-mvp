"""
Поиск компании по ИНН через DaData (ЕГРЮЛ/ЕГРИП).
GET ?inn=1234567890 — вернуть данные компании
"""
import json, os, urllib.request, urllib.error


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


def handler(event: dict, context) -> dict:
    """Поиск компании по ИНН через DaData для формы регистрации."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    params = event.get("queryStringParameters") or {}
    inn = (params.get("inn") or "").strip().replace(" ", "")

    if not inn:
        return err("inn обязателен")
    if not inn.isdigit() or len(inn) not in (10, 12):
        return err("ИНН должен содержать 10 или 12 цифр")

    api_key = os.environ.get("DADATA_API_KEY", "")
    if not api_key:
        return err("DaData API key не настроен", 503)

    payload = json.dumps({"query": inn, "count": 1}).encode("utf-8")
    req = urllib.request.Request(
        "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Token {api_key}",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        body = json.loads(resp.read().decode("utf-8"))
        suggestions = body.get("suggestions", [])
        if not suggestions:
            return err("Компания с таким ИНН не найдена", 404)

        s = suggestions[0]
        d = s.get("data", {})
        return ok({
            "name":         s.get("value", ""),
            "fullName":     (d.get("name") or {}).get("full_with_opf", ""),
            "shortName":    (d.get("name") or {}).get("short_with_opf", ""),
            "inn":          d.get("inn", inn),
            "kpp":          d.get("kpp", ""),
            "ogrn":         d.get("ogrn", ""),
            "address":      (d.get("address") or {}).get("value", ""),
            "opf":          (d.get("opf") or {}).get("short", ""),
        })
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"[inn-lookup] DaData error {e.code}: {body}")
        return err("Ошибка запроса к DaData", 502)
    except Exception as ex:
        print(f"[inn-lookup] Exception: {ex}")
        return err("Ошибка поиска", 500)

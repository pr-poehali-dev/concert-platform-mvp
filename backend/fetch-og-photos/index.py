"""
Фоновое обновление фотографий площадок через og:image с их сайтов.
POST ?action=fetch  — запустить парсинг og:image для площадок без фото (admin)
GET  ?action=status — сколько площадок без фото осталось
"""
import json
import os
import re
import psycopg2
import urllib.request
import urllib.error

SCHEMA = "t_p17532248_concert_platform_mvp"
TIMEOUT = 8


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Admin-Secret",
    }


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def fetch_og_image(url: str) -> str | None:
    """Загружает страницу и извлекает og:image или twitter:image."""
    if not url:
        return None
    if not url.startswith("http"):
        url = "https://" + url
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; GlobalLink/1.0; +https://globallink.art)",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "ru,en;q=0.9",
            }
        )
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            raw = resp.read(80000)
            try:
                html = raw.decode("utf-8", errors="replace")
            except Exception:
                html = raw.decode("latin-1", errors="replace")
    except Exception as e:
        print(f"[og] fetch error {url}: {e}")
        return None

    # og:image
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if not m:
        m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html, re.IGNORECASE)
    if not m:
        # twitter:image fallback
        m = re.search(r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if not m:
        m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']', html, re.IGNORECASE)

    if not m:
        return None

    img_url = m.group(1).strip()
    if not img_url or img_url.startswith("data:"):
        return None

    # Относительный URL → абсолютный
    if img_url.startswith("//"):
        img_url = "https:" + img_url
    elif img_url.startswith("/"):
        from urllib.parse import urlparse
        parsed = urlparse(url)
        img_url = f"{parsed.scheme}://{parsed.netloc}{img_url}"

    return img_url if img_url.startswith("http") else None


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "status")
    admin_secret = event.get("headers", {}).get("X-Admin-Secret", "")

    # ── GET status ────────────────────────────────────────────────────────
    if method == "GET" and action == "status":
        if admin_secret != os.environ.get("ADMIN_SECRET", ""):
            return err("Доступ запрещён", 403)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            SELECT
                COUNT(*) FILTER (WHERE photo_url = '' AND website != '') as needs_fetch,
                COUNT(*) FILTER (WHERE photo_url != '') as has_photo,
                COUNT(*) as total
            FROM {SCHEMA}.venues WHERE imported_from = 'openstreetmap'
        """)
        row = cur.fetchone()
        conn.close()
        return ok({
            "needsFetch": row[0],
            "hasPhoto": row[1],
            "total": row[2],
        })

    # ── POST fetch ────────────────────────────────────────────────────────
    if method == "POST" and action == "fetch":
        if admin_secret != os.environ.get("ADMIN_SECRET", ""):
            return err("Доступ запрещён", 403)

        body = json.loads(event.get("body") or "{}")
        limit = int(body.get("limit", 20))

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            SELECT id, name, website
            FROM {SCHEMA}.venues
            WHERE imported_from = 'openstreetmap'
              AND photo_url = ''
              AND website != ''
            LIMIT {limit}
        """)
        venues = cur.fetchall()

        updated = 0
        failed = 0
        results = []

        for venue_id, name, website in venues:
            print(f"[og] fetching {name} → {website}")
            img_url = fetch_og_image(website)
            if img_url:
                cur.execute(f"""
                    UPDATE {SCHEMA}.venues
                    SET photo_url = '{img_url.replace("'", "''")}'
                    WHERE id = '{venue_id}'
                """)
                updated += 1
                results.append({"name": name, "photo": img_url, "status": "ok"})
                print(f"[og] ✓ {name}: {img_url}")
            else:
                failed += 1
                results.append({"name": name, "photo": None, "status": "no_image"})
                print(f"[og] ✗ {name}: no og:image found")

        conn.commit()
        conn.close()

        return ok({
            "updated": updated,
            "failed": failed,
            "total": len(venues),
            "results": results,
        })

    return err("Неизвестное действие", 404)

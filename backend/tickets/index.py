"""
Билетные интеграции GLOBAL LINK.
Поддерживаемые провайдеры: ticketscloud (расширяемо)

GET  ?action=list&user_id=X                     — список интеграций пользователя
GET  ?action=get&id=X                           — одна интеграция
POST ?action=create                             — создать интеграцию
POST ?action=update                             — обновить (название, project_id и т.д.)
POST ?action=delete                             — удалить интеграцию
GET  ?action=sales&integration_id=X[&limit=50]  — продажи по интеграции
GET  ?action=project_sales&project_id=X         — все продажи по проекту (все интеграции)
GET  ?action=stats&integration_id=X             — сводная статистика
POST ?action=webhook/ticketscloud               — вебхук от TicketsCloud
POST ?action=sync&integration_id=X             — ручной запрос истории заказов
"""
import json
import os
import uuid
import hmac
import hashlib
import urllib.request
import urllib.parse
import psycopg2

SCHEMA = "t_p17532248_concert_platform_mvp"

PROVIDERS = {
    "ticketscloud": {
        "label": "TicketsCloud",
        "logo": "🎫",
        "api_base": "https://ticketscloud.com/v1",
        "docs_url": "https://ticketscloud.com/developers",
        "webhook_events": ["order.paid", "order.refunded", "order.reserved"],
    },
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id, X-Ticketscloud-Signature",
    }


def ok(data, status=200):
    return {
        "statusCode": status,
        "headers": {**cors(), "Content-Type": "application/json"},
        "body": json.dumps(data, ensure_ascii=False, default=str),
    }


def err(msg, status=400):
    return {
        "statusCode": status,
        "headers": {**cors(), "Content-Type": "application/json"},
        "body": json.dumps({"error": msg}, ensure_ascii=False),
    }


def row_to_integration(row, cols) -> dict:
    d = dict(zip(cols, row))
    return {
        "id":            str(d["id"]),
        "userId":        str(d["user_id"]),
        "projectId":     str(d["project_id"]) if d["project_id"] else None,
        "provider":      d["provider"],
        "name":          d["name"],
        "eventId":       d["event_id"],
        "isActive":      d["is_active"],
        "lastSyncAt":    str(d["last_sync_at"]) if d["last_sync_at"] else None,
        "meta":          d["meta"] or {},
        "createdAt":     str(d["created_at"]),
        # api_key и webhook_secret не возвращаем клиенту целиком
        "hasApiKey":     bool(d.get("api_key")),
        "webhookSecret": d.get("webhook_secret", ""),
    }


def row_to_sale(row, cols) -> dict:
    d = dict(zip(cols, row))
    return {
        "id":            str(d["id"]),
        "integrationId": str(d["integration_id"]),
        "projectId":     str(d["project_id"]) if d["project_id"] else None,
        "provider":      d["provider"],
        "eventId":       d["event_id"],
        "orderId":       d["order_id"],
        "ticketType":    d["ticket_type"],
        "quantity":      d["quantity"],
        "price":         float(d["price"]),
        "totalAmount":   float(d["total_amount"]),
        "status":        d["status"],
        "buyerName":     d["buyer_name"],
        "buyerEmail":    d["buyer_email"],
        "soldAt":        str(d["sold_at"]),
    }


def generate_webhook_secret() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex


def verify_ticketscloud_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Проверяет HMAC-SHA256 подпись от TicketsCloud.
    Если secret задан — подпись ОБЯЗАТЕЛЬНА и должна совпадать.
    Если secret не задан — отвергаем (закрытая интеграция должна иметь секрет)."""
    if not secret:
        return False
    if not signature:
        return False
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()  # noqa: hmac.new is correct
    return hmac.compare_digest(expected, signature.lower().replace("sha256=", ""))


def _tc_request(url: str, api_key: str, timeout: int = 20) -> dict:
    """Выполняет GET-запрос к TicketsCloud API, возвращает распарсенный JSON."""
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"key {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode()[:400]
        except Exception:
            pass
        raise RuntimeError(f"TicketsCloud HTTP {e.code}: {e.reason}. Response: {body[:200]}")
    except Exception as e:
        raise RuntimeError(f"TicketsCloud connection error: {e}")



def fetch_ticketscloud_event_info(api_key: str, event_id: str) -> dict:
    """Получает мета-информацию события из TicketsCloud API v1.

    GET /v1/resources/events/{event_id}
    Возвращает dict: {title, city, date_start, date_end}

    Примечание: TicketsCloud API не возвращает название площадки и город
    как отдельные поля — org и map приходят только как ID-строки.
    Город извлекается из названия события эвристически.
    """
    import re as _re
    url = f"https://ticketscloud.com/v1/resources/events/{event_id}"
    try:
        ev = _tc_request(url, api_key)
    except RuntimeError:
        return {}

    result = {}

    # Название события
    title_obj = ev.get("title") or {}
    title_text = ""
    if isinstance(title_obj, dict):
        title_text = title_obj.get("text") or ""
    elif isinstance(title_obj, str):
        title_text = title_obj
    if title_text:
        result["title"] = title_text

    # Город — несколько стратегий, в порядке приоритета
    if title_text:
        city_found = None

        # 1) Явное указание "г. Москва", "г.Москва", "г Москва"
        m = _re.search(r'\bг\.?\s*([А-ЯЁ][а-яё]+(?:[- ][А-ЯЁа-яё]+)*)', title_text)
        if m:
            city_found = m.group(1)

        # 2) Паттерн: "в/во <Город>" + приводим к именительному (убираем окончания падежей)
        if not city_found:
            m = _re.search(
                r'\bв[о]?\s+([А-ЯЁ][а-яё]+(?:[- ][А-ЯЁа-яё]+)*)',
                title_text
            )
            if m:
                raw = m.group(1)
                # Нормализация: убираем типичные падежные окончания
                # Санкт-Петербурге → Санкт-Петербург, Москве → Москва и т.д.
                ENDINGS = [("урге", "ург"), ("урга", "ург"), ("ове", "ов"), ("ово", "ово"),
                           ("аре", "ар"), ("аха", "ах"), ("оре", "ор"),
                           ("ске", "ск"), ("ска", "ск"), ("не", "нь"),
                           ("ве", "вь"), ("ле", "ль"), ("ри", "рь"), ("ни", "нь"),
                           ("зе", "зь"), ("ме", "м"), ("ке", "к"),
                           ("хе", "х"), ("бе", "б"), ("ге", "г"), ("де", "д"),
                           ("ве", "в"), ("те", "т"), ("пе", "п"), ("фе", "ф"),
                           ("ве", "в"), ("ге", "г"), ("же", "ж"), ("зе", "з"),
                           ("ле", "ль"), ("не", "нь"), ("ре", "рь"), ("се", "сь"),
                           ("те", "ть"), ("хе", "хь"), ("це", "ць"),
                           ("ве", "в"), ("ые", "ый"), ("ие", "ий"), ("ой", "ой"),
                           ("ве", "вь"), ("ях", "ях")]
                normalized = raw
                for suffix, replacement in ENDINGS:
                    if raw.lower().endswith(suffix) and len(raw) > len(suffix) + 1:
                        normalized = raw[: -len(suffix)] + replacement
                        break
                city_found = normalized

        if city_found:
            result["city"] = city_found

    # Дата/время из lifetime (iCal формат)
    # Пример: DTSTART;VALUE=DATE-TIME:20260605T170000Z
    lifetime = ev.get("lifetime") or ""
    if lifetime:
        m_start = _re.search(r'DTSTART[^:]*:(\d{8}T\d{6})', lifetime)
        m_end   = _re.search(r'DTEND[^:]*:(\d{8}T\d{6})', lifetime)

        def parse_ical_dt(s):
            try:
                from datetime import datetime, timezone
                dt = datetime.strptime(s, "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)
                return dt.strftime("%Y-%m-%d")   # только дата для сравнения с projects.date_start
            except Exception:
                return None

        if m_start:
            result["date_start"] = parse_ical_dt(m_start.group(1))
        if m_end:
            result["date_end"] = parse_ical_dt(m_end.group(1))

    return result


def fetch_ticketscloud_event_sets(api_key: str, event_id: str) -> list:
    """Получает категории билетов события из TicketsCloud API v1.

    GET /v1/resources/events/{event_id}/sets
    Возвращает список категорий с полями:
      id, name, amount (тираж), amount_vacant (свободно), current_price
    """
    url = f"https://ticketscloud.com/v1/resources/events/{event_id}/sets"
    try:
        raw = _tc_request(url, api_key)
    except RuntimeError:
        return []

    # Ответ — массив напрямую (не обёртка)
    sets = raw if isinstance(raw, list) else (raw.get("data") or [])

    result = []
    for s in sets:
        if not isinstance(s, dict) or s.get("removed"):
            continue
        set_id  = str(s.get("id") or "")
        name    = str(s.get("name") or set_id)
        price   = float(s.get("current_price") or s.get("price") or 0)
        total   = int(s.get("amount") or 0)          # тираж
        vacant  = int(s.get("amount_vacant") or 0)   # свободно
        sold    = max(0, total - vacant)              # продано + забронировано
        result.append({
            "id":    set_id,
            "name":  name,
            "price": price,
            "total": total,   # план
            "sold":  sold,    # факт (проданные + забронированные)
            "free":  vacant,
        })

    return result


def fetch_ticketscloud_orders(api_key: str, event_id: str) -> list:
    """Запрашивает заказы из TicketsCloud API v2.

    TC v2 НЕ поддерживает фильтр ?event= — возвращает 400 Bad Request.
    Получаем все заказы аккаунта и фильтруем по event_id на нашей стороне.
    Лимит: 10 страниц × 50 = 500 заказов за один sync.
    """
    base = "https://ticketscloud.com"
    all_orders = []
    page = 1
    MAX_PAGES = 10

    while True:
        params_q = {"page_size": "50", "page": str(page)}
        url = f"{base}/v2/resources/orders?" + urllib.parse.urlencode(params_q)
        data = _tc_request(url, api_key, timeout=15)

        raw_data = data.get("data") or []
        if isinstance(raw_data, list):
            items = raw_data
        elif isinstance(raw_data, dict):
            items = list(raw_data.values())
        else:
            items = []

        for item in items:
            if event_id == "__ALL__":
                all_orders.append(item)
            else:
                item_event = item.get("event") or ""
                if isinstance(item_event, dict):
                    item_event = item_event.get("id") or item_event.get("_id") or ""
                if str(item_event).strip() == str(event_id).strip():
                    all_orders.append(item)

        # Пагинация
        pagination = data.get("pagination") or data.get("meta") or {}
        page_size   = int(pagination.get("page_size") or pagination.get("size") or pagination.get("limit") or 50)
        total_pages = int(pagination.get("total") or pagination.get("pages") or pagination.get("total_pages") or 0)
        current     = int(pagination.get("page") or page)

        if len(items) == 0:
            break
        if not pagination:
            break
        if total_pages and current >= total_pages:
            break
        if len(items) < page_size:
            break
        if page >= MAX_PAGES:
            break
        page += 1

    return all_orders


def parse_ticketscloud_order(order: dict, integration_id: str, project_id) -> list:
    """Разбирает один заказ TicketsCloud v2 в записи ticket_sales.

    Структура TicketsCloud v2 order:
      id, status (done/cancelled/returned), event (id),
      created_at, settings.customer {email},
      tickets: [{id, set (id категории), serial}, ...],
      values: {price, full, sets_values: {set_id: {name, price, nominal}}}
    """
    rows = []
    oid = str(order.get("id") or "")
    if not oid:
        return rows

    # Статус: TicketsCloud v2 использует "done" для оплаченных
    status_raw = str(order.get("status") or "").lower()
    status = "paid"     if status_raw in ("done", "accepted", "paid", "complete", "completed") else \
             "refunded" if status_raw in ("returned", "refunded") else \
             "reserved" if status_raw in ("reserved",) else \
             "reserved"  # cancelled и прочие — пропускаем ниже

    # Отменённые не сохраняем
    if status_raw in ("cancelled", "cancel"):
        return rows

    # Покупатель — в v2 лежит в settings.customer
    settings = order.get("settings") or {}
    customer = settings.get("customer") or {}
    buyer_email = customer.get("email", "")
    buyer_name  = ""  # v2 не возвращает имя покупателя в списке заказов

    sold_at = order.get("created_at") or None

    # event id
    ev = order.get("event") or ""
    event_id = str(ev.get("id") if isinstance(ev, dict) else ev)

    raw_str = json.dumps(order, ensure_ascii=False, default=str)

    # Словарь имён и цен категорий из values.sets_values
    # {set_id: {name, price, nominal}}
    values = order.get("values") or {}
    sets_values = values.get("sets_values") or {}

    # Массив билетов
    tickets = order.get("tickets") or []

    if tickets:
        # Группируем по set_id — ключ уникален, поэтому два VIP с разной ценой не смешиваются
        groups: dict = {}
        for t in tickets:
            set_id = str(t.get("set") or "unknown")
            if set_id not in groups:
                sv    = sets_values.get(set_id) or {}
                name  = sv.get("name") or set_id
                price = float(sv.get("price") or sv.get("nominal") or t.get("price") or 0)
                groups[set_id] = {"name": name, "price": price, "count": 0, "set_id": set_id}
            groups[set_id]["count"] += 1

        for set_id, g in groups.items():
            rows.append({
                "integration_id": integration_id,
                "project_id":     project_id,
                "provider":       "ticketscloud",
                "event_id":       event_id,
                "order_id":       f"{oid}_{set_id[:20]}",
                "ticket_type":    g["name"],
                "set_id":         g["set_id"],
                "quantity":       g["count"],
                "price":          g["price"],
                "total_amount":   g["price"] * g["count"],
                "status":         status,
                "buyer_name":     buyer_name,
                "buyer_email":    buyer_email,
                "sold_at":        sold_at,
                "raw_payload":    raw_str,
            })
    else:
        total = float(order.get("total") or order.get("amount") or order.get("price") or 0)
        rows.append({
            "integration_id": integration_id,
            "project_id":     project_id,
            "provider":       "ticketscloud",
            "event_id":       event_id,
            "order_id":       oid,
            "ticket_type":    "Стандарт",
            "set_id":         "",
            "quantity":       1,
            "price":          total,
            "total_amount":   total,
            "status":         status,
            "buyer_name":     buyer_name,
            "buyer_email":    buyer_email,
            "sold_at":        sold_at,
            "raw_payload":    raw_str,
        })
    return rows


def sync_income_lines(cur, project_id: str, integration_id: str, event_sets: list = None):
    """Синхронизирует строки доходов проекта.

    Логика:
    - Каждая категория идентифицируется по set_id (уникален в TicketsCloud)
    - note = 'ticketscloud:{integration_id}:{set_id}' — уникальный ключ строки
    - ticket_count (план) = amount из /v1/events/{id}/sets
    - sold_count   (факт) = sum paid из ticket_sales GROUP BY set_id
    - Устаревшие строки (set_id больше не существует) обнуляются до 0
    """
    if not project_id:
        return 0

    if not event_sets:
        return 0

    # Факт продаж по set_id из ticket_sales
    cur.execute(
        f"""SELECT
              set_id,
              SUM(CASE WHEN status='paid' THEN quantity ELSE 0 END) as paid_qty
            FROM {SCHEMA}.ticket_sales
            WHERE integration_id = %s AND status != 'refunded'
            GROUP BY set_id""",
        (integration_id,)
    )
    sales_by_set: dict = {row[0]: int(row[1] or 0) for row in cur.fetchall()}

    base_marker = f"ticketscloud:{integration_id}"
    synced = 0
    active_note_keys = set()

    for s in event_sets:
        set_id     = s["id"]
        name       = s["name"]
        price      = s["price"]
        total      = s["total"]
        sold_count = sales_by_set.get(set_id, 0)
        note_key   = f"{base_marker}:{set_id}"
        active_note_keys.add(note_key)

        cur.execute(
            f"SELECT id FROM {SCHEMA}.project_income_lines WHERE project_id = %s AND note = %s LIMIT 1",
            (project_id, note_key)
        )
        existing = cur.fetchone()

        if existing:
            cur.execute(
                f"""UPDATE {SCHEMA}.project_income_lines
                    SET category = %s, ticket_count = %s, sold_count = %s, ticket_price = %s
                    WHERE id = %s""",
                (name, total, sold_count, price, existing[0])
            )
        else:
            cur.execute(
                f"SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {SCHEMA}.project_income_lines WHERE project_id = %s",
                (project_id,)
            )
            sort_order = cur.fetchone()[0]
            cur.execute(
                f"""INSERT INTO {SCHEMA}.project_income_lines
                    (project_id, category, ticket_count, ticket_price, sold_count, note, sort_order)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (project_id, name, total, price, sold_count, note_key, sort_order)
            )
        synced += 1

    # Обнуляем только строки со старым форматом note (без set_id) — это мусор
    cur.execute(
        f"""UPDATE {SCHEMA}.project_income_lines
            SET ticket_count = 0, sold_count = 0
            WHERE project_id = %s AND note = %s""",
        (project_id, base_marker)
    )

    # Пересчитываем итоги проекта
    cur.execute(
        f"""UPDATE {SCHEMA}.projects SET
              total_income_plan = COALESCE(
                (SELECT SUM(ticket_count::numeric * ticket_price) FROM {SCHEMA}.project_income_lines WHERE project_id = %s), 0),
              total_income_fact = COALESCE(
                (SELECT SUM(sold_count::numeric * ticket_price) FROM {SCHEMA}.project_income_lines WHERE project_id = %s), 0),
              updated_at = NOW()
            WHERE id = %s""",
        (project_id, project_id, project_id)
    )

    return synced


def upsert_sales(cur, sales: list):
    """Вставляет продажи, пропуская дубликаты по (integration_id, order_id)."""
    inserted = 0
    for s in sales:
        cur.execute(
            f"""INSERT INTO {SCHEMA}.ticket_sales
                (integration_id, project_id, provider, event_id, order_id,
                 ticket_type, set_id, quantity, price, total_amount, status,
                 buyer_name, buyer_email, sold_at, raw_payload)
                VALUES (%s,%s,%s,%s,%s, %s,%s,%s,%s,%s,%s, %s,%s,%s,%s)
                ON CONFLICT (integration_id, order_id) DO UPDATE SET
                  status       = EXCLUDED.status,
                  set_id       = EXCLUDED.set_id,
                  ticket_type  = EXCLUDED.ticket_type,
                  total_amount = EXCLUDED.total_amount,
                  raw_payload  = EXCLUDED.raw_payload""",
            (
                s["integration_id"], s["project_id"], s["provider"], s["event_id"], s["order_id"],
                s["ticket_type"], s.get("set_id", ""), s["quantity"], s["price"], s["total_amount"], s["status"],
                s["buyer_name"], s["buyer_email"], s.get("sold_at"), s["raw_payload"],
            ),
        )
        inserted += 1
    return inserted


def handler(event: dict, context) -> dict:
    """Билетные интеграции: CRUD + вебхуки + синхронизация продаж."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")

    # ── GET list — список интеграций пользователя ─────────────────────────
    if method == "GET" and action == "list":
        user_id = params.get("user_id", "")
        if not user_id:
            return err("user_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT ti.*, p.title as project_title
                    FROM {SCHEMA}.ticket_integrations ti
                    LEFT JOIN {SCHEMA}.projects p ON p.id = ti.project_id
                    WHERE ti.user_id = %s ORDER BY ti.created_at DESC""",
                (user_id,)
            )
            rows = cur.fetchall()
            cols  = [d[0] for d in cur.description]
        finally:
            conn.close()
        result = []
        for r in rows:
            d = row_to_integration(r, cols)
            d["projectTitle"] = dict(zip(cols, r)).get("project_title") or ""
            result.append(d)
        return ok({"integrations": result, "providers": PROVIDERS})

    # ── GET get — одна интеграция ─────────────────────────────────────────
    if method == "GET" and action == "get":
        int_id = params.get("id", "")
        if not int_id:
            return err("id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"SELECT * FROM {SCHEMA}.ticket_integrations WHERE id=%s", (int_id,))
            row = cur.fetchone()
            cols = [d[0] for d in cur.description]
        finally:
            conn.close()
        if not row:
            return err("Не найдено", 404)
        return ok({"integration": row_to_integration(row, cols)})

    # ── POST create — создать интеграцию ──────────────────────────────────
    if method == "POST" and action == "create":
        b          = json.loads(event.get("body") or "{}")
        user_id    = b.get("userId", "")
        project_id = b.get("projectId") or None
        provider   = b.get("provider", "ticketscloud")
        name       = (b.get("name") or "").strip()
        api_key    = (b.get("apiKey") or "").strip()
        event_id   = (b.get("eventId") or "").strip()

        if not user_id or not api_key or not event_id:
            return err("userId, apiKey, eventId обязательны")
        if provider not in PROVIDERS:
            return err(f"Провайдер {provider} не поддерживается")

        webhook_secret = generate_webhook_secret()
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""INSERT INTO {SCHEMA}.ticket_integrations
                    (user_id, project_id, provider, name, api_key, event_id, webhook_secret)
                    VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (user_id, project_id, provider, name or f"{PROVIDERS[provider]['label']} #{event_id[:8]}", api_key, event_id, webhook_secret)
            )
            new_id = str(cur.fetchone()[0])
            conn.commit()
        finally:
            conn.close()
        return ok({"id": new_id, "webhookSecret": webhook_secret}, 201)

    # ── GET list_tc_events — все события из кабинета TicketsCloud ──────────
    if method == "GET" and action == "list_tc_events":
        api_key = params.get("api_key", "")
        if not api_key:
            return err("api_key required")
        try:
            raw = _tc_request("https://ticketscloud.com/v1/resources/events", api_key)
        except RuntimeError as e:
            return err(f"TicketsCloud API: {e}", 422)

        events_raw = raw if isinstance(raw, list) else (raw.get("data") or [])
        import re as _re
        result = []
        for ev in events_raw:
            if not isinstance(ev, dict) or ev.get("removed"):
                continue
            ev_id   = str(ev.get("id") or "")
            title_o = ev.get("title") or {}
            title   = (title_o.get("text") if isinstance(title_o, dict) else str(title_o)) or ev_id
            status  = ev.get("status") or ""

            # Дата из lifetime
            lifetime = ev.get("lifetime") or ""
            date_start = ""
            if lifetime:
                m = _re.search(r'DTSTART[^:]*:(\d{8}T\d{6})', lifetime)
                if m:
                    try:
                        from datetime import datetime, timezone
                        dt = datetime.strptime(m.group(1), "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)
                        date_start = dt.strftime("%Y-%m-%d")
                    except Exception:
                        pass

            # Город из названия
            city = ""
            if title:
                cm = _re.search(r'\bв[о]?\s+([А-ЯЁ][а-яё]+(?:[- ][А-ЯЁа-яё]+)*)', title)
                if cm:
                    city = cm.group(1)

            result.append({
                "id": ev_id,
                "title": title,
                "status": status,
                "date_start": date_start,
                "city": city,
            })

        # Сортируем: сначала будущие по дате, потом прошедшие
        from datetime import date as _date
        today = str(_date.today())
        result.sort(key=lambda e: (e["date_start"] < today, e["date_start"] or "9999"))
        return ok({"events": result})

    # ── POST create_from_tc — создать проект из события TicketsCloud ───────
    # Быстрый шаг: только создаём проект + интеграцию (без загрузки заказов).
    # После создания фронт вызывает action=sync — там вся загрузка данных.
    if method == "POST" and action == "create_from_tc":
        b           = json.loads(event.get("body") or "{}")
        user_id     = b.get("userId", "")
        api_key     = (b.get("apiKey") or "").strip()
        tc_event_id = (b.get("eventId") or "").strip()
        project_id_existing = b.get("projectId") or None

        if not user_id or not api_key or not tc_event_id:
            return err("userId, apiKey, eventId обязательны")

        # Получаем только мета-данные и категории (2 быстрых запроса, ~1 сек)
        event_info = fetch_ticketscloud_event_info(api_key, tc_event_id)
        event_sets = fetch_ticketscloud_event_sets(api_key, tc_event_id)

        conn = get_conn()
        try:
            cur = conn.cursor()

            if project_id_existing:
                project_id = project_id_existing
            else:
                title      = event_info.get("title") or f"Событие {tc_event_id[:8]}"
                city       = event_info.get("city") or ""
                date_start = event_info.get("date_start") or None
                date_end   = event_info.get("date_end") or None

                cur.execute(
                    f"""INSERT INTO {SCHEMA}.projects
                        (user_id, title, artist, city, date_start, date_end, status)
                        VALUES (%s,%s,%s,%s,%s,%s,'planning') RETURNING id""",
                    (user_id, title, "", city, date_start, date_end)
                )
                project_id = str(cur.fetchone()[0])

            # Создаём интеграцию
            webhook_secret = generate_webhook_secret()
            title_for_name = event_info.get("title") or f"TicketsCloud #{tc_event_id[:8]}"
            cur.execute(
                f"""INSERT INTO {SCHEMA}.ticket_integrations
                    (user_id, project_id, provider, name, api_key, event_id, webhook_secret)
                    VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (user_id, project_id, "ticketscloud",
                 title_for_name[:80], api_key, tc_event_id, webhook_secret)
            )
            integration_id = str(cur.fetchone()[0])

            # Сразу создаём строки доходов с ПРАВИЛЬНЫМ note (integration_id:set_id)
            # чтобы первый же sync их нашёл и корректно обновил
            for i, s in enumerate(event_sets):
                note_key = f"ticketscloud:{integration_id}:{s['id']}"
                # Проверяем существование перед вставкой (нет уникального constraint на note)
                cur.execute(
                    f"SELECT id FROM {SCHEMA}.project_income_lines WHERE project_id=%s AND note=%s LIMIT 1",
                    (project_id, note_key)
                )
                if not cur.fetchone():
                    cur.execute(
                        f"""INSERT INTO {SCHEMA}.project_income_lines
                            (project_id, category, ticket_count, ticket_price, sold_count, note, sort_order)
                            VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                        (project_id, s["name"], s["total"], s["price"], 0, note_key, i)
                    )

            # Пересчитываем план (sold_count=0 пока — факт придёт после sync)
            cur.execute(
                f"""UPDATE {SCHEMA}.projects SET
                      total_income_plan = COALESCE(
                        (SELECT SUM(ticket_count::numeric * ticket_price)
                         FROM {SCHEMA}.project_income_lines WHERE project_id = %s), 0),
                      updated_at = NOW()
                    WHERE id = %s""",
                (project_id, project_id)
            )
            conn.commit()
        finally:
            conn.close()

        webhook_url = f"https://functions.poehali.dev/e8e3c7c9-b452-4e77-8db2-ca0266399006?action=webhook&provider=ticketscloud&integration_id={integration_id}"
        return ok({
            "projectId": project_id,
            "integrationId": integration_id,
            "webhookSecret": webhook_secret,
            "webhookUrl": webhook_url,
        }, 201)

    # ── POST update — обновить интеграцию ─────────────────────────────────
    if method == "POST" and action == "update":
        b      = json.loads(event.get("body") or "{}")
        int_id = b.get("id", "")
        if not int_id:
            return err("id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            fields = {}
            for fk, col in [("name","name"),("projectId","project_id"),("eventId","event_id"),
                             ("apiKey","api_key"),("isActive","is_active")]:
                if fk in b:
                    fields[col] = b[fk]
            if fields:
                set_clause = ", ".join(f"{c}=%s" for c in fields)
                cur.execute(
                    f"UPDATE {SCHEMA}.ticket_integrations SET {set_clause} WHERE id=%s",
                    list(fields.values()) + [int_id]
                )
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    # ── POST delete — удалить интеграцию ──────────────────────────────────
    if method == "POST" and action == "delete":
        b      = json.loads(event.get("body") or "{}")
        int_id = b.get("id", "")
        if not int_id:
            return err("id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.ticket_integrations SET is_active=FALSE WHERE id=%s", (int_id,))
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    # ── GET sales — продажи по интеграции ─────────────────────────────────
    if method == "GET" and action == "sales":
        int_id = params.get("integration_id", "")
        if not int_id:
            return err("integration_id required")
        limit  = min(int(params.get("limit", 100)), 500)
        status_filter = params.get("status", "")
        conn = get_conn()
        try:
            cur = conn.cursor()
            q = f"SELECT * FROM {SCHEMA}.ticket_sales WHERE integration_id=%s"
            args = [int_id]
            if status_filter:
                q += " AND status=%s"
                args.append(status_filter)
            q += " ORDER BY sold_at DESC LIMIT %s"
            args.append(limit)
            cur.execute(q, args)
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
        finally:
            conn.close()
        return ok({"sales": [row_to_sale(r, cols) for r in rows]})

    # ── GET project_sales — все продажи по проекту ────────────────────────
    if method == "GET" and action == "project_sales":
        project_id = params.get("project_id", "")
        if not project_id:
            return err("project_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT ts.*, ti.name as integration_name, ti.provider
                    FROM {SCHEMA}.ticket_sales ts
                    JOIN {SCHEMA}.ticket_integrations ti ON ti.id = ts.integration_id
                    WHERE ts.project_id=%s ORDER BY ts.sold_at DESC""",
                (project_id,)
            )
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
        finally:
            conn.close()
        return ok({"sales": [row_to_sale(r, cols) for r in rows]})

    # ── GET stats — сводная статистика интеграции ─────────────────────────
    if method == "GET" and action == "stats":
        int_id = params.get("integration_id", "") or params.get("project_id", "")
        field  = "integration_id" if params.get("integration_id") else "project_id"
        if not int_id:
            return err("integration_id or project_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT
                      COUNT(*) as orders_total,
                      COALESCE(SUM(quantity),0) as tickets_sold,
                      COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as revenue_paid,
                      COALESCE(SUM(CASE WHEN status='refunded' THEN total_amount ELSE 0 END),0) as revenue_refunded,
                      COALESCE(SUM(CASE WHEN status='reserved' THEN quantity ELSE 0 END),0) as tickets_reserved,
                      MIN(sold_at) as first_sale,
                      MAX(sold_at) as last_sale
                    FROM {SCHEMA}.ticket_sales WHERE {field}=%s AND status != 'refunded'""",
                (int_id,)
            )
            r = cur.fetchone()
            cur.execute(
                f"""SELECT ticket_type, SUM(quantity) as qty, SUM(total_amount) as amount
                    FROM {SCHEMA}.ticket_sales WHERE {field}=%s AND status='paid'
                    GROUP BY ticket_type ORDER BY amount DESC""",
                (int_id,)
            )
            by_type = [{"ticketType": row[0], "qty": row[1], "amount": float(row[2])} for row in cur.fetchall()]
        finally:
            conn.close()
        return ok({
            "ordersTotal":       r[0],
            "ticketsSold":       r[1],
            "revenuePaid":       float(r[2]),
            "revenueRefunded":   float(r[3]),
            "ticketsReserved":   int(r[4]),
            "firstSale":         str(r[5]) if r[5] else None,
            "lastSale":          str(r[6]) if r[6] else None,
            "byType":            by_type,
        })

    # ── POST apply_event_info — применить данные события к проекту ──────────
    if method == "POST" and action == "apply_event_info":
        body = json.loads(event.get("body") or "{}")
        int_id     = body.get("integrationId") or params.get("integration_id", "")
        fields     = body.get("fields") or {}  # {city, venue_name, date_start, date_end}
        if not int_id or not fields:
            return err("integrationId и fields обязательны", 400)

        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT project_id FROM {SCHEMA}.ticket_integrations WHERE id=%s AND is_active=TRUE",
                (int_id,)
            )
            row = cur.fetchone()
            if not row or not row[0]:
                return err("Интеграция не найдена", 404)
            project_id = row[0]

            allowed = {"city", "venue_name", "date_start", "date_end"}
            updates = {k: v for k, v in fields.items() if k in allowed}
            if not updates:
                return err("Нет допустимых полей для обновления", 400)

            set_parts = ", ".join(f"{k} = %s" for k in updates)
            vals = list(updates.values()) + [project_id]
            cur.execute(
                f"UPDATE {SCHEMA}.projects SET {set_parts}, updated_at=NOW() WHERE id=%s",
                vals
            )
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True, "updated": list(updates.keys())})

    # ── POST webhook/ticketscloud — принять вебхук ────────────────────────
    if method == "POST" and action == "webhook":
        provider = params.get("provider", "ticketscloud")
        int_id   = params.get("integration_id", "")
        if not int_id:
            return err("integration_id required in query", 400)

        raw_body   = event.get("body") or ""
        signature  = (event.get("headers") or {}).get("X-Ticketscloud-Signature", "")
        payload_bytes = raw_body.encode() if isinstance(raw_body, str) else raw_body

        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT api_key, webhook_secret, project_id FROM {SCHEMA}.ticket_integrations WHERE id=%s AND is_active=TRUE",
                (int_id,)
            )
            row = cur.fetchone()
            if not row:
                conn.close()
                return err("Интеграция не найдена", 404)

            api_key, webhook_secret, project_id = row

            # Верификация подписи TicketsCloud
            if webhook_secret and signature:
                if not verify_ticketscloud_signature(payload_bytes, signature, webhook_secret):
                    conn.close()
                    return err("Неверная подпись вебхука", 403)

            try:
                body = json.loads(raw_body or "{}")
            except Exception:
                body = {}

            event_type = body.get("event") or body.get("type") or ""
            # TicketsCloud вебхук: payload это сам deal или обёртка {data: deal}
            order_data = body.get("data") or body

            inserted = 0
            if provider == "ticketscloud":
                sales = parse_ticketscloud_order(order_data, int_id, project_id)
                inserted = upsert_sales(cur, sales)
                if project_id and inserted:
                    # При вебхуке тираж запрашиваем из API события
                    cur.execute(
                        f"SELECT api_key, event_id FROM {SCHEMA}.ticket_integrations WHERE id=%s",
                        (int_id,)
                    )
                    int_row = cur.fetchone()
                    wh_event_sets = []
                    if int_row:
                        try:
                            wh_event_sets = fetch_ticketscloud_event_sets(int_row[0], int_row[1])
                        except Exception:
                            pass
                    sync_income_lines(cur, str(project_id), int_id, wh_event_sets or None)
                cur.execute(
                    f"UPDATE {SCHEMA}.ticket_integrations SET last_sync_at=NOW() WHERE id=%s",
                    (int_id,)
                )

            conn.commit()
        finally:
            conn.close()

        return ok({"received": True, "event": event_type, "inserted": inserted})

    # ── POST sync — ручная синхронизация истории заказов ─────────────────
    if method == "POST" and action == "sync":
        b      = json.loads(event.get("body") or "{}")
        int_id = b.get("integrationId", "")
        if not int_id:
            return err("integrationId required")

        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT api_key, event_id, project_id, provider FROM {SCHEMA}.ticket_integrations WHERE id=%s AND is_active=TRUE",
                (int_id,)
            )
            row = cur.fetchone()
            if not row:
                conn.close()
                return err("Интеграция не найдена", 404)
            api_key, event_id_val, project_id, provider = row

            orders = []
            inserted = 0
            api_error = ""

            income_synced = 0
            event_sets = []
            event_info = {}
            event_diff = {}
            if provider == "ticketscloud":
                try:
                    orders = fetch_ticketscloud_orders(api_key, event_id_val)
                    all_sales = []
                    for order in orders:
                        all_sales.extend(parse_ticketscloud_order(order, int_id, project_id))
                    inserted = upsert_sales(cur, all_sales)
                    if project_id:
                        event_sets = fetch_ticketscloud_event_sets(api_key, event_id_val)
                        income_synced = sync_income_lines(cur, str(project_id), int_id, event_sets)
                        # Получаем мета-данные события и сравниваем с проектом
                        event_info = fetch_ticketscloud_event_info(api_key, event_id_val)
                        if event_info:
                            cur.execute(
                                f"SELECT city, date_start, date_end FROM {SCHEMA}.projects WHERE id=%s",
                                (project_id,)
                            )
                            proj_row = cur.fetchone()
                            if proj_row:
                                p_city, p_date_start, p_date_end = proj_row
                                tc_city = event_info.get("city") or ""
                                tc_ds   = event_info.get("date_start") or ""
                                tc_de   = event_info.get("date_end") or ""

                                def fmt_date(d):
                                    if not d:
                                        return ""
                                    s = str(d)[:10]
                                    try:
                                        from datetime import date
                                        y, m, day = s.split("-")
                                        months = ["", "января","февраля","марта","апреля","мая","июня",
                                                  "июля","августа","сентября","октября","ноября","декабря"]
                                        return f"{int(day)} {months[int(m)]} {y}"
                                    except Exception:
                                        return s

                                p_city_str = (p_city or "").strip()
                                if tc_city and tc_city != p_city_str:
                                    event_diff["city"] = {
                                        "current": p_city_str or "не указан",
                                        "new": tc_city
                                    }
                                if tc_ds:
                                    p_date = str(p_date_start)[:10] if p_date_start else ""
                                    if tc_ds != p_date:
                                        event_diff["date_start"] = {
                                            "current": fmt_date(p_date) or "не указана",
                                            "new": fmt_date(tc_ds),
                                            "raw": tc_ds
                                        }
                                if tc_de:
                                    p_date = str(p_date_end)[:10] if p_date_end else ""
                                    if tc_de != p_date:
                                        event_diff["date_end"] = {
                                            "current": fmt_date(p_date) or "не указана",
                                            "new": fmt_date(tc_de),
                                            "raw": tc_de
                                        }
                except RuntimeError as e:
                    api_error = str(e)

            cur.execute(
                f"UPDATE {SCHEMA}.ticket_integrations SET last_sync_at=NOW() WHERE id=%s",
                (int_id,)
            )
            conn.commit()
        finally:
            conn.close()

        if api_error:
            return err(f"Ошибка API провайдера: {api_error}", 422)

        return ok({
            "success": True,
            "inserted": inserted,
            "ordersProcessed": len(orders),
            "incomeLinesUpdated": income_synced,
            "eventSets": event_sets if project_id else [],
            "eventDiff": event_diff,
        })

    # ── GET list_for_sync — список интеграций пользователя для пофронтовой синхронизации ──
    if method == "GET" and action == "list_for_sync":
        uid = params.get("user_id", "")
        if not uid:
            return err("user_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT id, event_id, provider, name
                    FROM {SCHEMA}.ticket_integrations
                    WHERE user_id=%s AND is_active=TRUE
                    ORDER BY created_at""",
                (uid,)
            )
            rows = cur.fetchall()
        finally:
            conn.close()
        return ok({"integrations": [
            {"id": str(r[0]), "eventId": r[1], "provider": r[2], "name": r[3]}
            for r in rows
        ]})

    # ── POST sync_all — синхронизация всех интеграций пользователя ──────────
    # Оптимизация: заказы грузим ОДИН РАЗ, /sets — параллельно через threading.
    if method == "POST" and action == "sync_all":
        import threading
        from collections import defaultdict

        b       = json.loads(event.get("body") or "{}")
        user_id = b.get("userId", "")
        if not user_id:
            return err("userId required")

        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT id, api_key, event_id, project_id, provider
                    FROM {SCHEMA}.ticket_integrations
                    WHERE user_id=%s AND is_active=TRUE
                    ORDER BY created_at""",
                (user_id,)
            )
            integrations = cur.fetchall()
        finally:
            conn.close()

        if not integrations:
            return ok({"success": True, "total": 0, "synced": 0, "failed": 0, "results": []})

        results = []

        # Группируем по api_key
        by_api_key: dict = defaultdict(list)
        for int_row in integrations:
            int_id, api_key, event_id_val, project_id, provider = (
                str(int_row[0]), int_row[1], int_row[2], int_row[3], int_row[4]
            )
            if provider != "ticketscloud":
                results.append({"integrationId": int_id, "ok": False, "error": "Неизвестный провайдер"})
                continue
            by_api_key[api_key].append((int_id, event_id_val, project_id))

        for api_key, int_list in by_api_key.items():
            # 1. Загружаем ВСЕ заказы один раз
            try:
                all_orders_raw = fetch_ticketscloud_orders(api_key, "__ALL__")
            except RuntimeError as e:
                for int_id, _, _ in int_list:
                    results.append({"integrationId": int_id, "ok": False, "error": str(e)})
                continue

            # Группируем заказы по event_id
            orders_by_event: dict = defaultdict(list)
            for order in all_orders_raw:
                ev = order.get("event") or ""
                if isinstance(ev, dict):
                    ev = ev.get("id") or ev.get("_id") or ""
                orders_by_event[str(ev).strip()].append(order)

            # 2. Параллельно запрашиваем /sets для всех event_id
            sets_by_event: dict = {}
            sets_lock = threading.Lock()

            def fetch_sets_worker(eid):
                try:
                    s = fetch_ticketscloud_event_sets(api_key, eid)
                    with sets_lock:
                        sets_by_event[eid] = s
                except Exception:
                    with sets_lock:
                        sets_by_event[eid] = []

            threads = []
            for _, event_id_val, project_id in int_list:
                if project_id:
                    t = threading.Thread(target=fetch_sets_worker, args=(event_id_val,))
                    t.start()
                    threads.append(t)
            for t in threads:
                t.join(timeout=10)

            # 3. Сохраняем данные по каждой интеграции
            for int_id, event_id_val, project_id in int_list:
                orders = orders_by_event.get(str(event_id_val).strip(), [])
                conn2 = get_conn()
                try:
                    cur2 = conn2.cursor()
                    try:
                        all_sales = []
                        for order in orders:
                            all_sales.extend(parse_ticketscloud_order(order, int_id, project_id))
                        upsert_sales(cur2, all_sales)

                        if project_id:
                            event_sets = sets_by_event.get(event_id_val, [])
                            sync_income_lines(cur2, str(project_id), int_id, event_sets)

                        cur2.execute(
                            f"UPDATE {SCHEMA}.ticket_integrations SET last_sync_at=NOW() WHERE id=%s",
                            (int_id,)
                        )
                        conn2.commit()
                        results.append({"integrationId": int_id, "ok": True, "ordersProcessed": len(orders)})
                    except Exception as e:
                        results.append({"integrationId": int_id, "ok": False, "error": str(e)[:200]})
                finally:
                    conn2.close()

        ok_count  = sum(1 for r in results if r["ok"])
        err_count = len(results) - ok_count
        return ok({
            "success": True,
            "total": len(results),
            "synced": ok_count,
            "failed": err_count,
            "results": results,
        })

    return err("Not found", 404)
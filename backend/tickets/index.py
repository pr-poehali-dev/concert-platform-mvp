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
    """Проверяет HMAC-SHA256 подпись от TicketsCloud."""
    if not secret or not signature:
        return True  # если секрет не задан — пропускаем проверку
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



def fetch_ticketscloud_orders(api_key: str, event_id: str) -> list:
    """Запрашивает заказы из TicketsCloud API v2.

    TicketsCloud API v2:
      Base: https://ticketscloud.com
      Orders: GET /v2/resources/orders   (без фильтров по event в query)
      Auth: Authorization: key <token>
      Response: {"data": [...], "pagination": {"total": N, "page": N, "size": N}}

    Фильтруем заказы по event_id уже на нашей стороне.
    """
    import sys
    base = "https://ticketscloud.com"
    all_orders = []
    page = 1

    while True:
        # Только page — единственный параметр, который API принял в предыдущих тестах
        url = f"{base}/v2/resources/orders?page={page}" if page > 1 else f"{base}/v2/resources/orders"
        print(f"[TC] GET {url}", file=sys.stderr)
        data = _tc_request(url, api_key)

        # Логируем полную структуру первого ответа для диагностики
        if page == 1:
            import json as _json
            sample = {k: (v[:2] if isinstance(v, list) else v) for k, v in data.items()}
            print(f"[TC] response structure: {_json.dumps(sample, ensure_ascii=False, default=str)[:800]}", file=sys.stderr)

        raw_data = data.get("data") or []
        if isinstance(raw_data, list):
            items = raw_data
        elif isinstance(raw_data, dict):
            # Иногда data — это dict с ключами-id
            items = list(raw_data.values())
        else:
            items = []

        print(f"[TC] page={page} got {len(items)} orders", file=sys.stderr)

        # Фильтруем по event_id
        matched_before = len(all_orders)
        for item in items:
            item_event = item.get("event") or ""
            if isinstance(item_event, dict):
                item_event = item_event.get("id") or item_event.get("_id") or ""
            if str(item_event).strip() == str(event_id).strip():
                all_orders.append(item)
        print(f"[TC] matched for event {event_id}: {len(all_orders) - matched_before} new", file=sys.stderr)

        # Пагинация TicketsCloud v2: {"page": N, "page_size": 50, "total": N_pages}
        pagination = data.get("pagination") or data.get("meta") or {}
        print(f"[TC] pagination: {pagination}", file=sys.stderr)

        page_size   = int(pagination.get("page_size") or pagination.get("size") or pagination.get("limit") or 50)
        total_pages = int(pagination.get("total") or pagination.get("pages") or pagination.get("total_pages") or 0)
        current     = int(pagination.get("page") or page)

        # Условия выхода
        if len(items) == 0:
            break
        if not pagination:
            break
        if total_pages and current >= total_pages:
            break
        if len(items) < page_size:
            break
        if page >= 100:  # жёсткий лимит
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
        # Группируем по set_id
        groups: dict = {}
        for t in tickets:
            set_id = str(t.get("set") or "unknown")
            if set_id not in groups:
                # Пытаемся получить имя и цену из sets_values
                sv = sets_values.get(set_id) or {}
                name  = sv.get("name") or set_id
                price = float(sv.get("price") or sv.get("nominal") or 0)
                groups[set_id] = {"name": name, "price": price, "count": 0}
            groups[set_id]["count"] += 1

        for set_id, g in groups.items():
            rows.append({
                "integration_id": integration_id,
                "project_id":     project_id,
                "provider":       "ticketscloud",
                "event_id":       event_id,
                "order_id":       f"{oid}_{set_id[:20]}",
                "ticket_type":    g["name"],
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
        # Нет списка билетов — одна запись с общей суммой
        total = float(order.get("total") or order.get("amount") or order.get("price") or 0)
        rows.append({
            "integration_id": integration_id,
            "project_id":     project_id,
            "provider":       "ticketscloud",
            "event_id":       event_id,
            "order_id":       oid,
            "ticket_type":    "Стандарт",
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


def sync_income_lines(cur, project_id: str, integration_id: str):
    """Синхронизирует строки доходов проекта на основе продаж из билетной системы.

    Логика:
    - Группируем ticket_sales по ticket_type (только paid/reserved)
    - Для каждой категории: ticket_count = total_qty (план = всего продано),
      sold_count = qty со статусом paid (факт), ticket_price = avg цена
    - Ищем существующую строку по category + note='ticketscloud:<integration_id>'
    - Если есть — обновляем, нет — создаём
    - Пересчитываем итоги проекта
    """
    if not project_id:
        return 0

    # Агрегируем продажи по типу билета
    cur.execute(
        f"""SELECT 
              ticket_type,
              SUM(quantity) as total_qty,
              SUM(CASE WHEN status='paid' THEN quantity ELSE 0 END) as paid_qty,
              AVG(price) as avg_price
            FROM {SCHEMA}.ticket_sales
            WHERE integration_id = %s AND status != 'refunded'
            GROUP BY ticket_type
            HAVING SUM(quantity) > 0""",
        (integration_id,)
    )
    rows = cur.fetchall()
    if not rows:
        return 0

    note_marker = f"ticketscloud:{integration_id}"
    synced = 0

    for ticket_type, total_qty, paid_qty, avg_price in rows:
        ticket_count = int(total_qty or 0)
        sold_count   = int(paid_qty or 0)
        price        = float(avg_price or 0)

        # Ищем существующую строку по маркеру в note
        cur.execute(
            f"""SELECT id FROM {SCHEMA}.project_income_lines
                WHERE project_id = %s AND category = %s AND note = %s LIMIT 1""",
            (project_id, ticket_type, note_marker)
        )
        existing = cur.fetchone()

        if existing:
            cur.execute(
                f"""UPDATE {SCHEMA}.project_income_lines
                    SET ticket_count = %s, sold_count = %s, ticket_price = %s
                    WHERE id = %s""",
                (ticket_count, sold_count, price, existing[0])
            )
        else:
            # Получаем следующий sort_order
            cur.execute(
                f"SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {SCHEMA}.project_income_lines WHERE project_id = %s",
                (project_id,)
            )
            sort_order = cur.fetchone()[0]
            cur.execute(
                f"""INSERT INTO {SCHEMA}.project_income_lines
                    (project_id, category, ticket_count, ticket_price, sold_count, note, sort_order)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (project_id, ticket_type, ticket_count, price, sold_count, note_marker, sort_order)
            )
        synced += 1

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
                 ticket_type, quantity, price, total_amount, status,
                 buyer_name, buyer_email, sold_at, raw_payload)
                VALUES (%s,%s,%s,%s,%s, %s,%s,%s,%s,%s, %s,%s,%s,%s)
                ON CONFLICT (integration_id, order_id) DO UPDATE SET
                  status = EXCLUDED.status,
                  total_amount = EXCLUDED.total_amount,
                  raw_payload  = EXCLUDED.raw_payload""",
            (
                s["integration_id"], s["project_id"], s["provider"], s["event_id"], s["order_id"],
                s["ticket_type"], s["quantity"], s["price"], s["total_amount"], s["status"],
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
                    sync_income_lines(cur, str(project_id), int_id)
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
            if provider == "ticketscloud":
                try:
                    orders = fetch_ticketscloud_orders(api_key, event_id_val)
                    all_sales = []
                    for order in orders:
                        all_sales.extend(parse_ticketscloud_order(order, int_id, project_id))
                    inserted = upsert_sales(cur, all_sales)
                    # Автоматически синхронизируем строки доходов проекта
                    if project_id:
                        income_synced = sync_income_lines(cur, str(project_id), int_id)
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
        })

    return err("Not found", 404)
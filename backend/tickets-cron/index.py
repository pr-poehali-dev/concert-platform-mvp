"""
Автосинхронизация билетных интеграций — запускается по расписанию каждые 30 минут.

Логика:
- Берёт все активные интеграции у которых last_sync_at IS NULL или > 28 минут назад
- Для каждой: скачивает заказы из TicketsCloud, обновляет ticket_sales и income_lines
- Пропускает интеграции у которых синхронизация ещё свежая (< 28 мин)

Вызывается через GET / (без параметров) — из scheduler или cron-trigger.
Защита от параллельного запуска через short lease: обновляем last_sync_at ДО запроса к TC.
"""
import json
import os
import urllib.request
import urllib.parse
import psycopg2

SCHEMA = "t_p17532248_concert_platform_mvp"
SYNC_INTERVAL_MINUTES = 28  # чуть меньше 30 мин — с запасом


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def ok(data, status=200):
    return {
        "statusCode": status,
        "headers": {**cors(), "Content-Type": "application/json"},
        "body": json.dumps(data, ensure_ascii=False, default=str),
    }


def _tc_request(url: str, api_key: str, timeout: int = 8) -> dict:
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"key {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def fetch_orders(api_key: str, event_id: str) -> list:
    """Скачивает заказы события из TicketsCloud v2 (с фильтром по event_id)."""
    all_orders = []
    page = 1
    MAX_PAGES = 20

    while True:
        params_q = {"page_size": "50", "event": event_id}
        if page > 1:
            params_q["page"] = str(page)
        url = "https://ticketscloud.com/v2/resources/orders?" + urllib.parse.urlencode(params_q)
        data = _tc_request(url, api_key)

        raw_data = data.get("data") or []
        items = raw_data if isinstance(raw_data, list) else list(raw_data.values()) if isinstance(raw_data, dict) else []

        for item in items:
            item_event = item.get("event") or ""
            if isinstance(item_event, dict):
                item_event = item_event.get("id") or item_event.get("_id") or ""
            if not item_event or str(item_event).strip() == str(event_id).strip():
                all_orders.append(item)

        pagination  = data.get("pagination") or data.get("meta") or {}
        page_size   = int(pagination.get("page_size") or pagination.get("size") or 50)
        total_pages = int(pagination.get("total") or pagination.get("pages") or 0)
        current     = int(pagination.get("page") or page)

        if not items or not pagination:
            break
        if total_pages and current >= total_pages:
            break
        if len(items) < page_size:
            break
        if page >= MAX_PAGES:
            break
        page += 1

    return all_orders


def fetch_event_sets(api_key: str, event_id: str) -> list:
    """Получает категории тиража события."""
    try:
        raw = _tc_request(f"https://ticketscloud.com/v1/resources/events/{event_id}/sets", api_key)
    except Exception:
        return []
    sets = raw if isinstance(raw, list) else (raw.get("data") or [])
    result = []
    for s in sets:
        if not isinstance(s, dict) or s.get("removed"):
            continue
        set_id = str(s.get("id") or "")
        name   = str(s.get("name") or set_id)
        price  = float(s.get("current_price") or s.get("price") or 0)
        total  = int(s.get("amount") or 0)
        vacant = int(s.get("amount_vacant") or 0)
        sold   = max(0, total - vacant)
        result.append({"id": set_id, "name": name, "price": price, "total": total, "sold": sold})
    return result


def parse_order(order: dict, integration_id: str, project_id) -> list:
    """Преобразует заказ TicketsCloud v2 в строки ticket_sales."""
    rows = []
    oid = str(order.get("id") or "")
    if not oid:
        return rows

    status_raw = str(order.get("status") or "").lower()
    if status_raw in ("cancelled", "cancel"):
        return rows

    status = "paid"     if status_raw in ("done", "accepted", "paid", "complete", "completed") else \
             "refunded" if status_raw in ("returned", "refunded") else \
             "reserved"

    settings    = order.get("settings") or {}
    customer    = settings.get("customer") or {}
    buyer_email = customer.get("email", "")
    sold_at     = order.get("created_at") or None
    ev          = order.get("event") or ""
    event_id    = str(ev.get("id") if isinstance(ev, dict) else ev)

    values       = order.get("values") or {}
    sets_values  = values.get("sets_values") or {}
    tickets      = order.get("tickets") or []

    raw_str = json.dumps(order, ensure_ascii=False, default=str)[:4000]

    if tickets:
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
                "integration_id": integration_id, "project_id": project_id,
                "provider": "ticketscloud", "event_id": event_id,
                "order_id": f"{oid}_{set_id[:20]}", "ticket_type": g["name"],
                "set_id": g["set_id"], "quantity": g["count"], "price": g["price"],
                "total_amount": g["price"] * g["count"], "status": status,
                "buyer_name": "", "buyer_email": buyer_email, "sold_at": sold_at,
                "raw_payload": raw_str,
            })
    else:
        total = float(order.get("total") or order.get("amount") or 0)
        rows.append({
            "integration_id": integration_id, "project_id": project_id,
            "provider": "ticketscloud", "event_id": event_id,
            "order_id": oid, "ticket_type": "Стандарт", "set_id": "",
            "quantity": 1, "price": total, "total_amount": total, "status": status,
            "buyer_name": "", "buyer_email": buyer_email, "sold_at": sold_at,
            "raw_payload": raw_str,
        })
    return rows


def upsert_sales(cur, sales: list):
    for s in sales:
        cur.execute(
            f"""INSERT INTO {SCHEMA}.ticket_sales
                (integration_id, project_id, provider, event_id, order_id,
                 ticket_type, set_id, quantity, price, total_amount, status,
                 buyer_name, buyer_email, sold_at, raw_payload)
                VALUES (%s,%s,%s,%s,%s, %s,%s,%s,%s,%s,%s, %s,%s,%s,%s)
                ON CONFLICT (integration_id, order_id) DO UPDATE SET
                  status=EXCLUDED.status, set_id=EXCLUDED.set_id,
                  ticket_type=EXCLUDED.ticket_type, total_amount=EXCLUDED.total_amount,
                  raw_payload=EXCLUDED.raw_payload""",
            (
                s["integration_id"], s["project_id"], s["provider"], s["event_id"], s["order_id"],
                s["ticket_type"], s.get("set_id", ""), s["quantity"], s["price"], s["total_amount"], s["status"],
                s["buyer_name"], s["buyer_email"], s.get("sold_at"), s["raw_payload"],
            ),
        )


def sync_income_lines(cur, project_id: str, integration_id: str, event_sets: list):
    """Обновляет строки доходов проекта на основе тиража и факта продаж."""
    if not project_id or not event_sets:
        return

    cur.execute(
        f"""SELECT set_id, SUM(CASE WHEN status='paid' THEN quantity ELSE 0 END) as paid_qty
            FROM {SCHEMA}.ticket_sales
            WHERE integration_id = %s AND status != 'refunded'
            GROUP BY set_id""",
        (integration_id,)
    )
    sales_by_set = {row[0]: int(row[1] or 0) for row in cur.fetchall()}
    base_marker  = f"ticketscloud:{integration_id}"

    for i, s in enumerate(event_sets):
        set_id     = s["id"]
        sold_count = sales_by_set.get(set_id, 0)
        note_key   = f"{base_marker}:{set_id}"

        cur.execute(
            f"SELECT id FROM {SCHEMA}.project_income_lines WHERE project_id=%s AND note=%s LIMIT 1",
            (project_id, note_key)
        )
        existing = cur.fetchone()
        if existing:
            cur.execute(
                f"""UPDATE {SCHEMA}.project_income_lines
                    SET category=%s, ticket_count=%s, sold_count=%s, ticket_price=%s
                    WHERE id=%s""",
                (s["name"], s["total"], sold_count, s["price"], existing[0])
            )
        else:
            cur.execute(
                f"SELECT COALESCE(MAX(sort_order),0)+1 FROM {SCHEMA}.project_income_lines WHERE project_id=%s",
                (project_id,)
            )
            sort_order = cur.fetchone()[0]
            cur.execute(
                f"""INSERT INTO {SCHEMA}.project_income_lines
                    (project_id, category, ticket_count, ticket_price, sold_count, note, sort_order)
                    VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (project_id, s["name"], s["total"], s["price"], sold_count, note_key, sort_order)
            )

    cur.execute(
        f"""UPDATE {SCHEMA}.projects SET
              total_income_plan = COALESCE((SELECT SUM(ticket_count::numeric * ticket_price)
                FROM {SCHEMA}.project_income_lines WHERE project_id=%s), 0),
              total_income_fact = COALESCE((SELECT SUM(sold_count::numeric * ticket_price)
                FROM {SCHEMA}.project_income_lines WHERE project_id=%s), 0),
              updated_at = NOW()
            WHERE id=%s""",
        (project_id, project_id, project_id)
    )


def handler(event: dict, context) -> dict:
    """Автосинхронизация всех активных билетных интеграций (cron каждые 30 мин)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    # Получаем интеграции, которые нужно синхронизировать
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, api_key, event_id, project_id, provider
                FROM {SCHEMA}.ticket_integrations
                WHERE is_active = TRUE
                  AND (
                    last_sync_at IS NULL
                    OR last_sync_at < NOW() - INTERVAL '{SYNC_INTERVAL_MINUTES} minutes'
                  )
                ORDER BY last_sync_at ASC NULLS FIRST
                LIMIT 50""",
        )
        integrations = cur.fetchall()

        # Сразу ставим timestamp — защита от параллельного запуска
        if integrations:
            ids = [str(r[0]) for r in integrations]
            cur.execute(
                f"UPDATE {SCHEMA}.ticket_integrations SET last_sync_at=NOW() WHERE id = ANY(%s::uuid[])",
                (ids,)
            )
        conn.commit()
    finally:
        conn.close()

    if not integrations:
        return ok({"synced": 0, "message": "Нет интеграций для синхронизации"})

    results = []
    for int_row in integrations:
        int_id_raw, api_key, event_id_val, project_id, provider = int_row
        int_id = str(int_id_raw)

        if provider != "ticketscloud":
            results.append({"integrationId": int_id, "ok": False, "error": "unknown provider"})
            continue

        conn2 = get_conn()
        try:
            cur2 = conn2.cursor()
            orders = fetch_orders(api_key, event_id_val)
            all_sales = []
            for order in orders:
                all_sales.extend(parse_order(order, int_id, project_id))
            upsert_sales(cur2, all_sales)

            if project_id:
                event_sets = fetch_event_sets(api_key, event_id_val)
                sync_income_lines(cur2, str(project_id), int_id, event_sets)

            # Обновляем точное время (перезаписываем lease-время на реальное)
            cur2.execute(
                f"UPDATE {SCHEMA}.ticket_integrations SET last_sync_at=NOW() WHERE id=%s",
                (int_id,)
            )
            conn2.commit()
            results.append({"integrationId": int_id, "ok": True, "orders": len(orders)})
        except Exception as e:
            results.append({"integrationId": int_id, "ok": False, "error": str(e)[:200]})
        finally:
            conn2.close()

    ok_count = sum(1 for r in results if r["ok"])
    return ok({
        "synced": ok_count,
        "failed": len(results) - ok_count,
        "total": len(results),
        "results": results,
    })

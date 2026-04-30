"""
Бар-интеграция: iiko Cloud API v2 и R-Keeper XML-интерфейс.
GET  ?action=integrations&venue_user_id=X   — список интеграций площадки
POST ?action=add_integration                — добавить / обновить интеграцию
POST ?action=delete_integration             — удалить интеграцию
POST ?action=test_connection                — проверить подключение
GET  ?action=report&integration_id=X&type=sales|stock|shifts&date_from=&date_to=&event_id=
     — получить отчёт (из кэша или свежий)
POST ?action=sync&integration_id=X         — принудительная синхронизация
GET  ?action=events&venue_user_id=X        — концерты площадки для привязки
"""
import json, os, hashlib, urllib.request, urllib.error, urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
import psycopg2

SCHEMA = "t_p17532248_concert_platform_mvp"
CACHE_TTL_MINUTES = 15  # кэш отчётов 15 минут


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


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


# ══════════════════════════════════════════════════════════════════════════════
# iiko Cloud API v2
# ══════════════════════════════════════════════════════════════════════════════

IIKO_BASE = "https://api.iiko.services"


def iiko_get_token(api_login: str) -> str:
    """Получить токен сессии iiko (живёт 15 минут)."""
    url = f"{IIKO_BASE}/api/1/access_token"
    payload = json.dumps({"apiLogin": api_login}).encode()
    req = urllib.request.Request(url, data=payload,
                                  headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())["token"]


def iiko_request(token: str, path: str, body: dict | None = None) -> dict:
    """POST или GET к iiko API."""
    url = f"{IIKO_BASE}{path}"
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    data = json.dumps(body).encode() if body is not None else None
    method = "POST" if body is not None else "GET"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def iiko_get_orgs(api_login: str) -> list:
    """Получить список организаций iiko."""
    token = iiko_get_token(api_login)
    result = iiko_request(token, "/api/1/organizations", {"returnAdditionalInfo": False, "includeDisabled": False})
    return result.get("organizations", [])


def iiko_sales_report(api_login: str, org_id: str, date_from: str, date_to: str) -> dict:
    """Отчёт по продажам: сумма, количество чеков, топ-позиции."""
    token = iiko_get_token(api_login)
    # Получаем отчёт по доходам
    body = {
        "organizationIds": [org_id],
        "dateFrom": date_from,  # ISO: "2024-01-01 00:00:00.000"
        "dateTo":   date_to,
        "reportType": "SALES",
    }
    try:
        sales = iiko_request(token, "/api/1/reports/olap", body)
    except Exception as e:
        sales = {"error": str(e)}

    # Получаем чеки (оценка топ-позиций)
    try:
        orders_body = {
            "organizationIds": [org_id],
            "dateFrom": date_from,
            "dateTo": date_to,
            "statuses": ["Closed"],
            "sourceKeys": [],
        }
        orders = iiko_request(token, "/api/1/deliveries/by_delivery_date_and_status", orders_body)
    except Exception:
        orders = {}

    return {"sales": sales, "orders": orders}


def iiko_stock_report(api_login: str, org_id: str) -> dict:
    """Остатки на складах iiko."""
    token = iiko_get_token(api_login)
    # Получаем список складов
    try:
        stores = iiko_request(token, "/api/1/stores", {"organizationId": org_id})
    except Exception as e:
        return {"error": str(e)}
    store_ids = [s["id"] for s in stores.get("storeShiftsData", stores.get("items", []))[:5]]

    # Остатки
    try:
        stock = iiko_request(token, "/api/1/reports/olap", {
            "organizationIds": [org_id],
            "reportType": "STOCK_BALANCE",
            "groupByRowFields": ["ConceptId", "StoreId", "GoodsId", "GoodsName", "MeasureUnit"],
            "aggregateFields": ["Amount", "Sum"],
        })
    except Exception as e:
        stock = {"error": str(e)}
    return {"stores": stores, "stock": stock, "storeIds": store_ids}


def iiko_shifts_report(api_login: str, org_id: str, date_from: str, date_to: str) -> dict:
    """Отчёт по сменам."""
    token = iiko_get_token(api_login)
    try:
        result = iiko_request(token, "/api/1/reports/olap", {
            "organizationIds": [org_id],
            "dateFrom": date_from,
            "dateTo": date_to,
            "reportType": "SALES",
            "groupByRowFields": ["OpenTime.DayOfWeek", "OpenTime.Hour", "WaiterName"],
            "aggregateFields": ["DishAmountInt", "DishDiscountSumInt", "GuestNum", "OrderSum"],
        })
    except Exception as e:
        result = {"error": str(e)}
    return result


# ══════════════════════════════════════════════════════════════════════════════
# R-Keeper XML Interface
# ══════════════════════════════════════════════════════════════════════════════

def rk_request(server_url: str, xml_body: str, timeout: int = 20) -> ET.Element:
    """Отправить XML-запрос к R-Keeper XML-сервису."""
    url = server_url.rstrip("/") + "/xml_interface.dll"
    data = xml_body.encode("utf-8")
    req = urllib.request.Request(url, data=data,
                                  headers={"Content-Type": "text/xml; charset=utf-8"}, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return ET.fromstring(r.read())


def rk_get_info(server_url: str, cash_id: str, license_code: str) -> dict:
    """Проверка подключения и получение информации о кассе R-Keeper."""
    xml = f"""<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetServerInfo">
    <LicenseCode>{license_code}</LicenseCode>
  </RK7CMD>
</RK7Query>"""
    try:
        root = rk_request(server_url, xml)
        status = root.find(".//RK7CMD")
        return {"ok": True, "info": ET.tostring(root, encoding="unicode")[:500]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def rk_sales_report(server_url: str, cash_id: str, license_code: str,
                    date_from: str, date_to: str) -> dict:
    """Отчёт по продажам R-Keeper (XMLInterface GetOrderList)."""
    xml = f"""<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetOrderList">
    <LicenseCode>{license_code}</LicenseCode>
    <Order OrderStatusFlags="ClosedAndPaid">
      <Props DateTimeFrom="{date_from}" DateTimeTo="{date_to}"/>
    </Order>
  </RK7CMD>
</RK7Query>"""
    try:
        root = rk_request(server_url, xml)
        orders = []
        total_sum = 0.0
        for order in root.findall(".//Order"):
            amount = float(order.get("OrderSum", "0")) / 100
            total_sum += amount
            orders.append({
                "id":       order.get("OrderIdent"),
                "table":    order.get("TableName", ""),
                "sum":      amount,
                "guests":   order.get("GuestsCount", "1"),
                "closed":   order.get("CloseTime", ""),
            })
        return {"orders": orders, "totalSum": round(total_sum, 2), "count": len(orders)}
    except Exception as e:
        return {"error": str(e)}


def rk_stock_report(server_url: str, cash_id: str, license_code: str) -> dict:
    """Остатки склада R-Keeper (GetStoreHouseBalances)."""
    xml = f"""<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetStoreHouseBalances">
    <LicenseCode>{license_code}</LicenseCode>
  </RK7CMD>
</RK7Query>"""
    try:
        root = rk_request(server_url, xml)
        items = []
        for item in root.findall(".//Balance"):
            items.append({
                "name":     item.get("Name", ""),
                "category": item.get("Category", ""),
                "amount":   item.get("Amount", "0"),
                "unit":     item.get("MeasureUnit", ""),
                "price":    item.get("Price", "0"),
            })
        return {"items": items, "count": len(items)}
    except Exception as e:
        return {"error": str(e)}


def rk_shifts_report(server_url: str, cash_id: str, license_code: str,
                     date_from: str, date_to: str) -> dict:
    """Отчёт по сменам R-Keeper."""
    xml = f"""<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetCashShiftList">
    <LicenseCode>{license_code}</LicenseCode>
    <DateTimeFrom>{date_from}</DateTimeFrom>
    <DateTimeTo>{date_to}</DateTimeTo>
  </RK7CMD>
</RK7Query>"""
    try:
        root = rk_request(server_url, xml)
        shifts = []
        for shift in root.findall(".//Shift"):
            shifts.append({
                "id":       shift.get("ShiftNum"),
                "opened":   shift.get("OpenTime", ""),
                "closed":   shift.get("CloseTime", ""),
                "cashier":  shift.get("CashierName", ""),
                "sum":      float(shift.get("SumTotal", "0")) / 100,
                "checks":   shift.get("CheckCount", "0"),
            })
        return {"shifts": shifts, "count": len(shifts)}
    except Exception as e:
        return {"error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# DB helpers
# ══════════════════════════════════════════════════════════════════════════════

def row_to_integration(row) -> dict:
    return {
        "id":              str(row[0]),
        "venueUserId":     str(row[1]),
        "type":            row[2],
        "iikoApiLogin":    row[3] or "",
        "iikoOrgId":       row[4] or "",
        "rkServerUrl":     row[5] or "",
        "rkCashId":        row[6] or "",
        "rkLicenseCode":   row[7] or "",
        "displayName":     row[8],
        "isActive":        row[9],
        "lastSyncAt":      str(row[10]) if row[10] else None,
        "createdAt":       str(row[11]),
    }


def get_integration(conn, integration_id: str) -> dict | None:
    cur = conn.cursor()
    cur.execute(
        f"""SELECT id, venue_user_id, integration_type,
                   iiko_api_login, iiko_org_id,
                   rk_server_url, rk_cash_id, rk_license_code,
                   display_name, is_active, last_sync_at, created_at
            FROM {SCHEMA}.bar_integrations WHERE id = %s""",
        (integration_id,)
    )
    row = cur.fetchone()
    return row_to_integration(row) if row else None


def get_cached_report(conn, integration_id: str, report_type: str,
                      date_from: str, date_to: str, event_id: str | None) -> dict | None:
    cur = conn.cursor()
    cur.execute(
        f"""SELECT payload, fetched_at FROM {SCHEMA}.bar_report_cache
            WHERE integration_id = %s AND report_type = %s
              AND (event_id = %s OR (event_id IS NULL AND %s IS NULL))
              AND date_from = %s AND date_to = %s
              AND fetched_at > NOW() - INTERVAL '{CACHE_TTL_MINUTES} minutes'
            ORDER BY fetched_at DESC LIMIT 1""",
        (integration_id, report_type, event_id, event_id, date_from, date_to)
    )
    row = cur.fetchone()
    if row:
        payload = row[0] if isinstance(row[0], dict) else json.loads(row[0])
        return {"data": payload, "cachedAt": str(row[1]), "fromCache": True}
    return None


def save_cached_report(conn, integration_id: str, report_type: str,
                       date_from: str, date_to: str, event_id: str | None, payload: dict):
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO {SCHEMA}.bar_report_cache
            (integration_id, report_type, event_id, date_from, date_to, payload)
            VALUES (%s, %s, %s, %s, %s, %s)""",
        (integration_id, report_type, event_id or None, date_from, date_to, json.dumps(payload))
    )
    conn.commit()


# ══════════════════════════════════════════════════════════════════════════════
# Handler
# ══════════════════════════════════════════════════════════════════════════════

def handler(event: dict, context) -> dict:
    """Бар-интеграция: iiko Cloud и R-Keeper XML."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")

    # ── GET integrations ───────────────────────────────────────────────────
    if method == "GET" and action == "integrations":
        venue_user_id = params.get("venue_user_id", "")
        if not venue_user_id:
            return err("venue_user_id обязателен")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT id, venue_user_id, integration_type,
                           iiko_api_login, iiko_org_id,
                           rk_server_url, rk_cash_id, rk_license_code,
                           display_name, is_active, last_sync_at, created_at
                    FROM {SCHEMA}.bar_integrations
                    WHERE venue_user_id = %s ORDER BY created_at""",
                (venue_user_id,)
            )
            rows = cur.fetchall()
        finally:
            conn.close()
        return ok({"integrations": [row_to_integration(r) for r in rows]})

    # ── POST add_integration ───────────────────────────────────────────────
    if method == "POST" and action == "add_integration":
        b = json.loads(event.get("body") or "{}")
        venue_user_id    = b.get("venueUserId", "")
        itype            = b.get("type", "")
        display_name     = (b.get("displayName") or "Бар").strip()
        iiko_api_login   = (b.get("iikoApiLogin") or "").strip()
        iiko_org_id      = (b.get("iikoOrgId") or "").strip()
        rk_server_url    = (b.get("rkServerUrl") or "").strip()
        rk_cash_id       = (b.get("rkCashId") or "").strip()
        rk_license_code  = (b.get("rkLicenseCode") or "").strip()

        if not venue_user_id:     return err("venueUserId обязателен")
        if itype not in ("iiko", "rkeeper"): return err("type должен быть iiko или rkeeper")
        if itype == "iiko" and not iiko_api_login:
            return err("iikoApiLogin обязателен для iiko")
        if itype == "rkeeper" and not rk_server_url:
            return err("rkServerUrl обязателен для R-Keeper")

        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""INSERT INTO {SCHEMA}.bar_integrations
                    (venue_user_id, integration_type, display_name,
                     iiko_api_login, iiko_org_id,
                     rk_server_url, rk_cash_id, rk_license_code)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (venue_user_id, integration_type) DO UPDATE SET
                      display_name    = EXCLUDED.display_name,
                      iiko_api_login  = EXCLUDED.iiko_api_login,
                      iiko_org_id     = EXCLUDED.iiko_org_id,
                      rk_server_url   = EXCLUDED.rk_server_url,
                      rk_cash_id      = EXCLUDED.rk_cash_id,
                      rk_license_code = EXCLUDED.rk_license_code,
                      is_active       = TRUE
                    RETURNING id""",
                (venue_user_id, itype, display_name,
                 iiko_api_login or None, iiko_org_id or None,
                 rk_server_url or None, rk_cash_id or None, rk_license_code or None)
            )
            new_id = str(cur.fetchone()[0])
            conn.commit()
        finally:
            conn.close()
        return ok({"id": new_id}, 201)

    # ── POST delete_integration ────────────────────────────────────────────
    if method == "POST" and action == "delete_integration":
        b = json.loads(event.get("body") or "{}")
        integration_id = b.get("id", "")
        if not integration_id: return err("id обязателен")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.bar_integrations SET is_active = FALSE WHERE id = %s",
                (integration_id,)
            )
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    # ── POST test_connection ───────────────────────────────────────────────
    if method == "POST" and action == "test_connection":
        b = json.loads(event.get("body") or "{}")
        itype           = b.get("type", "")
        iiko_api_login  = (b.get("iikoApiLogin") or "").strip()
        rk_server_url   = (b.get("rkServerUrl") or "").strip()
        rk_cash_id      = (b.get("rkCashId") or "").strip()
        rk_license_code = (b.get("rkLicenseCode") or "").strip()

        if itype == "iiko":
            if not iiko_api_login: return err("iikoApiLogin обязателен")
            try:
                orgs = iiko_get_orgs(iiko_api_login)
                return ok({
                    "ok": True,
                    "message": f"Подключено! Найдено организаций: {len(orgs)}",
                    "organizations": [{"id": o["id"], "name": o["name"]} for o in orgs],
                })
            except Exception as e:
                return ok({"ok": False, "message": f"Ошибка: {str(e)[:200]}"})

        elif itype == "rkeeper":
            if not rk_server_url: return err("rkServerUrl обязателен")
            result = rk_get_info(rk_server_url, rk_cash_id, rk_license_code)
            return ok({
                "ok": result["ok"],
                "message": "Подключено к R-Keeper!" if result["ok"] else f"Ошибка: {result.get('error','')[:200]}",
            })
        else:
            return err("type должен быть iiko или rkeeper")

    # ── GET report ────────────────────────────────────────────────────────
    if method == "GET" and action == "report":
        integration_id = params.get("integration_id", "")
        report_type    = params.get("type", "sales")       # sales | stock | shifts
        date_from      = params.get("date_from", "")
        date_to        = params.get("date_to", "")
        event_id       = params.get("event_id") or None
        force_refresh  = params.get("refresh") == "1"

        if not integration_id: return err("integration_id обязателен")
        if report_type not in ("sales", "stock", "shifts"):
            return err("type: sales, stock или shifts")

        # Дефолтные даты — текущие сутки
        now = datetime.now(timezone.utc)
        if not date_from:
            date_from = now.replace(hour=0, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d %H:%M:%S.000")
        if not date_to:
            date_to = now.strftime("%Y-%m-%d %H:%M:%S.000")

        conn = get_conn()
        try:
            integration = get_integration(conn, integration_id)
            if not integration or not integration["isActive"]:
                return err("Интеграция не найдена", 404)

            # Проверяем кэш
            if not force_refresh:
                cached = get_cached_report(conn, integration_id, report_type, date_from, date_to, event_id)
                if cached:
                    conn.close()
                    return ok({"report": cached["data"], "fromCache": True, "cachedAt": cached["cachedAt"]})

            # Запрашиваем свежие данные
            itype = integration["type"]
            data = {}

            if itype == "iiko":
                api_login = integration["iikoApiLogin"]
                org_id    = integration["iikoOrgId"]
                if not api_login:
                    conn.close(); return err("iiko API-ключ не настроен")
                try:
                    if report_type == "sales":
                        data = iiko_sales_report(api_login, org_id, date_from, date_to)
                    elif report_type == "stock":
                        data = iiko_stock_report(api_login, org_id)
                    elif report_type == "shifts":
                        data = iiko_shifts_report(api_login, org_id, date_from, date_to)
                except Exception as e:
                    conn.close(); return err(f"iiko API: {str(e)[:300]}", 502)

            elif itype == "rkeeper":
                sv = integration["rkServerUrl"]
                cid = integration["rkCashId"]
                lc  = integration["rkLicenseCode"]
                if not sv:
                    conn.close(); return err("R-Keeper URL не настроен")
                try:
                    if report_type == "sales":
                        data = rk_sales_report(sv, cid, lc, date_from, date_to)
                    elif report_type == "stock":
                        data = rk_stock_report(sv, cid, lc)
                    elif report_type == "shifts":
                        data = rk_shifts_report(sv, cid, lc, date_from, date_to)
                except Exception as e:
                    conn.close(); return err(f"R-Keeper: {str(e)[:300]}", 502)

            # Сохраняем в кэш
            save_cached_report(conn, integration_id, report_type, date_from, date_to, event_id, data)

            # Обновляем last_sync_at
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.bar_integrations SET last_sync_at = NOW() WHERE id = %s",
                (integration_id,)
            )
            conn.commit()
        finally:
            conn.close()

        return ok({"report": data, "fromCache": False, "type": report_type,
                   "dateFrom": date_from, "dateTo": date_to})

    # ── GET events ────────────────────────────────────────────────────────
    if method == "GET" and action == "events":
        venue_user_id = params.get("venue_user_id", "")
        if not venue_user_id: return err("venue_user_id обязателен")
        conn = get_conn()
        try:
            cur = conn.cursor()
            # Берём концерты этой площадки из таблицы projects
            cur.execute(
                f"""SELECT id, name, start_date, end_date
                    FROM {SCHEMA}.projects
                    WHERE user_id = %s
                    ORDER BY start_date DESC LIMIT 50""",
                (venue_user_id,)
            )
            rows = cur.fetchall()
        except Exception:
            rows = []
        finally:
            conn.close()
        return ok({"events": [
            {"id": str(r[0]), "name": r[1],
             "startDate": str(r[2]) if r[2] else None,
             "endDate":   str(r[3]) if r[3] else None}
            for r in rows
        ]})

    return err("Неизвестное действие", 404)

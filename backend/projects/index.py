"""Финансовый учёт проектов GLOBAL LINK."""
import json
from helpers import (
    get_conn, cors, serial, recalc_totals, row_to_project,
    SCHEMA, DEFAULT_EXPENSE_CATEGORIES
)


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=serial)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "list")

    # GET list
    if method == "GET" and action == "list":
        uid = params.get("user_id", "")
        if not uid: return err("user_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id,user_id,title,artist,project_type,status,date_start,date_end,
                       city,venue_name,description,tax_system,total_expenses_plan,
                       total_expenses_fact,total_income_plan,total_income_fact,created_at,updated_at
                FROM {SCHEMA}.projects WHERE user_id=%s ORDER BY created_at DESC""", (uid,))
        rows = cur.fetchall(); conn.close()
        return ok({"projects": [row_to_project(r) for r in rows]})

    # GET detail
    if method == "GET" and action == "detail":
        pid = params.get("project_id", "")
        if not pid: return err("project_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT id,user_id,title,artist,project_type,status,date_start,date_end,
                       city,venue_name,description,tax_system,total_expenses_plan,
                       total_expenses_fact,total_income_plan,total_income_fact,created_at,updated_at
                FROM {SCHEMA}.projects WHERE id=%s""", (pid,))
        row = cur.fetchone()
        if not row: conn.close(); return err("Проект не найден", 404)
        project = row_to_project(row)
        cur.execute(
            f"SELECT id,category,title,amount_plan,amount_fact,note,sort_order FROM {SCHEMA}.project_expenses WHERE project_id=%s ORDER BY sort_order,created_at",
            (pid,))
        project["expenses"] = [{"id":str(r[0]),"category":r[1],"title":r[2],"amountPlan":float(r[3]),"amountFact":float(r[4]),"note":r[5],"sortOrder":r[6]} for r in cur.fetchall()]
        cur.execute(
            f"SELECT id,category,ticket_count,ticket_price,sold_count,note,sort_order FROM {SCHEMA}.project_income_lines WHERE project_id=%s ORDER BY sort_order,created_at",
            (pid,))
        project["incomeLines"] = [{"id":str(r[0]),"category":r[1],"ticketCount":r[2],"ticketPrice":float(r[3]),"soldCount":r[4],"note":r[5],"sortOrder":r[6],"totalPlan":r[2]*float(r[3]),"totalFact":r[4]*float(r[3])} for r in cur.fetchall()]
        conn.close()
        return ok({"project": project, "expenseCategories": DEFAULT_EXPENSE_CATEGORIES})

    # POST create
    if method == "POST" and action == "create":
        b = json.loads(event.get("body") or "{}")
        uid, title = b.get("userId",""), (b.get("title") or "").strip()
        if not uid: return err("userId required")
        if not title: return err("Введите название проекта")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.projects
                (user_id,title,artist,project_type,status,date_start,date_end,city,venue_name,description,tax_system)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (uid,title,b.get("artist",""),b.get("projectType","single"),b.get("status","planning"),
             b.get("dateStart") or None,b.get("dateEnd") or None,
             b.get("city",""),b.get("venueName",""),b.get("description",""),b.get("taxSystem","none")))
        pid = str(cur.fetchone()[0])
        def to_float(v, default=0.0):
            try: return float(v)
            except (TypeError, ValueError): return default
        def to_int(v, default=0):
            try: return int(v)
            except (TypeError, ValueError): return default
        for i,exp in enumerate(b.get("expenses") or []):
            cur.execute(
                f"INSERT INTO {SCHEMA}.project_expenses (project_id,category,title,amount_plan,amount_fact,note,sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (pid,exp.get("category","Прочее"),exp.get("title",""),to_float(exp.get("amountPlan")),to_float(exp.get("amountFact")),exp.get("note",""),i))
        for i,inc in enumerate(b.get("incomeLines") or []):
            cur.execute(
                f"INSERT INTO {SCHEMA}.project_income_lines (project_id,category,ticket_count,ticket_price,sold_count,note,sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (pid,inc.get("category","Стандарт"),to_int(inc.get("ticketCount")),to_float(inc.get("ticketPrice")),to_int(inc.get("soldCount")),inc.get("note",""),i))
        recalc_totals(cur, pid); conn.commit(); conn.close()
        return ok({"projectId": pid}, 201)

    # POST update
    if method == "POST" and action == "update":
        b = json.loads(event.get("body") or "{}")
        pid = b.get("projectId","")
        if not pid: return err("projectId required")
        key_map = {"title":"title","artist":"artist","projectType":"project_type","status":"status",
                   "dateStart":"date_start","dateEnd":"date_end","city":"city","venueName":"venue_name",
                   "description":"description","taxSystem":"tax_system"}
        fields = {col: (b[fk] or None if fk in ("dateStart","dateEnd") else b[fk]) for fk,col in key_map.items() if fk in b}
        if fields:
            set_clause = ", ".join(f"{c}=%s" for c in fields) + ", updated_at=NOW()"
            conn = get_conn(); cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.projects SET {set_clause} WHERE id=%s", list(fields.values())+[pid])
            conn.commit(); conn.close()
        return ok({"success": True})

    # POST delete
    if method == "POST" and action == "delete":
        b = json.loads(event.get("body") or "{}")
        pid = b.get("projectId","")
        if not pid: return err("projectId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.project_expenses WHERE project_id=%s",(pid,))
        cur.execute(f"DELETE FROM {SCHEMA}.project_income_lines WHERE project_id=%s",(pid,))
        cur.execute(f"DELETE FROM {SCHEMA}.projects WHERE id=%s",(pid,))
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST add_expense
    if method == "POST" and action == "add_expense":
        b = json.loads(event.get("body") or "{}")
        pid, title = b.get("projectId",""), (b.get("title") or "").strip()
        if not pid: return err("projectId required")
        if not title: return err("Введите название статьи")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"SELECT COALESCE(MAX(sort_order),0)+1 FROM {SCHEMA}.project_expenses WHERE project_id=%s",(pid,))
        order = cur.fetchone()[0]
        def _f(v):
            try: return float(v)
            except (TypeError, ValueError): return 0.0
        cur.execute(
            f"INSERT INTO {SCHEMA}.project_expenses (project_id,category,title,amount_plan,amount_fact,note,sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (pid,b.get("category","Прочее"),title,_f(b.get("amountPlan")),_f(b.get("amountFact")),b.get("note",""),order))
        eid = str(cur.fetchone()[0]); recalc_totals(cur, pid); conn.commit(); conn.close()
        return ok({"id": eid}, 201)

    # POST update_expense
    if method == "POST" and action == "update_expense":
        b = json.loads(event.get("body") or "{}")
        eid = b.get("id","")
        if not eid: return err("id required")
        fmap = {"category":"category","title":"title","amountPlan":"amount_plan","amountFact":"amount_fact","note":"note"}
        fields = {col: b[fk] for fk,col in fmap.items() if fk in b}
        if not fields: return err("Нет данных")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.project_expenses SET {', '.join(f'{c}=%s' for c in fields)} WHERE id=%s RETURNING project_id",
                    list(fields.values())+[eid])
        row = cur.fetchone()
        if row: recalc_totals(cur, str(row[0]))
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST delete_expense
    if method == "POST" and action == "delete_expense":
        b = json.loads(event.get("body") or "{}")
        eid = b.get("id","")
        if not eid: return err("id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.project_expenses WHERE id=%s RETURNING project_id",(eid,))
        row = cur.fetchone()
        if row: recalc_totals(cur, str(row[0]))
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST add_income
    if method == "POST" and action == "add_income":
        b = json.loads(event.get("body") or "{}")
        pid = b.get("projectId","")
        if not pid: return err("projectId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"SELECT COALESCE(MAX(sort_order),0)+1 FROM {SCHEMA}.project_income_lines WHERE project_id=%s",(pid,))
        order = cur.fetchone()[0]
        cur.execute(
            f"INSERT INTO {SCHEMA}.project_income_lines (project_id,category,ticket_count,ticket_price,sold_count,note,sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (pid,b.get("category","Стандарт"),int(b.get("ticketCount",0)),float(b.get("ticketPrice",0)),int(b.get("soldCount",0)),b.get("note",""),order))
        iid = str(cur.fetchone()[0]); recalc_totals(cur, pid); conn.commit(); conn.close()
        return ok({"id": iid}, 201)

    # POST update_income
    if method == "POST" and action == "update_income":
        b = json.loads(event.get("body") or "{}")
        iid = b.get("id","")
        if not iid: return err("id required")
        fmap = {"category":"category","ticketCount":"ticket_count","ticketPrice":"ticket_price","soldCount":"sold_count","note":"note"}
        fields = {col: b[fk] for fk,col in fmap.items() if fk in b}
        if not fields: return err("Нет данных")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.project_income_lines SET {', '.join(f'{c}=%s' for c in fields)} WHERE id=%s RETURNING project_id",
                    list(fields.values())+[iid])
        row = cur.fetchone()
        if row: recalc_totals(cur, str(row[0]))
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST delete_income
    if method == "POST" and action == "delete_income":
        b = json.loads(event.get("body") or "{}")
        iid = b.get("id","")
        if not iid: return err("id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.project_income_lines WHERE id=%s RETURNING project_id",(iid,))
        row = cur.fetchone()
        if row: recalc_totals(cur, str(row[0]))
        conn.commit(); conn.close()
        return ok({"success": True})

    return err("Not found", 404)
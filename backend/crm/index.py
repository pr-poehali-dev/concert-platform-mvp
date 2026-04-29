"""CRM API — управление компаниями, сделками, задачами и целями."""
import json
import os
import psycopg2
from datetime import datetime

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, ensure_ascii=False, default=str)}

def err(msg, code=400):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    action = params.get("action") or body.get("action", "")
    user_id = params.get("user_id") or body.get("user_id", "")

    if not user_id:
        return err("user_id required")

    conn = get_conn()
    cur = conn.cursor()

    try:
        # ── COMPANIES ──────────────────────────────────────────────────────────
        if action == "companies_list":
            cur.execute(
                "SELECT id,name,industry,status,revenue,contact,phone,email,city,created_at FROM crm_companies WHERE user_id=%s ORDER BY created_at DESC",
                (user_id,)
            )
            rows = cur.fetchall()
            cols = ["id","name","industry","status","revenue","contact","phone","email","city","createdAt"]
            return ok({"companies": [dict(zip(cols, r)) for r in rows]})

        if action == "company_save":
            d = body
            rid = d.get("id")
            if rid:
                cur.execute(
                    "UPDATE crm_companies SET name=%s,industry=%s,status=%s,revenue=%s,contact=%s,phone=%s,email=%s,city=%s,updated_at=NOW() WHERE id=%s AND user_id=%s",
                    (d.get("name",""), d.get("industry",""), d.get("status","lead"), int(d.get("revenue",0)),
                     d.get("contact",""), d.get("phone",""), d.get("email",""), d.get("city",""), rid, user_id)
                )
            else:
                rid = datetime.now().strftime("%Y%m%d%H%M%S%f")
                cur.execute(
                    "INSERT INTO crm_companies(id,user_id,name,industry,status,revenue,contact,phone,email,city) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (rid, user_id, d.get("name",""), d.get("industry",""), d.get("status","lead"),
                     int(d.get("revenue",0)), d.get("contact",""), d.get("phone",""), d.get("email",""), d.get("city",""))
                )
            conn.commit()
            return ok({"id": rid})

        if action == "company_delete":
            rid = body.get("id") or params.get("id")
            cur.execute("DELETE FROM crm_companies WHERE id=%s AND user_id=%s", (rid, user_id))
            conn.commit()
            return ok({"deleted": rid})

        # ── DEALS ──────────────────────────────────────────────────────────────
        if action == "deals_list":
            cur.execute(
                "SELECT id,title,company_id,company_name,stage,amount,probability,assignee,deadline,description,tags,created_at FROM crm_deals WHERE user_id=%s ORDER BY created_at DESC",
                (user_id,)
            )
            rows = cur.fetchall()
            cols = ["id","title","companyId","companyName","stage","amount","probability","assignee","deadline","description","tags","createdAt"]
            result = []
            for r in rows:
                item = dict(zip(cols, r))
                item["tags"] = json.loads(item["tags"]) if item["tags"] else []
                item["deadline"] = str(item["deadline"]) if item["deadline"] else ""
                item["createdAt"] = str(item["createdAt"])
                result.append(item)
            return ok({"deals": result})

        if action == "deal_save":
            d = body
            rid = d.get("id")
            tags = json.dumps(d.get("tags", []), ensure_ascii=False)
            deadline = d.get("deadline") or None
            if rid:
                cur.execute(
                    "UPDATE crm_deals SET title=%s,company_id=%s,company_name=%s,stage=%s,amount=%s,probability=%s,assignee=%s,deadline=%s,description=%s,tags=%s,updated_at=NOW() WHERE id=%s AND user_id=%s",
                    (d.get("title",""), d.get("companyId",""), d.get("companyName",""), d.get("stage","lead"),
                     int(d.get("amount",0)), int(d.get("probability",30)), d.get("assignee",""),
                     deadline, d.get("description",""), tags, rid, user_id)
                )
            else:
                rid = datetime.now().strftime("%Y%m%d%H%M%S%f")
                cur.execute(
                    "INSERT INTO crm_deals(id,user_id,title,company_id,company_name,stage,amount,probability,assignee,deadline,description,tags) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (rid, user_id, d.get("title",""), d.get("companyId",""), d.get("companyName",""),
                     d.get("stage","lead"), int(d.get("amount",0)), int(d.get("probability",30)),
                     d.get("assignee",""), deadline, d.get("description",""), tags)
                )
            conn.commit()
            return ok({"id": rid})

        if action == "deal_delete":
            rid = body.get("id") or params.get("id")
            cur.execute("DELETE FROM crm_deals WHERE id=%s AND user_id=%s", (rid, user_id))
            conn.commit()
            return ok({"deleted": rid})

        # ── TASKS ──────────────────────────────────────────────────────────────
        if action == "tasks_list":
            cur.execute(
                "SELECT id,title,description,status,priority,assignee,deadline,subtasks,created_at FROM crm_tasks WHERE user_id=%s ORDER BY created_at DESC",
                (user_id,)
            )
            rows = cur.fetchall()
            cols = ["id","title","description","status","priority","assignee","deadline","subtasks","createdAt"]
            result = []
            for r in rows:
                item = dict(zip(cols, r))
                item["subtasks"] = json.loads(item["subtasks"]) if item["subtasks"] else []
                item["deadline"] = str(item["deadline"]) if item["deadline"] else ""
                item["createdAt"] = str(item["createdAt"])
                result.append(item)
            return ok({"tasks": result})

        if action == "task_save":
            d = body
            rid = d.get("id")
            subtasks = json.dumps(d.get("subtasks", []), ensure_ascii=False)
            deadline = d.get("deadline") or None
            if rid:
                cur.execute(
                    "UPDATE crm_tasks SET title=%s,description=%s,status=%s,priority=%s,assignee=%s,deadline=%s,subtasks=%s,updated_at=NOW() WHERE id=%s AND user_id=%s",
                    (d.get("title",""), d.get("description",""), d.get("status","todo"), d.get("priority","medium"),
                     d.get("assignee",""), deadline, subtasks, rid, user_id)
                )
            else:
                rid = datetime.now().strftime("%Y%m%d%H%M%S%f")
                cur.execute(
                    "INSERT INTO crm_tasks(id,user_id,title,description,status,priority,assignee,deadline,subtasks) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (rid, user_id, d.get("title",""), d.get("description",""), d.get("status","todo"),
                     d.get("priority","medium"), d.get("assignee",""), deadline, subtasks)
                )
            conn.commit()
            return ok({"id": rid})

        if action == "task_delete":
            rid = body.get("id") or params.get("id")
            cur.execute("DELETE FROM crm_tasks WHERE id=%s AND user_id=%s", (rid, user_id))
            conn.commit()
            return ok({"deleted": rid})

        # ── GOALS ──────────────────────────────────────────────────────────────
        if action == "goals_list":
            cur.execute(
                "SELECT id,title,description,category,target,current_val,unit,deadline,owner,team,status,created_at FROM crm_goals WHERE user_id=%s ORDER BY created_at DESC",
                (user_id,)
            )
            rows = cur.fetchall()
            cols = ["id","title","description","category","target","current","unit","deadline","owner","team","status","createdAt"]
            result = []
            for r in rows:
                item = dict(zip(cols, r))
                item["team"] = json.loads(item["team"]) if item["team"] else []
                item["deadline"] = str(item["deadline"]) if item["deadline"] else ""
                item["createdAt"] = str(item["createdAt"])
                result.append(item)
            return ok({"goals": result})

        if action == "goal_save":
            d = body
            rid = d.get("id")
            team = json.dumps(d.get("team", []), ensure_ascii=False)
            deadline = d.get("deadline") or None
            current = int(d.get("current", 0))
            target = int(d.get("target", 1))
            status = "done" if current >= target else d.get("status", "in_progress")
            if rid:
                cur.execute(
                    "UPDATE crm_goals SET title=%s,description=%s,category=%s,target=%s,current_val=%s,unit=%s,deadline=%s,owner=%s,team=%s,status=%s,updated_at=NOW() WHERE id=%s AND user_id=%s",
                    (d.get("title",""), d.get("description",""), d.get("category","revenue"),
                     target, current, d.get("unit",""), deadline, d.get("owner",""), team, status, rid, user_id)
                )
            else:
                rid = datetime.now().strftime("%Y%m%d%H%M%S%f")
                cur.execute(
                    "INSERT INTO crm_goals(id,user_id,title,description,category,target,current_val,unit,deadline,owner,team,status) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (rid, user_id, d.get("title",""), d.get("description",""), d.get("category","revenue"),
                     target, current, d.get("unit",""), deadline, d.get("owner",""), team, status)
                )
            conn.commit()
            return ok({"id": rid})

        if action == "goal_delete":
            rid = body.get("id") or params.get("id")
            cur.execute("DELETE FROM crm_goals WHERE id=%s AND user_id=%s", (rid, user_id))
            conn.commit()
            return ok({"deleted": rid})

        return err("Unknown action")

    except Exception as e:
        conn.rollback()
        return err(str(e), 500)
    finally:
        cur.close()
        conn.close()

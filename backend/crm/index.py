"""
CRM — доски (Kanban), цели (Goals), воронки (Pipelines).
GET  ?action=crm_boards_list&user_id=...
POST ?action=crm_board_create
POST ?action=crm_board_delete
GET  ?action=crm_columns_list&board_id=...
POST ?action=crm_column_create
GET  ?action=crm_cards_list&board_id=...
POST ?action=crm_card_create
POST ?action=crm_card_update
POST ?action=crm_card_delete
GET  ?action=crm_goals_list&user_id=...
POST ?action=crm_goal_create
POST ?action=crm_goal_update
GET  ?action=crm_pipelines_list&user_id=...
POST ?action=crm_pipeline_create
"""
import json
import os
import psycopg2

SCHEMA = "t_p17532248_concert_platform_mvp"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    """CRM: Kanban boards, goals, pipelines."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")

    # ── BOARDS ──────────────────────────────────────────────────────────────

    if method == "GET" and action == "crm_boards_list":
        user_id = params.get("user_id", "")
        if not user_id: return err("user_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT b.id, b.title, b.description, b.color, b.created_at,
                           (SELECT COUNT(*) FROM {SCHEMA}.crm_columns WHERE board_id=b.id) as cols,
                           (SELECT COUNT(*) FROM {SCHEMA}.crm_cards WHERE board_id=b.id) as cards
                    FROM {SCHEMA}.crm_boards b
                    WHERE b.user_id=%s ORDER BY b.created_at""",
                (user_id,))
            rows = cur.fetchall()
        finally:
            conn.close()
        boards = [{"id": str(r[0]), "title": r[1], "description": r[2], "color": r[3],
                   "columnsCount": r[5], "cardsCount": r[6]} for r in rows]
        return ok({"boards": boards})

    if method == "POST" and action == "crm_board_create":
        b = json.loads(event.get("body") or "{}")
        user_id = b.get("userId", ""); title = (b.get("title") or "").strip()
        color = b.get("color", "from-neon-purple to-neon-cyan")
        if not user_id or not title: return err("userId and title required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"INSERT INTO {SCHEMA}.crm_boards (user_id, title, description, color) VALUES (%s,%s,%s,%s) RETURNING id",
                (user_id, title, b.get("description", ""), color))
            board_id = str(cur.fetchone()[0])
            # Создаём дефолтные колонки
            for i, col_title in enumerate(["Новые", "В работе", "Готово"]):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.crm_columns (board_id, title, sort_order) VALUES (%s,%s,%s)",
                    (board_id, col_title, i))
            conn.commit()
        finally:
            conn.close()
        return ok({"boardId": board_id}, 201)

    if method == "POST" and action == "crm_board_delete":
        b = json.loads(event.get("body") or "{}")
        board_id = b.get("boardId", ""); user_id = b.get("userId", "")
        if not board_id: return err("boardId required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {SCHEMA}.crm_cards WHERE board_id=%s", (board_id,))
            cur.execute(f"DELETE FROM {SCHEMA}.crm_columns WHERE board_id=%s", (board_id,))
            cur.execute(f"DELETE FROM {SCHEMA}.crm_boards WHERE id=%s AND user_id=%s", (board_id, user_id))
            conn.commit()
        finally:
            conn.close()
        return ok({"deleted": True})

    # ── COLUMNS ─────────────────────────────────────────────────────────────

    if method == "GET" and action == "crm_columns_list":
        board_id = params.get("board_id", "")
        if not board_id: return err("board_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT id, board_id, title, color, sort_order FROM {SCHEMA}.crm_columns WHERE board_id=%s ORDER BY sort_order",
                (board_id,))
            rows = cur.fetchall()
        finally:
            conn.close()
        cols = [{"id": str(r[0]), "boardId": str(r[1]), "title": r[2], "color": r[3], "sortOrder": r[4]} for r in rows]
        return ok({"columns": cols})

    if method == "POST" and action == "crm_column_create":
        b = json.loads(event.get("body") or "{}")
        board_id = b.get("boardId", ""); title = (b.get("title") or "").strip()
        if not board_id or not title: return err("boardId and title required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"INSERT INTO {SCHEMA}.crm_columns (board_id, title, sort_order) VALUES (%s,%s,%s) RETURNING id",
                (board_id, title, b.get("sortOrder", 0)))
            col_id = str(cur.fetchone()[0]); conn.commit()
        finally:
            conn.close()
        return ok({"columnId": col_id}, 201)

    if method == "POST" and action == "crm_column_delete":
        b = json.loads(event.get("body") or "{}")
        col_id = b.get("columnId", "")
        if not col_id: return err("columnId required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {SCHEMA}.crm_cards WHERE column_id=%s", (col_id,))
            cur.execute(f"DELETE FROM {SCHEMA}.crm_columns WHERE id=%s", (col_id,))
            conn.commit()
        finally:
            conn.close()
        return ok({"deleted": True})

    # ── CARDS ───────────────────────────────────────────────────────────────

    if method == "GET" and action == "crm_cards_list":
        board_id = params.get("board_id", "")
        if not board_id: return err("board_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT id, column_id, board_id, title, description, assigned_to,
                           due_date, priority, tags, sort_order
                    FROM {SCHEMA}.crm_cards WHERE board_id=%s ORDER BY sort_order""",
                (board_id,))
            rows = cur.fetchall()
        finally:
            conn.close()
        cards = [{"id": str(r[0]), "columnId": str(r[1]), "boardId": str(r[2]),
                  "title": r[3], "description": r[4],
                  "assignedTo": str(r[5]) if r[5] else None,
                  "dueDate": str(r[6]) if r[6] else None,
                  "priority": r[7], "tags": r[8], "sortOrder": r[9]} for r in rows]
        return ok({"cards": cards})

    if method == "POST" and action == "crm_card_create":
        b = json.loads(event.get("body") or "{}")
        col_id = b.get("columnId", ""); board_id = b.get("boardId", "")
        title = (b.get("title") or "").strip()
        if not col_id or not board_id or not title: return err("columnId, boardId, title required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""INSERT INTO {SCHEMA}.crm_cards (column_id, board_id, title, description, priority, sort_order)
                    VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""",
                (col_id, board_id, title, b.get("description", ""),
                 b.get("priority", "medium"), b.get("sortOrder", 0)))
            card_id = str(cur.fetchone()[0]); conn.commit()
        finally:
            conn.close()
        return ok({"cardId": card_id}, 201)

    if method == "POST" and action == "crm_card_update":
        b = json.loads(event.get("body") or "{}")
        card_id = b.get("cardId", "")
        if not card_id: return err("cardId required")
        fmap = {"columnId": "column_id", "title": "title", "description": "description",
                "assignedTo": "assigned_to", "dueDate": "due_date",
                "priority": "priority", "tags": "tags"}
        fields = {}
        for fk, col in fmap.items():
            if fk in b:
                fields[col] = b[fk] if b[fk] != "" else None
        if not fields: return err("Нет данных")
        set_clause = ", ".join(f"{c}=%s" for c in fields)
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.crm_cards SET {set_clause} WHERE id=%s",
                        list(fields.values()) + [card_id])
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    if method == "POST" and action == "crm_card_delete":
        b = json.loads(event.get("body") or "{}")
        card_id = b.get("cardId", "")
        if not card_id: return err("cardId required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {SCHEMA}.crm_cards WHERE id=%s", (card_id,))
            conn.commit()
        finally:
            conn.close()
        return ok({"deleted": True})

    # ── GOALS ───────────────────────────────────────────────────────────────

    if method == "GET" and action == "crm_goals_list":
        user_id = params.get("user_id", "")
        if not user_id: return err("user_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""SELECT id, title, description, target_value, current_value, unit,
                           status, deadline, color
                    FROM {SCHEMA}.crm_goals WHERE user_id=%s ORDER BY created_at""",
                (user_id,))
            rows = cur.fetchall()
        finally:
            conn.close()
        goals = [{"id": str(r[0]), "title": r[1], "description": r[2],
                  "targetValue": float(r[3]) if r[3] else None,
                  "currentValue": float(r[4]), "unit": r[5], "status": r[6],
                  "deadline": str(r[7]) if r[7] else None, "color": r[8]} for r in rows]
        return ok({"goals": goals})

    if method == "POST" and action == "crm_goal_create":
        b = json.loads(event.get("body") or "{}")
        user_id = b.get("userId", ""); title = (b.get("title") or "").strip()
        if not user_id or not title: return err("userId and title required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""INSERT INTO {SCHEMA}.crm_goals (user_id, title, description, target_value, unit, deadline)
                    VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""",
                (user_id, title, b.get("description", ""),
                 b.get("targetValue") or None, b.get("unit", ""),
                 b.get("deadline") or None))
            gid = str(cur.fetchone()[0]); conn.commit()
        finally:
            conn.close()
        return ok({"goalId": gid}, 201)

    if method == "POST" and action == "crm_goal_update":
        b = json.loads(event.get("body") or "{}")
        goal_id = b.get("goalId", "")
        if not goal_id: return err("goalId required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            if "currentValue" in b:
                cur.execute(f"UPDATE {SCHEMA}.crm_goals SET current_value=%s WHERE id=%s", (b["currentValue"], goal_id))
            if "status" in b:
                cur.execute(f"UPDATE {SCHEMA}.crm_goals SET status=%s WHERE id=%s", (b["status"], goal_id))
            conn.commit()
        finally:
            conn.close()
        return ok({"success": True})

    if method == "POST" and action == "crm_goal_delete":
        b = json.loads(event.get("body") or "{}")
        goal_id = b.get("goalId", "")
        if not goal_id: return err("goalId required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {SCHEMA}.crm_goals WHERE id=%s", (goal_id,))
            conn.commit()
        finally:
            conn.close()
        return ok({"deleted": True})

    # ── PIPELINES ───────────────────────────────────────────────────────────

    if method == "GET" and action == "crm_pipelines_list":
        user_id = params.get("user_id", "")
        if not user_id: return err("user_id required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT id, title, description FROM {SCHEMA}.crm_pipelines WHERE user_id=%s ORDER BY created_at",
                (user_id,))
            rows = cur.fetchall()
        finally:
            conn.close()
        pipelines = [{"id": str(r[0]), "title": r[1], "description": r[2]} for r in rows]
        return ok({"pipelines": pipelines})

    if method == "POST" and action == "crm_pipeline_create":
        b = json.loads(event.get("body") or "{}")
        user_id = b.get("userId", ""); title = (b.get("title") or "").strip()
        if not user_id or not title: return err("userId and title required")
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"INSERT INTO {SCHEMA}.crm_pipelines (user_id, title, description) VALUES (%s,%s,%s) RETURNING id",
                (user_id, title, b.get("description", "")))
            pid = str(cur.fetchone()[0])
            # Дефолтные этапы
            for i, stage in enumerate(["Новый лид", "Переговоры", "Предложение", "Закрыт"]):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.crm_pipeline_stages (pipeline_id, title, sort_order) VALUES (%s,%s,%s)",
                    (pid, stage, i))
            conn.commit()
        finally:
            conn.close()
        return ok({"pipelineId": pid}, 201)

    return err("Not found", 404)
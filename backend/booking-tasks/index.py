"""Задачи, чеклист и файлы бронирований."""
import json
import os
import base64
import uuid
import urllib.request
import psycopg2
import boto3
from decimal import Decimal

SCHEMA = "t_p17532248_concert_platform_mvp"
NOTIF_URL = "https://functions.poehali.dev/68f4b989-d93d-4a45-af4c-d54ad6815826"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    }


def serial(o):
    if isinstance(o, Decimal):
        return float(o)
    return str(o)


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=serial)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def cdn_url(key: str) -> str:
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def send_notification(user_id, notif_type, title, body, link_page=""):
    try:
        payload = json.dumps({
            "userId": user_id, "type": notif_type,
            "title": title, "body": body, "linkPage": link_page,
        }).encode()
        req = urllib.request.Request(
            f"{NOTIF_URL}?action=create", data=payload,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def handler(event: dict, context) -> dict:
    """Задачи и файлы бронирований."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")

    # GET booking_tasks
    if method == "GET" and action == "booking_tasks":
        booking_id = params.get("booking_id", "")
        project_id = params.get("project_id", "")
        if not booking_id and not project_id: return err("booking_id или project_id required")
        conn = get_conn(); cur = conn.cursor()
        if booking_id:
            cur.execute(
                f"SELECT id,booking_id,project_id,title,description,status,sort_order FROM {SCHEMA}.booking_tasks WHERE booking_id=%s ORDER BY sort_order",
                (booking_id,))
        else:
            cur.execute(
                f"SELECT id,booking_id,project_id,title,description,status,sort_order FROM {SCHEMA}.booking_tasks WHERE project_id=%s ORDER BY sort_order",
                (project_id,))
        rows = cur.fetchall(); conn.close()
        return ok({"tasks": [
            {"id": str(r[0]), "bookingId": str(r[1]), "projectId": str(r[2]),
             "title": r[3], "description": r[4], "status": r[5], "sortOrder": r[6]}
            for r in rows
        ]})

    # POST update_task
    if method == "POST" and action == "update_task":
        b = json.loads(event.get("body") or "{}")
        task_id = b.get("taskId", "")
        status_v = b.get("status", "")
        if not task_id or status_v not in ("pending", "in_progress", "done"):
            return err("taskId и status (pending/in_progress/done) обязательны")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT t.title, t.booking_id, b.venue_user_id, b.event_date, v.name
                FROM {SCHEMA}.booking_tasks t
                JOIN {SCHEMA}.venue_bookings b ON b.id = t.booking_id
                JOIN {SCHEMA}.venues v ON v.id = b.venue_id
                WHERE t.id=%s""", (task_id,))
        task_row = cur.fetchone()
        cur.execute(f"UPDATE {SCHEMA}.booking_tasks SET status=%s, updated_at=NOW() WHERE id=%s", (status_v, task_id))
        conn.commit(); conn.close()
        if task_row and status_v == "done":
            send_notification(str(task_row[2]), "booking",
                              f"Организатор выполнил задачу: {task_row[0]}",
                              f"Проект на {str(task_row[3])} в {task_row[4]} — шаг завершён.", "notifications")
        return ok({"success": True})

    # GET booking_checklist
    if method == "GET" and action == "booking_checklist":
        booking_id = params.get("booking_id", "")
        venue_id = params.get("venue_id", "")
        if not booking_id and not venue_id: return err("booking_id или venue_id required")
        conn = get_conn(); cur = conn.cursor()
        if booking_id:
            cur.execute(
                f"SELECT id,booking_id,venue_id,step_key,step_title,is_done,note,sort_order FROM {SCHEMA}.booking_checklist WHERE booking_id=%s ORDER BY sort_order",
                (booking_id,))
            rows = cur.fetchall(); conn.close()
            return ok({"checklist": [
                {"id": str(r[0]), "bookingId": str(r[1]), "venueId": str(r[2]),
                 "stepKey": r[3], "stepTitle": r[4], "isDone": r[5], "note": r[6], "sortOrder": r[7]}
                for r in rows
            ]})
        # venue mode — группируем по бронированиям
        cur.execute(
            f"""SELECT c.id, c.booking_id, c.venue_id, c.step_key, c.step_title, c.is_done, c.note, c.sort_order,
                       b.event_date, b.project_id, COALESCE(p.title, b.artist, 'Мероприятие'),
                       b.rental_amount, b.venue_conditions,
                       b.organizer_id, COALESCE(u.name, 'Организатор'),
                       b.event_time, b.artist, b.status, b.conversation_id
                FROM {SCHEMA}.booking_checklist c
                JOIN {SCHEMA}.venue_bookings b ON b.id = c.booking_id
                LEFT JOIN {SCHEMA}.projects p ON p.id = b.project_id
                LEFT JOIN {SCHEMA}.users u ON u.id = b.organizer_id
                WHERE b.venue_user_id = %s
                ORDER BY b.event_date ASC, c.sort_order ASC""",
            (venue_id,))
        rows = cur.fetchall(); conn.close()
        bookings_map = {}
        for r in rows:
            bid = str(r[1])
            if bid not in bookings_map:
                bookings_map[bid] = {
                    "bookingId": bid, "eventDate": str(r[8]),
                    "projectId": str(r[9]), "projectTitle": r[10],
                    "rentalAmount": float(r[11]) if r[11] else None,
                    "venueConditions": r[12] or "",
                    "organizerId": str(r[13]), "organizerName": r[14],
                    "eventTime": r[15] or "", "artist": r[16] or "",
                    "status": r[17],
                    "conversationId": str(r[18]) if r[18] else "",
                    "checklist": [],
                }
            bookings_map[bid]["checklist"].append({
                "id": str(r[0]), "stepKey": r[3], "stepTitle": r[4],
                "isDone": r[5], "note": r[6], "sortOrder": r[7]
            })
        return ok({"bookings": list(bookings_map.values())})

    # POST update_checklist
    if method == "POST" and action == "update_checklist":
        b = json.loads(event.get("body") or "{}")
        item_id = b.get("itemId", "")
        is_done = b.get("isDone", False)
        note = b.get("note", "")
        if not item_id: return err("itemId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.booking_checklist SET is_done=%s, note=%s, updated_at=NOW() WHERE id=%s",
            (is_done, note, item_id))
        conn.commit(); conn.close()
        return ok({"success": True})

    # POST upload_booking_file
    if method == "POST" and action == "upload_booking_file":
        b = json.loads(event.get("body") or "{}")
        booking_id = b.get("bookingId", "")
        uploaded_by = b.get("uploadedBy", "")
        step_key = b.get("stepKey", "")
        file_name = b.get("fileName", "file")
        file_data = b.get("fileData", "")
        mime_type = b.get("mimeType", "application/octet-stream")
        if not booking_id or not uploaded_by or not file_data:
            return err("bookingId, uploadedBy, fileData обязательны")
        raw = base64.b64decode(file_data)
        ext = file_name.rsplit(".", 1)[-1] if "." in file_name else "bin"
        key = f"booking-docs/{booking_id}/{uuid.uuid4()}.{ext}"
        s3 = get_s3()
        s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=mime_type)
        url = cdn_url(key)
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.booking_files (booking_id, uploaded_by, step_key, file_name, file_url, file_size, mime_type) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (booking_id, uploaded_by, step_key, file_name, url, len(raw), mime_type))
        file_id = str(cur.fetchone()[0])
        conn.commit(); conn.close()
        return ok({"id": file_id, "fileUrl": url, "fileName": file_name}, 201)

    # GET booking_files
    if method == "GET" and action == "booking_files":
        booking_id = params.get("booking_id", "")
        if not booking_id: return err("booking_id required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(
            f"""SELECT f.id, f.step_key, f.file_name, f.file_url, f.file_size, f.mime_type, f.created_at,
                       COALESCE(u.name, 'Пользователь')
                FROM {SCHEMA}.booking_files f
                LEFT JOIN {SCHEMA}.users u ON u.id = f.uploaded_by
                WHERE f.booking_id = %s ORDER BY f.created_at DESC""",
            (booking_id,))
        rows = cur.fetchall(); conn.close()
        return ok({"files": [
            {"id": str(r[0]), "stepKey": r[1], "fileName": r[2], "fileUrl": r[3],
             "fileSize": r[4], "mimeType": r[5], "createdAt": str(r[6]), "uploadedBy": r[7]}
            for r in rows
        ]})

    # POST delete_booking_file
    if method == "POST" and action == "delete_booking_file":
        b = json.loads(event.get("body") or "{}")
        file_id = b.get("fileId", "")
        if not file_id: return err("fileId required")
        conn = get_conn(); cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.booking_files WHERE id=%s", (file_id,))
        conn.commit(); conn.close()
        return ok({"success": True})

    return err("Unknown action", 404)

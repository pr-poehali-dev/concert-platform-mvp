"""Внешние интеграции: чат, уведомления, email."""
import json
import os
import urllib.request

NOTIF_URL = "https://functions.poehali.dev/68f4b989-d93d-4a45-af4c-d54ad6815826"
CHAT_URL = "https://functions.poehali.dev/85035195-bd7b-44ce-b77c-db1255f711b5"


def start_chat(organizer_id, venue_id, venue_user_id, venue_name, message, organizer_name="Организатор"):
    payload = json.dumps({
        "organizerId": organizer_id, "venueId": venue_id,
        "venueUserId": venue_user_id, "venueName": venue_name,
        "message": message, "organizerName": organizer_name,
    }).encode()
    req = urllib.request.Request(
        f"{CHAT_URL}?action=start", data=payload,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read()).get("conversationId", "")
    except Exception:
        return ""


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


def send_email(to_email, subject, html):
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key or not to_email:
        return
    payload = json.dumps({
        "from": "GLOBAL LINK <noreply@globallink.art>",
        "to": [to_email], "subject": subject, "html": html,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails", data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        pass

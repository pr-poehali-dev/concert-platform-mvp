"""HTML email templates для бронирований."""

APP_URL = "https://concert-platform-mvp.poehali.dev"


def request_email(venue_user_name, venue_name, org_name, date_str, artist, age_limit, expected_guests):
    rows = ""
    if artist:          rows += f"<tr><td style='color:rgba(255,255,255,0.5);padding:4px 0'>Артист</td><td style='color:#fff;padding:4px 0;padding-left:16px'>{artist}</td></tr>"
    if age_limit:       rows += f"<tr><td style='color:rgba(255,255,255,0.5);padding:4px 0'>Возраст</td><td style='color:#fff;padding:4px 0;padding-left:16px'>{age_limit}+</td></tr>"
    if expected_guests: rows += f"<tr><td style='color:rgba(255,255,255,0.5);padding:4px 0'>Гостей</td><td style='color:#fff;padding:4px 0;padding-left:16px'>{expected_guests}</td></tr>"
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:28px 32px;">
  <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:2px;">GLOBAL LINK</h1>
  <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Новый запрос на бронирование</p>
</td></tr>
<tr><td style="padding:32px;">
  <h2 style="margin:0 0 8px;color:#fff;font-size:20px;">Привет, {venue_user_name}!</h2>
  <p style="margin:0 0 24px;color:rgba(255,255,255,0.6);font-size:15px;">Организатор <b style="color:#fff">{org_name}</b> хочет забронировать вашу площадку <b style="color:#fff">{venue_name}</b>.</p>
  <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin-bottom:24px;">
    <table cellpadding="0" cellspacing="0" style="width:100%">
      <tr><td style="color:rgba(255,255,255,0.5);padding:4px 0">Дата</td><td style="color:#06b6d4;font-weight:700;padding:4px 0;padding-left:16px">{date_str}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.5);padding:4px 0">Организатор</td><td style="color:#fff;padding:4px 0;padding-left:16px">{org_name}</td></tr>
      {rows}
    </table>
  </div>
  <div style="text-align:center;">
    <a href="{APP_URL}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;">Открыть и ответить</a>
  </div>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
  <p style="margin:0;color:rgba(255,255,255,0.2);font-size:12px;">© 2025 GLOBAL LINK</p>
</td></tr>
</table></td></tr></table>
</body></html>"""


def confirm_email(org_name, venue_name, date_str, rental_amount, venue_conditions):
    rent_str = ""
    if rental_amount:
        amt = f"{int(rental_amount):,} ₽".replace(",", " ")
        rent_str = f"<tr><td style='color:rgba(255,255,255,0.5);padding:4px 0'>Сумма аренды</td><td style='color:#4ade80;font-weight:700;padding:4px 0;padding-left:16px'>{amt}</td></tr>"
    cond_str = ""
    if venue_conditions:
        cond_str = f"<tr><td style='color:rgba(255,255,255,0.5);padding:4px 0;vertical-align:top'>Условия</td><td style='color:#fff;padding:4px 0;padding-left:16px'>{venue_conditions}</td></tr>"
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#059669,#06b6d4);padding:28px 32px;">
  <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:2px;">GLOBAL LINK</h1>
  <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Бронирование подтверждено</p>
</td></tr>
<tr><td style="padding:32px;">
  <h2 style="margin:0 0 8px;color:#fff;font-size:20px;">Привет, {org_name}!</h2>
  <p style="margin:0 0 24px;color:rgba(255,255,255,0.6);font-size:15px;">Площадка <b style="color:#fff">{venue_name}</b> подтвердила вашу заявку.</p>
  <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin-bottom:24px;">
    <table cellpadding="0" cellspacing="0" style="width:100%">
      <tr><td style="color:rgba(255,255,255,0.5);padding:4px 0">Дата</td><td style="color:#06b6d4;font-weight:700;padding:4px 0;padding-left:16px">{date_str}</td></tr>
      {rent_str}{cond_str}
    </table>
  </div>
  <div style="text-align:center;">
    <a href="{APP_URL}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#059669,#06b6d4);color:#fff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;">Открыть проект</a>
  </div>
</td></tr>
</table></td></tr></table>
</body></html>"""


def reject_email(org_name, venue_name, edate, venue_conditions):
    reason = f"<p style='color:rgba(255,255,255,0.5);font-size:14px;margin:16px 0 0'>Причина: {venue_conditions}</p>" if venue_conditions else ""
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#be123c,#7c3aed);padding:28px 32px;">
  <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:2px;">GLOBAL LINK</h1>
  <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Запрос отклонён</p>
</td></tr>
<tr><td style="padding:32px;">
  <h2 style="margin:0 0 8px;color:#fff;font-size:20px;">Привет, {org_name}!</h2>
  <p style="margin:0 0 8px;color:rgba(255,255,255,0.6);font-size:15px;">Площадка <b style="color:#fff">{venue_name}</b> отклонила запрос на <b style="color:#06b6d4">{edate}</b>.</p>
  {reason}
  <div style="text-align:center;margin-top:28px;">
    <a href="{APP_URL}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;">Найти другую</a>
  </div>
</td></tr>
</table></td></tr></table>
</body></html>"""

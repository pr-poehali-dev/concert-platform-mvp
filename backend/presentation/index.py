"""
Генерация PDF-презентаций платформы GLOBAL LINK.
GET  ?type=investors          — для инвесторов
GET  ?type=users              — для организаторов и площадок
GET  ?type=partners           — для партнёров
POST ?action=project_pdf      — презентация проекта (ReportLab)
POST ?action=project_html_pdf — красивая презентация проекта (WeasyPrint HTML→PDF)
"""
import os, io, uuid, json, urllib.request, math
import psycopg2
import boto3

SCHEMA = "t_p17532248_concert_platform_mvp"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    Table, TableStyle, Image, KeepTogether
)
from reportlab.platypus.flowables import Flowable

W, H = A4  # 595 x 842 pt

# ── Цвета ──────────────────────────────────────────────────────────────────
C_BG       = colors.HexColor("#0d0d1a")
C_CARD     = colors.HexColor("#13131f")
C_PURPLE   = colors.HexColor("#a855f7")
C_CYAN     = colors.HexColor("#22d3ee")
C_PINK     = colors.HexColor("#ec4899")
C_GREEN    = colors.HexColor("#4ade80")
C_WHITE    = colors.HexColor("#ffffff")
C_WHITE60  = colors.HexColor("#99999f")
C_WHITE30  = colors.HexColor("#55555a")
C_BORDER   = colors.HexColor("#1e1e30")

APP_URL    = "https://preview--concert-platform-mvp.poehali.dev"
DEMO_URL   = f"{APP_URL}/?demo=1"

IMG_DASHBOARD = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/de320665-a1c3-4e3c-bda4-fafc277293f7.jpg"
IMG_VENUE     = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/c9d33978-e907-44ac-a364-a95e817a1fee.jpg"
IMG_NETWORK   = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/532d66ec-96d5-4325-a787-251856c73f79.jpg"


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
    }


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def get_s3():
    return boto3.client("s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def cdn(key):
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def fetch_image(url: str, max_w: float, max_h: float):
    """Скачивает изображение и возвращает ReportLab Image с сохранением пропорций."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "GLOBALLINK/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = r.read()
        buf = io.BytesIO(data)
        img = Image(buf)
        ratio = min(max_w / img.imageWidth, max_h / img.imageHeight)
        img.drawWidth  = img.imageWidth  * ratio
        img.drawHeight = img.imageHeight * ratio
        return img
    except Exception as e:
        print(f"[presentation] img error {url}: {e}")
        return None


# ── Кастомные флоуаблы ─────────────────────────────────────────────────────

class ColorRect(Flowable):
    """Цветной прямоугольник (разделитель/фон)."""
    def __init__(self, w, h, fill, radius=0):
        super().__init__()
        self.w, self.h, self.fill, self.radius = w, h, fill, radius
    def draw(self):
        self.canv.setFillColor(self.fill)
        if self.radius:
            self.canv.roundRect(0, 0, self.w, self.h, self.radius, fill=1, stroke=0)
        else:
            self.canv.rect(0, 0, self.w, self.h, fill=1, stroke=0)
    def wrap(self, *_): return self.w, self.h


class GradientLine(Flowable):
    def __init__(self, w, h=2):
        super().__init__()
        self.w, self.h = w, h
    def draw(self):
        self.canv.linearGradient(0, 0, self.w, 0,
            [C_BG, C_PURPLE, C_CYAN, C_BG], [0, 0.25, 0.75, 1])
    def wrap(self, *_): return self.w, self.h


# ── Стили текста ───────────────────────────────────────────────────────────

def style(name, **kw):
    base = dict(fontName="Helvetica", fontSize=11, textColor=C_WHITE,
                leading=16, spaceAfter=0, spaceBefore=0)
    base.update(kw)
    return ParagraphStyle(name, **base)


S_HERO_TITLE   = style("hero_title",  fontName="Helvetica-Bold", fontSize=36, textColor=C_WHITE,  leading=42, alignment=TA_CENTER)
S_HERO_SUB     = style("hero_sub",    fontSize=15, textColor=C_WHITE60, leading=22, alignment=TA_CENTER)
S_SECTION      = style("section",     fontName="Helvetica-Bold", fontSize=20, textColor=C_WHITE,  leading=26, spaceAfter=4)
S_SECTION_CYAN = style("section_c",   fontName="Helvetica-Bold", fontSize=20, textColor=C_CYAN,   leading=26, spaceAfter=4)
S_SECTION_PURP = style("section_p",   fontName="Helvetica-Bold", fontSize=20, textColor=C_PURPLE, leading=26, spaceAfter=4)
S_BODY         = style("body",        fontSize=11, textColor=C_WHITE60, leading=17)
S_CAPTION      = style("caption",     fontSize=9,  textColor=C_WHITE30, leading=13, alignment=TA_CENTER)
S_TAG          = style("tag",         fontName="Helvetica-Bold", fontSize=9, textColor=C_CYAN, leading=12)
S_CARD_TITLE   = style("card_title",  fontName="Helvetica-Bold", fontSize=13, textColor=C_WHITE,  leading=17)
S_CARD_BODY    = style("card_body",   fontSize=10, textColor=C_WHITE60, leading=15)
S_STAT_NUM     = style("stat_num",    fontName="Helvetica-Bold", fontSize=28, textColor=C_PURPLE, leading=32, alignment=TA_CENTER)
S_STAT_LABEL   = style("stat_label",  fontSize=9,  textColor=C_WHITE60, leading=13, alignment=TA_CENTER)
S_LINK         = style("link",        fontSize=10, textColor=C_CYAN, leading=14, alignment=TA_CENTER)
S_FOOTER       = style("footer",      fontSize=8,  textColor=C_WHITE30, leading=11, alignment=TA_CENTER)
S_HIGHLIGHT    = style("highlight",   fontName="Helvetica-Bold", fontSize=13, textColor=C_WHITE, leading=18)
S_BULLET       = style("bullet",      fontSize=11, textColor=C_WHITE60, leading=17, leftIndent=12)


def sp(n=1): return Spacer(1, n * 5)

def divider(color=C_BORDER, w=None):
    return HRFlowable(width=w or "100%", thickness=1, color=color, spaceAfter=0, spaceBefore=0)

def grad_line():
    return GradientLine(W - 40*mm)


def feature_card(icon: str, title: str, body: str, accent=C_PURPLE):
    data = [[
        Paragraph(f'<font color="#{accent.hexval()[2:] if hasattr(accent,"hexval") else "a855f7"}">{icon}</font>', style("ic", fontName="Helvetica-Bold", fontSize=18, textColor=accent, leading=22)),
        [Paragraph(title, S_CARD_TITLE), sp(1), Paragraph(body, S_CARD_BODY)],
    ]]
    t = Table(data, colWidths=[22*mm, None])
    t.setStyle(TableStyle([
        ("VALIGN",      (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING",(0,0), (-1,-1), 0),
        ("BOTTOMPADDING",(0,0),(-1,-1), 0),
        ("TOPPADDING",  (0,0), (-1,-1), 0),
    ]))
    return t


def stat_block(items):
    """items = [(num, label), ...]"""
    data = [[
        [Paragraph(num, S_STAT_NUM), sp(1), Paragraph(label, S_STAT_LABEL)]
        for num, label in items
    ]]
    t = Table(data, colWidths=[None]*len(items))
    t.setStyle(TableStyle([
        ("VALIGN",      (0,0),(-1,-1),"MIDDLE"),
        ("ALIGN",       (0,0),(-1,-1),"CENTER"),
        ("LEFTPADDING", (0,0),(-1,-1), 8),
        ("RIGHTPADDING",(0,0),(-1,-1), 8),
        ("BACKGROUND",  (0,0),(-1,-1), C_CARD),
        ("ROUNDEDCORNERS",[8]),
        ("TOPPADDING",  (0,0),(-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-1), 10),
    ]))
    return t


def two_col(left_items, right_items):
    data = [[left_items, right_items]]
    t = Table(data, colWidths=[(W-40*mm)*0.48, (W-40*mm)*0.48], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),0),
        ("BOTTOMPADDING",(0,0),(-1,-1),0),
    ]))
    return t


# ═══════════════════════════════════════════════════════════════════════════════
# ВАРИАНТ 1 — ДЛЯ ИНВЕСТОРОВ
# ═══════════════════════════════════════════════════════════════════════════════

def build_investors(buf):
    doc = SimpleDocTemplate(buf, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm, topMargin=15*mm, bottomMargin=15*mm)

    def bg_canvas(canvas, doc):
        canvas.setFillColor(C_BG)
        canvas.rect(0, 0, W, H, fill=1, stroke=0)

    story = []

    # ── Обложка ──────────────────────────────────────────────────────────────
    story += [
        sp(6),
        grad_line(), sp(2),
        Paragraph("GLOBAL LINK", S_HERO_TITLE),
        sp(2),
        Paragraph("Инвестиционная презентация", style("inv_sub", fontName="Helvetica-Bold", fontSize=18, textColor=C_PURPLE, leading=24, alignment=TA_CENTER)),
        sp(3),
        Paragraph("Платформа для организации концертной индустрии России", S_HERO_SUB),
        sp(2),
        grad_line(), sp(4),
    ]

    img = fetch_image(IMG_NETWORK, W - 40*mm, 90*mm)
    if img:
        img.hAlign = "CENTER"
        story.append(img)
    story += [sp(2), Paragraph("2025 · Конфиденциально", S_FOOTER), sp(8)]

    # ── Проблема рынка ───────────────────────────────────────────────────────
    story += [
        Paragraph("ПРОБЛЕМА", S_TAG), sp(1),
        Paragraph("Рынок концертной индустрии фрагментирован", S_SECTION), sp(2),
        two_col(
            [
                Paragraph("Организаторы тратят недели на поиск площадок через мессенджеры и звонки", S_BODY), sp(2),
                Paragraph("Нет единого стандарта для технических райдеров и договоров", S_BODY), sp(2),
                Paragraph("Отсутствие прозрачности цен и доступности дат", S_BODY),
            ],
            [
                Paragraph("Площадки не имеют инструментов для управления бронированиями", S_BODY), sp(2),
                Paragraph("Документооборот ведётся вручную — Word, PDF по email", S_BODY), sp(2),
                Paragraph("Рынок объёмом <b>₽280 млрд</b> не имеет цифрового лидера", style("bold_b", fontName="Helvetica-Bold", fontSize=11, textColor=C_WHITE, leading=17)),
            ]
        ),
        sp(4),
    ]

    # ── Решение ──────────────────────────────────────────────────────────────
    story += [
        grad_line(), sp(3),
        Paragraph("РЕШЕНИЕ", S_TAG), sp(1),
        Paragraph("GLOBAL LINK — экосистема концертного рынка", S_SECTION_CYAN), sp(3),
    ]
    img2 = fetch_image(IMG_DASHBOARD, W - 40*mm, 80*mm)
    if img2:
        img2.hAlign = "CENTER"
        story.append(img2)
        story += [sp(1), Paragraph("Интерфейс платформы GLOBAL LINK", S_CAPTION), sp(3)]

    story += [
        two_col(
            [
                feature_card("◈", "Единый маркетплейс", "Все площадки России с фото, ценами, техническими данными и свободными датами в одном месте", C_CYAN),
                sp(3),
                feature_card("⬡", "Электронный документооборот", "Договоры, акты, технические райдеры — подписание ПЭП/КЭП без бумаги", C_PURPLE),
            ],
            [
                feature_card("◆", "Управление турами", "Планирование гастролей по городам: площадки, даты, бюджет, статусы", C_GREEN),
                sp(3),
                feature_card("◉", "Внутренний чат", "Переговоры между организаторами и площадками внутри платформы", C_PINK),
            ]
        ),
        sp(4),
    ]

    # ── Бизнес-модель ────────────────────────────────────────────────────────
    story += [
        grad_line(), sp(3),
        Paragraph("МОНЕТИЗАЦИЯ", S_TAG), sp(1),
        Paragraph("Три источника выручки", S_SECTION_PURP), sp(3),
        stat_block([
            ("2–5%", "Комиссия\nс бронирования"),
            ("₽4 990", "Подписка\nорганизатора / мес"),
            ("₽9 990", "Подписка\nплощадки / мес"),
        ]),
        sp(4),
    ]

    # ── Рынок ────────────────────────────────────────────────────────────────
    story += [
        Paragraph("РЫНОК", S_TAG), sp(1),
        Paragraph("TAM · SAM · SOM", S_SECTION), sp(3),
        stat_block([
            ("₽280 млрд", "TAM\nКонцертный рынок РФ"),
            ("₽42 млрд", "SAM\nЦифровой сегмент"),
            ("₽4,2 млрд", "SOM\nЦелевой рынок 3 года"),
        ]),
        sp(4),
    ]

    # ── Трекшн ───────────────────────────────────────────────────────────────
    story += [
        grad_line(), sp(3),
        Paragraph("ТРЕКШН", S_TAG), sp(1),
        Paragraph("Платформа запущена и работает", S_SECTION_CYAN), sp(2),
        Paragraph("• MVP запущен — полная функциональность для организаторов и площадок", S_BULLET), sp(1),
        Paragraph("• Модуль ЭДО с подписанием ПЭП — в России аналогов в нише нет", S_BULLET), sp(1),
        Paragraph("• PWA-приложение — устанавливается на телефон и компьютер", S_BULLET), sp(1),
        Paragraph("• Более 33 площадок в базе на момент презентации", S_BULLET), sp(4),
    ]

    # ── Команда / контакты ───────────────────────────────────────────────────
    story += [
        grad_line(), sp(3),
        Paragraph("КОНТАКТЫ", S_TAG), sp(1),
        Paragraph("Готовы к диалогу", S_SECTION), sp(2),
        Paragraph(f'<link href="{APP_URL}"><u>Платформа: {APP_URL}</u></link>', S_LINK), sp(1),
        Paragraph(f'<link href="{DEMO_URL}"><u>Демо-кабинет: {DEMO_URL}</u></link>', S_LINK), sp(2),
        Paragraph("Для инвестиционных запросов: invest@globallink.art", S_BODY), sp(6),
        grad_line(),
        sp(2),
        Paragraph("© 2025 GLOBAL LINK · Конфиденциально · Все права защищены", S_FOOTER),
    ]

    doc.build(story, onFirstPage=bg_canvas, onLaterPages=bg_canvas)


# ═══════════════════════════════════════════════════════════════════════════════
# ВАРИАНТ 2 — ДЛЯ ПОЛЬЗОВАТЕЛЕЙ (организаторы и площадки)
# ═══════════════════════════════════════════════════════════════════════════════

def build_users(buf):
    doc = SimpleDocTemplate(buf, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm, topMargin=15*mm, bottomMargin=15*mm)

    def bg(canvas, doc):
        canvas.setFillColor(C_BG)
        canvas.rect(0, 0, W, H, fill=1, stroke=0)

    story = []

    # Обложка
    story += [
        sp(4),
        grad_line(), sp(2),
        Paragraph("GLOBAL LINK", S_HERO_TITLE),
        sp(2),
        Paragraph("Всё для организации концертов — в одном месте", style("u_sub", fontName="Helvetica-Bold", fontSize=16, textColor=C_CYAN, leading=22, alignment=TA_CENTER)),
        sp(2),
        Paragraph("Для организаторов туров и концертных площадок", S_HERO_SUB),
        sp(2),
        grad_line(), sp(3),
    ]

    img = fetch_image(IMG_VENUE, W - 40*mm, 85*mm)
    if img:
        img.hAlign = "CENTER"
        story.append(img)
    story += [sp(1), Paragraph("Присоединяйтесь к концертной экосистеме России", S_CAPTION), sp(4)]

    # Для организаторов
    story += [
        Paragraph("ДЛЯ ОРГАНИЗАТОРОВ", S_TAG), sp(1),
        Paragraph("Организуй туры быстро и без хаоса", S_SECTION_PURP), sp(3),
        feature_card("🔍", "Поиск площадок", "Фильтрация по городу, вместимости, оборудованию и цене. Свободные даты — сразу видны в календаре.", C_PURPLE),
        sp(3),
        feature_card("🗺", "Планирование туров", "Создай маршрут из нескольких городов. Управляй расписанием, бюджетом и статусами всех концертов в одном месте.", C_CYAN),
        sp(3),
        feature_card("📄", "Технические райдеры", "Отправляй технические требования прямо через платформу. Площадка получает их мгновенно.", C_GREEN),
        sp(3),
        feature_card("✍", "Электронные договоры", "Подписывай договоры аренды онлайн — простой ЭП через код из email. Без бумаги и курьеров.", C_PINK),
        sp(4),
    ]

    # Для площадок
    story += [
        grad_line(), sp(3),
        Paragraph("ДЛЯ ПЛОЩАДОК", S_TAG), sp(1),
        Paragraph("Привлекай организаторов и управляй расписанием", S_SECTION_CYAN), sp(3),
    ]

    img3 = fetch_image(IMG_DASHBOARD, W - 40*mm, 75*mm)
    if img3:
        img3.hAlign = "CENTER"
        story.append(img3)
    story += [sp(2)]

    story += [
        feature_card("📍", "Профиль в маркетплейсе", "Фотографии, описание, вместимость, технические характеристики — всё в одной карточке. Организаторы находят тебя сами.", C_CYAN),
        sp(3),
        feature_card("📅", "Управление календарём", "Отмечай занятые даты с описанием события. Организаторы видят свободные слоты в реальном времени.", C_PURPLE),
        sp(3),
        feature_card("💬", "Чат с организаторами", "Все переговоры в одном месте. История переписки, файлы, документы — ничего не теряется.", C_GREEN),
        sp(3),
        feature_card("🏢", "Управление командой", "Добавляй сотрудников с разными ролями: менеджер, бухгалтер, администратор.", C_PINK),
        sp(4),
    ]

    # Как начать
    story += [
        grad_line(), sp(3),
        Paragraph("КАК НАЧАТЬ", S_TAG), sp(1),
        Paragraph("3 шага до первого концерта", S_SECTION), sp(3),
        stat_block([
            ("1", "Зарегистрируйся\nбесплатно"),
            ("2", "Создай профиль\nили площадку"),
            ("3", "Находи партнёров\nи заключай сделки"),
        ]),
        sp(4),
        Paragraph(f'<link href="{APP_URL}"><u>Попробовать бесплатно: {APP_URL}</u></link>', S_LINK), sp(1),
        Paragraph(f'<link href="{DEMO_URL}"><u>Демо-кабинет (войти без регистрации): {DEMO_URL}</u></link>', S_LINK),
        sp(6),
        grad_line(), sp(2),
        Paragraph("© 2025 GLOBAL LINK · globallink.art", S_FOOTER),
    ]

    doc.build(story, onFirstPage=bg, onLaterPages=bg)


# ═══════════════════════════════════════════════════════════════════════════════
# ВАРИАНТ 3 — ДЛЯ ПАРТНЁРОВ
# ═══════════════════════════════════════════════════════════════════════════════

def build_partners(buf):
    doc = SimpleDocTemplate(buf, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm, topMargin=15*mm, bottomMargin=15*mm)

    def bg(canvas, doc):
        canvas.setFillColor(C_BG)
        canvas.rect(0, 0, W, H, fill=1, stroke=0)

    story = []

    # Обложка
    story += [
        sp(4),
        grad_line(), sp(2),
        Paragraph("GLOBAL LINK", S_HERO_TITLE),
        sp(2),
        Paragraph("Партнёрское предложение", style("p_sub", fontName="Helvetica-Bold", fontSize=18, textColor=C_GREEN, leading=24, alignment=TA_CENTER)),
        sp(2),
        Paragraph("Станьте частью экосистемы концертной индустрии России", S_HERO_SUB),
        sp(2),
        grad_line(), sp(3),
    ]

    img = fetch_image(IMG_NETWORK, W - 40*mm, 85*mm)
    if img:
        img.hAlign = "CENTER"
        story.append(img)
    story += [sp(1), Paragraph("Экосистема GLOBAL LINK объединяет всех участников рынка", S_CAPTION), sp(4)]

    # Что такое GLOBAL LINK
    story += [
        Paragraph("О ПЛАТФОРМЕ", S_TAG), sp(1),
        Paragraph("GLOBAL LINK — цифровая инфраструктура концертного рынка", S_SECTION_CYAN), sp(2),
        Paragraph(
            "Мы создали платформу, которая объединяет организаторов концертов и туров с концертными площадками по всей России. "
            "Полный цикл: от поиска площадки до подписания договора и управления командой — всё в одной системе.",
            S_BODY
        ),
        sp(3),
        stat_block([
            ("33+", "Площадок\nв базе"),
            ("8+", "Городов\nРоссии"),
            ("100%", "Цифровой\nдокументооборот"),
        ]),
        sp(4),
    ]

    # Форматы партнёрства
    story += [
        grad_line(), sp(3),
        Paragraph("ФОРМАТЫ ПАРТНЁРСТВА", S_TAG), sp(1),
        Paragraph("Варианты сотрудничества", S_SECTION_PURP), sp(3),
        feature_card("🎵", "Медиапартнёрство", "Совместные публикации, кросс-промо, брендинг в рассылках и на платформе. Охват аудитории организаторов и площадок по всей России.", C_PURPLE),
        sp(3),
        feature_card("💳", "Финансовые сервисы", "Интеграция эквайринга, факторинга или страхования событий. Ваш продукт — внутри транзакционного потока платформы.", C_CYAN),
        sp(3),
        feature_card("⚖", "Юридические сервисы", "Партнёрство с юридическими компаниями для сопровождения договоров, КЭП, нотариального заверения документов.", C_GREEN),
        sp(3),
        feature_card("🔗", "Технологическая интеграция", "API-интеграция вашего сервиса: билетные платформы, стриминг, PR-агентства, логистика, оборудование.", C_PINK),
        sp(4),
    ]

    # Почему GLOBAL LINK
    story += [
        grad_line(), sp(3),
        Paragraph("ПОЧЕМУ МЫ", S_TAG), sp(1),
        Paragraph("Преимущества партнёрства", S_SECTION), sp(3),
    ]

    img3 = fetch_image(IMG_DASHBOARD, W - 40*mm, 70*mm)
    if img3:
        img3.hAlign = "CENTER"
        story.append(img3)
    story += [sp(2)]

    story += [
        Paragraph("• Первая специализированная B2B-платформа концертного рынка в России", S_BULLET), sp(1),
        Paragraph("• Встроенный ЭДО: договоры, акты, райдеры — без бумаги", S_BULLET), sp(1),
        Paragraph("• Аудитория: профессионалы индустрии с реальными бюджетами", S_BULLET), sp(1),
        Paragraph("• PWA — работает как мобильное приложение на iOS и Android", S_BULLET), sp(1),
        Paragraph("• Открыты к кастомным форматам интеграции", S_BULLET),
        sp(4),
    ]

    # Контакты
    story += [
        grad_line(), sp(3),
        Paragraph("ДАВАЙТЕ ОБСУДИМ", S_TAG), sp(1),
        Paragraph("Свяжитесь с нами", S_SECTION_CYAN), sp(2),
        Paragraph("Мы открыты к любым предложениям о сотрудничестве", S_BODY), sp(2),
        Paragraph(f'<link href="{APP_URL}"><u>Платформа: {APP_URL}</u></link>', S_LINK), sp(1),
        Paragraph(f'<link href="{DEMO_URL}"><u>Демо-кабинет: {DEMO_URL}</u></link>', S_LINK), sp(1),
        Paragraph("Партнёрский отдел: partners@globallink.art", S_BODY),
        sp(6),
        grad_line(), sp(2),
        Paragraph("© 2025 GLOBAL LINK · globallink.art · Конфиденциально", S_FOOTER),
    ]

    doc.build(story, onFirstPage=bg, onLaterPages=bg)


# ═══════════════════════════════════════════════════════════════════════════════
# ═══════════════════════════════════════════════════════════════════════════════
# ВАРИАНТ 4 — ПРЕЗЕНТАЦИЯ КОНКРЕТНОГО ПРОЕКТА
# ═══════════════════════════════════════════════════════════════════════════════

def fmt_money(v):
    """Форматирование денег: 1 234 567 ₽"""
    try:
        v = float(v or 0)
        if abs(v) >= 1_000_000:
            return f"{v/1_000_000:.1f} млн ₽"
        return f"{int(v):,} ₽".replace(",", " ")
    except Exception:
        return "0 ₽"


def pct(a, b):
    """Процент выполнения a/b"""
    try:
        a, b = float(a or 0), float(b or 0)
        if b == 0:
            return "—"
        return f"{a/b*100:.0f}%"
    except Exception:
        return "—"


def progress_bar(canvas, x, y, w, h, value, total, color):
    """Горизонтальный прогресс-бар."""
    try:
        ratio = min(1.0, float(value or 0) / float(total or 1))
    except Exception:
        ratio = 0
    canvas.setFillColor(C_CARD)
    canvas.roundRect(x, y, w, h, h/2, fill=1, stroke=0)
    if ratio > 0:
        canvas.setFillColor(color)
        canvas.roundRect(x, y, max(h, w * ratio), h, h/2, fill=1, stroke=0)


class ProgressBarFlowable(Flowable):
    def __init__(self, value, total, color, bar_w=None, bar_h=6):
        super().__init__()
        self._val = value
        self._tot = total
        self._color = color
        self._bar_w = bar_w
        self._bar_h = bar_h

    def wrap(self, availW, availH):
        self._w = self._bar_w or availW
        return self._w, self._bar_h + 2

    def draw(self):
        progress_bar(self.canv, 0, 1, self._w, self._bar_h, self._val, self._tot, self._color)


def build_project_pdf(buf, project: dict, expenses: list, income_lines: list, ticket_sales: list, ai_summary: str, user_prompt: str = ""):
    doc = SimpleDocTemplate(buf, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm, topMargin=15*mm, bottomMargin=15*mm)
    CW = W - 40*mm

    def bg(canvas, doc):
        canvas.setFillColor(C_BG)
        canvas.rect(0, 0, W, H, fill=1, stroke=0)

    story = []

    # ── Данные ────────────────────────────────────────────────────────────────
    title    = project.get("title") or "Проект"
    artist   = project.get("artist") or ""
    city     = project.get("city") or ""
    venue    = project.get("venue_name") or ""
    d_start  = str(project.get("date_start") or "")
    d_end    = str(project.get("date_end") or "")
    status   = project.get("status") or ""
    tax_sys  = project.get("tax_system") or "usn6"

    inc_plan = float(project.get("total_income_plan") or 0)
    inc_fact = float(project.get("total_income_fact") or 0)
    exp_plan = float(project.get("total_expenses_plan") or 0)
    exp_fact = float(project.get("total_expenses_fact") or 0)

    TAX_RATES   = {"usn6":0.06,"usn15":0.15,"osn":0.20,"patent":0,"npd":0.06}
    tax_rate    = TAX_RATES.get(tax_sys, 0.06)
    tax_plan    = inc_plan * tax_rate
    tax_fact    = inc_fact * tax_rate
    profit_plan = inc_plan - exp_plan - tax_plan
    profit_fact = inc_fact - exp_fact - tax_fact
    profit_col  = C_GREEN if profit_plan >= 0 else C_PINK
    tax_lbl     = f"УСН {int(tax_rate*100)}%" if tax_sys.startswith("usn") else "ОСН"

    STATUS_RU = {"planning":"Планирование","active":"Активный","completed":"Завершён","cancelled":"Отменён"}
    date_str  = d_start
    if d_end and d_end != d_start: date_str += f" — {d_end}"
    meta      = "  ·  ".join(p for p in [city, venue, date_str] if p)

    def fmt(v):
        v = float(v or 0)
        if abs(v) >= 1_000_000: return f"{v/1_000_000:.1f} млн ₽"
        return f"{int(v):,} ₽".replace(",", " ")

    # ════════════════════════════════════════════════════════════════════════
    # ОБЛОЖКА — как слайд HERO
    # ════════════════════════════════════════════════════════════════════════
    story += [sp(4), grad_line(), sp(2)]

    if user_prompt:
        story += [Paragraph(user_prompt[:90],
            style("upt", fontName="Helvetica-Bold", fontSize=10, textColor=C_CYAN, leading=14, alignment=TA_CENTER)), sp(1)]

    if artist:
        story += [Paragraph(artist, style("art", fontName="Helvetica-Bold", fontSize=13,
            textColor=C_PURPLE, leading=18, alignment=TA_CENTER)), sp(1)]

    story += [Paragraph(title.upper(), S_HERO_TITLE), sp(2)]
    if meta:
        story += [Paragraph(meta, S_HERO_SUB), sp(1)]
    story += [Paragraph(STATUS_RU.get(status, status), S_CAPTION), sp(2), grad_line(), sp(3)]

    # Картинка-дашборд (как в слайде «РЕШЕНИЕ»)
    img = fetch_image(IMG_DASHBOARD, CW, 80*mm)
    if img:
        img.hAlign = "CENTER"
        story += [img, sp(1),
            Paragraph("Управление концертным проектом на платформе GLOBAL LINK", S_CAPTION), sp(3)]

    # KPI-блок — 4 цифры как в HERO-слайде
    story += [
        stat_block([
            (fmt(inc_plan),    "Доход\nплан"),
            (fmt(inc_fact),    "Доход\nфакт"),
            (fmt(exp_plan),    "Расходы\nплан"),
            (fmt(profit_plan), "Прибыль\nплан"),
        ]),
        sp(6),
    ]

    # ════════════════════════════════════════════════════════════════════════
    # ПЛАН VS ФАКТ — как слайд «ФИНАНСЫ»
    # ════════════════════════════════════════════════════════════════════════
    story += [
        grad_line(), sp(3),
        Paragraph("ФИНАНСЫ", S_TAG), sp(1),
        Paragraph("Бюджет, доходы и чистая прибыль", S_SECTION_PURP), sp(3),
    ]

    inc_pct = f"{inc_fact/inc_plan*100:.0f}% выполнено" if inc_plan else "нет данных"
    exp_pct = f"{exp_fact/exp_plan*100:.0f}% израсходовано" if exp_plan else "нет данных"

    story += [
        two_col(
            [
                feature_card("🎯", "Доходы",
                    f"План: {fmt(inc_plan)}\nФакт: {fmt(inc_fact)} · {inc_pct}", C_GREEN),
                sp(4),
                feature_card("💰", f"Налог ({tax_lbl})",
                    f"К уплате план: {fmt(tax_plan)}\nФакт: {fmt(tax_fact)}", C_CYAN),
            ],
            [
                feature_card("💸", "Расходы",
                    f"Бюджет: {fmt(exp_plan)}\nПотрачено: {fmt(exp_fact)} · {exp_pct}", C_PINK),
                sp(4),
                feature_card("✨", "Чистая прибыль",
                    f"Прогноз: {fmt(profit_plan)}\nПо факту: {fmt(profit_fact)}", profit_col),
            ]
        ),
        sp(4),
    ]

    # ════════════════════════════════════════════════════════════════════════
    # ИИ-АНАЛИТИКА — как слайд «РЕШЕНИЕ» с картинкой
    # ════════════════════════════════════════════════════════════════════════
    if ai_summary:
        story += [
            grad_line(), sp(3),
            Paragraph("АНАЛИТИКА", S_TAG), sp(1),
            Paragraph("Оценка проекта и рекомендации", S_SECTION_CYAN), sp(2),
        ]
        img2 = fetch_image(IMG_NETWORK, CW, 55*mm)
        if img2:
            img2.hAlign = "CENTER"
            story += [img2, sp(2)]

        for line in ai_summary.split("\n"):
            line = line.strip().lstrip("#*").strip()
            if not line: story.append(sp(1)); continue
            if line.startswith("•") or line.startswith("-"):
                story += [Paragraph(f"• {line.lstrip('•-').strip()}", S_BULLET), sp(1)]
            else:
                story += [Paragraph(line, S_BODY), sp(1)]
        story.append(sp(3))

    # ════════════════════════════════════════════════════════════════════════
    # РАСХОДЫ — как слайд «ИНСТРУМЕНТЫ» (feature_card + прогресс)
    # ════════════════════════════════════════════════════════════════════════
    if expenses:
        cats: dict = {}
        for e in expenses:
            cat = e.get("category") or "Прочее"
            cats.setdefault(cat, {"plan": 0.0, "fact": 0.0})
            cats[cat]["plan"] += float(e.get("amount_plan") or 0)
            cats[cat]["fact"] += float(e.get("amount_fact") or 0)

        story += [
            grad_line(), sp(3),
            Paragraph("БЮДЖЕТ РАСХОДОВ", S_TAG), sp(1),
            Paragraph("Статьи затрат — план и исполнение", S_SECTION_PURP), sp(3),
        ]

        ICONS  = ["🏛","🎵","📢","🚌","🎤","💡","🎬","🖥","📋","💰","🎸","🎺"]
        COLS   = [C_PINK, C_PURPLE, C_CYAN, C_GREEN,
                  colors.HexColor("#f59e0b"), colors.HexColor("#8b5cf6"),
                  colors.HexColor("#ef4444"), colors.HexColor("#06b6d4")]

        for idx, (cat, vals) in enumerate(sorted(cats.items(), key=lambda x: -x[1]["plan"])):
            pv, fv = vals["plan"], vals["fact"]
            col    = COLS[idx % len(COLS)]
            icon   = ICONS[idx % len(ICONS)]
            share  = f"{pv/exp_plan*100:.0f}% от бюджета" if exp_plan else ""
            done   = f"{fv/pv*100:.0f}% исполнено" if pv else ""
            desc   = "  ·  ".join(p for p in [f"План: {fmt(pv)}", share, f"Факт: {fmt(fv)}", done] if p)
            story += [
                feature_card(icon, cat, desc, col),
                ProgressBarFlowable(fv if fv else pv*0.01, pv if pv else 1, col, CW, bar_h=5),
                sp(3),
            ]
        story.append(sp(2))

    # ════════════════════════════════════════════════════════════════════════
    # ПРОДАЖИ БИЛЕТОВ — как слайд «БИЛЕТЫ»
    # ════════════════════════════════════════════════════════════════════════
    if income_lines:
        total_plan = sum(int(il.get("ticket_count") or 0) for il in income_lines)
        total_sold = sum(int(il.get("sold_count") or 0) for il in income_lines)
        conv       = f"{total_sold/total_plan*100:.0f}%" if total_plan else "—"

        story += [
            grad_line(), sp(3),
            Paragraph("БИЛЕТЫ", S_TAG), sp(1),
            Paragraph("Продажи по категориям", S_SECTION_CYAN), sp(3),
            stat_block([
                (str(total_plan), "Билетов\nзапланировано"),
                (str(total_sold), "Билетов\nпродано"),
                (conv,            "Конверсия"),
                (fmt(inc_fact),   "Выручка\nот продаж"),
            ]),
            sp(3),
        ]

        img3 = fetch_image(IMG_VENUE, CW, 60*mm)
        if img3:
            img3.hAlign = "CENTER"
            story += [img3, sp(2)]

        for il in income_lines:
            cat  = il.get("category") or "Билеты"
            plan = int(il.get("ticket_count") or 0)
            sold = int(il.get("sold_count") or 0)
            price= float(il.get("ticket_price") or 0)
            cv   = f"{sold/plan*100:.0f}% продано" if plan else "—"
            desc = f"Цена: {fmt(price)}  ·  Продано {sold} из {plan} ({cv})  ·  Выручка: {fmt(sold*price)}"
            story += [
                feature_card("🎟", cat, desc, C_GREEN),
                ProgressBarFlowable(sold, plan if plan else 1, C_GREEN, CW, bar_h=5),
                sp(3),
            ]
        story.append(sp(2))

    # ════════════════════════════════════════════════════════════════════════
    # TC-СТАТИСТИКА
    # ════════════════════════════════════════════════════════════════════════
    if ticket_sales:
        total   = len(ticket_sales)
        revenue = sum(float(s.get("total_amount") or 0) for s in ticket_sales)
        paid    = sum(1 for s in ticket_sales if s.get("status") == "paid")
        resv    = total - paid
        avg     = revenue / paid if paid else 0

        story += [
            grad_line(), sp(3),
            Paragraph("ДАННЫЕ ПРОДАЖ", S_TAG), sp(1),
            Paragraph("Реальные данные из системы билетов", S_SECTION_PURP), sp(3),
            stat_block([
                (str(total),  "Всего\nзаказов"),
                (str(paid),   "Оплачено"),
                (str(resv),   "Забронировано"),
                (fmt(avg),    "Средний\nчек"),
            ]),
            sp(3),
            two_col(
                [feature_card("✅", "Оплаченные заказы",
                    f"{paid} заказов · выручка {fmt(revenue)}", C_GREEN)],
                [feature_card("🔖", "Ожидают оплаты",
                    f"{resv} заказов забронировано", C_CYAN)],
            ),
            sp(4),
        ]

    # ════════════════════════════════════════════════════════════════════════
    # ПОДВАЛ — как в build_investors
    # ════════════════════════════════════════════════════════════════════════
    story += [
        grad_line(), sp(2),
        Paragraph(f"GLOBAL LINK  ·  {title.upper()}",
            style("ft", fontName="Helvetica-Bold", fontSize=9, textColor=C_WHITE30, leading=13, alignment=TA_CENTER)),
        sp(1),
        Paragraph("globallink.art  ·  Конфиденциально  ·  Сформировано платформой GLOBAL LINK", S_FOOTER),
    ]

    doc.build(story, onFirstPage=bg, onLaterPages=bg)


# ═══════════════════════════════════════════════════════════════════════════════
# HTML-ШАБЛОН ДЛЯ WEASYPRINT
# ═══════════════════════════════════════════════════════════════════════════════

def build_html_template(project: dict, expenses: list, income_lines: list,
                        ticket_sales: list, ai_summary: str, user_prompt: str) -> str:
    IMG_HERO      = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/c969ae71-7a9a-4f65-b744-3969d9375dbb.jpg"
    IMG_DASHBOARD = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/de320665-a1c3-4e3c-bda4-fafc277293f7.jpg"
    IMG_VENUE     = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/1c73dd10-0cee-421e-ae63-02ea7734eacc.jpg"

    title   = str(project.get("title") or "Проект")
    artist  = str(project.get("artist") or "")
    city    = str(project.get("city") or "")
    venue   = str(project.get("venue_name") or "")
    d_start = str(project.get("date_start") or "")[:10]
    d_end   = str(project.get("date_end") or "")[:10]
    status  = str(project.get("status") or "")
    tax_sys = str(project.get("tax_system") or "usn6")

    inc_plan = float(project.get("total_income_plan") or 0)
    inc_fact = float(project.get("total_income_fact") or 0)
    exp_plan = float(project.get("total_expenses_plan") or 0)
    exp_fact = float(project.get("total_expenses_fact") or 0)

    TAX = {"usn6":0.06,"usn15":0.15,"osn":0.20,"patent":0,"npd":0.06}
    tax_rate = TAX.get(tax_sys, 0.06)
    tax_plan = inc_plan * tax_rate
    tax_fact = inc_fact * tax_rate
    prf_plan = inc_plan - exp_plan - tax_plan
    prf_fact = inc_fact - exp_fact - tax_fact
    tax_lbl  = f"УСН {int(tax_rate*100)}%" if tax_sys.startswith("usn") else "ОСН"
    prf_col  = "#4ade80" if prf_plan >= 0 else "#ec4899"

    STATUS_RU = {"planning":"Планирование","active":"Активный","completed":"Завершён","cancelled":"Отменён"}
    date_str  = d_start + (f" — {d_end}" if d_end and d_end != d_start else "")
    meta      = "  ·  ".join(p for p in [city, venue, date_str] if p)

    def fmt(v):
        v = float(v or 0)
        if abs(v) >= 1_000_000: return f"{v/1_000_000:.1f} млн ₽"
        return f"{int(v):,} ₽".replace(",", " ")

    def pct(fact, plan):
        if not plan: return "—"
        return f"{fact/plan*100:.0f}%"

    # Расходы по категориям
    cats = {}
    for e in expenses:
        cat = str(e.get("category") or "Прочее")
        cats.setdefault(cat, {"plan": 0.0, "fact": 0.0})
        cats[cat]["plan"] += float(e.get("amount_plan") or 0)
        cats[cat]["fact"] += float(e.get("amount_fact") or 0)
    sorted_cats = sorted(cats.items(), key=lambda x: -x[1]["plan"])

    CAT_COLORS = ["#a855f7","#ec4899","#22d3ee","#4ade80","#f59e0b","#8b5cf6","#ef4444","#06b6d4"]
    CAT_ICONS  = ["🏛","🎵","📢","🚌","🎤","💡","🎬","🖥","📋","💰"]

    # Билеты
    total_plan_tix = sum(int(il.get("ticket_count") or 0) for il in income_lines)
    total_sold_tix = sum(int(il.get("sold_count") or 0) for il in income_lines)

    # TC
    tc_total   = len(ticket_sales)
    tc_paid    = sum(1 for s in ticket_sales if s.get("status") == "paid")
    tc_revenue = sum(float(s.get("total_amount") or 0) for s in ticket_sales)
    tc_avg     = tc_revenue / tc_paid if tc_paid else 0

    # AI текст
    def ai_to_html(text):
        lines = []
        for line in text.split("\n"):
            line = line.strip().lstrip("#*").strip()
            if not line: continue
            if line.startswith("•") or line.startswith("-"):
                lines.append(f'<div class="ai-bullet">• {line.lstrip("•- ").strip()}</div>')
            else:
                lines.append(f'<p class="ai-para">{line}</p>')
        return "".join(lines)

    # Расходы — прогресс-бары
    expenses_html = ""
    for idx, (cat, vals) in enumerate(sorted_cats):
        col   = CAT_COLORS[idx % len(CAT_COLORS)]
        icon  = CAT_ICONS[idx % len(CAT_ICONS)]
        share = f"{vals['plan']/exp_plan*100:.0f}%" if exp_plan else "—"
        done  = min(100, int(vals["fact"]/vals["plan"]*100)) if vals["plan"] else 0
        expenses_html += f"""
        <div class="progress-row">
          <div class="progress-header">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">{icon}</span>
              <span class="progress-name">{cat}</span>
              <span class="badge" style="color:{col};background:{col}18;border-color:{col}44;">{share} бюджета</span>
            </div>
            <div class="progress-vals">
              <span style="color:#fff;">{fmt(vals['plan'])}</span> · факт: <span style="color:{col};">{fmt(vals['fact'])}</span>
            </div>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:{done}%;background:{col};"></div>
          </div>
        </div>"""

    # Строки таблицы билетов
    ticket_rows_html = ""
    ticket_bars_html = ""
    for il in income_lines:
        cat   = str(il.get("category") or "Билеты")
        plan  = int(il.get("ticket_count") or 0)
        sold  = int(il.get("sold_count") or 0)
        price = float(il.get("ticket_price") or 0)
        conv  = f"{sold/plan*100:.0f}%" if plan else "—"
        bar_w = min(100, int(sold/plan*100)) if plan else 0
        ticket_rows_html += f"""
        <tr>
          <td><b>🎟 {cat}</b></td>
          <td style="color:#999;">{fmt(price)}</td>
          <td style="text-align:center;">{plan}</td>
          <td style="text-align:center;color:#4ade80;font-weight:700;">{sold}</td>
          <td style="text-align:center;color:#22d3ee;">{conv}</td>
          <td style="text-align:right;color:#4ade80;font-weight:700;">{fmt(sold*price)}</td>
        </tr>"""
        ticket_bars_html += f"""
        <div class="progress-row">
          <div class="progress-header">
            <span class="progress-name">🎟 {cat}</span>
            <span class="progress-vals">{sold} из {plan}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:{bar_w}%;background:#4ade80;"></div>
          </div>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}
:root{{
  --bg:#0d0d1a; --card:#13131f; --border:#1e1e30;
  --purple:#a855f7; --cyan:#22d3ee; --pink:#ec4899; --green:#4ade80;
  --w:#fff; --w60:rgba(255,255,255,.6); --w40:rgba(255,255,255,.4);
  --w20:rgba(255,255,255,.2); --w10:rgba(255,255,255,.1);
}}
html,body{{background:var(--bg);color:var(--w);font-family:'Inter',sans-serif;font-size:13px;line-height:1.6;}}
.page{{width:210mm;min-height:297mm;padding:14mm 16mm;background:var(--bg);position:relative;page-break-after:always;overflow:hidden;}}
.page:last-child{{page-break-after:auto;}}
.glow-tl{{position:absolute;top:-80px;left:-80px;width:320px;height:320px;background:radial-gradient(circle,rgba(168,85,247,.12) 0%,transparent 70%);pointer-events:none;}}
.glow-br{{position:absolute;bottom:-80px;right:-80px;width:260px;height:260px;background:radial-gradient(circle,rgba(34,211,238,.10) 0%,transparent 70%);pointer-events:none;}}
.oswald{{font-family:'Oswald',sans-serif;}}
.hero-title{{font-family:'Oswald',sans-serif;font-size:46px;font-weight:700;text-transform:uppercase;line-height:1.05;letter-spacing:-1px;background:linear-gradient(135deg,var(--purple),var(--cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-align:center;}}
.section-label{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--cyan);margin-bottom:6px;}}
.section-title{{font-family:'Oswald',sans-serif;font-size:24px;font-weight:600;line-height:1.2;}}
.s-purple{{color:var(--purple);}} .s-cyan{{color:var(--cyan);}} .s-white{{color:var(--w);}}
.grad-line{{height:2px;background:linear-gradient(90deg,transparent 0%,var(--purple) 25%,var(--cyan) 75%,transparent 100%);margin:12px 0;}}
.thin-line{{height:1px;background:var(--border);margin:8px 0;}}
.body-text{{color:var(--w60);font-size:13px;line-height:1.65;}}
.caption{{font-size:11px;color:var(--w40);text-align:center;}}
.footer-text{{font-size:9px;color:rgba(255,255,255,.2);text-align:center;}}
/* KPI */
.kpi-grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0;}}
.kpi-card{{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 10px;text-align:center;}}
.kpi-num{{font-family:'Oswald',sans-serif;font-size:18px;font-weight:700;line-height:1.2;}}
.kpi-label{{font-size:10px;color:var(--w40);margin-top:4px;}}
.kpi-sub{{font-size:10px;color:var(--w40);margin-top:2px;}}
/* Stat block */
.stat-block{{display:grid;background:var(--card);border-radius:14px;border:1px solid var(--border);overflow:hidden;margin:12px 0;}}
.c2{{grid-template-columns:repeat(2,1fr);}} .c3{{grid-template-columns:repeat(3,1fr);}} .c4{{grid-template-columns:repeat(4,1fr);}}
.stat-item{{padding:18px 10px;text-align:center;border-right:1px solid var(--border);}}
.stat-item:last-child{{border-right:none;}}
.stat-num{{font-family:'Oswald',sans-serif;font-size:24px;font-weight:700;line-height:1.1;}}
.stat-label{{font-size:10px;color:var(--w40);margin-top:4px;}}
/* Feature card */
.feature-grid{{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0;}}
.feature-card{{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;gap:12px;align-items:flex-start;}}
.feature-icon{{font-size:20px;line-height:1;flex-shrink:0;margin-top:2px;}}
.feature-title{{font-weight:600;font-size:13px;color:var(--w);margin-bottom:4px;}}
.feature-body{{font-size:12px;color:var(--w60);line-height:1.5;}}
/* Progress */
.progress-row{{margin:6px 0 14px;}}
.progress-header{{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}}
.progress-name{{font-size:13px;font-weight:500;color:var(--w);}}
.progress-vals{{font-size:11px;color:var(--w40);}}
.progress-track{{height:6px;background:rgba(255,255,255,.08);border-radius:6px;overflow:hidden;}}
.progress-fill{{height:100%;border-radius:6px;}}
/* Badge */
.badge{{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600;border:1px solid;}}
/* AI */
.ai-box{{background:var(--card);border:1px solid var(--border);border-left:3px solid var(--cyan);border-radius:12px;padding:16px 20px;margin:14px 0;}}
.ai-para{{color:var(--w60);font-size:13px;line-height:1.65;margin-bottom:8px;}}
.ai-bullet{{color:var(--w60);font-size:13px;line-height:1.65;margin-bottom:6px;padding-left:4px;}}
/* Table */
.ticket-table{{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;}}
.ticket-table th{{background:rgba(168,85,247,.12);color:var(--w40);padding:8px 10px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px;}}
.ticket-table td{{padding:9px 10px;border-bottom:1px solid var(--border);color:var(--w);vertical-align:middle;}}
.ticket-table tr:last-child td{{border-bottom:none;}}
.ticket-table tr:nth-child(even) td{{background:rgba(255,255,255,.02);}}
/* Img */
.hero-img{{width:100%;height:180px;object-fit:cover;border-radius:14px;margin:14px 0 6px;border:1px solid var(--border);}}
.section-img{{width:100%;height:140px;object-fit:cover;border-radius:12px;border:1px solid var(--border);margin:14px 0 6px;}}
</style>
</head>
<body>

<!-- СТРАНИЦА 1 — ОБЛОЖКА -->
<div class="page">
  <div class="glow-tl"></div><div class="glow-br"></div>
  <div style="padding-top:16px;">
    {f'<div style="text-align:center;margin-bottom:10px;"><span class="badge" style="color:#22d3ee;background:rgba(34,211,238,.08);border-color:rgba(34,211,238,.3);">{user_prompt[:80]}</span></div>' if user_prompt else ""}
    <div class="grad-line"></div>
    <div style="margin:20px 0 10px;text-align:center;">
      {f'<div style="font-family:Oswald,sans-serif;font-size:15px;font-weight:600;color:var(--purple);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">{artist}</div>' if artist else ""}
      <div class="hero-title">{title.upper()}</div>
      {f'<div style="color:var(--w40);font-size:13px;margin-top:10px;">{meta}</div>' if meta else ""}
    </div>
    <div style="text-align:center;margin:8px 0;">
      <span class="badge" style="color:var(--purple);background:rgba(168,85,247,.08);border-color:rgba(168,85,247,.3);">{STATUS_RU.get(status, status)}</span>
    </div>
    <div class="grad-line"></div>
    <img src="{IMG_HERO}" class="hero-img" alt="Концерт"/>
    <p class="caption" style="margin-bottom:18px;">Платформа GLOBAL LINK — управление концертными проектами</p>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-num" style="color:#4ade80;">{fmt(inc_plan)}</div>
        <div class="kpi-label">Доход план</div>
        <div class="kpi-sub">факт: {fmt(inc_fact)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-num" style="color:#ec4899;">{fmt(exp_plan)}</div>
        <div class="kpi-label">Расходы план</div>
        <div class="kpi-sub">факт: {fmt(exp_fact)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-num" style="color:#22d3ee;">{fmt(tax_plan)}</div>
        <div class="kpi-label">Налог ({tax_lbl})</div>
        <div class="kpi-sub">факт: {fmt(tax_fact)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-num" style="color:{prf_col};">{fmt(prf_plan)}</div>
        <div class="kpi-label">Чистая прибыль</div>
        <div class="kpi-sub">факт: {fmt(prf_fact)}</div>
      </div>
    </div>
  </div>
</div>

<!-- СТРАНИЦА 2 — ФИНАНСЫ + ИИ -->
<div class="page">
  <div class="glow-tl"></div><div class="glow-br"></div>
  <div class="section-label">Финансы проекта</div>
  <div class="section-title s-purple">Бюджет, доходы и чистая прибыль</div>
  <div class="grad-line"></div>
  <div class="feature-grid">
    <div class="feature-card" style="border-color:rgba(74,222,128,.25);">
      <div class="feature-icon">🎯</div>
      <div>
        <div class="feature-title">Доходы</div>
        <div class="feature-body"><b style="color:#4ade80;">План: {fmt(inc_plan)}</b><br/>Факт: {fmt(inc_fact)} · {pct(inc_fact, inc_plan)} выполнено</div>
      </div>
    </div>
    <div class="feature-card" style="border-color:rgba(236,72,153,.25);">
      <div class="feature-icon">💸</div>
      <div>
        <div class="feature-title">Расходы</div>
        <div class="feature-body"><b style="color:#ec4899;">Бюджет: {fmt(exp_plan)}</b><br/>Потрачено: {fmt(exp_fact)} · {pct(exp_fact, exp_plan)} от плана</div>
      </div>
    </div>
    <div class="feature-card" style="border-color:rgba(34,211,238,.25);">
      <div class="feature-icon">💰</div>
      <div>
        <div class="feature-title">Налог ({tax_lbl})</div>
        <div class="feature-body"><b style="color:#22d3ee;">К уплате план: {fmt(tax_plan)}</b><br/>Факт: {fmt(tax_fact)}</div>
      </div>
    </div>
    <div class="feature-card" style="border-color:rgba({('168,85,247' if prf_plan >= 0 else '236,72,153')},.25);">
      <div class="feature-icon">✨</div>
      <div>
        <div class="feature-title">Чистая прибыль</div>
        <div class="feature-body"><b style="color:{prf_col};">Прогноз: {fmt(prf_plan)}</b><br/>По факту: {fmt(prf_fact)}</div>
      </div>
    </div>
  </div>
  <img src="{IMG_DASHBOARD}" class="section-img" alt="Дашборд"/>
  <p class="caption" style="margin-bottom:14px;">Управление финансами проекта в платформе GLOBAL LINK</p>
  {f'''<div class="section-label" style="margin-top:8px;">ИИ-аналитика</div>
  <div class="section-title s-cyan">Оценка проекта и рекомендации</div>
  <div class="grad-line"></div>
  <div class="ai-box">{ai_to_html(ai_summary)}</div>''' if ai_summary else ""}
</div>

<!-- СТРАНИЦА 3 — РАСХОДЫ -->
{"" if not sorted_cats else f'''
<div class="page">
  <div class="glow-tl"></div>
  <div class="section-label">Бюджет расходов</div>
  <div class="section-title s-purple">Статьи затрат — план и исполнение</div>
  <div class="grad-line"></div>
  <div class="stat-block c3" style="margin-bottom:18px;">
    <div class="stat-item"><div class="stat-num" style="color:#ec4899;">{fmt(exp_plan)}</div><div class="stat-label">Всего бюджет</div></div>
    <div class="stat-item"><div class="stat-num" style="color:#22d3ee;">{fmt(exp_fact)}</div><div class="stat-label">Потрачено</div></div>
    <div class="stat-item"><div class="stat-num" style="color:{"#4ade80" if exp_fact <= exp_plan else "#ec4899"};">{pct(exp_fact, exp_plan)}</div><div class="stat-label">Исполнение</div></div>
  </div>
  {expenses_html}
</div>'''}

<!-- СТРАНИЦА 4 — БИЛЕТЫ -->
{"" if not income_lines else f'''
<div class="page">
  <div class="glow-tl"></div><div class="glow-br"></div>
  <div class="section-label">Продажи билетов</div>
  <div class="section-title s-cyan">Плановые и фактические продажи</div>
  <div class="grad-line"></div>
  <div class="stat-block c4" style="margin-bottom:18px;">
    <div class="stat-item"><div class="stat-num" style="color:#a855f7;">{total_plan_tix}</div><div class="stat-label">Билетов план</div></div>
    <div class="stat-item"><div class="stat-num" style="color:#4ade80;">{total_sold_tix}</div><div class="stat-label">Продано</div></div>
    <div class="stat-item"><div class="stat-num" style="color:#22d3ee;">{pct(total_sold_tix, total_plan_tix)}</div><div class="stat-label">Конверсия</div></div>
    <div class="stat-item"><div class="stat-num" style="color:#4ade80;">{fmt(inc_fact)}</div><div class="stat-label">Выручка</div></div>
  </div>
  <table class="ticket-table">
    <thead><tr><th>Категория</th><th>Цена</th><th>План</th><th>Продано</th><th>%</th><th>Выручка</th></tr></thead>
    <tbody>{ticket_rows_html}</tbody>
  </table>
  {ticket_bars_html}
  <img src="{IMG_VENUE}" class="section-img" alt="Площадка"/>
  <p class="caption" style="margin-top:6px;">Площадка концерта</p>
</div>'''}

<!-- СТРАНИЦА 5 — TC + ПОДВАЛ -->
<div class="page">
  <div class="glow-tl"></div><div class="glow-br"></div>
  {"" if not tc_total else f'''
  <div class="section-label">Данные продаж</div>
  <div class="section-title s-purple">Реальные данные из системы билетов</div>
  <div class="grad-line"></div>
  <div class="stat-block c4">
    <div class="stat-item"><div class="stat-num" style="color:#a855f7;">{tc_total}</div><div class="stat-label">Всего заказов</div></div>
    <div class="stat-item"><div class="stat-num" style="color:#4ade80;">{tc_paid}</div><div class="stat-label">Оплачено</div></div>
    <div class="stat-item"><div class="stat-num" style="color:#22d3ee;">{tc_total - tc_paid}</div><div class="stat-label">Забронировано</div></div>
    <div class="stat-item"><div class="stat-num" style="color:#4ade80;">{fmt(tc_avg)}</div><div class="stat-label">Средний чек</div></div>
  </div>
  <div class="feature-grid" style="margin-top:16px;">
    <div class="feature-card" style="border-color:rgba(74,222,128,.25);">
      <div class="feature-icon">✅</div>
      <div><div class="feature-title">Оплаченные заказы</div>
      <div class="feature-body"><b style="color:#4ade80;">{tc_paid} заказов</b><br/>Выручка: {fmt(tc_revenue)}</div></div>
    </div>
    <div class="feature-card" style="border-color:rgba(34,211,238,.25);">
      <div class="feature-icon">🔖</div>
      <div><div class="feature-title">Ожидают оплаты</div>
      <div class="feature-body"><b style="color:#22d3ee;">{tc_total - tc_paid} заказов</b><br/>Забронировано, не оплачено</div></div>
    </div>
  </div>'''}
  <div style="margin-top:40px;">
    <div class="grad-line"></div>
    <p class="footer-text" style="margin-top:10px;">GLOBAL LINK  ·  {title.upper()}</p>
    <p class="footer-text">globallink.art  ·  Конфиденциально  ·  Сформировано платформой GLOBAL LINK</p>
  </div>
</div>

</body></html>"""


# HANDLER
# ═══════════════════════════════════════════════════════════════════════════════

def handler(event: dict, context) -> dict:
    """Генерирует PDF-презентацию GLOBAL LINK и возвращает CDN URL."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    ptype  = params.get("type", "users")

    # ── action=project_pdf / project_html_pdf — презентация проекта ─────────
    if action in ("project_pdf", "project_html_pdf"):
        body       = json.loads(event.get("body") or "{}")
        project_id = body.get("projectId") or params.get("projectId", "")
        user_id    = body.get("userId") or params.get("userId", "")
        ai_summary  = (body.get("aiSummary") or "").strip()
        user_prompt = (body.get("userPrompt") or "").strip()

        if not project_id or not user_id:
            return err("projectId и userId обязательны")

        conn = get_conn()
        try:
            cur = conn.cursor()

            # Проект
            cur.execute(
                f"SELECT id, title, artist, city, venue_name, date_start, date_end, status, tax_system, "
                f"total_income_plan, total_income_fact, total_expenses_plan, total_expenses_fact "
                f"FROM {SCHEMA}.projects WHERE id = %s AND user_id = %s",
                (project_id, user_id)
            )
            row = cur.fetchone()
            if not row:
                return err("Проект не найден", 404)
            cols = [d[0] for d in cur.description]
            project = dict(zip(cols, row))

            # Расходы
            cur.execute(
                f"SELECT category, title, amount_plan, amount_fact FROM {SCHEMA}.project_expenses "
                f"WHERE project_id = %s ORDER BY sort_order ASC",
                (project_id,)
            )
            ec = [d[0] for d in cur.description]
            expenses = [dict(zip(ec, r)) for r in cur.fetchall()]

            # Строки доходов
            cur.execute(
                f"SELECT category, ticket_count, ticket_price, sold_count FROM {SCHEMA}.project_income_lines "
                f"WHERE project_id = %s ORDER BY sort_order ASC",
                (project_id,)
            )
            ic = [d[0] for d in cur.description]
            income_lines = [dict(zip(ic, r)) for r in cur.fetchall()]

            # Продажи билетов (TC)
            cur.execute(
                f"SELECT status, total_amount FROM {SCHEMA}.ticket_sales "
                f"WHERE project_id = %s",
                (project_id,)
            )
            sc = [d[0] for d in cur.description]
            ticket_sales = [dict(zip(sc, r)) for r in cur.fetchall()]

        finally:
            conn.close()

        # ── ИИ-аналитика прямо здесь, строго на русском ─────────────────────
        ai_summary = ""
        try:
            api_key = os.environ.get("AITUNNEL_API_KEY", "")
            if api_key:
                title_p  = project.get("title") or "проект"
                artist_p = project.get("artist") or ""
                city_p   = project.get("city") or ""
                inc_p    = float(project.get("total_income_plan") or 0)
                inc_f    = float(project.get("total_income_fact") or 0)
                exp_p    = float(project.get("total_expenses_plan") or 0)
                exp_f    = float(project.get("total_expenses_fact") or 0)
                tax_r    = {"usn6":0.06,"usn15":0.15,"osn":0.20,"patent":0,"npd":0.06}.get(
                               project.get("tax_system") or "usn6", 0.06)
                prf_p    = inc_p - exp_p - inc_p * tax_r
                prf_f    = inc_f - exp_f - inc_f * tax_r
                prompt_extra = f"\n\nОсобый акцент: {user_prompt}" if user_prompt else ""

                sys_msg = ("Ты аналитик концертной индустрии. Отвечай ТОЛЬКО на русском языке. "
                           "Пиши живо, по-деловому, коротко. Используй • для списков.")
                user_msg = (
                    f"Напиши аналитику для PDF-презентации концертного проекта (8-12 строк, только русский язык).{prompt_extra}\n\n"
                    f"Проект: «{title_p}»{', артист: ' + artist_p if artist_p else ''}{', город: ' + city_p if city_p else ''}\n"
                    f"Доход план: {inc_p:,.0f} ₽, факт: {inc_f:,.0f} ₽\n"
                    f"Расходы план: {exp_p:,.0f} ₽, факт: {exp_f:,.0f} ₽\n"
                    f"Чистая прибыль план: {prf_p:,.0f} ₽, факт: {prf_f:,.0f} ₽\n\n"
                    f"Структура ответа:\n"
                    f"1. Одно предложение — общая оценка проекта\n"
                    f"2. 3-4 пункта со знаком • — ключевые наблюдения по цифрам\n"
                    f"3. Одно предложение — главная рекомендация\n"
                    f"Не используй markdown заголовки ##. Не пиши ни слова на английском."
                )
                payload = json.dumps({
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "system", "content": sys_msg},
                                 {"role": "user",   "content": user_msg}],
                    "temperature": 0.5,
                    "max_tokens": 600,
                }).encode("utf-8")
                req = urllib.request.Request(
                    "https://api.aitunnel.ru/v1/chat/completions",
                    data=payload,
                    headers={"Content-Type": "application/json",
                             "Authorization": f"Bearer {api_key}"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=20) as r:
                    resp = json.loads(r.read())
                    ai_summary = resp["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"[presentation] ai error: {e}")

        safe_title = "".join(c if c.isalnum() or c in " _-" else "_" for c in (project.get("title") or "project"))[:40].strip()
        filename   = f"Presentation_{safe_title}.pdf"

        if action == "project_html_pdf":
            # WeasyPrint: HTML → PDF
            from weasyprint import HTML as WP_HTML
            html_str = build_html_template(project, expenses, income_lines, ticket_sales, ai_summary, user_prompt)
            pdf_bytes = WP_HTML(string=html_str, base_url="https://globallink.art").write_pdf()
        else:
            # ReportLab (старый путь, оставляем для совместимости)
            buf = io.BytesIO()
            build_project_pdf(buf, project, expenses, income_lines, ticket_sales, ai_summary, user_prompt)
            pdf_bytes = buf.getvalue()

        s3  = get_s3()
        key = f"presentations/projects/{project_id}/{uuid.uuid4()}.pdf"
        s3.put_object(
            Bucket="files", Key=key, Body=pdf_bytes,
            ContentType="application/pdf",
            ContentDisposition=f'attachment; filename="{filename}"',
        )
        url = cdn(key)
        return ok({"url": url, "filename": filename, "projectId": project_id})

    # ── Обычные презентации платформы ─────────────────────────────────────────
    if ptype not in ("investors", "users", "partners"):
        return err("type must be investors, users or partners")

    buf = io.BytesIO()
    if ptype == "investors":
        build_investors(buf)
        filename = "GLOBALLINK_Investors_2025.pdf"
    elif ptype == "users":
        build_users(buf)
        filename = "GLOBALLINK_ForUsers_2025.pdf"
    else:
        build_partners(buf)
        filename = "GLOBALLINK_Partners_2025.pdf"

    pdf_bytes = buf.getvalue()

    s3  = get_s3()
    key = f"presentations/{ptype}/{uuid.uuid4()}.pdf"
    s3.put_object(
        Bucket="files", Key=key, Body=pdf_bytes,
        ContentType="application/pdf",
        ContentDisposition=f'attachment; filename="{filename}"',
    )
    url = cdn(key)
    return ok({"url": url, "filename": filename, "type": ptype})
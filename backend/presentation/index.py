"""
Генерация PDF-презентаций платформы GLOBAL LINK.
GET ?type=investors  — для инвесторов
GET ?type=users      — для организаторов и площадок
GET ?type=partners   — для партнёров
"""
import os, io, uuid, json, urllib.request
import boto3
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
# HANDLER
# ═══════════════════════════════════════════════════════════════════════════════

def handler(event: dict, context) -> dict:
    """Генерирует PDF-презентацию GLOBAL LINK и возвращает CDN URL."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    params = event.get("queryStringParameters") or {}
    ptype  = params.get("type", "users")

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

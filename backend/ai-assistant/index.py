"""
ИИ-ассистент платформы GLOBAL LINK.
POST ?action=ask   — задать вопрос (требует X-Session-Id)
GET  ?action=list  — список запросов для админа (требует X-Admin-Token)
POST ?action=rate  — оценить ответ (helpful: true/false)
"""
import json, os, urllib.request, urllib.error, psycopg2

SCHEMA = "t_p17532248_concert_platform_mvp"
ADMIN_URL = "https://functions.poehali.dev/19ba5519-e548-4443-845c-9cb446cfc909"

SYSTEM_PROMPT = """Ты — ИИ-ассистент платформы GLOBAL LINK, B2B SaaS сервиса для организации концертов и гастрольных туров по России.

Ты знаешь всё о платформе и помогаешь пользователям разобраться в ней.

ПЛАТФОРМА GLOBAL LINK — ЧТО ЭТО:
Сервис для двух типов пользователей:
1. ОРГАНИЗАТОРЫ (organizer) — те, кто организуют концерты и туры
2. ПЛОЩАДКИ (venue) — концертные залы, клубы, арены

ОСНОВНЫЕ ФУНКЦИИ ПЛАТФОРМЫ:

== ДЛЯ ОРГАНИЗАТОРОВ ==
• МОИ ТУРЫ — создание и управление гастрольными турами. Каждый тур включает несколько концертов в разных городах.
• ИСТОРИЯ — архив прошедших туров и мероприятий.
• ДОКУМЕНТЫ — хранение и управление документами (договоры, счета, акты).
• ПОДПИСАНИЕ (ЭДО) — электронный документооборот: подписание договоров с площадками без бумаги.
• УВЕДОМЛЕНИЯ — системные уведомления о заявках, подписании, сообщениях.
• КОМПАНИЯ — внутренний чат команды, управление сотрудниками, реквизиты компании.
• ПРОФИЛЬ — личные данные, реквизиты, логотип, смена пароля, 2FA.
• ПОИСК ПЛОЩАДОК — на главной странице можно искать площадки по городу, вместимости, цене.

== ДЛЯ ПЛОЩАДОК ==
• МОИ ПЛОЩАДКИ — управление своими площадками: добавление, редактирование, фотографии, описание, технический райдер.
• ПРОЕКТЫ — входящие заявки от организаторов на аренду площадки.
• МОИ КОНЦЕРТЫ — управление запланированными концертами.
• ДОКУМЕНТЫ — договоры и финансовые документы.
• ПОДПИСАНИЕ (ЭДО) — электронные подписи документов.
• CRM — управление задачами, Kanban-доска, воронка продаж, цели.
• УВЕДОМЛЕНИЯ — оповещения о новых заявках и сообщениях.
• КОМПАНИЯ — командный чат, сотрудники, реквизиты.
• ПРОФИЛЬ — настройки аккаунта.

== ПРОЕКТЫ (совместная работа организатор + площадка) ==
Проект создаётся когда организатор бронирует площадку. В проекте есть:
• Основная информация (дата, название, бюджет)
• Чат между организатором и площадкой
• Финансы: доходы, расходы, P&L отчёт
• Документы: договоры (генерация PDF), счета (генерация PDF)
• Логистика: авиа, ЖД, отели для команды
• Технический райдер площадки
• Задачи (CRM внутри проекта)
• Продажи билетов: синхронизация с агрегаторами

== ЭДО (ЭЛЕКТРОННЫЙ ДОКУМЕНТООБОРОТ) ==
• Генерация договора аренды площадки в PDF
• Подписание через простую электронную подпись
• Обе стороны (организатор и площадка) подписывают онлайн
• Статусы: черновик → отправлен → подписан обеими сторонами

== РЕГИСТРАЦИЯ И ВХОД ==
• Регистрация: выбор роли (организатор / площадка), email, пароль, данные компании
• После регистрации — модерация администратором (статус "на проверке")
• При одобрении — полный доступ к платформе
• Двухфакторная аутентификация (2FA) — включается в профиле
• Смена пароля — в профиле → "Безопасность"

== ТАРИФЫ ==
• Пробный период доступен после регистрации
• Для уточнения тарифов свяжитесь с поддержкой

== ПОДДЕРЖКА ==
• Кнопка "Помощь" в боковом меню → ИИ-ассистент (это ты)
• Для связи с живым оператором: написать в раздел "Поддержка" или на email

== ВЕРИФИКАЦИЯ ==
• После регистрации аккаунт проходит проверку администратором
• Статус "Верифицирован" означает проверенную компанию (зелёная галочка)
• Верификация повышает доверие партнёров

СТИЛЬ ОТВЕТОВ:
- Отвечай кратко, по делу, на русском языке
- Используй простой язык без технических терминов
- Если не знаешь ответа — честно скажи и предложи написать в поддержку
- Не выдумывай функции которых нет
- Будь дружелюбным и профессиональным
"""


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id, X-Admin-Token",
    }


def ok(data, status=200):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**cors(), "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def get_session_user(session_id: str) -> dict | None:
    """Получает данные пользователя из сессии."""
    if not session_id:
        return None
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            f"SELECT user_data FROM {SCHEMA}.sessions WHERE session_id = %s AND last_seen > NOW() - INTERVAL '30 days'",
            (session_id,)
        )
        row = cur.fetchone()
    finally:
        conn.close()
    if not row:
        return None
    return row[0] if isinstance(row[0], dict) else json.loads(row[0])


def call_aitunnel(api_key: str, model: str, messages: list, max_tokens: int = 800) -> str | None:
    """Прямой HTTP-запрос к AiTunnel без SDK — быстрый холодный старт."""
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": max_tokens,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.aitunnel.ru/v1/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        print(f"[ai] AiTunnel/{model} HTTP {e.code}: {e.read().decode()[:200]}")
        return None
    except Exception as ex:
        print(f"[ai] AiTunnel/{model} error: {ex}")
        return None


def ask_ai(question: str, user_role: str) -> str:
    """Отправляет вопрос через AiTunnel (прямой HTTP, без SDK)."""
    api_key = os.environ.get("AITUNNEL_API_KEY", "")
    if not api_key:
        return "ИИ-ассистент временно недоступен — не задан API-ключ. Обратитесь к администратору."

    role_hint = ""
    if user_role == "organizer":
        role_hint = "\n\nПользователь является ОРГАНИЗАТОРОМ концертов."
    elif user_role == "venue":
        role_hint = "\n\nПользователь является владельцем ПЛОЩАДКИ."

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + role_hint},
        {"role": "user", "content": question},
    ]

    for model in ["gpt-5-nano", "gpt-4o-mini", "gpt-4o"]:
        result = call_aitunnel(api_key, model, messages)
        if result:
            print(f"[ai] answered via AiTunnel/{model}")
            return result

    return "Не удалось получить ответ от ИИ. Попробуйте позже или напишите в поддержку."


def check_admin_token(token: str) -> bool:
    """Проверяет токен администратора."""
    if not token:
        return False
    payload = json.dumps({"token": token}).encode("utf-8")
    req = urllib.request.Request(
        f"{ADMIN_URL}?action=check_token",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("ok", False)
    except Exception:
        secret = os.environ.get("ADMIN_SECRET", "")
        return bool(secret) and token == secret


def handler(event: dict, context) -> dict:
    """ИИ-ассистент GLOBAL LINK: отвечает на вопросы пользователей о платформе."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "ask")
    headers = event.get("headers") or {}
    session_id = headers.get("X-Session-Id") or headers.get("x-session-id", "")
    admin_token = headers.get("X-Admin-Token") or headers.get("x-admin-token", "")

    # ── POST ask ──────────────────────────────────────────────────────────
    if method == "POST" and action == "ask":
        print(f"[ai] ask: session_id={session_id[:8] if session_id else 'EMPTY'}")
        user = get_session_user(session_id)
        if not user:
            print(f"[ai] ask: user not found for session")
            return err("Не авторизован", 401)

        print(f"[ai] ask: user={user.get('email','?')} role={user.get('role','?')}")
        body = json.loads(event.get("body") or "{}")
        question = (body.get("question") or "").strip()
        if not question:
            return err("Вопрос не может быть пустым")
        if len(question) > 2000:
            return err("Вопрос слишком длинный (максимум 2000 символов)")

        aitunnel_key_present = bool(os.environ.get("AITUNNEL_API_KEY", ""))
        print(f"[ai] ask: question_len={len(question)} aitunnel_key_present={aitunnel_key_present}")
        answer = ask_ai(question, user.get("role", ""))
        print(f"[ai] ask: answer_len={len(answer)}")

        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"""INSERT INTO {SCHEMA}.ai_requests
                    (user_id, user_name, user_email, user_role, question, answer)
                    VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
                (
                    user.get("id", ""),
                    user.get("name", ""),
                    user.get("email", ""),
                    user.get("role", ""),
                    question,
                    answer,
                )
            )
            request_id = cur.fetchone()[0]
            conn.commit()
        finally:
            conn.close()

        return ok({"answer": answer, "requestId": request_id})

    # ── POST rate ─────────────────────────────────────────────────────────
    if method == "POST" and action == "rate":
        user = get_session_user(session_id)
        if not user:
            return err("Не авторизован", 401)

        body = json.loads(event.get("body") or "{}")
        request_id = body.get("requestId")
        is_helpful = body.get("helpful")
        if request_id is None or is_helpful is None:
            return err("requestId и helpful обязательны")

        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.ai_requests SET is_helpful = %s WHERE id = %s AND user_id = %s",
                (bool(is_helpful), request_id, user.get("id", ""))
            )
            conn.commit()
        finally:
            conn.close()

        return ok({"ok": True})

    # ── GET list (admin) ──────────────────────────────────────────────────
    if method == "GET" and action == "list":
        if not check_admin_token(admin_token):
            return err("Доступ запрещён", 403)

        try:
            page = max(1, int(params.get("page", 1)))
            limit = min(50, max(1, int(params.get("limit", 20))))
        except (ValueError, TypeError):
            page, limit = 1, 20

        offset = (page - 1) * limit
        search = (params.get("search") or "").strip()

        conn = get_conn()
        try:
            cur = conn.cursor()
            if search:
                cur.execute(
                    f"""SELECT id, user_id, user_name, user_email, user_role,
                               question, answer, is_helpful, created_at
                        FROM {SCHEMA}.ai_requests
                        WHERE user_name ILIKE %s OR user_email ILIKE %s OR question ILIKE %s
                        ORDER BY created_at DESC LIMIT %s OFFSET %s""",
                    (f"%{search}%", f"%{search}%", f"%{search}%", limit, offset)
                )
            else:
                cur.execute(
                    f"""SELECT id, user_id, user_name, user_email, user_role,
                               question, answer, is_helpful, created_at
                        FROM {SCHEMA}.ai_requests
                        ORDER BY created_at DESC LIMIT %s OFFSET %s""",
                    (limit, offset)
                )
            rows = cur.fetchall()
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.ai_requests" + (
                " WHERE user_name ILIKE %s OR user_email ILIKE %s OR question ILIKE %s"
                if search else ""
            ), ([f"%{search}%"] * 3 if search else []))
            total = cur.fetchone()[0]
        finally:
            conn.close()

        return ok({
            "requests": [
                {
                    "id": r[0], "userId": r[1], "userName": r[2],
                    "userEmail": r[3], "userRole": r[4],
                    "question": r[5], "answer": r[6],
                    "isHelpful": r[7], "createdAt": str(r[8]),
                }
                for r in rows
            ],
            "total": total,
            "page": page,
            "pages": max(1, (total + limit - 1) // limit),
        })

    # ── GET stats (admin) ─────────────────────────────────────────────────
    if method == "GET" and action == "stats":
        if not check_admin_token(admin_token):
            return err("Доступ запрещён", 403)

        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute(f"""
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE is_helpful = TRUE)  as helpful,
                    COUNT(*) FILTER (WHERE is_helpful = FALSE) as not_helpful,
                    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as week
                FROM {SCHEMA}.ai_requests
            """)
            row = cur.fetchone()
        finally:
            conn.close()

        return ok({
            "total": row[0], "helpful": row[1],
            "notHelpful": row[2], "week": row[3],
        })

    return err("Неизвестное действие", 404)
"""
ИИ-юрист платформы GLOBAL LINK.
POST ?action=ask        — задать вопрос или загрузить документ (требует X-Session-Id)
POST ?action=generate   — сгенерировать договор по шаблону
POST ?action=analyze    — анализ загруженного документа (base64 текст)
"""
import json, os, base64, psycopg2
from openai import OpenAI

SCHEMA = "t_p17532248_concert_platform_mvp"

SYSTEM_PROMPT = """Ты — ИИ-юрист платформы GLOBAL LINK, специализируешься на российском праве в сфере концертной и event-индустрии.

ТВОИ ЗАДАЧИ:
1. Анализировать договоры и юридические документы — объяснять простым языком что написано, на что обратить внимание, какие риски
2. Составлять договоры по шаблонам: договор аренды площадки, договор с артистом, договор на организацию мероприятия, NDA, акт выполненных работ
3. Отвечать на юридические вопросы в сфере event-бизнеса: авторские права, налоги ИП/ООО, ответственность сторон, форс-мажор
4. Проверять договоры на спорные пункты и предлагать более выгодные формулировки

СТИЛЬ ОТВЕТОВ:
- Объясняй простым языком без юридического жаргона
- Выделяй РИСКИ и важные моменты
- Давай конкретные рекомендации
- При составлении договора — создавай полноценный документ с реквизитами
- Отвечай на русском языке
- Если вопрос выходит за рамки event-индустрии — всё равно помогай, но уточни что это общая консультация
- В конце сложных ответов предлагай что ещё можно уточнить

ВАЖНО: Ты не несёшь юридической ответственности — это консультационный инструмент. Рекомендуй обращаться к практикующему юристу для важных сделок.
"""

TEMPLATES = {
    "venue_rent": {
        "name": "Договор аренды площадки",
        "prompt": """Составь профессиональный ДОГОВОР АРЕНДЫ ПЛОЩАДКИ для проведения концерта/мероприятия по российскому праву.

Включи обязательно:
- Полные реквизиты сторон (Арендодатель — площадка, Арендатор — организатор)
- Предмет договора (описание площадки, адрес, площадь)
- Сроки аренды (дата, время начала и окончания, включая время монтажа/демонтажа)
- Арендная плата и порядок расчётов (предоплата, остаток)
- Обязанности Арендодателя (предоставить помещение, обеспечить охрану, свет, звук)
- Обязанности Арендатора (соблюдать правила, не превышать вместимость, убрать после)
- Ответственность сторон за ущерб
- Форс-мажор
- Порядок расторжения (штрафы при отмене за N дней)
- Подписи и реквизиты

Данные для подстановки: {details}

Используй стандартные формулировки российского гражданского права (ГК РФ)."""
    },
    "artist": {
        "name": "Договор с артистом",
        "prompt": """Составь ДОГОВОР ВОЗМЕЗДНОГО ОКАЗАНИЯ УСЛУГ с артистом/исполнителем для выступления на мероприятии по российскому праву.

Включи:
- Реквизиты сторон (Заказчик — организатор, Исполнитель — артист/агент)
- Предмет: выступление (программа, продолжительность, количество выходов)
- Дата, место, время выступления
- Гонорар и порядок оплаты
- Технический райдер (как приложение)
- Бытовой райдер (трансфер, отель, питание)
- Авторские права на запись выступления
- Отмена и перенос (штрафные санкции)
- Форс-мажор
- Конфиденциальность

Данные для подстановки: {details}

Используй стандартные формулировки российского права."""
    },
    "nda": {
        "name": "Соглашение о конфиденциальности (NDA)",
        "prompt": """Составь СОГЛАШЕНИЕ О КОНФИДЕНЦИАЛЬНОСТИ (NDA) для партнёров в event-индустрии по российскому праву.

Включи:
- Стороны соглашения
- Определение конфиденциальной информации
- Обязательства сторон
- Исключения (общедоступная информация)
- Срок действия NDA
- Ответственность за нарушение
- Порядок урегулирования споров

Данные для подстановки: {details}"""
    },
    "act": {
        "name": "Акт выполненных работ",
        "prompt": """Составь АКТ ВЫПОЛНЕННЫХ РАБОТ (оказанных услуг) для event-мероприятия по российскому праву.

Включи:
- Реквизиты сторон
- Ссылку на основной договор
- Перечень выполненных работ/услуг
- Сроки выполнения
- Стоимость
- Подтверждение отсутствия претензий
- Подписи

Данные для подстановки: {details}"""
    },
}

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def get_session_user(session_id: str) -> dict | None:
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


def call_ai(messages: list, max_tokens: int = 2000) -> str:
    api_key = os.environ.get("AITUNNEL_API_KEY", "")
    if not api_key:
        raise ValueError("AITUNNEL_API_KEY не задан")
    client = OpenAI(api_key=api_key, base_url="https://api.aitunnel.ru/v1/")
    for model in ["gpt-5-nano", "gpt-4o-mini", "gpt-4o"]:
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
                max_tokens=max_tokens,
                timeout=25,
            )
            print(f"[lawyer] answered via {model}")
            return resp.choices[0].message.content.strip()
        except Exception as ex:
            print(f"[lawyer] {model} error: {ex}")
            continue
    raise RuntimeError("Все модели недоступны")


def handler(event: dict, context) -> dict:
    """ИИ-юрист GLOBAL LINK: анализ документов, составление договоров, юридические консультации."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "POST")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "ask")
    headers = event.get("headers") or {}
    session_id = headers.get("X-Session-Id") or headers.get("x-session-id", "")

    user = get_session_user(session_id)
    if not user:
        return err("Не авторизован", 401)

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            return err("Неверный JSON")

    print(f"[lawyer] action={action} user={user.get('email','?')}")

    # ── Вопрос / анализ документа ─────────────────────────────────────────
    if action == "ask":
        question = (body.get("question") or "").strip()
        doc_text = (body.get("docText") or "").strip()  # текст загруженного документа

        if not question and not doc_text:
            return err("Введите вопрос или загрузите документ")

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if doc_text:
            messages.append({"role": "user", "content": f"Проанализируй этот документ:\n\n{doc_text[:8000]}"})
            if question:
                messages.append({"role": "assistant", "content": "Документ получен, анализирую..."})
                messages.append({"role": "user", "content": question})
        else:
            messages.append({"role": "user", "content": question})

        try:
            answer = call_ai(messages, max_tokens=2000)
        except Exception as ex:
            return err(f"ИИ временно недоступен: {ex}", 503)

        return ok({"answer": answer})

    # ── Генерация договора ────────────────────────────────────────────────
    if action == "generate":
        template_id = body.get("templateId", "")
        details = body.get("details", "")

        if template_id not in TEMPLATES:
            return err(f"Неизвестный шаблон: {template_id}")

        tpl = TEMPLATES[template_id]
        prompt = tpl["prompt"].format(details=details or "используй стандартные placeholder-значения в квадратных скобках [ФИО], [адрес] и т.д.")

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        try:
            contract = call_ai(messages, max_tokens=3000)
        except Exception as ex:
            return err(f"ИИ временно недоступен: {ex}", 503)

        return ok({"contract": contract, "templateName": tpl["name"]})

    # ── Список шаблонов ────────────────────────────────────────────────────
    if action == "templates":
        return ok({"templates": [{"id": k, "name": v["name"]} for k, v in TEMPLATES.items()]})

    return err("Неизвестный action")

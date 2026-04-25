import os
import psycopg2
from decimal import Decimal

SCHEMA = "t_p17532248_concert_platform_mvp"

TAX_RATES = {
    "none": 0.0, "usn_6": 0.06, "usn_15": 0.15, "osn": 0.20, "npd": 0.06,
}
TAX_LABELS = {
    "none": "Без налога", "usn_6": "УСН 6% (доходы)",
    "usn_15": "УСН 15% (доходы − расходы)", "osn": "ОСН НДС 20%",
    "npd": "Самозанятый 6%",
}
DEFAULT_EXPENSE_CATEGORIES = [
    "Аренда площадки","Техническое обеспечение","Логистика","Реклама и PR",
    "Гонорар артиста","Гостиница","Питание","Безопасность","Полиграфия","Страхование","Прочее",
]


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


def calc_finance(ip, iF, ep, ef, tax_system):
    rate = TAX_RATES.get(tax_system, 0.0)
    ip, iF, ep, ef = float(ip), float(iF), float(ep), float(ef)
    if tax_system == "usn_15":
        tp, tf = max(0, (ip - ep) * rate), max(0, (iF - ef) * rate)
    else:
        tp, tf = ip * rate, iF * rate
    return {
        "incomePlan": round(ip, 2), "incomeFact": round(iF, 2),
        "expensesPlan": round(ep, 2), "expensesFact": round(ef, 2),
        "taxSystem": tax_system, "taxLabel": TAX_LABELS.get(tax_system, ""),
        "taxRate": rate, "taxPlan": round(tp, 2), "taxFact": round(tf, 2),
        "profitPlan": round(ip - ep - tp, 2), "profitFact": round(iF - ef - tf, 2),
    }


def row_to_project(row) -> dict:
    return {
        "id": str(row[0]), "userId": str(row[1]), "title": row[2], "artist": row[3],
        "projectType": row[4], "status": row[5],
        "dateStart": str(row[6]) if row[6] else None,
        "dateEnd": str(row[7]) if row[7] else None,
        "city": row[8], "venueName": row[9], "description": row[10], "taxSystem": row[11],
        "totalExpensesPlan": float(row[12]), "totalExpensesFact": float(row[13]),
        "totalIncomePlan": float(row[14]), "totalIncomeFact": float(row[15]),
        "createdAt": str(row[16]), "updatedAt": str(row[17]),
        "finance": calc_finance(row[14], row[15], row[12], row[13], row[11]),
    }


def recalc_totals(cur, project_id: str):
    cur.execute(
        f"""UPDATE {SCHEMA}.projects SET
            total_expenses_plan=COALESCE((SELECT SUM(amount_plan) FROM {SCHEMA}.project_expenses WHERE project_id=%s),0),
            total_expenses_fact=COALESCE((SELECT SUM(amount_fact) FROM {SCHEMA}.project_expenses WHERE project_id=%s),0),
            total_income_plan=COALESCE((SELECT SUM(ticket_count::numeric*ticket_price) FROM {SCHEMA}.project_income_lines WHERE project_id=%s),0),
            total_income_fact=COALESCE((SELECT SUM(sold_count::numeric*ticket_price) FROM {SCHEMA}.project_income_lines WHERE project_id=%s),0),
            updated_at=NOW() WHERE id=%s""",
        (project_id,)*5
    )

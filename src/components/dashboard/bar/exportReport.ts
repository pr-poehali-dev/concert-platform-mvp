import * as XLSX from "xlsx";

export type ReportType = "sales" | "stock" | "shifts";

// ── Нормализация сырых данных в плоские строки ────────────────────────────

function normalizeSales(report: Record<string, unknown>) {
  const r = report;
  const orders = (r.orders as Record<string, unknown>[])
    ?? ((r.sales as Record<string, unknown>)?.orders as Record<string, unknown>[])
    ?? [];
  const totalSum = (r.totalSum as number)
    ?? ((r.sales as Record<string, unknown>)?.totalSum as number)
    ?? 0;
  const count = (r.count as number)
    ?? ((r.sales as Record<string, unknown>)?.count as number)
    ?? orders.length;

  const rows = orders.map(o => ({
    "Стол / Чек":       String(o.table ?? o.id ?? ""),
    "Сумма (₽)":        Number(o.sum ?? 0),
    "Гостей":           String(o.guests ?? ""),
    "Закрыт":           String(o.closed ?? "").replace("T", " ").slice(0, 16),
  }));

  // Итоговая строка
  rows.push({
    "Стол / Чек":  "ИТОГО",
    "Сумма (₽)":   Number(totalSum),
    "Гостей":      "",
    "Закрыт":      `${count} чеков`,
  });

  return rows;
}

function normalizeStock(report: Record<string, unknown>) {
  const items = (report.items as Record<string, unknown>[])
    ?? ((report.stock as Record<string, unknown>)?.data as Record<string, unknown>[])
    ?? [];

  return items.map(i => ({
    "Наименование":  String(i.name ?? i.GoodsName ?? ""),
    "Категория":     String(i.category ?? i.Category ?? ""),
    "Остаток":       String(i.amount ?? i.Amount ?? ""),
    "Ед. изм.":      String(i.unit ?? i.MeasureUnit ?? ""),
    "Цена":          String(i.price ?? i.Price ?? ""),
  }));
}

function normalizeShifts(report: Record<string, unknown>) {
  const shifts = (report.shifts as Record<string, unknown>[])
    ?? (report.data as Record<string, unknown>[])
    ?? [];

  return shifts.map(s => ({
    "Смена №":     String(s.id ?? ""),
    "Кассир":      String(s.cashier ?? s.WaiterName ?? ""),
    "Открыта":     String(s.opened ?? "").replace("T", " ").slice(0, 16),
    "Закрыта":     String(s.closed ?? "").replace("T", " ").slice(0, 16),
    "Чеков":       String(s.checks ?? s.CheckCount ?? ""),
    "Сумма (₽)":   Number(s.sum ?? 0),
  }));
}

function getRows(type: ReportType, report: Record<string, unknown>) {
  if (type === "sales")  return normalizeSales(report);
  if (type === "stock")  return normalizeStock(report);
  if (type === "shifts") return normalizeShifts(report);
  return [];
}

const REPORT_TITLES: Record<ReportType, string> = {
  sales:  "Продажи",
  stock:  "Остатки",
  shifts: "Смены",
};

// ── CSV ───────────────────────────────────────────────────────────────────

export function exportCSV(
  type: ReportType,
  report: Record<string, unknown>,
  filename: string,
) {
  const rows = getRows(type, report);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(";"),
    ...rows.map(r => headers.map(h => {
      const v = String((r as Record<string, unknown>)[h] ?? "");
      return v.includes(";") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(";")),
  ];

  const bom = "\uFEFF"; // UTF-8 BOM для Excel
  const blob = new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Excel (XLSX) ──────────────────────────────────────────────────────────

export function exportExcel(
  type: ReportType,
  report: Record<string, unknown>,
  filename: string,
  meta: { integrationName: string; dateFrom: string; dateTo: string; eventName?: string },
) {
  const rows = getRows(type, report);
  if (rows.length === 0) return;

  const wb = XLSX.utils.book_new();

  // Лист с данными
  const ws = XLSX.utils.json_to_sheet(rows);

  // Стили ширины колонок
  const cols = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) }));
  ws["!cols"] = cols;

  XLSX.utils.book_append_sheet(wb, ws, REPORT_TITLES[type]);

  // Лист «Инфо»
  const infoData = [
    ["Отчёт",        REPORT_TITLES[type]],
    ["Система",      meta.integrationName],
    ["Период с",     meta.dateFrom],
    ["Период по",    meta.dateTo],
    ...(meta.eventName ? [["Мероприятие", meta.eventName]] : []),
    ["Дата выгрузки", new Date().toLocaleString("ru")],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
  wsInfo["!cols"] = [{ wch: 18 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Инфо");

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

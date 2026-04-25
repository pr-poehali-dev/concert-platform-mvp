import type { Project } from "@/hooks/useProjects";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

function fmtMoney(n: number) {
  return fmtNum(n) + " ₽";
}

function taxLabel(sys: string) {
  const m: Record<string, string> = {
    none: "Без налога", usn_6: "УСН 6%", usn_15: "УСН 15%", osn: "ОСН 20%", npd: "Самозанятый 6%",
  };
  return m[sys] || sys;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilename(s: string) {
  return s.replace(/[^a-zA-Zа-яА-Я0-9_\- ]/g, "").trim().slice(0, 50) || "project";
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function exportCSV(project: Project) {
  const rows: string[][] = [];
  const sep = ";";

  const row = (...cols: (string | number)[]) =>
    rows.push(cols.map(c => `"${String(c).replace(/"/g, '""')}"`));

  row("GLOBAL LINK — Финансовый отчёт по проекту");
  row("");
  row("Проект:", project.title);
  if (project.artist) row("Артист:", project.artist);
  row("Тип:", project.projectType === "single" ? "Одиночный концерт" : "Тур");
  if (project.dateStart) row("Дата начала:", project.dateStart);
  if (project.dateEnd) row("Дата окончания:", project.dateEnd);
  if (project.city) row("Город:", project.city);
  if (project.venueName) row("Площадка:", project.venueName);
  row("Налоговая система:", taxLabel(project.taxSystem));
  row("");

  // Расходы
  row("РАСХОДЫ");
  row("Категория", "Статья", "План (₽)", "Факт (₽)", "Отклонение (₽)");
  for (const e of project.expenses || []) {
    row(e.category, e.title, e.amountPlan, e.amountFact, e.amountFact - e.amountPlan);
  }
  const f = project.finance;
  row("", "ИТОГО РАСХОДЫ", f.expensesPlan, f.expensesFact, f.expensesFact - f.expensesPlan);
  row("");

  // Доходы
  row("ДОХОДЫ (БИЛЕТЫ)");
  row("Категория", "Кол-во план (шт)", "Цена (₽)", "Продано факт (шт)", "Вал план (₽)", "Вал факт (₽)");
  for (const i of project.incomeLines || []) {
    row(i.category, i.ticketCount, i.ticketPrice, i.soldCount, i.totalPlan, i.totalFact);
  }
  row("", "", "", "ИТОГО ДОХОДЫ", f.incomePlan, f.incomeFact);
  row("");

  // P&L
  row("P&L (ИТОГ)");
  row("Показатель", "План (₽)", "Факт (₽)");
  row("Выручка", f.incomePlan, f.incomeFact);
  row("Расходы", -f.expensesPlan, -f.expensesFact);
  if (f.taxPlan > 0 || f.taxFact > 0) {
    row(`Налог (${taxLabel(project.taxSystem)})`, -f.taxPlan, -f.taxFact);
  }
  row("Чистая прибыль", f.profitPlan, f.profitFact);
  if (f.incomePlan > 0) {
    row("Маржинальность, %",
      Math.round(f.profitPlan / f.incomePlan * 1000) / 10,
      f.incomeFact > 0 ? Math.round(f.profitFact / f.incomeFact * 1000) / 10 : 0
    );
  }

  const csv = rows.map(r => r.join(sep)).join("\r\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${safeFilename(project.title)}_PnL.csv`);
}

// ─── Excel (XML Spreadsheet) ─────────────────────────────────────────────────

export function exportExcel(project: Project) {
  const f = project.finance;

  const xmlRows: string[] = [];

  const addRow = (cells: { v: string | number; bold?: boolean; color?: string; bg?: string; num?: boolean }[]) => {
    const cellsXml = cells.map(c => {
      const type = typeof c.v === "number" ? "Number" : "String";
      const styles: string[] = [];
      if (c.bold) styles.push("font-weight:bold");
      if (c.color) styles.push(`color:${c.color}`);
      if (c.bg) styles.push(`background:${c.bg}`);
      const style = styles.length ? ` style="${styles.join(";")}"` : "";
      return `<Cell${style}><Data ss:Type="${type}">${String(c.v).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Data></Cell>`;
    }).join("");
    xmlRows.push(`<Row>${cellsXml}</Row>`);
  };

  const empty = () => xmlRows.push("<Row/>");
  const header = (text: string) => addRow([{ v: text, bold: true, bg: "#1a1a2e", color: "#a855f7" }]);

  // Шапка
  addRow([{ v: "GLOBAL LINK — Финансовый отчёт", bold: true }]);
  addRow([{ v: `Проект: ${project.title}`, bold: true }]);
  if (project.artist) addRow([{ v: `Артист: ${project.artist}` }]);
  addRow([{ v: `Тип: ${project.projectType === "single" ? "Одиночный концерт" : "Тур"}` }]);
  if (project.dateStart) addRow([{ v: `Период: ${project.dateStart}${project.dateEnd ? " — " + project.dateEnd : ""}` }]);
  if (project.city) addRow([{ v: `Город: ${project.city}${project.venueName ? " / " + project.venueName : ""}` }]);
  addRow([{ v: `Налоговая система: ${taxLabel(project.taxSystem)}` }]);
  empty();

  // Расходы
  header("РАСХОДЫ");
  addRow([
    { v: "Категория", bold: true }, { v: "Статья расхода", bold: true },
    { v: "План (₽)", bold: true }, { v: "Факт (₽)", bold: true }, { v: "Отклонение (₽)", bold: true },
  ]);
  for (const e of project.expenses || []) {
    const delta = e.amountFact - e.amountPlan;
    addRow([
      { v: e.category }, { v: e.title },
      { v: e.amountPlan, num: true }, { v: e.amountFact, num: true },
      { v: delta, num: true, color: delta > 0 ? "#f43f5e" : delta < 0 ? "#22c55e" : "#666" },
    ]);
  }
  addRow([
    { v: "", bold: true }, { v: "ИТОГО РАСХОДЫ", bold: true },
    { v: f.expensesPlan, bold: true, color: "#f43f5e" },
    { v: f.expensesFact, bold: true, color: "#22c55e" },
    { v: f.expensesFact - f.expensesPlan, bold: true },
  ]);
  empty();

  // Доходы
  header("ДОХОДЫ (БИЛЕТЫ)");
  addRow([
    { v: "Категория", bold: true }, { v: "Кол-во план (шт)", bold: true },
    { v: "Цена (₽)", bold: true }, { v: "Продано факт (шт)", bold: true },
    { v: "Вал план (₽)", bold: true }, { v: "Вал факт (₽)", bold: true },
  ]);
  for (const i of project.incomeLines || []) {
    addRow([
      { v: i.category }, { v: i.ticketCount, num: true },
      { v: i.ticketPrice, num: true }, { v: i.soldCount, num: true },
      { v: i.totalPlan, num: true, color: "#22c55e" },
      { v: i.totalFact, num: true, color: "#22c55e" },
    ]);
  }
  addRow([
    { v: "", bold: true }, { v: "" }, { v: "" }, { v: "ИТОГО ДОХОДЫ", bold: true },
    { v: f.incomePlan, bold: true, color: "#22c55e" },
    { v: f.incomeFact, bold: true, color: "#22c55e" },
  ]);
  empty();

  // P&L
  header("P&L — ФИНАНСОВЫЙ РЕЗУЛЬТАТ");
  addRow([{ v: "Показатель", bold: true }, { v: "План (₽)", bold: true }, { v: "Факт (₽)", bold: true }]);
  addRow([{ v: "Выручка" }, { v: f.incomePlan, num: true, color: "#22c55e" }, { v: f.incomeFact, num: true, color: "#22c55e" }]);
  addRow([{ v: "Расходы" }, { v: -f.expensesPlan, num: true, color: "#f43f5e" }, { v: -f.expensesFact, num: true, color: "#f43f5e" }]);
  if (f.taxPlan > 0 || f.taxFact > 0) {
    addRow([{ v: `Налог (${taxLabel(project.taxSystem)})` }, { v: -f.taxPlan, num: true }, { v: -f.taxFact, num: true }]);
  }
  addRow([
    { v: "Чистая прибыль", bold: true },
    { v: f.profitPlan, bold: true, num: true, color: f.profitPlan >= 0 ? "#22c55e" : "#f43f5e" },
    { v: f.profitFact, bold: true, num: true, color: f.profitFact >= 0 ? "#22c55e" : "#f43f5e" },
  ]);
  if (f.incomePlan > 0) {
    addRow([
      { v: "Маржинальность %" },
      { v: Math.round(f.profitPlan / f.incomePlan * 1000) / 10 },
      { v: f.incomeFact > 0 ? Math.round(f.profitFact / f.incomeFact * 1000) / 10 : 0 },
    ]);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="P&amp;L">
    <Table>
      ${xmlRows.join("\n      ")}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  triggerDownload(blob, `${safeFilename(project.title)}_PnL.xls`);
}

// ─── PDF (print window) ───────────────────────────────────────────────────────

export function exportPDF(project: Project) {
  const f = project.finance;

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 24px; }
    h1 { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .meta { color: #555; font-size: 10px; margin-bottom: 16px; }
    .section-title { font-size: 13px; font-weight: 700; background: #f0f0ff; color: #4f46e5; padding: 6px 10px; margin: 14px 0 6px; border-left: 3px solid #4f46e5; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #f5f5ff; color: #333; text-align: left; padding: 5px 8px; font-size: 10px; border-bottom: 1px solid #ddd; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
    .num { text-align: right; }
    .bold { font-weight: 700; }
    .green { color: #16a34a; }
    .red { color: #dc2626; }
    .cyan { color: #0891b2; }
    .total-row { background: #f9f9ff; font-weight: 700; }
    .pl-box { border: 2px solid #e0e0ff; border-radius: 6px; padding: 12px 16px; margin-top: 8px; }
    .pl-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
    .pl-row:last-child { border-bottom: none; }
    .pl-profit { font-size: 16px; font-weight: 700; margin-top: 8px; padding-top: 8px; border-top: 2px solid #4f46e5; }
    .footer { margin-top: 20px; font-size: 9px; color: #aaa; text-align: center; }
    @media print { body { padding: 12px; } }
  `;

  const expRows = (project.expenses || []).map(e => {
    const delta = e.amountFact - e.amountPlan;
    return `<tr>
      <td>${e.category}</td><td>${e.title}</td>
      <td class="num">${fmtMoney(e.amountPlan)}</td>
      <td class="num">${fmtMoney(e.amountFact)}</td>
      <td class="num ${delta > 0 ? "red" : delta < 0 ? "green" : ""}">${delta !== 0 ? (delta > 0 ? "+" : "") + fmtMoney(delta) : "—"}</td>
    </tr>`;
  }).join("");

  const incRows = (project.incomeLines || []).map(i => `<tr>
    <td>${i.category}</td>
    <td class="num">${fmtNum(i.ticketCount)} шт</td>
    <td class="num">${fmtMoney(i.ticketPrice)}</td>
    <td class="num">${fmtNum(i.soldCount)} шт</td>
    <td class="num green">${fmtMoney(i.totalPlan)}</td>
    <td class="num green">${fmtMoney(i.totalFact)}</td>
  </tr>`).join("");

  const margin = f.incomePlan > 0 ? `Маржинальность: <b>${(f.profitPlan / f.incomePlan * 100).toFixed(1)}%</b> (план)${f.incomeFact > 0 ? ` · <b>${(f.profitFact / f.incomeFact * 100).toFixed(1)}%</b> (факт)` : ""}` : "";

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>P&L — ${project.title}</title><style>${css}</style></head>
<body>
  <h1>GLOBAL LINK — Финансовый отчёт</h1>
  <div class="meta">
    Проект: <b>${project.title}</b>${project.artist ? ` · Артист: <b>${project.artist}</b>` : ""}
    ${project.dateStart ? ` · Период: <b>${project.dateStart}${project.dateEnd ? " — " + project.dateEnd : ""}</b>` : ""}
    ${project.city ? ` · Город: <b>${project.city}</b>` : ""}${project.venueName ? ` / ${project.venueName}` : ""}
    · Налог: <b>${taxLabel(project.taxSystem)}</b>
  </div>

  <div class="section-title">РАСХОДЫ</div>
  <table>
    <thead><tr><th>Категория</th><th>Статья</th><th class="num">План</th><th class="num">Факт</th><th class="num">Отклонение</th></tr></thead>
    <tbody>
      ${expRows}
      <tr class="total-row">
        <td colspan="2" class="bold">ИТОГО РАСХОДЫ</td>
        <td class="num red bold">${fmtMoney(f.expensesPlan)}</td>
        <td class="num red bold">${fmtMoney(f.expensesFact)}</td>
        <td class="num ${f.expensesFact - f.expensesPlan > 0 ? "red" : "green"} bold">${fmtMoney(f.expensesFact - f.expensesPlan)}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">ДОХОДЫ (БИЛЕТЫ)</div>
  <table>
    <thead><tr><th>Категория</th><th class="num">Кол-во план</th><th class="num">Цена</th><th class="num">Продано</th><th class="num">Вал план</th><th class="num">Вал факт</th></tr></thead>
    <tbody>
      ${incRows}
      <tr class="total-row">
        <td colspan="3" class="bold">ИТОГО ДОХОДЫ</td>
        <td class="num bold">${fmtNum((project.incomeLines || []).reduce((s, i) => s + i.soldCount, 0))} шт</td>
        <td class="num green bold">${fmtMoney(f.incomePlan)}</td>
        <td class="num green bold">${fmtMoney(f.incomeFact)}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">P&L — ФИНАНСОВЫЙ РЕЗУЛЬТАТ</div>
  <div class="pl-box">
    <div class="pl-row"><span>Выручка</span><span><b class="green">${fmtMoney(f.incomePlan)}</b> план · <span class="green">${fmtMoney(f.incomeFact)}</span> факт</span></div>
    <div class="pl-row"><span>Расходы</span><span><b class="red">−${fmtMoney(f.expensesPlan)}</b> план · <span class="red">−${fmtMoney(f.expensesFact)}</span> факт</span></div>
    ${f.taxPlan > 0 || f.taxFact > 0 ? `<div class="pl-row"><span>Налог (${taxLabel(project.taxSystem)})</span><span class="cyan">−${fmtMoney(f.taxPlan)} план · −${fmtMoney(f.taxFact)} факт</span></div>` : ""}
    <div class="pl-row pl-profit">
      <span>Чистая прибыль</span>
      <span class="${f.profitPlan >= 0 ? "green" : "red"}">${f.profitPlan >= 0 ? "+" : ""}${fmtMoney(f.profitPlan)} план · ${f.profitFact >= 0 ? "+" : ""}${fmtMoney(f.profitFact)} факт</span>
    </div>
    ${margin ? `<div style="font-size:10px;color:#777;margin-top:6px">${margin}</div>` : ""}
  </div>

  <div class="footer">Сформировано в GLOBAL LINK · ${new Date().toLocaleDateString("ru")} ${new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}</div>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) { alert("Разрешите всплывающие окна для этого сайта"); return; }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}

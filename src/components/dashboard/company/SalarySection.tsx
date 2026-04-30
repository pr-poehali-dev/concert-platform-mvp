import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { EMPLOYEES_URL, ROLE_LABELS } from "@/components/dashboard/profile/types";
import * as XLSX from "xlsx";

interface SalaryRow {
  employeeId: string;
  name: string;
  roleInCompany: string;
  avatar: string;
  avatarColor: string;
  recordId: string | null;
  baseSalary: number;
  bonus: number;
  deduction: number;
  note: string;
  status: "pending" | "paid";
  paidAt: string | null;
  period: string;
  displayId: string;
}

interface HistoryRow {
  id: string;
  period: string;
  baseSalary: number;
  bonus: number;
  deduction: number;
  note: string;
  status: "pending" | "paid";
  paidAt: string | null;
}

function periodLabel(p: string) {
  const [y, m] = p.split("-");
  const months = ["Январь","Февраль","Март","Апрель","Май","Июнь",
                  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function prevPeriod(p: string) {
  const [y, m] = p.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

function nextPeriod(p: string) {
  const [y, m] = p.split("-").map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

// ── Строка редактирования одного сотрудника ───────────────────────────────
interface RowProps {
  row: SalaryRow;
  companyId: string;
  period: string;
  selected: boolean;
  onToggleSelect: () => void;
  onSaved: () => void;
}

function SalaryRow({ row, companyId, period, selected, onToggleSelect, onSaved }: RowProps) {
  const [base,      setBase]      = useState(String(row.baseSalary || ""));
  const [bonus,     setBonus]     = useState(String(row.bonus || ""));
  const [deduction, setDeduction] = useState(String(row.deduction || ""));
  const [note,      setNote]      = useState(row.note || "");
  const [saving,    setSaving]    = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history,   setHistory]   = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dirty,     setDirty]     = useState(false);

  // Обновляем когда данные пришли с сервера
  useEffect(() => {
    setBase(String(row.baseSalary || ""));
    setBonus(String(row.bonus || ""));
    setDeduction(String(row.deduction || ""));
    setNote(row.note || "");
    setDirty(false);
  }, [row.baseSalary, row.bonus, row.deduction, row.note, row.recordId]);

  const total = (parseFloat(base) || 0) + (parseFloat(bonus) || 0) - (parseFloat(deduction) || 0);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${EMPLOYEES_URL}?action=salary_save`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyUserId: companyId,
          employeeId:    row.employeeId,
          period,
          baseSalary:    parseFloat(base) || 0,
          bonus:         parseFloat(bonus) || 0,
          deduction:     parseFloat(deduction) || 0,
          note,
        }),
      });
      setDirty(false);
      onSaved();
    } finally { setSaving(false); }
  };

  const loadHistory = async () => {
    if (showHistory) { setShowHistory(false); return; }
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`${EMPLOYEES_URL}?action=salary_history&employee_id=${row.employeeId}&company_user_id=${companyId}`);
      const data = await res.json();
      setHistory(data.history || []);
    } finally { setLoadingHistory(false); }
  };

  const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-sm text-right outline-none focus:border-neon-purple/50 transition-colors";

  return (
    <>
      <div className={`grid grid-cols-[auto_1fr_repeat(4,minmax(90px,1fr))_auto_auto] gap-2 items-center px-4 py-3 border-b border-white/5 hover:bg-white/2 transition-colors ${row.status === "paid" ? "opacity-70" : ""}`}>
        {/* Чекбокс */}
        {row.recordId ? (
          <div
            onClick={onToggleSelect}
            className={`w-4 h-4 rounded border cursor-pointer flex items-center justify-center transition-all shrink-0 ${selected ? "bg-neon-purple border-neon-purple" : "border-white/25 hover:border-white/50"}`}
          >
            {selected && <Icon name="Check" size={10} className="text-white" />}
          </div>
        ) : (
          <div className="w-4 h-4 shrink-0" />
        )}

        {/* Сотрудник */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${row.avatarColor} flex items-center justify-center font-bold text-white text-xs shrink-0`}>
            {row.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{row.name}</p>
            <p className="text-white/40 text-[10px] truncate">
              {ROLE_LABELS[row.roleInCompany] || row.roleInCompany}
              {row.displayId && <span className="ml-1.5 font-mono text-white/20">{row.displayId}</span>}
            </p>
          </div>
        </div>

        {/* Оклад */}
        <input
          type="number" min="0" placeholder="0"
          value={base}
          onChange={e => { setBase(e.target.value); setDirty(true); }}
          className={inp}
          disabled={row.status === "paid"}
        />

        {/* Премия */}
        <input
          type="number" min="0" placeholder="0"
          value={bonus}
          onChange={e => { setBonus(e.target.value); setDirty(true); }}
          className={`${inp} focus:border-neon-green/50`}
          disabled={row.status === "paid"}
        />

        {/* Удержание */}
        <input
          type="number" min="0" placeholder="0"
          value={deduction}
          onChange={e => { setDeduction(e.target.value); setDirty(true); }}
          className={`${inp} focus:border-neon-pink/50`}
          disabled={row.status === "paid"}
        />

        {/* Итого */}
        <div className="text-right">
          <span className={`text-sm font-bold ${total > 0 ? "text-neon-green" : "text-white/50"}`}>
            {total.toLocaleString("ru")} ₽
          </span>
          {row.status === "paid" && (
            <p className="text-neon-green/60 text-[10px]">выплачено</p>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={loadHistory}
            title="История"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
          >
            <Icon name="History" size={13} />
          </button>
          {dirty && row.status !== "paid" && (
            <button
              onClick={save}
              disabled={saving}
              title="Сохранить"
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 transition-colors disabled:opacity-50"
            >
              {saving ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Check" size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Заметка */}
      {dirty && row.status !== "paid" && (
        <div className="px-4 pb-2 bg-white/1">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Заметка (необязательно)"
            className="w-full bg-transparent border-b border-white/10 focus:border-neon-purple/40 outline-none text-white/60 text-xs py-1 placeholder:text-white/20 transition-colors"
          />
        </div>
      )}

      {/* История */}
      {showHistory && (
        <div className="px-4 py-3 bg-black/20 border-b border-white/5">
          {loadingHistory ? (
            <div className="flex justify-center py-2">
              <Icon name="Loader2" size={16} className="animate-spin text-white/30" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-2">Нет истории выплат</p>
          ) : (
            <div className="space-y-1">
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between text-xs">
                  <span className="text-white/50">{periodLabel(h.period)}</span>
                  <span className={`font-medium ${h.status === "paid" ? "text-neon-green" : "text-white/60"}`}>
                    {((h.baseSalary + h.bonus - h.deduction)).toLocaleString("ru")} ₽
                    {h.status === "paid" && <span className="text-neon-green/50 ml-1">✓</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────
interface Props { companyId: string }

export default function SalarySection({ companyId }: Props) {
  const [period,    setPeriod]    = useState(currentPeriod);
  const [rows,      setRows]      = useState<SalaryRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [markingPaid, setMarkingPaid] = useState(false);
  const [msg,       setMsg]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const res = await fetch(`${EMPLOYEES_URL}?action=salary_list&company_user_id=${companyId}&period=${period}`);
      const data = await res.json();
      setRows(data.salaries || []);
    } finally { setLoading(false); }
  }, [companyId, period]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });

  const selectAll = () => {
    const unpaid = rows.filter(r => r.recordId && r.status === "pending").map(r => r.recordId!);
    setSelected(prev => prev.size === unpaid.length ? new Set() : new Set(unpaid));
  };

  const exportExcel = () => {
    if (rows.length === 0) return;
    const data = rows.map(r => ({
      "ID":                r.displayId || "",
      "Сотрудник":         r.name,
      "Должность":         ROLE_LABELS[r.roleInCompany] || r.roleInCompany,
      "Оклад (₽)":         r.baseSalary,
      "Премия (₽)":        r.bonus,
      "Вычет (₽)":         r.deduction,
      "Итого (₽)":         r.baseSalary + r.bonus - r.deduction,
      "Статус":            r.status === "paid" ? "Выплачено" : "К выплате",
      "Дата выплаты":      r.paidAt ? new Date(r.paidAt).toLocaleDateString("ru") : "",
      "Заметка":           r.note,
    }));

    // Итоговая строка
    const total = rows.reduce((s, r) => s + r.baseSalary + r.bonus - r.deduction, 0);
    data.push({
      "ID": "", "Сотрудник": `ИТОГО (${rows.length} чел.)`,
      "Должность": "", "Оклад (₽)": rows.reduce((s, r) => s + r.baseSalary, 0),
      "Премия (₽)": rows.reduce((s, r) => s + r.bonus, 0),
      "Вычет (₽)": rows.reduce((s, r) => s + r.deduction, 0),
      "Итого (₽)": total, "Статус": "", "Дата выплаты": "", "Заметка": "",
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [6, 22, 16, 12, 12, 12, 12, 14, 14, 20].map(wch => ({ wch }));

    // Лист «Инфо»
    const info = XLSX.utils.aoa_to_sheet([
      ["Ведомость зарплат"],
      ["Период:", periodLabel(period)],
      ["Дата выгрузки:", new Date().toLocaleString("ru")],
      ["Фонд оплаты труда:", `${total.toLocaleString("ru")} ₽`],
    ]);
    info["!cols"] = [{ wch: 22 }, { wch: 24 }];

    XLSX.utils.book_append_sheet(wb, ws, "Ведомость");
    XLSX.utils.book_append_sheet(wb, info, "Инфо");
    XLSX.writeFile(wb, `Зарплаты_${period}.xlsx`);
  };

  const exportCSV = () => {
    if (rows.length === 0) return;
    const headers = ["ID", "Сотрудник", "Должность", "Оклад", "Премия", "Вычет", "Итого", "Статус"];
    const lines = [
      headers.join(";"),
      ...rows.map(r => [
        r.displayId || "",
        r.name,
        ROLE_LABELS[r.roleInCompany] || r.roleInCompany,
        r.baseSalary,
        r.bonus,
        r.deduction,
        r.baseSalary + r.bonus - r.deduction,
        r.status === "paid" ? "Выплачено" : "К выплате",
      ].join(";")),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Зарплаты_${period}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const markPaid = async (status: "paid" | "pending") => {
    if (selected.size === 0) return;
    setMarkingPaid(true);
    try {
      await fetch(`${EMPLOYEES_URL}?action=salary_mark_paid`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), status }),
      });
      setMsg(status === "paid" ? `Отмечено выплаченным: ${selected.size} чел.` : "Статус сброшен");
      setSelected(new Set());
      load();
    } finally { setMarkingPaid(false); }
  };

  // Итоги
  const totals = rows.reduce((acc, r) => ({
    base:      acc.base + r.baseSalary,
    bonus:     acc.bonus + r.bonus,
    deduction: acc.deduction + r.deduction,
    total:     acc.total + r.baseSalary + r.bonus - r.deduction,
    paid:      acc.paid + (r.status === "paid" ? r.baseSalary + r.bonus - r.deduction : 0),
    pending:   acc.pending + (r.status === "pending" ? r.baseSalary + r.bonus - r.deduction : 0),
  }), { base: 0, bonus: 0, deduction: 0, total: 0, paid: 0, pending: 0 });

  return (
    <div className="flex flex-col gap-4 animate-fade-in">

      {/* Шапка с периодом */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-oswald font-bold text-white text-xl">Зарплаты</h3>
          <p className="text-white/45 text-xs mt-0.5">Управляй начислениями сотрудников по периодам</p>
        </div>

        {/* Переключатель периода + экспорт */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 glass rounded-xl border border-white/10 px-1 py-1">
            <button onClick={() => setPeriod(p => prevPeriod(p))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/45 hover:text-white hover:bg-white/8 transition-all">
              <Icon name="ChevronLeft" size={14} />
            </button>
            <span className="text-white text-sm font-semibold px-3 min-w-[130px] text-center">
              {periodLabel(period)}
            </span>
            <button
              onClick={() => setPeriod(p => nextPeriod(p))}
              disabled={period >= currentPeriod()}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/45 hover:text-white hover:bg-white/8 disabled:opacity-30 transition-all">
              <Icon name="ChevronRight" size={14} />
            </button>
          </div>
          {rows.length > 0 && !loading && (
            <div className="flex items-center gap-1.5">
              <button onClick={exportCSV}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-neon-cyan/80 hover:text-neon-cyan border border-neon-cyan/20 hover:border-neon-cyan/40 hover:bg-neon-cyan/5 transition-all"
                title="Скачать CSV">
                <Icon name="FileText" size={12} /> CSV
              </button>
              <button onClick={exportExcel}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-neon-green/80 hover:text-neon-green border border-neon-green/20 hover:border-neon-green/40 hover:bg-neon-green/5 transition-all"
                title="Скачать Excel">
                <Icon name="FileSpreadsheet" size={12} /> Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI карточки */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Фонд оплаты",  value: totals.total,   icon: "Wallet",     color: "text-neon-purple" },
            { label: "Оклады",        value: totals.base,    icon: "Banknote",   color: "text-white/65"    },
            { label: "Выплачено",     value: totals.paid,    icon: "CheckCircle",color: "text-neon-green"  },
            { label: "К выплате",     value: totals.pending, icon: "Clock",      color: "text-neon-cyan"   },
          ].map(c => (
            <div key={c.label} className="glass rounded-xl border border-white/10 px-4 py-3 flex items-center gap-3">
              <Icon name={c.icon as never} size={18} className={`${c.color} shrink-0`} />
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-wide">{c.label}</p>
                <p className="text-white font-bold text-base">{c.value.toLocaleString("ru")} ₽</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Уведомление */}
      {msg && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neon-green/10 border border-neon-green/25 text-neon-green text-xs">
          <Icon name="CheckCircle" size={13} className="shrink-0" />
          {msg}
          <button onClick={() => setMsg(null)} className="ml-auto text-neon-green/50 hover:text-neon-green">
            <Icon name="X" size={12} />
          </button>
        </div>
      )}

      {/* Таблица */}
      <div className="glass rounded-2xl border border-white/10 overflow-hidden">

        {/* Шапка таблицы */}
        <div className="grid grid-cols-[auto_1fr_repeat(4,minmax(90px,1fr))_auto_auto] gap-2 items-center px-4 py-2.5 border-b border-white/10 bg-white/3">
          <div className="w-4 h-4 shrink-0" />
          <p className="text-white/40 text-[11px] uppercase tracking-wider font-bold">Сотрудник</p>
          <p className="text-white/40 text-[11px] uppercase tracking-wider font-bold text-right">Оклад ₽</p>
          <p className="text-neon-green/60 text-[11px] uppercase tracking-wider font-bold text-right">Премия ₽</p>
          <p className="text-neon-pink/60 text-[11px] uppercase tracking-wider font-bold text-right">Вычет ₽</p>
          <p className="text-white/40 text-[11px] uppercase tracking-wider font-bold text-right">Итого ₽</p>
          <div className="w-16" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Icon name="Loader2" size={24} className="animate-spin text-white/25" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center px-6">
            <Icon name="Users" size={32} className="text-white/15" />
            <p className="text-white/40 text-sm">Нет активных сотрудников</p>
            <p className="text-white/25 text-xs">Добавь сотрудников в разделе «Сотрудники»</p>
          </div>
        ) : (
          rows.map(r => (
            <SalaryRow
              key={r.employeeId}
              row={r}
              companyId={companyId}
              period={period}
              selected={r.recordId ? selected.has(r.recordId) : false}
              onToggleSelect={() => r.recordId && toggleSelect(r.recordId)}
              onSaved={load}
            />
          ))
        )}

        {/* Итоговая строка */}
        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-[auto_1fr_repeat(4,minmax(90px,1fr))_auto_auto] gap-2 items-center px-4 py-3 border-t border-white/10 bg-white/3">
            <div className="w-4" />
            <p className="text-white/55 text-xs font-semibold">ИТОГО ({rows.length} чел.)</p>
            <p className="text-white/65 text-sm font-bold text-right">{totals.base.toLocaleString("ru")}</p>
            <p className="text-neon-green/80 text-sm font-bold text-right">{totals.bonus.toLocaleString("ru")}</p>
            <p className="text-neon-pink/80 text-sm font-bold text-right">{totals.deduction.toLocaleString("ru")}</p>
            <p className="text-neon-purple text-sm font-bold text-right">{totals.total.toLocaleString("ru")}</p>
            <div className="w-16" />
          </div>
        )}
      </div>

      {/* Панель массовых действий */}
      {rows.some(r => r.recordId) && !loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-xs text-white/45 hover:text-white transition-colors"
          >
            <Icon name="CheckSquare" size={13} />
            {selected.size > 0 ? `Снять выделение (${selected.size})` : "Выбрать всех к выплате"}
          </button>

          {selected.size > 0 && (
            <>
              <div className="h-3 w-px bg-white/15" />
              <button
                onClick={() => markPaid("paid")}
                disabled={markingPaid}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-neon-green/15 text-neon-green border border-neon-green/25 hover:bg-neon-green/25 disabled:opacity-50 transition-all"
              >
                {markingPaid ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="CheckCircle" size={12} />}
                Отметить выплаченным ({selected.size})
              </button>
              <button
                onClick={() => markPaid("pending")}
                disabled={markingPaid}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/55 border border-white/10 hover:text-white disabled:opacity-50 transition-all"
              >
                <Icon name="RotateCcw" size={12} />
                Сбросить
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
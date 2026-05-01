import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { EMPLOYEES_URL, ROLE_LABELS } from "@/components/dashboard/profile/types";
import * as XLSX from "xlsx";
import {
  type SalaryRow,
  periodLabel, currentPeriod, prevPeriod, nextPeriod,
} from "./salaryUtils";
import SalaryTable from "./SalaryTable";

interface Props { companyId: string }

export default function SalarySection({ companyId }: Props) {
  const [period,      setPeriod]      = useState(currentPeriod);
  const [rows,        setRows]        = useState<SalaryRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [markingPaid, setMarkingPaid] = useState(false);
  const [msg,         setMsg]         = useState<string | null>(null);

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
      "ID":            r.displayId || "",
      "Сотрудник":     r.name,
      "Должность":     ROLE_LABELS[r.roleInCompany] || r.roleInCompany,
      "Оклад (₽)":     r.baseSalary,
      "Премия (₽)":    r.bonus,
      "Вычет (₽)":     r.deduction,
      "Итого (₽)":     r.baseSalary + r.bonus - r.deduction,
      "Статус":        r.status === "paid" ? "Выплачено" : "К выплате",
      "Дата выплаты":  r.paidAt ? new Date(r.paidAt).toLocaleDateString("ru") : "",
      "Заметка":       r.note,
    }));

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
            { label: "Фонд оплаты",  value: totals.total,   icon: "Wallet",      color: "text-neon-purple" },
            { label: "Оклады",        value: totals.base,    icon: "Banknote",    color: "text-white/65"    },
            { label: "Выплачено",     value: totals.paid,    icon: "CheckCircle", color: "text-neon-green"  },
            { label: "К выплате",     value: totals.pending, icon: "Clock",       color: "text-neon-cyan"   },
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
      <SalaryTable
        rows={rows}
        loading={loading}
        companyId={companyId}
        period={period}
        selected={selected}
        totals={totals}
        onToggleSelect={toggleSelect}
        onSaved={load}
      />

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

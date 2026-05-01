import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { EMPLOYEES_URL, ROLE_LABELS } from "@/components/dashboard/profile/types";
import { type SalaryRow, type HistoryRow, periodLabel } from "./salaryUtils";

interface Props {
  row: SalaryRow;
  companyId: string;
  period: string;
  selected: boolean;
  onToggleSelect: () => void;
  onSaved: () => void;
}

export default function SalaryTableRow({ row, companyId, period, selected, onToggleSelect, onSaved }: Props) {
  const [base,           setBase]           = useState(String(row.baseSalary || ""));
  const [bonus,          setBonus]          = useState(String(row.bonus || ""));
  const [deduction,      setDeduction]      = useState(String(row.deduction || ""));
  const [note,           setNote]           = useState(row.note || "");
  const [saving,         setSaving]         = useState(false);
  const [showHistory,    setShowHistory]    = useState(false);
  const [history,        setHistory]        = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dirty,          setDirty]          = useState(false);

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

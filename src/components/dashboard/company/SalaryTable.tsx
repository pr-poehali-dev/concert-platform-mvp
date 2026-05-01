import Icon from "@/components/ui/icon";
import { type SalaryRow } from "./salaryUtils";
import SalaryTableRow from "./SalaryTableRow";

interface Totals {
  base: number;
  bonus: number;
  deduction: number;
  total: number;
  paid: number;
  pending: number;
}

interface Props {
  rows: SalaryRow[];
  loading: boolean;
  companyId: string;
  period: string;
  selected: Set<string>;
  totals: Totals;
  onToggleSelect: (id: string) => void;
  onSaved: () => void;
}

export default function SalaryTable({
  rows, loading, companyId, period, selected, totals,
  onToggleSelect, onSaved,
}: Props) {
  return (
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
          <SalaryTableRow
            key={r.employeeId}
            row={r}
            companyId={companyId}
            period={period}
            selected={r.recordId ? selected.has(r.recordId) : false}
            onToggleSelect={() => r.recordId && onToggleSelect(r.recordId)}
            onSaved={onSaved}
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
  );
}

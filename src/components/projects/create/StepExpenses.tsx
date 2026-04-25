import Icon from "@/components/ui/icon";
import { EXPENSE_CATEGORIES } from "@/hooks/useProjects";
import type { ExpenseLine } from "./types";

interface Props {
  expenses: ExpenseLine[];
  totalExpPlan: number;
  onSet: (id: string, k: string, v: unknown) => void;
  onAdd: () => void;
  onDel: (id: string) => void;
}

export default function StepExpenses({ expenses, totalExpPlan, onSet, onAdd, onDel }: Props) {
  return (
    <div className="space-y-3 animate-fade-in">
      <p className="text-white/50 text-sm">Укажите плановые расходы по статьям. Фактические суммы сможете внести позже.</p>
      <div className="space-y-2">
        {expenses.map(exp => (
          <div key={exp.id} className="glass rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <select value={exp.category} onChange={e => onSet(exp.id, "category", e.target.value)}
                className="glass rounded-lg px-3 py-2 text-white/70 outline-none border border-white/10 text-xs appearance-none bg-transparent w-40 shrink-0">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
              </select>
              <input value={exp.title} onChange={e => onSet(exp.id, "title", e.target.value)}
                placeholder="Название статьи расхода"
                className="flex-1 glass rounded-lg px-3 py-2 text-white placeholder:text-white/25 outline-none border border-white/10 text-sm" />
              <button onClick={() => onDel(exp.id)} className="text-white/20 hover:text-neon-pink transition-colors shrink-0"><Icon name="X" size={15} /></button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-white/30 mb-0.5 block">План (₽)</label>
                <input type="number" value={exp.amountPlan || ""} onChange={e => onSet(exp.id, "amountPlan", e.target.value)}
                  placeholder="0" className="w-full glass rounded-lg px-3 py-2 text-neon-cyan placeholder:text-white/20 outline-none border border-white/10 text-sm" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-white/30 mb-0.5 block">Факт (₽)</label>
                <input type="number" value={exp.amountFact || ""} onChange={e => onSet(exp.id, "amountFact", e.target.value)}
                  placeholder="0" className="w-full glass rounded-lg px-3 py-2 text-neon-green placeholder:text-white/20 outline-none border border-white/10 text-sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onAdd} className="w-full flex items-center justify-center gap-2 py-2.5 glass rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/30 transition-all text-sm">
        <Icon name="Plus" size={15} />Добавить статью расхода
      </button>
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-white/50 text-sm">Итого расходов (план)</span>
        <span className="font-oswald font-bold text-xl text-neon-pink">{new Intl.NumberFormat("ru-RU").format(totalExpPlan)} ₽</span>
      </div>
    </div>
  );
}

import Icon from "@/components/ui/icon";
import type { IncomeLine } from "./types";

interface Props {
  incomeLines: IncomeLine[];
  totalIncPlan: number;
  totalExpPlan: number;
  profitPreview: number;
  onSet: (id: string, k: string, v: unknown) => void;
  onAdd: () => void;
  onDel: (id: string) => void;
}

export default function StepIncome({ incomeLines, totalIncPlan, totalExpPlan, profitPreview, onSet, onAdd, onDel }: Props) {
  return (
    <div className="space-y-3 animate-fade-in">
      <p className="text-white/50 text-sm">Добавьте категории билетов и укажите планируемые продажи.</p>
      <div className="space-y-2">
        {incomeLines.map(inc => {
          const linePlan = Number(inc.ticketCount) * Number(inc.ticketPrice);
          return (
            <div key={inc.id} className="glass rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input value={inc.category} onChange={e => onSet(inc.id, "category", e.target.value)}
                  placeholder="Категория (Партер, VIP...)"
                  className="flex-1 glass rounded-lg px-3 py-2 text-white placeholder:text-white/25 outline-none border border-white/10 text-sm" />
                <button onClick={() => onDel(inc.id)} className="text-white/20 hover:text-neon-pink transition-colors shrink-0"><Icon name="X" size={15} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-white/30 mb-0.5 block">Кол-во (план)</label>
                  <input type="number" value={inc.ticketCount || ""} onChange={e => onSet(inc.id, "ticketCount", e.target.value)}
                    placeholder="0" className="w-full glass rounded-lg px-3 py-2 text-white placeholder:text-white/20 outline-none border border-white/10 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-white/30 mb-0.5 block">Цена (₽)</label>
                  <input type="number" value={inc.ticketPrice || ""} onChange={e => onSet(inc.id, "ticketPrice", e.target.value)}
                    placeholder="0" className="w-full glass rounded-lg px-3 py-2 text-neon-green placeholder:text-white/20 outline-none border border-white/10 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-white/30 mb-0.5 block">Итог (₽)</label>
                  <div className="glass rounded-lg px-3 py-2 text-neon-cyan text-sm font-medium">{new Intl.NumberFormat("ru-RU").format(linePlan)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={onAdd} className="w-full flex items-center justify-center gap-2 py-2.5 glass rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/30 transition-all text-sm">
        <Icon name="Plus" size={15} />Добавить категорию билетов
      </button>
      <div className="glass rounded-xl px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-sm">Доходы (план)</span>
          <span className="font-oswald font-bold text-xl text-neon-green">{new Intl.NumberFormat("ru-RU").format(totalIncPlan)} ₽</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-sm">Расходы (план)</span>
          <span className="font-oswald font-bold text-xl text-neon-pink">{new Intl.NumberFormat("ru-RU").format(totalExpPlan)} ₽</span>
        </div>
        <div className="h-px bg-white/10" />
        <div className="flex items-center justify-between">
          <span className="text-white font-medium text-sm">Прибыль (план)</span>
          <span className={`font-oswald font-bold text-xl ${profitPreview >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
            {profitPreview >= 0 ? "+" : ""}{new Intl.NumberFormat("ru-RU").format(profitPreview)} ₽
          </span>
        </div>
      </div>
    </div>
  );
}

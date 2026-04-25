import Icon from "@/components/ui/icon";
import { TAX_OPTIONS } from "@/hooks/useProjects";

interface Props {
  taxSystem: string;
  ticketingFeePercent: number;
  totalIncPlan: number;
  totalExpPlan: number;
  onSet: (k: string, v: unknown) => void;
}

export default function StepTax({ taxSystem, ticketingFeePercent, totalIncPlan, totalExpPlan, onSet }: Props) {
  const rate = taxSystem === "none" ? 0 : taxSystem === "usn_6" ? 0.06 : taxSystem === "usn_15" ? 0.15 : taxSystem === "osn" ? 0.20 : 0.06;
  const ticketingFee = totalIncPlan * ticketingFeePercent / 100;
  const totalExp = totalExpPlan + ticketingFee;
  const taxBase = taxSystem === "usn_15" ? Math.max(0, totalIncPlan - totalExp) : totalIncPlan;
  const tax = taxBase * rate;
  const profit = totalIncPlan - totalExp - tax;

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-white/50 text-sm">Выберите систему налогообложения и укажите комиссию билетного оператора.</p>

      <div className="space-y-2">
        {TAX_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => onSet("taxSystem", opt.value)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${taxSystem === opt.value ? "bg-neon-purple/20 border-neon-purple/50" : "glass border-white/10 hover:border-white/25"}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${taxSystem === opt.value ? "border-neon-purple bg-neon-purple" : "border-white/30"}`}>
              {taxSystem === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <span className={`text-sm ${taxSystem === opt.value ? "text-white" : "text-white/60"}`}>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Вознаграждение билетного оператора */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-oswald font-semibold text-white text-sm flex items-center gap-2">
              <Icon name="Ticket" size={15} className="text-neon-cyan" />Вознаграждение билетного оператора
            </h4>
            <p className="text-white/40 text-xs mt-0.5">Комиссия от суммы продаж билетов</p>
          </div>
          <span className="font-oswald font-bold text-xl text-neon-cyan">
            {ticketingFeePercent === 0 ? "Нет" : `${ticketingFeePercent}%`}
          </span>
        </div>
        <div className="relative">
          <input type="range" min={0} max={20} step={1}
            value={ticketingFeePercent}
            onChange={e => onSet("ticketingFeePercent", Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-neon-cyan bg-white/10" />
          <div className="flex justify-between text-xs text-white/25 mt-1 px-0.5">
            <span>0%</span><span>5%</span><span>10%</span><span>15%</span><span>20%</span>
          </div>
        </div>
        {ticketingFeePercent > 0 && totalIncPlan > 0 && (
          <p className="text-white/40 text-xs">
            ≈ {new Intl.NumberFormat("ru-RU").format(Math.round(totalIncPlan * ticketingFeePercent / 100))} ₽ от {new Intl.NumberFormat("ru-RU").format(totalIncPlan)} ₽ дохода
          </p>
        )}
      </div>

      {/* Итоговый расчёт */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <h3 className="font-oswald font-semibold text-white flex items-center gap-2">
          <Icon name="Calculator" size={16} className="text-neon-purple" />Предварительный расчёт
        </h3>
        {([
          ["Доходы (план)", totalIncPlan, "text-neon-green"],
          ["Расходы (план)", -totalExpPlan, "text-neon-pink"],
          ...(ticketingFee > 0 ? [["Сбор билетного оператора (" + ticketingFeePercent + "%)", -ticketingFee, "text-neon-cyan"] as [string, number, string]] : []),
          ...(tax > 0 ? [["Налог (" + (rate * 100).toFixed(0) + "%)", -tax, "text-neon-cyan"] as [string, number, string]] : []),
        ] as [string, number, string][]).map(([label, val, cls], i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-white/50 text-sm">{label}</span>
            <span className={`font-oswald font-bold text-lg ${cls}`}>{val >= 0 ? "+" : ""}{new Intl.NumberFormat("ru-RU").format(Math.round(val))} ₽</span>
          </div>
        ))}
        <div className="h-px bg-white/10" />
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">Чистая прибыль</span>
          <span className={`font-oswald font-bold text-2xl ${profit >= 0 ? "gradient-text" : "text-neon-pink"}`}>
            {profit >= 0 ? "+" : ""}{new Intl.NumberFormat("ru-RU").format(Math.round(profit))} ₽
          </span>
        </div>
      </div>
    </div>
  );
}

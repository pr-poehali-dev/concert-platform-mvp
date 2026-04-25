import Icon from "@/components/ui/icon";
import { TAX_OPTIONS, fmt, type Project, type IncomeLine } from "@/hooks/useProjects";
import EditCell from "./EditCell";

interface Props {
  activeTab: "income" | "summary";
  project: Project;
  expPlan: number;
  expFact: number;
  incPlan: number;
  incFact: number;
  taxPlan: number;
  taxFact: number;
  profitPlan: number;
  profitFact: number;
  onAddIncome?: () => void;
  onUpdateIncome?: (id: string, fields: Partial<IncomeLine>) => void;
  onDeleteIncome?: (id: string) => void;
  onUpdateTaxSystem?: (value: string) => void;
}

export default function ProjectIncomeAndSummaryTab({
  activeTab, project,
  expPlan, expFact, incPlan, incFact, taxPlan, taxFact, profitPlan, profitFact,
  onAddIncome, onUpdateIncome, onDeleteIncome, onUpdateTaxSystem,
}: Props) {
  const f = project.finance;
  const rate = f.taxRate;

  if (activeTab === "income") {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <span className="font-oswald font-semibold text-white">Доходы от билетов</span>
            {onAddIncome && (
              <button onClick={onAddIncome} className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-green/20 text-neon-green border border-neon-green/30 rounded-lg text-xs hover:bg-neon-green/30 transition-colors">
                <Icon name="Plus" size={13}/>Добавить категорию
              </button>
            )}
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {["Категория","Кол-во (план)","Цена, ₽","Продано (факт)","Вал план","Вал факт",""].map(h=>(
                  <th key={h} className="text-left px-4 py-2.5 text-xs text-white/35 uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(project.incomeLines||[]).length===0?(
                <tr><td colSpan={7} className="text-center py-8 text-white/30 text-sm">Нет строк доходов</td></tr>
              ):(project.incomeLines||[]).map((inc,i)=>(
                <tr key={inc.id} className={`hover:bg-white/3 transition-colors ${i<(project.incomeLines||[]).length-1?"border-b border-white/5":""}`}>
                  <td className="px-4 py-3">
                    {onUpdateIncome ? <EditCell value={inc.category} onSave={v=>onUpdateIncome(inc.id,{category:v})} className="text-white font-medium text-sm" /> : <span className="text-white font-medium text-sm">{inc.category}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {onUpdateIncome ? <EditCell value={inc.ticketCount} onSave={v=>onUpdateIncome(inc.id,{ticketCount:Number(v)})} type="number" suffix=" шт" className="text-white/70 text-sm" /> : <span className="text-white/70 text-sm">{inc.ticketCount} шт</span>}
                  </td>
                  <td className="px-4 py-3">
                    {onUpdateIncome ? <EditCell value={inc.ticketPrice} onSave={v=>onUpdateIncome(inc.id,{ticketPrice:Number(v)})} type="number" suffix=" ₽" className="text-neon-cyan text-sm font-medium" /> : <span className="text-neon-cyan text-sm font-medium">{fmt(inc.ticketPrice)} ₽</span>}
                  </td>
                  <td className="px-4 py-3">
                    {onUpdateIncome ? <EditCell value={inc.soldCount} onSave={v=>onUpdateIncome(inc.id,{soldCount:Number(v)})} type="number" suffix=" шт" className="text-white/70 text-sm" /> : <span className="text-white/70 text-sm">{inc.soldCount} шт</span>}
                  </td>
                  <td className="px-4 py-3 text-neon-green font-medium text-sm">{fmt(inc.totalPlan)} ₽</td>
                  <td className="px-4 py-3 text-neon-green font-medium text-sm">{fmt(inc.totalFact)} ₽</td>
                  <td className="px-4 py-3">
                    {onDeleteIncome && <button onClick={()=>onDeleteIncome(inc.id)} className="text-white/20 hover:text-neon-pink transition-colors"><Icon name="Trash2" size={14}/></button>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-white/3">
                <td className="px-4 py-3 font-oswald font-semibold text-white text-sm">ИТОГО</td>
                <td className="px-4 py-3 text-white/50 text-sm">{(project.incomeLines||[]).reduce((s,i)=>s+i.ticketCount,0)} шт</td>
                <td/>
                <td className="px-4 py-3 text-white/50 text-sm">{(project.incomeLines||[]).reduce((s,i)=>s+i.soldCount,0)} шт</td>
                <td className="px-4 py-3 font-oswald font-bold text-neon-green">{fmt(incPlan)} ₽</td>
                <td className="px-4 py-3 font-oswald font-bold text-neon-green">{fmt(incFact)} ₽</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  // summary
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
      {/* Налоговая система */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-oswald font-bold text-xl text-white mb-4 flex items-center gap-2">
          <Icon name="Percent" size={18} className="text-neon-cyan"/>Система налогообложения
        </h3>
        <div className="space-y-2">
          {TAX_OPTIONS.map(opt=>(
            <button key={opt.value}
              onClick={onUpdateTaxSystem ? ()=>onUpdateTaxSystem(opt.value) : undefined}
              disabled={!onUpdateTaxSystem}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${project.taxSystem===opt.value?"bg-neon-purple/20 border-neon-purple/50":"glass border-white/10 hover:border-white/25"} ${!onUpdateTaxSystem?"cursor-default":""}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${project.taxSystem===opt.value?"border-neon-purple bg-neon-purple":"border-white/30"}`}>
                {project.taxSystem===opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white"/>}
              </div>
              <span className={`text-sm ${project.taxSystem===opt.value?"text-white":"text-white/60"}`}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* P&L */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-oswald font-bold text-xl text-white mb-4 flex items-center gap-2">
          <Icon name="BarChart3" size={18} className="text-neon-purple"/>Отчёт P&L
        </h3>
        <div className="space-y-3">
          {[
            {label:"Выручка (план)",    vp:incPlan,   vf:incFact,   cp:"text-neon-green"},
            {label:"Расходы (план)",     vp:-expPlan,  vf:-expFact,  cp:"text-neon-pink"},
            ...(rate>0?[{label:`Налог ${f.taxLabel}`, vp:-taxPlan, vf:-taxFact, cp:"text-neon-cyan"}]:[]),
          ].map((row,i)=>(
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/8">
              <span className="text-white/60 text-sm">{row.label}</span>
              <div className="text-right">
                <div className={`font-oswald font-bold text-lg ${row.cp}`}>{row.vp>=0?"+":""}{fmt(row.vp)} ₽</div>
                <div className="text-white/30 text-xs">факт: {row.vf>=0?"+":""}{fmt(row.vf)} ₽</div>
              </div>
            </div>
          ))}
          <div className={`rounded-xl p-4 ${profitPlan>=0?"bg-neon-green/10 border border-neon-green/20":"bg-neon-pink/10 border border-neon-pink/20"}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-oswald font-bold text-lg">Чистая прибыль</span>
              <Icon name={profitPlan>=0?"TrendingUp":"TrendingDown"} size={20} className={profitPlan>=0?"text-neon-green":"text-neon-pink"} />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/40 text-xs">план</p>
                <p className={`font-oswald font-bold text-3xl ${profitPlan>=0?"text-neon-green":"text-neon-pink"}`}>{profitPlan>=0?"+":""}{fmt(profitPlan)} ₽</p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-xs">факт</p>
                <p className={`font-oswald font-bold text-xl ${profitFact>=0?"text-neon-green":"text-neon-pink"}`}>{profitFact>=0?"+":""}{fmt(profitFact)} ₽</p>
              </div>
            </div>
          </div>
          {incPlan>0 && (
            <div className="text-center text-white/30 text-xs">
              Маржинальность: {(profitPlan/incPlan*100).toFixed(1)}% (план) · {incFact>0?(profitFact/incFact*100).toFixed(1)+"% (факт)":"—"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import Icon from "@/components/ui/icon";
import { EXPENSE_CATEGORIES, fmt, type Project, type Expense } from "@/hooks/useProjects";
import EditCell from "./EditCell";

interface Props {
  project: Project;
  expPlan: number;
  expFact: number;
  onAddExpense?: () => void;
  onUpdateExpense?: (id: string, fields: Partial<Expense>) => void;
  onDeleteExpense?: (id: string) => void;
}

export default function ProjectBudgetTab({ project, expPlan, expFact, onAddExpense, onUpdateExpense, onDeleteExpense }: Props) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <span className="font-oswald font-semibold text-white">Статьи расходов</span>
          {onAddExpense && (
            <button onClick={onAddExpense} className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-purple/20 text-neon-purple border border-neon-purple/30 rounded-lg text-xs hover:bg-neon-purple/30 transition-colors">
              <Icon name="Plus" size={13}/>Добавить строку
            </button>
          )}
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {["Категория","Статья расхода","План (₽)","Факт (₽)","Отклонение",""].map(h=>(
                <th key={h} className="text-left px-4 py-2.5 text-xs text-white/35 uppercase tracking-wider font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(project.expenses||[]).length===0?(
              <tr><td colSpan={6} className="text-center py-8 text-white/30 text-sm">Нет статей расходов</td></tr>
            ):(project.expenses||[]).map((exp,i)=>{
              const delta = exp.amountFact - exp.amountPlan;
              return (
                <tr key={exp.id} className={`hover:bg-white/3 transition-colors ${i<(project.expenses||[]).length-1?"border-b border-white/5":""}`}>
                  <td className="px-4 py-3">
                    {onUpdateExpense ? (
                      <select value={exp.category} onChange={e=>onUpdateExpense(exp.id,{category:e.target.value})}
                        className="glass rounded-lg px-2 py-1.5 text-white/60 outline-none border border-white/10 text-xs appearance-none bg-transparent max-w-[140px]">
                        {EXPENSE_CATEGORIES.map(c=><option key={c} value={c} className="bg-gray-900">{c}</option>)}
                      </select>
                    ) : <span className="text-white/50 text-xs">{exp.category}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {onUpdateExpense ? (
                      <EditCell value={exp.title} onSave={v=>onUpdateExpense(exp.id,{title:v})} className="text-white text-sm" />
                    ) : <span className="text-white text-sm">{exp.title}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {onUpdateExpense ? (
                      <EditCell value={exp.amountPlan} onSave={v=>onUpdateExpense(exp.id,{amountPlan:Number(v)})} type="number" suffix=" ₽" className="text-neon-cyan text-sm font-medium" />
                    ) : <span className="text-neon-cyan text-sm font-medium">{fmt(exp.amountPlan)} ₽</span>}
                  </td>
                  <td className="px-4 py-3">
                    {onUpdateExpense ? (
                      <EditCell value={exp.amountFact} onSave={v=>onUpdateExpense(exp.id,{amountFact:Number(v)})} type="number" suffix=" ₽" className="text-neon-green text-sm font-medium" />
                    ) : <span className="text-neon-green text-sm font-medium">{fmt(exp.amountFact)} ₽</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${delta>0?"text-neon-pink":delta<0?"text-neon-green":"text-white/30"}`}>
                      {delta>0?"+":""}{exp.amountFact>0||exp.amountPlan>0?fmt(delta)+" ₽":"—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {onDeleteExpense && <button onClick={()=>onDeleteExpense(exp.id)} className="text-white/20 hover:text-neon-pink transition-colors"><Icon name="Trash2" size={14}/></button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 bg-white/3">
              <td colSpan={2} className="px-4 py-3 font-oswald font-semibold text-white text-sm">ИТОГО</td>
              <td className="px-4 py-3 font-oswald font-bold text-neon-cyan">{fmt(expPlan)} ₽</td>
              <td className="px-4 py-3 font-oswald font-bold text-neon-green">{fmt(expFact)} ₽</td>
              <td className="px-4 py-3">
                <span className={`font-oswald font-bold ${expFact-expPlan>0?"text-neon-pink":"text-neon-green"}`}>
                  {expFact>0||expPlan>0?(expFact-expPlan>0?"+":"")+fmt(expFact-expPlan)+" ₽":"—"}
                </span>
              </td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
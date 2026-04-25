import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { PROJECTS_URL, STATUS_CONFIG, TAX_OPTIONS, EXPENSE_CATEGORIES, fmt, type Project, type Expense, type IncomeLine } from "@/hooks/useProjects";
import { exportCSV, exportExcel, exportPDF, companyInfoFromUser } from "@/lib/exportProject";
import { useAuth } from "@/context/AuthContext";

interface Props { projectId: string; onBack: () => void; }

// ─── Редактируемая ячейка ─────────────────────────────────────────────────────
function EditCell({ value, onSave, prefix="", suffix="", type="text", className="" }: {
  value: string|number; onSave:(v:string)=>void; prefix?:string; suffix?:string; type?:string; className?:string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  useEffect(()=>setVal(String(value)),[value]);
  if (!editing) return (
    <button onClick={()=>setEditing(true)} className={`text-left hover:opacity-70 transition-opacity ${className}`}>
      {prefix}{type==="number"&&value!==0?fmt(Number(value)):value}{suffix}
    </button>
  );
  return (
    <input autoFocus type={type} value={val}
      onChange={e=>setVal(e.target.value)}
      onBlur={()=>{onSave(val);setEditing(false);}}
      onKeyDown={e=>{if(e.key==="Enter"){onSave(val);setEditing(false);}if(e.key==="Escape"){setVal(String(value));setEditing(false);}}}
      className={`bg-white/10 rounded px-2 py-0.5 outline-none border border-neon-purple/50 text-sm ${className}`}
    />
  );
}

export default function ProjectDetailPage({ projectId, onBack }: Props) {
  const { user } = useAuth();
  const [project, setProject] = useState<Project|null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"budget"|"income"|"summary">("budget");
  const [saving, setSaving] = useState<string|null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch(`${PROJECTS_URL}?action=detail&project_id=${projectId}`).then(r=>r.json());
    setProject(data.project || null);
    setLoading(false);
  }, [projectId]);

  useEffect(()=>{load();},[load]);

  // Закрытие дропдауна по клику вне
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  const api = async (action:string, body:object) => {
    setSaving(action);
    const res = await fetch(`${PROJECTS_URL}?action=${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data = await res.json();
    setSaving(null);
    return data;
  };

  const updateField = async (key:string, val:unknown) => {
    await api("update",{projectId,projectType:project?.projectType,...{[key]:val}});
    setProject(p=>p?{...p,[key]:val}:p);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`${PROJECTS_URL}?action=delete`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId})});
    setDeleting(false);
    onBack();
  };

  // Expenses
  const addExpense = async () => {
    const data = await api("add_expense",{projectId,category:"Прочее",title:"Новая статья",amountPlan:0,amountFact:0});
    if(data.id) load();
  };
  const updateExpense = async (id:string, fields:Partial<Expense>) => {
    await api("update_expense",{id,...fields});
    setProject(p=>{
      if(!p||!p.expenses) return p;
      const expenses = p.expenses.map(e=>e.id===id?{...e,...fields}:e);
      const tp = expenses.reduce((s,e)=>s+e.amountPlan,0);
      const tf = expenses.reduce((s,e)=>s+e.amountFact,0);
      return {...p,expenses,totalExpensesPlan:tp,totalExpensesFact:tf};
    });
  };
  const deleteExpense = async (id:string) => {
    await api("delete_expense",{id});
    setProject(p=>{
      if(!p||!p.expenses) return p;
      const expenses = p.expenses.filter(e=>e.id!==id);
      return {...p,expenses};
    });
  };

  // Income
  const addIncome = async () => {
    await api("add_income",{projectId,category:"Стандарт",ticketCount:0,ticketPrice:0,soldCount:0});
    load();
  };
  const updateIncome = async (id:string, fields:Partial<IncomeLine>) => {
    await api("update_income",{id,...fields});
    setProject(p=>{
      if(!p||!p.incomeLines) return p;
      const incomeLines = p.incomeLines.map(i=>i.id===id?{...i,...fields,totalPlan:(fields.ticketCount??i.ticketCount)*(fields.ticketPrice??i.ticketPrice),totalFact:(fields.soldCount??i.soldCount)*(fields.ticketPrice??i.ticketPrice)}:i);
      const tp = incomeLines.reduce((s,i)=>s+i.totalPlan,0);
      const tf = incomeLines.reduce((s,i)=>s+i.totalFact,0);
      return {...p,incomeLines,totalIncomePlan:tp,totalIncomeFact:tf};
    });
  };
  const deleteIncome = async (id:string) => {
    await api("delete_income",{id});
    setProject(p=>{
      if(!p||!p.incomeLines) return p;
      return {...p,incomeLines:p.incomeLines.filter(i=>i.id!==id)};
    });
  };

  if(loading) return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <Icon name="Loader2" size={32} className="text-white/30 animate-spin" />
    </div>
  );
  if(!project) return (
    <div className="min-h-screen pt-20 flex items-center justify-center text-white/30">Проект не найден</div>
  );

  const f = project.finance;
  const expPlan = project.totalExpensesPlan, expFact = project.totalExpensesFact;
  const incPlan = project.totalIncomePlan, incFact = project.totalIncomeFact;
  const rate = f.taxRate;
  const taxPlan = f.taxPlan, taxFact = f.taxFact;
  const profitPlan = f.profitPlan, profitFact = f.profitFact;

  const TABS = [{id:"budget",label:"Бюджет расходов",icon:"TrendingDown"},{id:"income",label:"Доходы",icon:"TrendingUp"},{id:"summary",label:"Итог / P&L",icon:"BarChart3"}] as const;

  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <div className="relative py-10 overflow-hidden">
        <div className="absolute inset-0 gradient-bg-purple opacity-30" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
              <Icon name="ArrowLeft" size={16}/>Назад к проектам
            </button>

            <div className="flex items-center gap-2">
            {/* Delete button */}
            <button onClick={()=>setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 glass rounded-xl border border-white/10 hover:border-neon-pink/40 text-white/40 hover:text-neon-pink transition-all text-sm">
              <Icon name="Trash2" size={15}/>Удалить
            </button>

            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-2 glass rounded-xl border border-white/15 hover:border-neon-purple/40 text-white/70 hover:text-white transition-all text-sm"
              >
                <Icon name="Download" size={15}/>
                Экспорт
                <Icon name="ChevronDown" size={14} className={`transition-transform ${exportOpen ? "rotate-180" : ""}`}/>
              </button>

              {exportOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 glass-strong rounded-xl border border-white/10 overflow-hidden z-50 animate-scale-in">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-white/40 text-xs uppercase tracking-wider">Скачать отчёт P&L</p>
                  </div>
                  {[
                    { icon: "FileText", label: "PDF (для печати)", color: "text-neon-pink", action: () => { exportPDF(project, user ? companyInfoFromUser(user) : undefined); setExportOpen(false); } },
                    { icon: "Table2", label: "Excel (.xls)", color: "text-neon-green", action: () => { exportExcel(project, user ? companyInfoFromUser(user) : undefined); setExportOpen(false); } },
                    { icon: "FileSpreadsheet", label: "CSV (таблица)", color: "text-neon-cyan", action: () => { exportCSV(project, user ? companyInfoFromUser(user) : undefined); setExportOpen(false); } },
                  ].map((opt, i) => (
                    <button key={i} onClick={opt.action}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                      <Icon name={opt.icon} size={16} className={opt.color}/>
                      <span className="text-white/80 text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="font-oswald font-bold text-3xl text-white">{project.title}</h1>
                <Badge className={`text-xs border ${STATUS_CONFIG[project.status]?.color}`}>
                  {STATUS_CONFIG[project.status]?.label}
                </Badge>
                <Badge className="bg-white/10 text-white/50 border-white/10 text-xs">
                  {project.projectType==="single"?"Концерт":"Тур"}
                </Badge>
              </div>
              {project.artist && <p className="text-neon-cyan text-sm">{project.artist}</p>}
              <div className="flex items-center gap-3 text-white/40 text-xs mt-1 flex-wrap">
                {project.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={11}/>{project.city}</span>}
                {project.venueName && <span className="flex items-center gap-1"><Icon name="Building2" size={11}/>{project.venueName}</span>}
                {project.dateStart && <span className="flex items-center gap-1"><Icon name="Calendar" size={11}/>{project.dateStart}{project.dateEnd&&project.dateEnd!==project.dateStart?" — "+project.dateEnd:""}</span>}
              </div>
            </div>
            {/* Статус */}
            <select value={project.status} onChange={e=>updateField("status",e.target.value)}
              className="glass rounded-xl px-4 py-2 text-white outline-none border border-white/10 text-sm appearance-none bg-transparent">
              {Object.entries(STATUS_CONFIG).map(([v,c])=><option key={v} value={v} className="bg-gray-900">{c.label}</option>)}
            </select>
          </div>

          {/* KPI-карточки */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              {label:"Доход план", val:incPlan, fact:incFact, color:"text-neon-green", bg:"bg-neon-green/10"},
              {label:"Расходы план", val:expPlan, fact:expFact, color:"text-neon-pink", bg:"bg-neon-pink/10"},
              {label:"Налог", val:taxPlan, fact:taxFact, color:"text-neon-cyan", bg:"bg-neon-cyan/10"},
              {label:"Чистая прибыль", val:profitPlan, fact:profitFact, color:profitPlan>=0?"text-neon-green":"text-neon-pink", bg:profitPlan>=0?"bg-neon-green/10":"bg-neon-pink/10"},
            ].map((k,i)=>(
              <div key={i} className={`glass rounded-2xl p-4 ${k.bg}`}>
                <p className="text-white/40 text-xs mb-1">{k.label}</p>
                <p className={`font-oswald font-bold text-xl ${k.color}`}>{fmt(k.val)} ₽</p>
                <p className="text-white/30 text-xs mt-0.5">факт: {fmt(k.fact)} ₽</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 glass rounded-xl p-1 w-fit">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-oswald font-medium transition-all ${activeTab===t.id?"bg-neon-purple text-white":"text-white/50 hover:text-white"}`}>
              <Icon name={t.icon} size={15}/>{t.label}
            </button>
          ))}
        </div>

        {/* ── BUDGET ── */}
        {activeTab==="budget" && (
          <div className="space-y-3 animate-fade-in">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <span className="font-oswald font-semibold text-white">Статьи расходов</span>
                <button onClick={addExpense} className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-purple/20 text-neon-purple border border-neon-purple/30 rounded-lg text-xs hover:bg-neon-purple/30 transition-colors">
                  <Icon name="Plus" size={13}/>Добавить строку
                </button>
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
                          <select value={exp.category} onChange={e=>updateExpense(exp.id,{category:e.target.value})}
                            className="glass rounded-lg px-2 py-1.5 text-white/60 outline-none border border-white/10 text-xs appearance-none bg-transparent max-w-[140px]">
                            {EXPENSE_CATEGORIES.map(c=><option key={c} value={c} className="bg-gray-900">{c}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <EditCell value={exp.title} onSave={v=>updateExpense(exp.id,{title:v})} className="text-white text-sm" />
                        </td>
                        <td className="px-4 py-3">
                          <EditCell value={exp.amountPlan} onSave={v=>updateExpense(exp.id,{amountPlan:Number(v)})} type="number" suffix=" ₽" className="text-neon-cyan text-sm font-medium" />
                        </td>
                        <td className="px-4 py-3">
                          <EditCell value={exp.amountFact} onSave={v=>updateExpense(exp.id,{amountFact:Number(v)})} type="number" suffix=" ₽" className="text-neon-green text-sm font-medium" />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${delta>0?"text-neon-pink":delta<0?"text-neon-green":"text-white/30"}`}>
                            {delta>0?"+":""}{exp.amountFact>0||exp.amountPlan>0?fmt(delta)+" ₽":"—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={()=>deleteExpense(exp.id)} className="text-white/20 hover:text-neon-pink transition-colors"><Icon name="Trash2" size={14}/></button>
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
        )}

        {/* ── INCOME ── */}
        {activeTab==="income" && (
          <div className="space-y-3 animate-fade-in">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <span className="font-oswald font-semibold text-white">Доходы от билетов</span>
                <button onClick={addIncome} className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-green/20 text-neon-green border border-neon-green/30 rounded-lg text-xs hover:bg-neon-green/30 transition-colors">
                  <Icon name="Plus" size={13}/>Добавить категорию
                </button>
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
                        <EditCell value={inc.category} onSave={v=>updateIncome(inc.id,{category:v})} className="text-white font-medium text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <EditCell value={inc.ticketCount} onSave={v=>updateIncome(inc.id,{ticketCount:Number(v)})} type="number" suffix=" шт" className="text-white/70 text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <EditCell value={inc.ticketPrice} onSave={v=>updateIncome(inc.id,{ticketPrice:Number(v)})} type="number" suffix=" ₽" className="text-neon-cyan text-sm font-medium" />
                      </td>
                      <td className="px-4 py-3">
                        <EditCell value={inc.soldCount} onSave={v=>updateIncome(inc.id,{soldCount:Number(v)})} type="number" suffix=" шт" className="text-white/70 text-sm" />
                      </td>
                      <td className="px-4 py-3 text-neon-green font-medium text-sm">{fmt(inc.totalPlan)} ₽</td>
                      <td className="px-4 py-3 text-neon-green font-medium text-sm">{fmt(inc.totalFact)} ₽</td>
                      <td className="px-4 py-3">
                        <button onClick={()=>deleteIncome(inc.id)} className="text-white/20 hover:text-neon-pink transition-colors"><Icon name="Trash2" size={14}/></button>
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
        )}

        {/* ── SUMMARY P&L ── */}
        {activeTab==="summary" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Налоговая система */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-oswald font-bold text-xl text-white mb-4 flex items-center gap-2">
                <Icon name="Percent" size={18} className="text-neon-cyan"/>Система налогообложения
              </h3>
              <div className="space-y-2">
                {TAX_OPTIONS.map(opt=>(
                  <button key={opt.value} onClick={()=>updateField("taxSystem",opt.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${project.taxSystem===opt.value?"bg-neon-purple/20 border-neon-purple/50":"glass border-white/10 hover:border-white/25"}`}>
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
        )}

        {saving && (
          <div className="fixed bottom-6 right-6 flex items-center gap-2 glass-strong px-4 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm">
            <Icon name="Loader2" size={14} className="animate-spin"/>Сохраняю...
          </div>
        )}
      </div>

      {/* Подтверждение удаления */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setConfirmDelete(false)}/>
          <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl p-6 border border-neon-pink/20 animate-scale-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-neon-pink/20 flex items-center justify-center">
                <Icon name="Trash2" size={18} className="text-neon-pink"/>
              </div>
              <h3 className="font-oswald font-bold text-white text-lg">Удалить проект?</h3>
            </div>
            <p className="text-white/50 text-sm mb-5">«{project.title}» будет удалён без возможности восстановления вместе со всеми расходами и доходами.</p>
            <div className="flex gap-3">
              <button onClick={()=>setConfirmDelete(false)}
                className="flex-1 py-2.5 glass rounded-xl text-white/60 hover:text-white text-sm transition-colors border border-white/10">
                Отмена
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-neon-pink/90 hover:bg-neon-pink text-white font-oswald font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting?<><Icon name="Loader2" size={14} className="animate-spin"/>Удаляю...</>:"Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
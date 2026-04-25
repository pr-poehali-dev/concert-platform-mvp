import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { PROJECTS_URL, TAX_OPTIONS, CITIES, EXPENSE_CATEGORIES } from "@/hooks/useProjects";

interface Props { open: boolean; onClose: () => void; onCreated: (id: string) => void; }

const DEFAULT_EXPENSES = [
  { category: "Аренда площадки", title: "Аренда площадки", amountPlan: 0 },
  { category: "Гонорар артиста",  title: "Гонорар артиста",  amountPlan: 0 },
  { category: "Техническое обеспечение", title: "Техническое обеспечение", amountPlan: 0 },
  { category: "Реклама и PR",     title: "Реклама и PR",     amountPlan: 0 },
  { category: "Логистика",        title: "Логистика",        amountPlan: 0 },
];

export default function CreateProjectModal({ open, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "", artist: "", projectType: "single" as "single"|"tour",
    status: "planning", dateStart: "", dateEnd: "", city: "Москва",
    venueName: "", description: "", taxSystem: "none",
  });

  const [expenses, setExpenses] = useState(DEFAULT_EXPENSES.map((e, i) => ({ ...e, id: String(i), amountFact: 0, note: "" })));
  const [incomeLines, setIncomeLines] = useState([
    { id: "0", category: "Партер", ticketCount: 0, ticketPrice: 0, soldCount: 0, note: "" },
    { id: "1", category: "VIP",    ticketCount: 0, ticketPrice: 0, soldCount: 0, note: "" },
  ]);

  if (!open) return null;
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // Expenses
  const setExp = (id: string, k: string, v: unknown) =>
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, [k]: v } : e));
  const addExp = () => setExpenses(prev => [...prev, { id: Date.now().toString(), category: "Прочее", title: "", amountPlan: 0, amountFact: 0, note: "" }]);
  const delExp = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));

  // Income
  const setInc = (id: string, k: string, v: unknown) =>
    setIncomeLines(prev => prev.map(i => i.id === id ? { ...i, [k]: v } : i));
  const addInc = () => setIncomeLines(prev => [...prev, { id: Date.now().toString(), category: "Стандарт", ticketCount: 0, ticketPrice: 0, soldCount: 0, note: "" }]);
  const delInc = (id: string) => setIncomeLines(prev => prev.filter(i => i.id !== id));

  const totalExpPlan = expenses.reduce((s, e) => s + Number(e.amountPlan), 0);
  const totalIncPlan = incomeLines.reduce((s, i) => s + Number(i.ticketCount) * Number(i.ticketPrice), 0);
  const profitPreview = totalIncPlan - totalExpPlan;

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Введите название проекта"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${PROJECTS_URL}?action=create`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user!.id, ...form,
          expenses: expenses.filter(e => e.title.trim()),
          incomeLines: incomeLines.filter(i => Number(i.ticketCount) > 0 || Number(i.ticketPrice) > 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated(data.projectId);
      onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoading(false); }
  };

  const STEPS = ["Основное", "Расходы", "Доходы", "Налоги"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl glass-strong rounded-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="font-oswald font-bold text-2xl text-white">Новый проект</h2>
            <p className="text-white/40 text-sm">Шаг {step} из {STEPS.length}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Icon name="X" size={16} /></button>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 px-6 pb-4 shrink-0">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 ${i+1<=step?"text-neon-purple":"text-white/25"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${i+1<step?"bg-neon-purple border-neon-purple text-white":i+1===step?"border-neon-purple text-neon-purple":"border-white/20 text-white/25"}`}>
                  {i+1<step?<Icon name="Check" size={12}/>:i+1}
                </div>
                <span className="text-xs hidden sm:block">{s}</span>
              </div>
              {i<STEPS.length-1 && <div className={`flex-1 h-px ${i+1<step?"bg-neon-purple/60":"bg-white/10"}`}/>}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-2 space-y-4">

          {/* STEP 1 — Основное */}
          {step===1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex gap-2">
                {(["single","tour"] as const).map(t => (
                  <button key={t} onClick={()=>set("projectType",t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-oswald font-medium border transition-all ${form.projectType===t?"bg-neon-purple text-white border-neon-purple":"glass text-white/50 border-white/10 hover:border-white/20 hover:text-white"}`}>
                    {t==="single"?"Одиночный концерт":"Тур"}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Название проекта *</label>
                <input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Например: Концерт в Москве, Осенний тур 2025"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Артист / группа</label>
                <input value={form.artist} onChange={e=>set("artist",e.target.value)} placeholder="Имя артиста или группы"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Дата начала</label>
                  <input type="date" value={form.dateStart} onChange={e=>set("dateStart",e.target.value)}
                    className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 text-sm [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Дата окончания</label>
                  <input type="date" value={form.dateEnd} onChange={e=>set("dateEnd",e.target.value)}
                    className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 text-sm [color-scheme:dark]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Город</label>
                  <select value={form.city} onChange={e=>set("city",e.target.value)}
                    className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 text-sm appearance-none bg-transparent">
                    {CITIES.map(c=><option key={c} value={c} className="bg-gray-900">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Площадка</label>
                  <input value={form.venueName} onChange={e=>set("venueName",e.target.value)} placeholder="Название площадки"
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Описание</label>
                <textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={2}
                  placeholder="Дополнительная информация о проекте..."
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm resize-none" />
              </div>
            </div>
          )}

          {/* STEP 2 — Расходы */}
          {step===2 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-white/50 text-sm">Укажите плановые расходы по статьям. Фактические суммы сможете внести позже.</p>
              <div className="space-y-2">
                {expenses.map(exp => (
                  <div key={exp.id} className="glass rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <select value={exp.category} onChange={e=>setExp(exp.id,"category",e.target.value)}
                        className="glass rounded-lg px-3 py-2 text-white/70 outline-none border border-white/10 text-xs appearance-none bg-transparent w-40 shrink-0">
                        {EXPENSE_CATEGORIES.map(c=><option key={c} value={c} className="bg-gray-900">{c}</option>)}
                      </select>
                      <input value={exp.title} onChange={e=>setExp(exp.id,"title",e.target.value)}
                        placeholder="Название статьи расхода"
                        className="flex-1 glass rounded-lg px-3 py-2 text-white placeholder:text-white/25 outline-none border border-white/10 text-sm" />
                      <button onClick={()=>delExp(exp.id)} className="text-white/20 hover:text-neon-pink transition-colors shrink-0"><Icon name="X" size={15}/></button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-white/30 mb-0.5 block">План (₽)</label>
                        <input type="number" value={exp.amountPlan||""} onChange={e=>setExp(exp.id,"amountPlan",e.target.value)}
                          placeholder="0" className="w-full glass rounded-lg px-3 py-2 text-neon-cyan placeholder:text-white/20 outline-none border border-white/10 text-sm" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-white/30 mb-0.5 block">Факт (₽)</label>
                        <input type="number" value={exp.amountFact||""} onChange={e=>setExp(exp.id,"amountFact",e.target.value)}
                          placeholder="0" className="w-full glass rounded-lg px-3 py-2 text-neon-green placeholder:text-white/20 outline-none border border-white/10 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addExp} className="w-full flex items-center justify-center gap-2 py-2.5 glass rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/30 transition-all text-sm">
                <Icon name="Plus" size={15}/>Добавить статью расхода
              </button>
              <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-white/50 text-sm">Итого расходов (план)</span>
                <span className="font-oswald font-bold text-xl text-neon-pink">{new Intl.NumberFormat("ru-RU").format(totalExpPlan)} ₽</span>
              </div>
            </div>
          )}

          {/* STEP 3 — Доходы */}
          {step===3 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-white/50 text-sm">Укажите категории билетов, их количество и цену.</p>
              <div className="space-y-2">
                {incomeLines.map(inc => (
                  <div key={inc.id} className="glass rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={inc.category} onChange={e=>setInc(inc.id,"category",e.target.value)}
                        placeholder="Категория (Партер, VIP...)"
                        className="flex-1 glass rounded-lg px-3 py-2 text-white placeholder:text-white/25 outline-none border border-white/10 text-sm" />
                      <button onClick={()=>delInc(inc.id)} className="text-white/20 hover:text-neon-pink transition-colors shrink-0"><Icon name="X" size={15}/></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-white/30 mb-0.5 block">Кол-во билетов</label>
                        <input type="number" value={inc.ticketCount||""} onChange={e=>setInc(inc.id,"ticketCount",e.target.value)}
                          placeholder="0" className="w-full glass rounded-lg px-3 py-2 text-white placeholder:text-white/20 outline-none border border-white/10 text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 mb-0.5 block">Цена, ₽</label>
                        <input type="number" value={inc.ticketPrice||""} onChange={e=>setInc(inc.id,"ticketPrice",e.target.value)}
                          placeholder="0" className="w-full glass rounded-lg px-3 py-2 text-neon-cyan placeholder:text-white/20 outline-none border border-white/10 text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 mb-0.5 block">Итог (план)</label>
                        <div className="w-full glass rounded-lg px-3 py-2 text-neon-green text-sm font-medium">
                          {new Intl.NumberFormat("ru-RU").format(Number(inc.ticketCount)*Number(inc.ticketPrice))} ₽
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addInc} className="w-full flex items-center justify-center gap-2 py-2.5 glass rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/30 transition-all text-sm">
                <Icon name="Plus" size={15}/>Добавить категорию билетов
              </button>
              <div className="grid grid-cols-3 gap-3">
                <div className="glass rounded-xl px-4 py-3 text-center">
                  <p className="text-white/40 text-xs mb-1">Доход план</p>
                  <p className="font-oswald font-bold text-lg text-neon-green">{new Intl.NumberFormat("ru-RU").format(totalIncPlan)} ₽</p>
                </div>
                <div className="glass rounded-xl px-4 py-3 text-center">
                  <p className="text-white/40 text-xs mb-1">Расходы план</p>
                  <p className="font-oswald font-bold text-lg text-neon-pink">{new Intl.NumberFormat("ru-RU").format(totalExpPlan)} ₽</p>
                </div>
                <div className={`glass rounded-xl px-4 py-3 text-center border ${profitPreview>=0?"border-neon-green/20":"border-neon-pink/20"}`}>
                  <p className="text-white/40 text-xs mb-1">Разница</p>
                  <p className={`font-oswald font-bold text-lg ${profitPreview>=0?"text-neon-green":"text-neon-pink"}`}>{profitPreview>=0?"+":""}{new Intl.NumberFormat("ru-RU").format(profitPreview)} ₽</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — Налоги */}
          {step===4 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-white/50 text-sm">Выберите систему налогообложения для расчёта чистой прибыли.</p>
              <div className="space-y-2">
                {TAX_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={()=>set("taxSystem",opt.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${form.taxSystem===opt.value?"bg-neon-purple/20 border-neon-purple/50":"glass border-white/10 hover:border-white/25"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${form.taxSystem===opt.value?"border-neon-purple bg-neon-purple":"border-white/30"}`}>
                      {form.taxSystem===opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                    </div>
                    <span className={`text-sm ${form.taxSystem===opt.value?"text-white":"text-white/60"}`}>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Итоговый расчёт */}
              {(() => {
                const rate = form.taxSystem==="none"?0:form.taxSystem==="usn_6"?0.06:form.taxSystem==="usn_15"?0.15:form.taxSystem==="osn"?0.20:0.06;
                const taxBase = form.taxSystem==="usn_15"?Math.max(0,totalIncPlan-totalExpPlan):totalIncPlan;
                const tax = taxBase * rate;
                const profit = totalIncPlan - totalExpPlan - tax;
                return (
                  <div className="glass rounded-2xl p-5 space-y-3">
                    <h3 className="font-oswald font-semibold text-white flex items-center gap-2"><Icon name="Calculator" size={16} className="text-neon-purple"/>Предварительный расчёт</h3>
                    {[
                      ["Доходы (план)", totalIncPlan, "text-neon-green"],
                      ["Расходы (план)", -totalExpPlan, "text-neon-pink"],
                      ...(tax>0?[["Налог (" + (rate*100).toFixed(0) + "%)", -tax, "text-neon-cyan"] as [string,number,string]]:[]),
                    ].map(([label,val,cls],i)=>(
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-white/50 text-sm">{label as string}</span>
                        <span className={`font-oswald font-bold text-lg ${cls as string}`}>{(val as number)>=0?"+":""}{new Intl.NumberFormat("ru-RU").format(val as number)} ₽</span>
                      </div>
                    ))}
                    <div className="h-px bg-white/10"/>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Чистая прибыль</span>
                      <span className={`font-oswald font-bold text-2xl ${profit>=0?"gradient-text":"text-neon-pink"}`}>{profit>=0?"+":""}{new Intl.NumberFormat("ru-RU").format(profit)} ₽</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-4 py-3 border border-neon-pink/20">
              <Icon name="AlertCircle" size={14}/>{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 shrink-0">
          <button onClick={()=>step>1?setStep(s=>s-1):onClose()} className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-white/60 hover:text-white text-sm transition-colors">
            <Icon name="ChevronLeft" size={16}/>{step===1?"Отмена":"Назад"}
          </button>
          {step<STEPS.length?(
            <button onClick={()=>{setError("");setStep(s=>s+1);}}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 text-sm">
              Далее<Icon name="ChevronRight" size={16}/>
            </button>
          ):(
            <button onClick={handleSubmit} disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 text-sm">
              {loading?<><Icon name="Loader2" size={16} className="animate-spin"/>Создаём...</>:<><Icon name="Check" size={16}/>Создать проект</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

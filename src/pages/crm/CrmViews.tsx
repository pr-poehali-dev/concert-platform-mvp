import { useState } from "react";
import { type Company, type Deal, type Task, type Goal, STAGES, PRIORITIES, TASK_STATUSES, CAT_LABELS, CAT_COLORS, css, fmt, KPI, Bar, Bdg, Modal, Field, Empty } from "./CrmCore";

// ─── Tab type (shared) ────────────────────────────────────────────────────────
export type Tab = "dashboard"|"deals"|"companies"|"tasks"|"goals";

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function Dashboard({ deals, tasks, goals, companies, onTab }: { deals: Deal[]; tasks: Task[]; goals: Goal[]; companies: Company[]; onTab: (t: Tab) => void }) {
  const isEmpty = deals.length === 0 && tasks.length === 0 && companies.length === 0 && goals.length === 0;
  const revenue = deals.filter(d => d.stage === "won").reduce((s, d) => s + d.amount, 0);
  const pipeline = deals.filter(d => !["won","lost"].includes(d.stage)).reduce((s, d) => s + d.amount * d.probability / 100, 0);
  const overdue = tasks.filter(t => t.status !== "done" && new Date(t.deadline) < new Date()).length;
  const wonRate = deals.length ? Math.round(deals.filter(d => d.stage === "won").length / deals.length * 100) : 0;
  const topDeals = [...deals].filter(d => !["won","lost"].includes(d.stage)).sort((a,b) => b.amount - a.amount).slice(0,5);
  const urgent = [...tasks].filter(t => t.status !== "done").sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0,5);

  if (isEmpty) {
    return (
      <div style={{ padding: 16, maxWidth: 700, margin: "0 auto" }}>
        <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: "#fff", letterSpacing: -0.5 }}>Дашборд</div>
        <div style={{ fontSize: 15, color: "#c9d1d9", marginBottom: 32, lineHeight: 1.5 }}>Добро пожаловать в CRM — управляйте клиентами, сделками и задачами в одном месте</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 32 }}>
          {[
            { icon: "🏢", tab: "companies" as Tab, title: "Компании", hint: "Добавьте первого клиента или партнёра" },
            { icon: "💼", tab: "deals" as Tab, title: "Сделки", hint: "Ведите воронку продаж и переговоры" },
            { icon: "✅", tab: "tasks" as Tab, title: "Задачи", hint: "Планируйте работу команды" },
            { icon: "🎯", tab: "goals" as Tab, title: "Цели", hint: "Ставьте цели и отслеживайте прогресс" },
          ].map(item => (
            <div key={item.tab} onClick={() => onTab(item.tab)}
              style={{ ...css.card, cursor: "pointer", textAlign: "center", padding: 24, transition: "border-color .2s", borderColor: "#21262d" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#a855f7")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#21262d")}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#8b949e" }}>{item.hint}</div>
            </div>
          ))}
        </div>

        <div style={{ ...css.card, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🚀 С чего начать?</div>
          {[
            { n: 1, text: "Добавьте компанию — клиента или партнёра", tab: "companies" as Tab },
            { n: 2, text: "Создайте первую сделку и укажите сумму", tab: "deals" as Tab },
            { n: 3, text: "Добавьте задачи для команды", tab: "tasks" as Tab },
            { n: 4, text: "Поставьте цели на квартал или год", tab: "goals" as Tab },
          ].map(step => (
            <div key={step.n} onClick={() => onTab(step.tab)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #21262d", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#1c2333")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#a855f722", color: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{step.n}</div>
              <div style={{ fontSize: 13, flex: 1 }}>{step.text}</div>
              <div style={{ color: "#8b949e", fontSize: 16 }}>→</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 18, color: "#fff", letterSpacing: -0.5, background: "linear-gradient(90deg,#fff,#c9d1d9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Дашборд</div>
      <div style={{ ...css.g4, marginBottom: 16 }}>
        <KPI label="Выручка" value={fmt.money(revenue)} accent="#a855f7" sub={`${deals.filter(d=>d.stage==="won").length} сделок`} />
        <KPI label="Pipeline" value={fmt.money(pipeline)} accent="#22d3ee" sub={`${deals.filter(d=>!["won","lost"].includes(d.stage)).length} активных`} />
        <KPI label="Конверсия" value={`${wonRate}%`} accent="#4ade80" sub={`${deals.length} сделок всего`} />
        <KPI label="Просрочено задач" value={String(overdue)} accent="#f43f5e" sub={`${tasks.filter(t=>t.status!=="done").length} открытых`} />
      </div>

      <div style={{ ...css.g2, marginBottom: 16 }}>
        <div style={css.card}>
          <div style={{ fontSize: 12, color: "#8b949e", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Воронка</div>
          {STAGES.map(s => { const cnt = deals.filter(d => d.stage === s.id).length; return (
            <div key={s.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span>{s.label}</span><span style={{ color: "#8b949e" }}>{cnt}</span></div>
              <Bar pct={deals.length ? cnt/deals.length*100 : 0} color={s.color} h={8} />
            </div>
          ); })}
        </div>
        <div style={css.card}>
          <div style={{ fontSize: 12, color: "#8b949e", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Топ сделки</div>
          {topDeals.length ? topDeals.map(d => { const st = STAGES.find(s => s.id === d.stage); return (
            <div key={d.id} style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #21262d" }}>
              <div style={{ width: 4, height: 36, background: st?.color, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div><div style={{ fontSize: 11, color: "#8b949e" }}>{d.companyName}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 13, fontWeight: 600, color: "#a855f7" }}>{fmt.money(d.amount)}</div><div style={{ fontSize: 11, color: "#8b949e" }}>{d.probability}%</div></div>
            </div>
          ); }) : <div style={{ color: "#8b949e", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Нет открытых сделок</div>}
        </div>
      </div>

      <div style={{ ...css.g2, marginBottom: 16 }}>
        <div style={css.card}>
          <div style={{ fontSize: 12, color: "#8b949e", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Срочные задачи</div>
          {urgent.length ? urgent.map(t => { const p = PRIORITIES.find(x => x.id === t.priority); const od = new Date(t.deadline) < new Date(); return (
            <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #21262d" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p?.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
              <div style={{ fontSize: 11, color: od ? "#f43f5e" : "#8b949e", flexShrink: 0 }}>{fmt.date(t.deadline)}</div>
            </div>
          ); }) : <div style={{ color: "#8b949e", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Нет открытых задач</div>}
        </div>
        <div style={css.card}>
          <div style={{ fontSize: 12, color: "#8b949e", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Цели</div>
          {goals.length ? goals.slice(0,4).map(g => { const pct = Math.min(100, Math.round(g.current/g.target*100)); const color = pct>=80?"#4ade80":pct>=50?"#a855f7":"#f59e0b"; return (
            <div key={g.id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{g.title}</span><span style={{ color, fontWeight: 600 }}>{pct}%</span></div>
              <Bar pct={pct} color={color} />
            </div>
          ); }) : <div style={{ color: "#8b949e", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Нет целей</div>}
        </div>
      </div>

      <div style={css.card}>
        <div style={{ fontSize: 12, color: "#8b949e", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Компании</div>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {[["active","Активных","#a855f7"],["lead","Лидов","#22d3ee"],["inactive","Неактивных","#8b949e"]].map(([st,lb,cl]) => (
            <div key={st}><div style={{ fontSize: 24, fontWeight: 700, color: cl }}>{companies.filter(c=>c.status===st).length}</div><div style={{ fontSize: 12, color: "#8b949e" }}>{lb}</div></div>
          ))}
          <div><div style={{ fontSize: 24, fontWeight: 700 }}>{companies.length}</div><div style={{ fontSize: 12, color: "#8b949e" }}>Всего</div></div>
        </div>
      </div>
    </div>
  );
}

// ─── Companies ────────────────────────────────────────────────────────────────
export function Companies({ companies, saveCompany, deleteCompany }: { companies: Company[]; saveCompany: (d: Partial<Company>) => Promise<void>; deleteCompany: (id: string) => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Company|null|"new">(null);
  const [form, setForm] = useState<Partial<Company>>({});
  const SC = { active:"#4ade80", inactive:"#8b949e", lead:"#f59e0b" } as Record<string,string>;
  const SL = { active:"Активный", inactive:"Неактивный", lead:"Лид" } as Record<string,string>;
  const filtered = companies.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())||c.contact.toLowerCase().includes(search.toLowerCase()));
  const open = (c: Company|"new") => { setForm(c==="new"?{status:"lead"}:{...c}); setModal(c); };
  const close = () => setModal(null);
  const save = async () => { if (!form.name) return; await saveCompany(form); close(); };
  const del = async (id: string) => { await deleteCompany(id); close(); };

  return (
    <div style={{ padding:16, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:-0.5 }}>Компании</div>
        <button style={{ ...css.btn, background:"linear-gradient(135deg,#a855f7 0%,#6366f1 100%)", color:"#fff", padding:"12px 22px", fontSize:15 }} onClick={()=>open("new")}>+ Добавить</button>
      </div>
      <div style={{ ...css.g4, marginBottom:16 }}>
        <KPI label="Активных" value={String(companies.filter(c=>c.status==="active").length)} accent="#a855f7" />
        <KPI label="Лидов" value={String(companies.filter(c=>c.status==="lead").length)} accent="#22d3ee" />
        <KPI label="Всего" value={String(companies.length)} accent="#4ade80" />
        <KPI label="Выручка" value={fmt.money(companies.reduce((s,c)=>s+c.revenue,0))} accent="#f59e0b" />
      </div>
      <div style={{ position:"relative", marginBottom:16 }}>
        <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#8b949e" }}>🔍</span>
        <input style={{ ...css.input, paddingLeft:34 }} placeholder="Поиск..." value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      {companies.length === 0 && (
        <Empty icon="🏢" title="Нет компаний" hint="Добавьте клиентов и партнёров — укажите контакты, отрасль и выручку" action="Добавить компанию" onAction={() => open("new")} />
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map(c=>(
          <div key={c.id} style={{ ...css.card, cursor:"pointer", display:"flex", alignItems:"center", gap:12 }} onClick={()=>open(c)}>
            <div style={{ width:44,height:44,borderRadius:"50%",background:"#a855f722",color:"#a855f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,flexShrink:0 }}>{fmt.initials(c.name)}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:2 }}>
                <span style={{ fontSize:15,fontWeight:600 }}>{c.name}</span>
                <Bdg label={SL[c.status]||c.status} color={SC[c.status]||"#8b949e"} />
              </div>
              <div style={{ fontSize:12,color:"#8b949e" }}>{c.industry} · {c.city} · {c.contact}</div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontSize:14,fontWeight:700,color:"#a855f7" }}>{fmt.money(c.revenue)}</div>
              <div style={{ fontSize:11,color:"#8b949e" }}>{c.deals} сделок</div>
            </div>
          </div>
        ))}
      </div>
      {modal&&(
        <Modal title={modal==="new"?"Новая компания":(modal as Company).name} onClose={close}
          footer={<>{modal!=="new"&&<button style={{ ...css.btn,background:"#f43f5e22",color:"#f43f5e" }} onClick={()=>del((modal as Company).id)}>Удалить</button>}<button style={{ ...css.btn,background:"#21262d",color:"#f0f6fc" }} onClick={close}>Отмена</button><button style={{ ...css.btn,background:"linear-gradient(135deg,#a855f7 0%,#6366f1 100%)",color:"#fff" }} onClick={save}>Сохранить</button></>}>
          <Field label="Название *"><input style={css.input} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></Field>
          <div style={css.g2}>
            <Field label="Отрасль"><input style={css.input} value={form.industry||""} onChange={e=>setForm(f=>({...f,industry:e.target.value}))} /></Field>
            <Field label="Статус"><select style={css.input} value={form.status||"lead"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="lead">Лид</option><option value="active">Активный</option><option value="inactive">Неактивный</option></select></Field>
          </div>
          <Field label="Выручка ₽"><input style={css.input} type="number" value={form.revenue||""} onChange={e=>setForm(f=>({...f,revenue:+e.target.value}))} /></Field>
          <Field label="Контакт"><input style={css.input} value={form.contact||""} onChange={e=>setForm(f=>({...f,contact:e.target.value}))} /></Field>
          <div style={css.g2}>
            <Field label="Телефон"><input style={css.input} value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></Field>
            <Field label="Город"><input style={css.input} value={form.city||""} onChange={e=>setForm(f=>({...f,city:e.target.value}))} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export function Tasks({ tasks, saveTask, deleteTask }: { tasks: Task[]; saveTask: (d: Partial<Task>) => Promise<void>; deleteTask: (id: string) => Promise<void> }) {
  const [filter, setFilter] = useState("");
  const [modal, setModal] = useState<Task|null|"new">(null);
  const [form, setForm] = useState<Partial<Task>>({});
  const filtered = tasks.filter(t=>!filter||t.status===filter);
  const open = (t: Task|"new") => { setForm(t==="new"?{status:"todo",priority:"medium"}:{...t}); setModal(t); };
  const close = () => setModal(null);
  const save = async () => { if (!form.title) return; await saveTask({ ...form, subtasks: form.subtasks || [] }); close(); };
  const del = async (id: string) => { await deleteTask(id); close(); };
  const toggle = async (id: string) => {
    const t = tasks.find(x => x.id === id);
    if (t) await saveTask({ ...t, status: t.status === "done" ? "todo" : "done" });
  };

  return (
    <div style={{ padding:16, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:-0.5 }}>Задачи</div>
        <button style={{ ...css.btn, background:"linear-gradient(135deg,#a855f7 0%,#6366f1 100%)", color:"#fff", padding:"12px 22px", fontSize:15 }} onClick={()=>open("new")}>+ Задача</button>
      </div>
      <div style={{ ...css.g4, marginBottom:16 }}>
        <KPI label="Просрочено" value={String(tasks.filter(t=>t.status!=="done"&&new Date(t.deadline)<new Date()).length)} accent="#f43f5e" />
        <KPI label="В работе" value={String(tasks.filter(t=>t.status==="in_progress").length)} accent="#a855f7" />
        <KPI label="Выполнено" value={String(tasks.filter(t=>t.status==="done").length)} accent="#4ade80" />
        <KPI label="Всего" value={String(tasks.length)} accent="#22d3ee" />
      </div>
      <div style={{ display:"flex", gap:4, background:"#1c2333", borderRadius:6, padding:4, marginBottom:16, flexWrap:"wrap" }}>
        <button onClick={()=>setFilter("")} style={{ ...css.btn,background:!filter?"#a855f7":"none",color:!filter?"#fff":"#8b949e",padding:"6px 12px",fontSize:13 }}>Все</button>
        {TASK_STATUSES.map(s=><button key={s.id} onClick={()=>setFilter(s.id)} style={{ ...css.btn,background:filter===s.id?s.color:"none",color:filter===s.id?"#fff":"#8b949e",padding:"6px 12px",fontSize:13 }}>{s.label}</button>)}
      </div>
      {tasks.length === 0 && (
        <Empty icon="✅" title="Нет задач" hint="Создайте первую задачу — назначьте исполнителя, приоритет и дедлайн" action="Создать задачу" onAction={() => open("new")} />
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(t=>{ const st=TASK_STATUSES.find(s=>s.id===t.status); const p=PRIORITIES.find(x=>x.id===t.priority); const od=t.status!=="done"&&new Date(t.deadline)<new Date(); const sd=t.subtasks?.filter(s=>s.done).length||0; const st2=t.subtasks?.length||0; return (
          <div key={t.id} style={{ ...css.card, opacity:t.status==="done"?0.6:1 }}>
            <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
              <div onClick={()=>toggle(t.id)} style={{ width:20,height:20,borderRadius:"50%",border:`2px solid ${st?.color}`,background:t.status==="done"?st?.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,marginTop:2 }}>
                {t.status==="done"&&<span style={{ color:"#fff",fontSize:11 }}>✓</span>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14,fontWeight:500,textDecoration:t.status==="done"?"line-through":"none",color:t.status==="done"?"#8b949e":"#f0f6fc" }}>{t.title}</div>
                <div style={{ display:"flex",gap:8,marginTop:4,flexWrap:"wrap",alignItems:"center" }}>
                  <Bdg label={p?.label||""} color={p?.color||"#6b7280"} />
                  <Bdg label={st?.label||""} color={st?.color||"#6b7280"} />
                  <span style={{ fontSize:11,color:od?"#f43f5e":"#8b949e" }}>{od?"⚠ ":""}{fmt.date(t.deadline)}</span>
                </div>
                {st2>0&&<div style={{ marginTop:6 }}><Bar pct={sd/st2*100} color="#22d3ee" /><div style={{ fontSize:11,color:"#8b949e",marginTop:2 }}>{sd}/{st2} подзадач</div></div>}
              </div>
              <button onClick={()=>open(t)} style={{ ...css.btn,background:"#21262d",color:"#8b949e",padding:"4px 8px",fontSize:12,flexShrink:0 }}>✏️</button>
            </div>
          </div>
        );})}
      </div>
      {modal&&(
        <Modal title={modal==="new"?"Новая задача":(modal as Task).title} onClose={close}
          footer={<>{modal!=="new"&&<button style={{ ...css.btn,background:"#f43f5e22",color:"#f43f5e" }} onClick={()=>del((modal as Task).id)}>Удалить</button>}<button style={{ ...css.btn,background:"#21262d",color:"#f0f6fc" }} onClick={close}>Отмена</button><button style={{ ...css.btn,background:"linear-gradient(135deg,#a855f7 0%,#6366f1 100%)",color:"#fff" }} onClick={save}>Сохранить</button></>}>
          <Field label="Название *"><input style={css.input} value={form.title||""} onChange={e=>setForm(f=>({...f,title:e.target.value}))} /></Field>
          <Field label="Описание"><textarea style={{ ...css.input,resize:"vertical" }} rows={2} value={form.description||""} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></Field>
          <div style={css.g2}>
            <Field label="Статус"><select style={css.input} value={form.status||"todo"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{TASK_STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
            <Field label="Приоритет"><select style={css.input} value={form.priority||"medium"} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>{PRIORITIES.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></Field>
          </div>
          <Field label="Исполнитель"><input style={css.input} value={form.assignee||""} onChange={e=>setForm(f=>({...f,assignee:e.target.value}))} /></Field>
          <Field label="Дедлайн"><input style={{ ...css.input,colorScheme:"dark" }} type="date" value={form.deadline?.split("T")[0]||""} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} /></Field>
        </Modal>
      )}
    </div>
  );
}

// ─── Goals ────────────────────────────────────────────────────────────────────
export function Goals({ goals, saveGoal, deleteGoal }: { goals: Goal[]; saveGoal: (d: Partial<Goal>) => Promise<void>; deleteGoal: (id: string) => Promise<void> }) {
  const [modal, setModal] = useState<Goal|null|"new">(null);
  const [form, setForm] = useState<Partial<Goal>>({});
  const [prog, setProg] = useState<Record<string,string>>({});
  const active = goals.filter(g=>g.status!=="done");
  const done = goals.filter(g=>g.status==="done");
  const avg = active.length?Math.round(active.reduce((s,g)=>s+g.current/g.target*100,0)/active.length):0;
  const open = (g: Goal|"new") => { setForm(g==="new"?{category:"revenue",unit:"₽",current:0}:{...g}); setModal(g); };
  const close = () => setModal(null);
  const save = async () => { if (!form.title||!form.target) return; await saveGoal({ ...form, team: form.team || [] }); close(); };
  const del = async (id: string) => { await deleteGoal(id); close(); };
  const upd = async (id: string) => {
    const val=parseFloat(prog[id]||"0"); const g=goals.find(x=>x.id===id); if(!g) return;
    await saveGoal({ ...g, current: val });
    setProg(p=>({...p,[id]:""}));
  };

  return (
    <div style={{ padding:16, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:-0.5 }}>Цели</div>
        <button style={{ ...css.btn, background:"linear-gradient(135deg,#a855f7 0%,#6366f1 100%)", color:"#fff", padding:"12px 22px", fontSize:15 }} onClick={()=>open("new")}>+ Цель</button>
      </div>
      <div style={{ ...css.g4, marginBottom:16 }}>
        <KPI label="Активных" value={String(active.length)} accent="#a855f7" />
        <KPI label="Завершённых" value={String(done.length)} accent="#4ade80" />
        <KPI label="Ср. прогресс" value={`${avg}%`} accent="#22d3ee" />
        <KPI label="Всего" value={String(goals.length)} accent="#f59e0b" />
      </div>
      {goals.length === 0 && (
        <Empty icon="🎯" title="Нет целей" hint="Поставьте цели на квартал или год — отслеживайте выручку, клиентов и конверсию" action="Создать цель" onAction={() => open("new")} />
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {goals.map(g=>{ const pct=Math.min(100,Math.round(g.current/g.target*100)); const color=CAT_COLORS[g.category]||"#a855f7"; const isDone=g.status==="done"; return (
          <div key={g.id} style={{ ...css.card, opacity:isDone?0.7:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:15,fontWeight:600 }}>{g.title}</span>
                  <span style={{ background:color+"22",color,borderRadius:12,padding:"2px 10px",fontSize:12,fontWeight:600 }}>{CAT_LABELS[g.category]||g.category}</span>
                </div>
                {g.description&&<div style={{ fontSize:12,color:"#8b949e" }}>{g.description}</div>}
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                <button onClick={()=>open(g)} style={{ ...css.btn,background:"#21262d",color:"#8b949e",padding:"4px 8px",fontSize:12 }}>✏️</button>
              </div>
            </div>
            <div style={{ marginBottom:8 }}>
              <Bar pct={pct} color={isDone?"#4ade80":color} h={10} />
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginTop:4 }}>
                <span style={{ fontWeight:700,color:isDone?"#4ade80":color }}>{pct}%</span>
                <span><span style={{ color:"#f0f6fc",fontWeight:600 }}>{fmt.num(g.current)} {g.unit}</span> из {fmt.num(g.target)} {g.unit}</span>
                <span>{fmt.date(g.deadline)}</span>
              </div>
            </div>
            {g.status!=="done"&&(
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <input style={{ ...css.input,flex:1 }} type="number" placeholder={`Текущее (${fmt.num(g.current)})`} value={prog[g.id]||""} onChange={e=>setProg(p=>({...p,[g.id]:e.target.value}))} />
                <button style={{ ...css.btn,background:"#a855f7",color:"#fff",flexShrink:0 }} onClick={()=>upd(g.id)}>Обновить</button>
              </div>
            )}
          </div>
        );})}
      </div>
      {modal&&(
        <Modal title={modal==="new"?"Новая цель":(modal as Goal).title} onClose={close}
          footer={<>{modal!=="new"&&<button style={{ ...css.btn,background:"#f43f5e22",color:"#f43f5e" }} onClick={()=>del((modal as Goal).id)}>Удалить</button>}<button style={{ ...css.btn,background:"#21262d",color:"#f0f6fc" }} onClick={close}>Отмена</button><button style={{ ...css.btn,background:"linear-gradient(135deg,#a855f7 0%,#6366f1 100%)",color:"#fff" }} onClick={save}>Сохранить</button></>}>
          <Field label="Название *"><input style={css.input} value={form.title||""} onChange={e=>setForm(f=>({...f,title:e.target.value}))} /></Field>
          <Field label="Описание"><textarea style={{ ...css.input,resize:"vertical" }} rows={2} value={form.description||""} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></Field>
          <Field label="Категория"><select style={css.input} value={form.category||"revenue"} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{Object.entries(CAT_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
          <div style={css.g2}>
            <Field label="Цель *"><input style={css.input} type="number" value={form.target||""} onChange={e=>setForm(f=>({...f,target:+e.target.value}))} /></Field>
            <Field label="Текущее"><input style={css.input} type="number" value={form.current??""} onChange={e=>setForm(f=>({...f,current:+e.target.value}))} /></Field>
          </div>
          <Field label="Единица (₽/%)"><input style={css.input} value={form.unit||""} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} /></Field>
          <Field label="Дедлайн"><input style={{ ...css.input,colorScheme:"dark" }} type="date" value={form.deadline?.split("T")[0]||""} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} /></Field>
        </Modal>
      )}
    </div>
  );
}

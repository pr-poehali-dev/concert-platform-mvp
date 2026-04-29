import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Company { id: string; name: string; industry: string; status: string; revenue: number; contact: string; phone: string; email: string; city: string; deals: number; tasks: number; createdAt: string; }
interface Deal { id: string; title: string; companyId: string; companyName: string; stage: string; amount: number; probability: number; assignee: string; deadline: string; description: string; tags: string[]; createdAt: string; }
interface Task { id: string; title: string; description: string; status: string; priority: string; assignee: string; deadline: string; subtasks: { id: string; title: string; done: boolean }[]; createdAt: string; }
interface Goal { id: string; title: string; description: string; category: string; target: number; current: number; unit: string; deadline: string; owner: string; team: string[]; status: string; createdAt: string; }

// ─── Config ───────────────────────────────────────────────────────────────────
const STAGES = [
  { id: "lead", label: "Лид", color: "#6366f1" },
  { id: "negotiation", label: "Переговоры", color: "#a855f7" },
  { id: "proposal", label: "Предложение", color: "#22d3ee" },
  { id: "won", label: "Выиграно", color: "#4ade80" },
  { id: "lost", label: "Проиграно", color: "#f43f5e" },
];
const PRIORITIES = [
  { id: "low", label: "Низкий", color: "#6b7280" },
  { id: "medium", label: "Средний", color: "#f59e0b" },
  { id: "high", label: "Высокий", color: "#f43f5e" },
];
const TASK_STATUSES = [
  { id: "todo", label: "К выполнению", color: "#6366f1" },
  { id: "in_progress", label: "В работе", color: "#a855f7" },
  { id: "review", label: "На проверке", color: "#22d3ee" },
  { id: "done", label: "Готово", color: "#4ade80" },
];
const CAT_LABELS: Record<string, string> = { revenue: "Выручка", clients: "Клиенты", deals: "Сделки", quality: "Качество", tasks: "Задачи", conversion: "Конверсия", hr: "HR", efficiency: "Эффективность" };
const CAT_COLORS: Record<string, string> = { revenue: "#a855f7", clients: "#22d3ee", deals: "#4ade80", quality: "#f59e0b", tasks: "#6366f1", conversion: "#ec4899", hr: "#f97316", efficiency: "#14b8a6" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmt = {
  money: (n: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n),
  date: (d: string) => d ? new Date(d).toLocaleDateString("ru-RU") : "—",
  initials: (name: string) => name?.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || "?",
  num: (n: number) => new Intl.NumberFormat("ru-RU").format(n),
};

// ─── Storage + mock data ──────────────────────────────────────────────────────
const MOCK_COMPANIES: Company[] = [
  { id: "c001", name: "ООО Альфа Технологии", industry: "IT", status: "active", revenue: 12500000, contact: "Иван Петров", phone: "+7 495 123-45-67", email: "info@alpha.ru", city: "Москва", deals: 3, tasks: 5, createdAt: "2024-01-15T10:00:00Z" },
  { id: "c002", name: "ЗАО БетаСтрой", industry: "Строительство", status: "active", revenue: 34000000, contact: "Мария Сидорова", phone: "+7 812 234-56-78", email: "m@betastroy.ru", city: "СПб", deals: 7, tasks: 12, createdAt: "2024-01-20T11:00:00Z" },
  { id: "c003", name: "АО ДельтаФинанс", industry: "Финансы", status: "active", revenue: 89000000, contact: "Светлана Новикова", phone: "+7 495 456-78-90", email: "s@deltafinance.ru", city: "Москва", deals: 11, tasks: 8, createdAt: "2024-02-10T14:00:00Z" },
  { id: "c004", name: "ООО ЭпсилонМед", industry: "Медицина", status: "lead", revenue: 3200000, contact: "Дмитрий Волков", phone: "+7 383 567-89-01", email: "volkov@epsilon.ru", city: "Новосибирск", deals: 1, tasks: 2, createdAt: "2024-02-15T10:00:00Z" },
  { id: "c005", name: "ЗАО ЗетаРетейл", industry: "Ритейл", status: "active", revenue: 56000000, contact: "Анна Морозова", phone: "+7 863 678-90-12", email: "morozova@zeta.ru", city: "Ростов", deals: 9, tasks: 15, createdAt: "2024-03-01T08:00:00Z" },
  { id: "c006", name: "АО Иота Энерго", industry: "Энергетика", status: "active", revenue: 145000000, contact: "Николай Попов", phone: "+7 495 901-23-45", email: "popov@iota.ru", city: "Москва", deals: 14, tasks: 20, createdAt: "2024-03-20T11:00:00Z" },
];
const MOCK_DEALS: Deal[] = [
  { id: "d001", title: "Внедрение ERP системы", companyId: "c001", companyName: "ООО Альфа Технологии", stage: "won", amount: 4500000, probability: 100, assignee: "Иван Смирнов", deadline: "2024-06-30T00:00:00Z", description: "", tags: ["ERP"], createdAt: "2024-01-20T10:00:00Z" },
  { id: "d002", title: "Поставка материалов", companyId: "c002", companyName: "ЗАО БетаСтрой", stage: "negotiation", amount: 12000000, probability: 65, assignee: "Мария Волкова", deadline: "2024-07-15T00:00:00Z", description: "", tags: [], createdAt: "2024-02-01T09:00:00Z" },
  { id: "d003", title: "Аудит отчётности", companyId: "c003", companyName: "АО ДельтаФинанс", stage: "proposal", amount: 800000, probability: 75, assignee: "Алексей Петров", deadline: "2024-07-01T00:00:00Z", description: "", tags: [], createdAt: "2024-02-15T10:00:00Z" },
  { id: "d004", title: "Мобильное приложение", companyId: "c005", companyName: "ЗАО ЗетаРетейл", stage: "in_progress", amount: 3500000, probability: 80, assignee: "Дмитрий Новиков", deadline: "2024-08-01T00:00:00Z", description: "", tags: [], createdAt: "2024-03-01T10:00:00Z" },
  { id: "d005", title: "Поставка медоборудования", companyId: "c004", companyName: "ООО ЭпсилонМед", stage: "lead", amount: 6700000, probability: 30, assignee: "Мария Волкова", deadline: "2024-09-01T00:00:00Z", description: "", tags: [], createdAt: "2024-03-15T11:00:00Z" },
  { id: "d006", title: "Энергоаудит предприятий", companyId: "c006", companyName: "АО Иота Энерго", stage: "proposal", amount: 2300000, probability: 70, assignee: "Алексей Петров", deadline: "2024-07-20T00:00:00Z", description: "", tags: [], createdAt: "2024-03-20T10:00:00Z" },
  { id: "d007", title: "Жилой комплекс Северный", companyId: "c002", companyName: "ЗАО БетаСтрой", stage: "negotiation", amount: 87000000, probability: 60, assignee: "Иван Смирнов", deadline: "2024-10-01T00:00:00Z", description: "", tags: [], createdAt: "2024-04-15T11:00:00Z" },
  { id: "d008", title: "CRM внедрение", companyId: "c001", companyName: "ООО Альфа Технологии", stage: "lost", amount: 1800000, probability: 0, assignee: "Алексей Петров", deadline: "2024-05-30T00:00:00Z", description: "", tags: [], createdAt: "2024-05-10T09:00:00Z" },
];
const MOCK_TASKS: Task[] = [
  { id: "t001", title: "Подготовить КП для Альфа", description: "", status: "done", priority: "high", assignee: "Иван Смирнов", deadline: "2024-06-10T00:00:00Z", subtasks: [{ id: "s1", title: "Собрать требования", done: true }], createdAt: "2024-06-01T10:00:00Z" },
  { id: "t002", title: "Провести презентацию для БетаСтрой", description: "", status: "in_progress", priority: "high", assignee: "Мария Волкова", deadline: "2024-07-05T00:00:00Z", subtasks: [{ id: "s3", title: "Подготовить слайды", done: true }, { id: "s4", title: "Согласовать время", done: false }], createdAt: "2024-06-05T09:00:00Z" },
  { id: "t003", title: "Запросить документы у ДельтаФинанс", description: "", status: "todo", priority: "medium", assignee: "Алексей Петров", deadline: "2024-06-25T00:00:00Z", subtasks: [], createdAt: "2024-06-08T11:00:00Z" },
  { id: "t004", title: "Звонок с клиентом ЗетаРетейл", description: "", status: "in_progress", priority: "high", assignee: "Дмитрий Новиков", deadline: "2024-06-30T00:00:00Z", subtasks: [{ id: "s5", title: "Подготовить вопросы", done: true }, { id: "s6", title: "Провести звонок", done: false }], createdAt: "2024-06-10T10:00:00Z" },
  { id: "t005", title: "Согласовать договор Иота Энерго", description: "", status: "todo", priority: "medium", assignee: "Алексей Петров", deadline: "2024-07-15T00:00:00Z", subtasks: [], createdAt: "2024-06-14T11:00:00Z" },
  { id: "t006", title: "Подготовить отчёт Q2", description: "", status: "in_progress", priority: "high", assignee: "Иван Смирнов", deadline: "2024-07-01T00:00:00Z", subtasks: [{ id: "s7", title: "Собрать данные", done: true }, { id: "s8", title: "Написать резюме", done: false }], createdAt: "2024-06-18T09:00:00Z" },
];
const MOCK_GOALS: Goal[] = [
  { id: "g001", title: "Выручка Q3 2024", description: "Достичь 50 млн", category: "revenue", target: 50000000, current: 34500000, unit: "₽", deadline: "2024-09-30T00:00:00Z", owner: "Иван Смирнов", team: ["Иван Смирнов", "Мария Волкова"], status: "in_progress", createdAt: "2024-07-01T10:00:00Z" },
  { id: "g002", title: "Новые клиенты Q3", description: "15 новых клиентов", category: "clients", target: 15, current: 9, unit: "компаний", deadline: "2024-09-30T00:00:00Z", owner: "Мария Волкова", team: ["Мария Волкова"], status: "in_progress", createdAt: "2024-07-01T09:00:00Z" },
  { id: "g003", title: "Конверсия лидов 40%", description: "", category: "conversion", target: 40, current: 31, unit: "%", deadline: "2024-09-30T00:00:00Z", owner: "Иван Смирнов", team: [], status: "in_progress", createdAt: "2024-07-01T10:00:00Z" },
  { id: "g004", title: "Выручка 2024 год", description: "200 млн рублей", category: "revenue", target: 200000000, current: 142000000, unit: "₽", deadline: "2024-12-31T00:00:00Z", owner: "Иван Смирнов", team: ["Иван Смирнов", "Мария Волкова", "Алексей Петров"], status: "in_progress", createdAt: "2024-01-01T10:00:00Z" },
];

const store = {
  get: <T,>(key: string, def: T): T => { try { return JSON.parse(localStorage.getItem("crm_" + key) || "null") ?? def; } catch { return def; } },
  set: <T,>(key: string, val: T) => localStorage.setItem("crm_" + key, JSON.stringify(val)),
};

function useData() {
  const [companies, setCompanies] = useState<Company[]>(() => store.get("companies", MOCK_COMPANIES));
  const [deals, setDeals] = useState<Deal[]>(() => store.get("deals", MOCK_DEALS));
  const [tasks, setTasks] = useState<Task[]>(() => store.get("tasks", MOCK_TASKS));
  const [goals, setGoals] = useState<Goal[]>(() => store.get("goals", MOCK_GOALS));
  const saveCompanies = (d: Company[]) => { setCompanies(d); store.set("companies", d); };
  const saveDeals = (d: Deal[]) => { setDeals(d); store.set("deals", d); };
  const saveTasks = (d: Task[]) => { setTasks(d); store.set("tasks", d); };
  const saveGoals = (d: Goal[]) => { setGoals(d); store.set("goals", d); };
  return { companies, deals, tasks, goals, saveCompanies, saveDeals, saveTasks, saveGoals };
}

// ─── UI primitives ────────────────────────────────────────────────────────────
const css = {
  card: { background: "#161b22", border: "1px solid #21262d", borderRadius: 10, padding: 16 } as React.CSSProperties,
  input: { background: "#1c2333", border: "1px solid #21262d", color: "#f0f6fc", borderRadius: 6, padding: "8px 12px", fontSize: 14, width: "100%", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const },
  btn: { display: "inline-flex" as const, alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "inherit" } as React.CSSProperties,
  g2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 } as React.CSSProperties,
  g4: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 } as React.CSSProperties,
};

function KPI({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div style={{ ...css.card, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Bar({ pct, color = "#a855f7", h = 6 }: { pct: number; color?: string; h?: number }) {
  return <div style={{ height: h, background: "#21262d", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: color, borderRadius: 3, transition: "width .5s" }} /></div>;
}

function Bdg({ label, color }: { label: string; color: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: color + "22", color }}>{label}</span>;
}

function Modal({ title, children, onClose, footer }: { title: string; children: React.ReactNode; onClose: () => void; footer?: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#161b22", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #21262d", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "12px 20px", borderTop: "1px solid #21262d", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 4 }}>{label}</label>{children}</div>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ deals, tasks, goals, companies }: { deals: Deal[]; tasks: Task[]; goals: Goal[]; companies: Company[] }) {
  const revenue = deals.filter(d => d.stage === "won").reduce((s, d) => s + d.amount, 0);
  const pipeline = deals.filter(d => !["won","lost"].includes(d.stage)).reduce((s, d) => s + d.amount * d.probability / 100, 0);
  const overdue = tasks.filter(t => t.status !== "done" && new Date(t.deadline) < new Date()).length;
  const wonRate = deals.length ? Math.round(deals.filter(d => d.stage === "won").length / deals.length * 100) : 0;
  const topDeals = [...deals].filter(d => !["won","lost"].includes(d.stage)).sort((a,b) => b.amount - a.amount).slice(0,5);
  const urgent = [...tasks].filter(t => t.status !== "done").sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0,5);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Дашборд</div>
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
          {topDeals.map(d => { const st = STAGES.find(s => s.id === d.stage); return (
            <div key={d.id} style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #21262d" }}>
              <div style={{ width: 4, height: 36, background: st?.color, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div><div style={{ fontSize: 11, color: "#8b949e" }}>{d.companyName}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 13, fontWeight: 600, color: "#a855f7" }}>{fmt.money(d.amount)}</div><div style={{ fontSize: 11, color: "#8b949e" }}>{d.probability}%</div></div>
            </div>
          ); })}
        </div>
      </div>

      <div style={{ ...css.g2, marginBottom: 16 }}>
        <div style={css.card}>
          <div style={{ fontSize: 12, color: "#8b949e", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Срочные задачи</div>
          {urgent.map(t => { const p = PRIORITIES.find(x => x.id === t.priority); const od = new Date(t.deadline) < new Date(); return (
            <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #21262d" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p?.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div><div style={{ fontSize: 11, color: od ? "#f43f5e" : "#8b949e" }}>{od ? "⚠ " : ""}{fmt.date(t.deadline)}</div></div>
            </div>
          ); })}
        </div>
        <div style={css.card}>
          <div style={{ fontSize: 12, color: "#8b949e", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Цели</div>
          {goals.slice(0,4).map(g => { const pct = Math.min(100, Math.round(g.current/g.target*100)); const color = pct>=80?"#4ade80":pct>=50?"#a855f7":"#f59e0b"; return (
            <div key={g.id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{g.title}</span><span style={{ color, fontWeight: 600 }}>{pct}%</span></div>
              <Bar pct={pct} color={color} />
            </div>
          ); })}
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

// ─── Deals ────────────────────────────────────────────────────────────────────
function Deals({ deals, companies, saveDeals }: { deals: Deal[]; companies: Company[]; saveDeals: (d: Deal[]) => void }) {
  const [view, setView] = useState<"kanban"|"list">("kanban");
  const [modal, setModal] = useState<Deal | null | "new">(null);
  const [form, setForm] = useState<Partial<Deal>>({});
  const [drag, setDrag] = useState<string|null>(null);

  const open = (d: Deal | "new") => { setForm(d === "new" ? { stage:"lead", probability:30, amount:0 } : {...d}); setModal(d); };
  const close = () => setModal(null);
  const save = () => {
    if (!form.title) return;
    const co = companies.find(c => c.id === form.companyId);
    if (modal === "new") saveDeals([...deals, { ...form, id:genId(), companyName:co?.name||"", createdAt:new Date().toISOString(), tags:[] } as Deal]);
    else saveDeals(deals.map(d => d.id===(modal as Deal).id ? {...d,...form, companyName:co?.name||d.companyName} : d));
    close();
  };
  const del = (id: string) => { saveDeals(deals.filter(d => d.id!==id)); close(); };

  const revenue = deals.filter(d=>d.stage==="won").reduce((s,d)=>s+d.amount,0);
  const pipeline = deals.filter(d=>!["won","lost"].includes(d.stage)).reduce((s,d)=>s+d.amount*d.probability/100,0);

  return (
    <div style={{ padding:16, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:22, fontWeight:700 }}>Воронка продаж</div>
        <button style={{ ...css.btn, background:"#a855f7", color:"#fff" }} onClick={() => open("new")}>+ Сделка</button>
      </div>
      <div style={{ ...css.g4, marginBottom:16 }}>
        <KPI label="Pipeline" value={fmt.money(pipeline)} accent="#a855f7" />
        <KPI label="Выиграно" value={fmt.money(revenue)} accent="#4ade80" />
        <KPI label="Всего" value={String(deals.length)} accent="#22d3ee" />
        <KPI label="Конверсия" value={`${deals.length?Math.round(deals.filter(d=>d.stage==="won").length/deals.length*100):0}%`} accent="#f59e0b" />
      </div>

      <div style={{ display:"flex", gap:4, background:"#1c2333", borderRadius:6, padding:4, marginBottom:16, width:"fit-content" }}>
        {(["kanban","list"] as const).map(v => <button key={v} onClick={()=>setView(v)} style={{ ...css.btn, background:view===v?"#a855f7":"none", color:view===v?"#fff":"#8b949e", padding:"6px 16px", fontSize:13 }}>{v==="kanban"?"Канбан":"Список"}</button>)}
      </div>

      {view === "kanban" ? (
        <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:16 }}>
          {STAGES.map(st => (
            <div key={st.id} style={{ minWidth:240, flexShrink:0, background:"#1c2333", borderRadius:10, border:"1px solid #21262d" }}
              onDragOver={e=>e.preventDefault()}
              onDrop={()=>{ if(drag) saveDeals(deals.map(d=>d.id===drag?{...d,stage:st.id}:d)); setDrag(null); }}>
              <div style={{ padding:"12px 14px", borderBottom:"1px solid #21262d", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={{ width:8,height:8,borderRadius:"50%",background:st.color }}/><span style={{ fontSize:13,fontWeight:600 }}>{st.label}</span></div>
                <span style={{ fontSize:11,color:"#8b949e",background:"#21262d",padding:"2px 8px",borderRadius:20 }}>{deals.filter(d=>d.stage===st.id).length}</span>
              </div>
              <div style={{ padding:8, display:"flex", flexDirection:"column", gap:8, minHeight:60 }}>
                {deals.filter(d=>d.stage===st.id).map(d=>(
                  <div key={d.id} draggable onDragStart={()=>setDrag(d.id)} onClick={()=>open(d)}
                    style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:6, padding:12, cursor:"pointer", borderLeft:`3px solid ${st.color}` }}>
                    <div style={{ fontSize:13,fontWeight:500,marginBottom:4 }}>{d.title}</div>
                    <div style={{ fontSize:11,color:"#8b949e",marginBottom:6 }}>{d.companyName}</div>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                      <span style={{ fontSize:13,fontWeight:600,color:"#a855f7" }}>{fmt.money(d.amount)}</span>
                      <span style={{ fontSize:11,color:"#8b949e" }}>{d.probability}%</span>
                    </div>
                    <Bar pct={d.probability} h={4} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={css.card}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr>{["Сделка","Сумма","Этап","Вер-ть","Менеджер"].map(h=><th key={h} style={{ padding:"10px 12px",textAlign:"left",fontSize:11,color:"#8b949e",fontWeight:600,borderBottom:"1px solid #21262d" }}>{h}</th>)}</tr></thead>
            <tbody>{deals.map(d=>{ const st=STAGES.find(s=>s.id===d.stage); return (
              <tr key={d.id} onClick={()=>open(d)} style={{ cursor:"pointer", borderBottom:"1px solid #21262d" }}>
                <td style={{ padding:"10px 12px" }}><div style={{ fontWeight:500 }}>{d.title}</div><div style={{ fontSize:11,color:"#8b949e" }}>{d.companyName}</div></td>
                <td style={{ padding:"10px 12px",color:"#a855f7",fontWeight:600 }}>{fmt.money(d.amount)}</td>
                <td style={{ padding:"10px 12px" }}><Bdg label={st?.label||""} color={st?.color||"#6b7280"} /></td>
                <td style={{ padding:"10px 12px" }}>{d.probability}%</td>
                <td style={{ padding:"10px 12px" }}>{d.assignee}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal==="new"?"Новая сделка":(modal as Deal).title} onClose={close}
          footer={<>{modal!=="new"&&<button style={{ ...css.btn,background:"#f43f5e22",color:"#f43f5e" }} onClick={()=>del((modal as Deal).id)}>Удалить</button>}<button style={{ ...css.btn,background:"#21262d",color:"#f0f6fc" }} onClick={close}>Отмена</button><button style={{ ...css.btn,background:"#a855f7",color:"#fff" }} onClick={save}>Сохранить</button></>}>
          <Field label="Название *"><input style={css.input} value={form.title||""} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Название сделки" /></Field>
          <Field label="Компания"><select style={css.input} value={form.companyId||""} onChange={e=>setForm(f=>({...f,companyId:e.target.value}))}><option value="">— Выберите —</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <div style={css.g2}>
            <Field label="Сумма ₽"><input style={css.input} type="number" value={form.amount||""} onChange={e=>setForm(f=>({...f,amount:+e.target.value}))} /></Field>
            <Field label="Вероятность %"><input style={css.input} type="number" value={form.probability||""} onChange={e=>setForm(f=>({...f,probability:+e.target.value}))} /></Field>
          </div>
          <Field label="Этап"><select style={css.input} value={form.stage||"lead"} onChange={e=>setForm(f=>({...f,stage:e.target.value}))}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
          <Field label="Менеджер"><input style={css.input} value={form.assignee||""} onChange={e=>setForm(f=>({...f,assignee:e.target.value}))} /></Field>
          <Field label="Дедлайн"><input style={{ ...css.input, colorScheme:"dark" }} type="date" value={form.deadline?.split("T")[0]||""} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} /></Field>
        </Modal>
      )}
    </div>
  );
}

// ─── Companies ────────────────────────────────────────────────────────────────
function Companies({ companies, saveCompanies }: { companies: Company[]; saveCompanies: (d: Company[]) => void }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Company|null|"new">(null);
  const [form, setForm] = useState<Partial<Company>>({});
  const SC = { active:"#4ade80", inactive:"#8b949e", lead:"#f59e0b" } as Record<string,string>;
  const SL = { active:"Активный", inactive:"Неактивный", lead:"Лид" } as Record<string,string>;
  const filtered = companies.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())||c.contact.toLowerCase().includes(search.toLowerCase()));
  const open = (c: Company|"new") => { setForm(c==="new"?{status:"lead"}:{...c}); setModal(c); };
  const close = () => setModal(null);
  const save = () => {
    if (!form.name) return;
    if (modal==="new") saveCompanies([...companies,{...form,id:genId(),deals:0,tasks:0,revenue:form.revenue||0,createdAt:new Date().toISOString()} as Company]);
    else saveCompanies(companies.map(c=>c.id===(modal as Company).id?{...c,...form} as Company:c));
    close();
  };
  const del = (id: string) => { saveCompanies(companies.filter(c=>c.id!==id)); close(); };

  return (
    <div style={{ padding:16, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:22, fontWeight:700 }}>Компании</div>
        <button style={{ ...css.btn, background:"#a855f7", color:"#fff" }} onClick={()=>open("new")}>+ Добавить</button>
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
          footer={<>{modal!=="new"&&<button style={{ ...css.btn,background:"#f43f5e22",color:"#f43f5e" }} onClick={()=>del((modal as Company).id)}>Удалить</button>}<button style={{ ...css.btn,background:"#21262d",color:"#f0f6fc" }} onClick={close}>Отмена</button><button style={{ ...css.btn,background:"#a855f7",color:"#fff" }} onClick={save}>Сохранить</button></>}>
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
function Tasks({ tasks, saveTasks }: { tasks: Task[]; saveTasks: (d: Task[]) => void }) {
  const [filter, setFilter] = useState("");
  const [modal, setModal] = useState<Task|null|"new">(null);
  const [form, setForm] = useState<Partial<Task>>({});
  const filtered = tasks.filter(t=>!filter||t.status===filter);
  const open = (t: Task|"new") => { setForm(t==="new"?{status:"todo",priority:"medium"}:{...t}); setModal(t); };
  const close = () => setModal(null);
  const save = () => {
    if (!form.title) return;
    if (modal==="new") saveTasks([...tasks,{...form,id:genId(),subtasks:[],createdAt:new Date().toISOString()} as Task]);
    else saveTasks(tasks.map(t=>t.id===(modal as Task).id?{...t,...form} as Task:t));
    close();
  };
  const del = (id: string) => { saveTasks(tasks.filter(t=>t.id!==id)); close(); };
  const toggle = (id: string) => saveTasks(tasks.map(t=>t.id===id?{...t,status:t.status==="done"?"todo":"done"}:t));

  return (
    <div style={{ padding:16, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:22, fontWeight:700 }}>Задачи</div>
        <button style={{ ...css.btn, background:"#a855f7", color:"#fff" }} onClick={()=>open("new")}>+ Задача</button>
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
          footer={<>{modal!=="new"&&<button style={{ ...css.btn,background:"#f43f5e22",color:"#f43f5e" }} onClick={()=>del((modal as Task).id)}>Удалить</button>}<button style={{ ...css.btn,background:"#21262d",color:"#f0f6fc" }} onClick={close}>Отмена</button><button style={{ ...css.btn,background:"#a855f7",color:"#fff" }} onClick={save}>Сохранить</button></>}>
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
function Goals({ goals, saveGoals }: { goals: Goal[]; saveGoals: (d: Goal[]) => void }) {
  const [modal, setModal] = useState<Goal|null|"new">(null);
  const [form, setForm] = useState<Partial<Goal>>({});
  const [prog, setProg] = useState<Record<string,string>>({});
  const active = goals.filter(g=>g.status!=="done");
  const done = goals.filter(g=>g.status==="done");
  const avg = active.length?Math.round(active.reduce((s,g)=>s+g.current/g.target*100,0)/active.length):0;
  const open = (g: Goal|"new") => { setForm(g==="new"?{category:"revenue",unit:"₽",current:0}:{...g}); setModal(g); };
  const close = () => setModal(null);
  const save = () => {
    if (!form.title||!form.target) return;
    const status=(form.current||0)>=(form.target||1)?"done":"in_progress";
    if (modal==="new") saveGoals([...goals,{...form,id:genId(),status,team:[],createdAt:new Date().toISOString()} as Goal]);
    else saveGoals(goals.map(g=>g.id===(modal as Goal).id?{...g,...form,status} as Goal:g));
    close();
  };
  const del = (id: string) => { saveGoals(goals.filter(g=>g.id!==id)); close(); };
  const upd = (id: string) => {
    const val=parseFloat(prog[id]||"0"); const g=goals.find(x=>x.id===id); if(!g) return;
    saveGoals(goals.map(x=>x.id===id?{...x,current:val,status:val>=x.target?"done":"in_progress"}:x));
    setProg(p=>({...p,[id]:""}));
  };

  return (
    <div style={{ padding:16, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:22, fontWeight:700 }}>Цели и OKR</div>
        <button style={{ ...css.btn, background:"#a855f7", color:"#fff" }} onClick={()=>open("new")}>+ Цель</button>
      </div>
      <div style={{ ...css.g4, marginBottom:16 }}>
        <KPI label="Активных" value={String(active.length)} accent="#a855f7" />
        <KPI label="Средний прогресс" value={`${avg}%`} accent="#22d3ee" />
        <KPI label="Выполнено" value={String(done.length)} accent="#4ade80" />
        <KPI label="Всего" value={String(goals.length)} accent="#f59e0b" />
      </div>
      {[...active,...done].map(g=>{ const pct=Math.min(100,Math.round(g.current/g.target*100)); const color=g.status==="done"?"#4ade80":pct>=80?"#4ade80":pct>=50?"#a855f7":"#f59e0b"; const cc=CAT_COLORS[g.category]||"#a855f7"; return (
        <div key={g.id} style={{ ...css.card, marginBottom:12, borderLeft:`4px solid ${cc}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
            <div><div style={{ fontSize:15,fontWeight:600,marginBottom:4 }}>{g.title} {g.status==="done"?"✅":""}</div><Bdg label={CAT_LABELS[g.category]||g.category} color={cc} /></div>
            <div style={{ textAlign:"right" }}><div style={{ fontSize:20,fontWeight:700,color }}>{pct}%</div><button onClick={()=>open(g)} style={{ ...css.btn,background:"none",color:"#8b949e",padding:"2px 6px",fontSize:12 }}>✏️</button></div>
          </div>
          <Bar pct={pct} color={color} h={8} />
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:12, color:"#8b949e" }}>
            <span><span style={{ color:"#f0f6fc",fontWeight:600 }}>{fmt.num(g.current)} {g.unit}</span> из {fmt.num(g.target)} {g.unit}</span>
            <span>{fmt.date(g.deadline)}</span>
          </div>
          {g.status!=="done"&&(
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <input style={{ ...css.input,flex:1 }} type="number" placeholder={`Текущее (${fmt.num(g.current)})`} value={prog[g.id]||""} onChange={e=>setProg(p=>({...p,[g.id]:e.target.value}))} />
              <button style={{ ...css.btn,background:"#a855f7",color:"#fff",flexShrink:0 }} onClick={()=>upd(g.id)}>Обновить</button>
            </div>
          )}
        </div>
      );})}
      {modal&&(
        <Modal title={modal==="new"?"Новая цель":(modal as Goal).title} onClose={close}
          footer={<>{modal!=="new"&&<button style={{ ...css.btn,background:"#f43f5e22",color:"#f43f5e" }} onClick={()=>del((modal as Goal).id)}>Удалить</button>}<button style={{ ...css.btn,background:"#21262d",color:"#f0f6fc" }} onClick={close}>Отмена</button><button style={{ ...css.btn,background:"#a855f7",color:"#fff" }} onClick={save}>Сохранить</button></>}>
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

// ─── Root ─────────────────────────────────────────────────────────────────────
type Tab = "dashboard"|"deals"|"companies"|"tasks"|"goals";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id:"dashboard", label:"Главная", icon:"🏠" },
  { id:"deals",     label:"Сделки",  icon:"💼" },
  { id:"companies", label:"Компании",icon:"🏢" },
  { id:"tasks",     label:"Задачи",  icon:"✅" },
  { id:"goals",     label:"Цели",    icon:"🎯" },
];

export default function CrmPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const { companies, deals, tasks, goals, saveCompanies, saveDeals, saveTasks, saveGoals } = useData();
  const go = useCallback((t: Tab) => { setTab(t); window.scrollTo({ top:0, behavior:"smooth" }); }, []);

  return (
    <div style={{ background:"#0d1117", minHeight:"100vh", color:"#f0f6fc", fontFamily:"inherit", paddingBottom:72 }}>
      {tab==="dashboard" && <Dashboard deals={deals} tasks={tasks} goals={goals} companies={companies} />}
      {tab==="deals"     && <Deals deals={deals} companies={companies} saveDeals={saveDeals} />}
      {tab==="companies" && <Companies companies={companies} saveCompanies={saveCompanies} />}
      {tab==="tasks"     && <Tasks tasks={tasks} saveTasks={saveTasks} />}
      {tab==="goals"     && <Goals goals={goals} saveGoals={saveGoals} />}

      <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:"#161b22", borderTop:"1px solid #21262d", display:"flex", zIndex:100 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>go(t.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"8px 4px 6px", gap:2, background:"none", border:"none", cursor:"pointer", color:tab===t.id?"#a855f7":"#8b949e", fontSize:10, fontFamily:"inherit", transition:"color .2s" }}>
            <span style={{ fontSize:20 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

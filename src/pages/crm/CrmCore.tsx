import { useState, useCallback, useEffect } from "react";

const CRM_URL = "https://functions.poehali.dev/8641d4ef-87cd-4f51-bbe3-01b7a911724e";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Company { id: string; name: string; industry: string; status: string; revenue: number; contact: string; phone: string; email: string; city: string; deals: number; tasks: number; createdAt: string; }
export interface Deal { id: string; title: string; companyId: string; companyName: string; stage: string; amount: number; probability: number; assignee: string; deadline: string; description: string; tags: string[]; createdAt: string; }
export interface Task { id: string; title: string; description: string; status: string; priority: string; assignee: string; deadline: string; subtasks: { id: string; title: string; done: boolean }[]; createdAt: string; }
export interface Goal { id: string; title: string; description: string; category: string; target: number; current: number; unit: string; deadline: string; owner: string; team: string[]; status: string; createdAt: string; }

// ─── Config ───────────────────────────────────────────────────────────────────
export const STAGES = [
  { id: "lead", label: "Лид", color: "#6366f1" },
  { id: "negotiation", label: "Переговоры", color: "#a855f7" },
  { id: "proposal", label: "Предложение", color: "#22d3ee" },
  { id: "won", label: "Выиграно", color: "#4ade80" },
  { id: "lost", label: "Проиграно", color: "#f43f5e" },
];
export const PRIORITIES = [
  { id: "low", label: "Низкий", color: "#6b7280" },
  { id: "medium", label: "Средний", color: "#f59e0b" },
  { id: "high", label: "Высокий", color: "#f43f5e" },
];
export const TASK_STATUSES = [
  { id: "todo", label: "К выполнению", color: "#6366f1" },
  { id: "in_progress", label: "В работе", color: "#a855f7" },
  { id: "review", label: "На проверке", color: "#22d3ee" },
  { id: "done", label: "Готово", color: "#4ade80" },
];
export const CAT_LABELS: Record<string, string> = { revenue: "Выручка", clients: "Клиенты", deals: "Сделки", quality: "Качество", tasks: "Задачи", conversion: "Конверсия", hr: "HR", efficiency: "Эффективность" };
export const CAT_COLORS: Record<string, string> = { revenue: "#a855f7", clients: "#22d3ee", deals: "#4ade80", quality: "#f59e0b", tasks: "#6366f1", conversion: "#ec4899", hr: "#f97316", efficiency: "#14b8a6" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const fmt = {
  money: (n: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n),
  date: (d: string) => d ? new Date(d).toLocaleDateString("ru-RU") : "—",
  initials: (name: string) => name?.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || "?",
  num: (n: number) => new Intl.NumberFormat("ru-RU").format(n),
};

// ─── Storage ──────────────────────────────────────────────────────────────────
export const api = {
  get: async (action: string, userId: string) => {
    const r = await fetch(`${CRM_URL}?action=${action}&user_id=${userId}`);
    return r.json();
  },
  post: async (action: string, body: object) => {
    const r = await fetch(`${CRM_URL}?action=${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.json();
  },
};

export function useData(userId: string) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [c, d, t, g] = await Promise.all([
        api.get("companies_list", userId),
        api.get("deals_list", userId),
        api.get("tasks_list", userId),
        api.get("goals_list", userId),
      ]);
      setCompanies(c.companies || []);
      setDeals(d.deals || []);
      setTasks(t.tasks || []);
      setGoals(g.goals || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  const saveCompany = async (data: Partial<Company>) => { await api.post("company_save", { ...data, user_id: userId }); await reload(); };
  const deleteCompany = async (id: string) => { await api.post("company_delete", { id, user_id: userId }); await reload(); };
  const saveDeal = async (data: Partial<Deal>) => { await api.post("deal_save", { ...data, user_id: userId }); await reload(); };
  const deleteDeal = async (id: string) => { await api.post("deal_delete", { id, user_id: userId }); await reload(); };
  const saveTask = async (data: Partial<Task>) => { await api.post("task_save", { ...data, user_id: userId }); await reload(); };
  const deleteTask = async (id: string) => { await api.post("task_delete", { id, user_id: userId }); await reload(); };
  const saveGoal = async (data: Partial<Goal>) => { await api.post("goal_save", { ...data, user_id: userId }); await reload(); };
  const deleteGoal = async (id: string) => { await api.post("goal_delete", { id, user_id: userId }); await reload(); };

  return { companies, deals, tasks, goals, loading, saveCompany, deleteCompany, saveDeal, deleteDeal, saveTask, deleteTask, saveGoal, deleteGoal };
}

// ─── UI primitives ────────────────────────────────────────────────────────────
export const css = {
  card: { background: "linear-gradient(180deg,#161b22 0%,#13181f 100%)", border: "1px solid #2a3140", borderRadius: 14, padding: 18, boxShadow: "0 4px 14px rgba(0,0,0,0.25)" } as React.CSSProperties,
  input: { background: "#1c2333", border: "1px solid #2a3140", color: "#f0f6fc", borderRadius: 10, padding: "11px 14px", fontSize: 15, fontWeight: 500, width: "100%", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const, transition: "border-color .2s, box-shadow .2s" },
  btn: { display: "inline-flex" as const, alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, fontFamily: "inherit", letterSpacing: 0.2, boxShadow: "0 4px 12px rgba(168,85,247,0.25)", transition: "transform .15s, box-shadow .2s, opacity .2s" } as React.CSSProperties,
  g2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 } as React.CSSProperties,
  g4: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 } as React.CSSProperties,
};

export function KPI({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div style={{ ...css.card, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}aa)` }} />
      <div style={{ fontSize: 12, color: "#c9d1d9", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#8b949e", marginTop: 4, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export function Bar({ pct, color = "#a855f7", h = 6 }: { pct: number; color?: string; h?: number }) {
  return <div style={{ height: h, background: "#21262d", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: color, borderRadius: 3, transition: "width .5s" }} /></div>;
}

export function Bdg({ label, color }: { label: string; color: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: color + "26", color, border: `1px solid ${color}44`, letterSpacing: 0.2 }}>{label}</span>;
}

export function Modal({ title, children, onClose, footer }: { title: string; children: React.ReactNode; onClose: () => void; footer?: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "linear-gradient(180deg,#1a2030 0%,#161b22 100%)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column", border: "1px solid #2a3140", borderBottom: "none", boxShadow: "0 -10px 40px rgba(168,85,247,0.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #2a3140", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#fff", letterSpacing: -0.2 }}>{title}</span>
          <button onClick={onClose} style={{ background: "rgba(139,148,158,0.1)", border: "none", color: "#c9d1d9", cursor: "pointer", fontSize: 16, lineHeight: 1, width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "14px 22px", borderTop: "1px solid #2a3140", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: "#c9d1d9", display: "block", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>{children}</div>;
}

export function Empty({ icon, title, hint, action, onAction }: { icon: string; title: string; hint: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px", borderRadius: 16, border: "2px dashed #2a3140", background: "linear-gradient(180deg,#161b22 0%,#13181f 100%)" }}>
      <div style={{ fontSize: 56, marginBottom: 14, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: "#fff", letterSpacing: -0.2 }}>{title}</div>
      <div style={{ fontSize: 14, color: "#c9d1d9", marginBottom: 22, maxWidth: 360, margin: "0 auto 22px", lineHeight: 1.5 }}>{hint}</div>
      {action && onAction && (
        <button onClick={onAction} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "linear-gradient(135deg,#a855f7 0%,#6366f1 100%)", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15, fontWeight: 700, fontFamily: "inherit", boxShadow: "0 8px 20px rgba(168,85,247,0.4)", letterSpacing: 0.2 }}>
          + {action}
        </button>
      )}
    </div>
  );
}

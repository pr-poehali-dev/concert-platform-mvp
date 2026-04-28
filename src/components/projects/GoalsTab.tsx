import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { PROJECTS_URL, type Goal } from "./crmTypes";

interface Props {
  goals: Goal[];
  projectId: string;
  user: { id: string; name: string } | null;
  onReload: () => void;
}

export default function GoalsTab({ goals, projectId, user, onReload }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", targetValue: "", unit: "", deadline: "" });

  const createGoal = async () => {
    if (!form.title.trim() || !user) return;
    setSaving(true);
    await fetch(`${PROJECTS_URL}?action=project_goal_create`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId, userId: user.id,
        title: form.title.trim(), description: form.description,
        targetValue: form.targetValue ? Number(form.targetValue) : null,
        unit: form.unit,
        deadline: form.deadline || null,
      }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ title: "", description: "", targetValue: "", unit: "", deadline: "" });
    onReload();
  };

  const updateGoalProgress = async (goalId: string, value: number) => {
    await fetch(`${PROJECTS_URL}?action=project_goal_update`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, currentValue: value }),
    });
    onReload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-oswald font-bold text-white text-lg">Цели проекта</h3>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90">
          <Icon name="Plus" size={15} />Новая цель
        </button>
      </div>

      {showForm && (
        <div className="glass-strong rounded-2xl p-5 border border-neon-purple/30 animate-scale-in">
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Название цели *"
              className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
            <div className="grid grid-cols-3 gap-3">
              <input type="number" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))}
                placeholder="Целевое значение"
                className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none" />
              <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="Единица (₽, шт, %)"
                className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none" />
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={createGoal} disabled={saving || !form.title.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Target" size={15} />}
                Создать цель
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-5 py-2.5 glass rounded-xl text-white/50 hover:text-white text-sm border border-white/10">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-10 glass rounded-2xl">
          <Icon name="Target" size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Нет целей</p>
          <p className="text-white/15 text-xs mt-1">Цели помогают отслеживать ключевые результаты проекта</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map(goal => {
            const pct = goal.targetValue ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0;
            return (
              <div key={goal.id} className="glass rounded-2xl p-5 border border-white/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${goal.color} flex items-center justify-center`}>
                      <Icon name="Target" size={14} className="text-white" />
                    </div>
                    <h4 className="font-oswald font-semibold text-white">{goal.title}</h4>
                  </div>
                  <Badge className={`text-xs border ${goal.status === "completed" ? "text-neon-green bg-neon-green/10 border-neon-green/20" : "text-white/40 bg-white/5 border-white/10"}`}>
                    {goal.status === "completed" ? "Достигнута" : "Активна"}
                  </Badge>
                </div>

                {goal.targetValue && (
                  <>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-white/60">{goal.currentValue.toLocaleString("ru")} {goal.unit}</span>
                      <span className="text-white/30">/ {goal.targetValue.toLocaleString("ru")} {goal.unit}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                      <div className={`h-full rounded-full transition-all bg-gradient-to-r ${goal.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" defaultValue={goal.currentValue}
                        className="flex-1 glass rounded-lg px-3 py-1.5 text-white text-xs border border-white/10 outline-none"
                        onBlur={e => updateGoalProgress(goal.id, Number(e.target.value))}
                      />
                      <span className="text-white/30 text-xs">{goal.unit}</span>
                      <span className={`text-xs font-bold ${pct >= 100 ? "text-neon-green" : "text-neon-purple"}`}>{pct}%</span>
                    </div>
                  </>
                )}

                {goal.deadline && (
                  <p className="text-white/30 text-xs mt-2 flex items-center gap-1">
                    <Icon name="Calendar" size={10} />
                    до {new Date(goal.deadline).toLocaleDateString("ru", { day: "numeric", month: "long" })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

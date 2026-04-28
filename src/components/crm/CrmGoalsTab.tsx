import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { CRM_URL, type Goal } from "./crmTypes";

interface Props {
  goals: Goal[];
  userId: string;
  saving: boolean;
  showForm: boolean;
  goalForm: { title: string; description: string; targetValue: string; unit: string; deadline: string };
  onShowFormToggle: () => void;
  onFormChange: (form: { title: string; description: string; targetValue: string; unit: string; deadline: string }) => void;
  onCreateGoal: () => void;
  onCancelForm: () => void;
  onUpdateGoalValue: (goalId: string, value: number) => void;
}

export default function CrmGoalsTab({
  goals,
  saving,
  showForm,
  goalForm,
  onShowFormToggle,
  onFormChange,
  onCreateGoal,
  onCancelForm,
  onUpdateGoalValue,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">OKR и ключевые результаты компании</p>
        <button onClick={onShowFormToggle}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90">
          <Icon name="Plus" size={15} />Новая цель
        </button>
      </div>

      {showForm && (
        <div className="glass-strong rounded-2xl p-5 border border-neon-purple/30 animate-scale-in">
          <div className="space-y-3">
            <input value={goalForm.title} onChange={e => onFormChange({ ...goalForm, title: e.target.value })}
              placeholder="Название цели *"
              className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
            <div className="grid grid-cols-3 gap-3">
              <input type="number" value={goalForm.targetValue} onChange={e => onFormChange({ ...goalForm, targetValue: e.target.value })}
                placeholder="Цель (число)"
                className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none" />
              <input value={goalForm.unit} onChange={e => onFormChange({ ...goalForm, unit: e.target.value })}
                placeholder="Единица (₽, %)"
                className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none" />
              <input type="date" value={goalForm.deadline} onChange={e => onFormChange({ ...goalForm, deadline: e.target.value })}
                className="glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={onCreateGoal} disabled={saving || !goalForm.title.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Target" size={15} />}
                Создать
              </button>
              <button onClick={onCancelForm} className="px-5 py-2.5 glass rounded-xl text-white/50 hover:text-white text-sm border border-white/10">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl">
          <Icon name="Target" size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 font-oswald text-lg">Нет целей</p>
          <p className="text-white/20 text-sm mt-1">Задайте цели компании и отслеживайте прогресс</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map(goal => {
            const pct = goal.targetValue ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0;
            return (
              <div key={goal.id} className="glass rounded-2xl p-5 border border-white/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${goal.color} flex items-center justify-center shrink-0`}>
                      <Icon name="Target" size={14} className="text-white" />
                    </div>
                    <h4 className="font-oswald font-bold text-white">{goal.title}</h4>
                  </div>
                  <Badge className={`text-xs border shrink-0 ${pct >= 100 ? "text-neon-green bg-neon-green/10 border-neon-green/20" : "text-white/40 bg-white/5 border-white/10"}`}>
                    {pct >= 100 ? "Достигнута" : "Активна"}
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
                        onBlur={e => onUpdateGoalValue(goal.id, Number(e.target.value))} />
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

// Re-export for consumers that need it
export { CRM_URL };

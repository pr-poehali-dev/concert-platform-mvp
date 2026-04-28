import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { EMPLOYEES_URL, type Employee } from "@/components/dashboard/profile/types";
import { useAuth } from "@/context/AuthContext";
import {
  PROJECTS_URL,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  STATUS_ORDER,
  formatDue,
  type ProjectTask,
  type Goal,
} from "./crmTypes";
import TaskDetailModal from "./TaskDetailModal";
import GoalsTab from "./GoalsTab";

export default function ProjectCrmTab({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tasks" | "goals">("tasks");

  const emptyForm = useMemo(() => ({
    title: "", description: "", assignedTo: "", priority: "medium" as const,
    dueDate: "", estimatedHours: "", goalId: "",
  }), []);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [tasksRes, empsRes, goalsRes] = await Promise.all([
        fetch(`${PROJECTS_URL}?action=project_tasks_list&project_id=${projectId}&company_user_id=${user.id}`),
        fetch(`${EMPLOYEES_URL}?action=list&company_user_id=${user.id}`),
        fetch(`${PROJECTS_URL}?action=project_goals_list&project_id=${projectId}`),
      ]);
      const [tasksData, empsData, goalsData] = await Promise.all([
        tasksRes.json(), empsRes.json(), goalsRes.json(),
      ]);
      setTasks(tasksData.tasks || []);
      setEmployees((empsData.employees || []).filter((e: Employee) => e.isActive));
      setGoals(goalsData.goals || []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => { load(); }, [load]);

  const createTask = async () => {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    await fetch(`${PROJECTS_URL}?action=project_task_create`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId, companyUserId: user.id, createdBy: user.id,
        title: form.title.trim(), description: form.description,
        assignedTo: form.assignedTo || null,
        priority: form.priority,
        dueDate: form.dueDate || null,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
        goalId: form.goalId || null,
      }),
    });
    setSaving(false);
    setShowForm(false);
    setForm(emptyForm);
    load();
  };

  const updateStatus = async (taskId: string, status: string) => {
    await fetch(`${PROJECTS_URL}?action=project_task_update`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status }),
    });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as ProjectTask["status"] } : t));
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`${PROJECTS_URL}?action=project_task_delete`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const startEdit = (task: ProjectTask) => {
    setEditingId(task.id);
    setForm({
      title: task.title, description: task.description,
      assignedTo: task.assignedTo || "", priority: task.priority,
      dueDate: task.dueDate || "", estimatedHours: task.estimatedHours?.toString() || "",
      goalId: task.goalId || "",
    });
    setShowForm(true);
  };

  const saveEdit = async () => {
    if (!editingId || !form.title.trim()) return;
    setSaving(true);
    await fetch(`${PROJECTS_URL}?action=project_task_update`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: editingId, title: form.title.trim(), description: form.description,
        assignedTo: form.assignedTo || null, priority: form.priority,
        dueDate: form.dueDate || null,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
        goalId: form.goalId || null,
      }),
    });
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const filtered = tasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterAssignee !== "all" && t.assignedTo !== filterAssignee) return false;
    return true;
  });

  const grouped = STATUS_ORDER.reduce((acc, st) => {
    acc[st] = filtered.filter(t => t.status === st);
    return acc;
  }, {} as Record<string, ProjectTask[]>);

  const totalDone = tasks.filter(t => t.status === "done").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const progress = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;
  const openTask = openTaskId ? tasks.find(t => t.id === openTaskId) || null : null;

  if (loading) return (
    <div className="space-y-3 animate-fade-in">
      {[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl h-20 animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 glass rounded-xl p-1">
          <button onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-oswald font-medium transition-all ${activeTab === "tasks" ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}>
            <Icon name="CheckSquare" size={14} />Задачи
            {inProgress > 0 && (
              <span className="bg-neon-pink text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {inProgress}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab("goals")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-oswald font-medium transition-all ${activeTab === "goals" ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}>
            <Icon name="Target" size={14} />Цели
            {goals.length > 0 && <span className="text-white/40 text-xs">{goals.length}</span>}
          </button>
        </div>

        {activeTab === "tasks" && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 glass rounded-lg p-1">
              <button onClick={() => setViewMode("kanban")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "kanban" ? "bg-neon-purple text-white" : "text-white/40 hover:text-white"}`}>
                <Icon name="Columns3" size={14} />
              </button>
              <button onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-neon-purple text-white" : "text-white/40 hover:text-white"}`}>
                <Icon name="List" size={14} />
              </button>
            </div>
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 transition-opacity"
            >
              <Icon name="Plus" size={15} />Новая задача
            </button>
          </div>
        )}
      </div>

      {/* Прогресс */}
      {activeTab === "tasks" && tasks.length > 0 && (
        <div className="glass rounded-xl p-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/40 text-xs">Прогресс проекта</span>
              <span className={`text-xs font-medium ${progress === 100 ? "text-neon-green" : "text-white/60"}`}>{totalDone}/{tasks.length}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${progress === 100 ? "bg-neon-green" : "bg-gradient-to-r from-neon-purple to-neon-cyan"}`}
                style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs shrink-0">
            {inProgress > 0 && (
              <span className="flex items-center gap-1 text-neon-cyan">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />{inProgress} в работе
              </span>
            )}
            <span className={progress === 100 ? "text-neon-green" : "text-white/30"}>{progress}%</span>
          </div>
        </div>
      )}

      {/* ── ЗАДАЧИ ── */}
      {activeTab === "tasks" && (
        <>
          {/* Фильтры */}
          {tasks.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="glass rounded-xl px-3 py-1.5 text-white text-xs border border-white/10 outline-none appearance-none bg-transparent">
                <option value="all" className="bg-gray-900">Все статусы</option>
                {STATUS_ORDER.map(s => <option key={s} value={s} className="bg-gray-900">{STATUS_CONFIG[s].label}</option>)}
              </select>
              <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
                className="glass rounded-xl px-3 py-1.5 text-white text-xs border border-white/10 outline-none appearance-none bg-transparent">
                <option value="all" className="bg-gray-900">Все сотрудники</option>
                {employees.map(e => <option key={e.id} value={e.id} className="bg-gray-900">{e.name}</option>)}
              </select>
            </div>
          )}

          {/* Форма создания/редактирования */}
          {showForm && (
            <div className="glass-strong rounded-2xl p-5 border border-neon-purple/30 animate-scale-in">
              <h4 className="font-oswald font-bold text-white mb-4 flex items-center gap-2">
                <Icon name={editingId ? "Edit" : "Plus"} size={16} className="text-neon-purple" />
                {editingId ? "Редактировать задачу" : "Новая задача"}
              </h4>
              <div className="space-y-3">
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Название задачи *"
                  className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Описание (необязательно)" rows={2}
                  className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-neon-purple/50 text-sm resize-none" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                    className="glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none appearance-none bg-transparent">
                    <option value="" className="bg-gray-900">Не назначена</option>
                    {employees.map(e => <option key={e.id} value={e.id} className="bg-gray-900">{e.name}</option>)}
                  </select>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as never }))}
                    className="glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none appearance-none bg-transparent">
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} className="bg-gray-900">{v.label}</option>)}
                  </select>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none" />
                  <input type="number" step="0.5" value={form.estimatedHours} onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))}
                    placeholder="Оценка (часов)"
                    className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none" />
                </div>
                {goals.length > 0 && (
                  <select value={form.goalId} onChange={e => setForm(f => ({ ...f, goalId: e.target.value }))}
                    className="w-full glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none appearance-none bg-transparent">
                    <option value="" className="bg-gray-900">Привязать к цели (необязательно)</option>
                    {goals.map(g => <option key={g.id} value={g.id} className="bg-gray-900">{g.title}</option>)}
                  </select>
                )}
                <div className="flex gap-3">
                  <button onClick={editingId ? saveEdit : createTask} disabled={saving || !form.title.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
                    {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Check" size={15} />}
                    {editingId ? "Сохранить" : "Создать"}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                    className="px-5 py-2.5 glass rounded-xl text-white/50 hover:text-white text-sm border border-white/10 transition-all">
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* KANBAN */}
          {viewMode === "kanban" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {STATUS_ORDER.map(status => {
                const col = grouped[status] || [];
                const cfg = STATUS_CONFIG[status];
                return (
                  <div key={status} className={`glass rounded-2xl p-3 border border-white/5 ${cfg.bg}`}>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Icon name={cfg.icon as never} size={13} className={cfg.cls.split(" ")[0]} />
                      <span className="font-oswald font-semibold text-white text-sm">{cfg.label}</span>
                      <span className="ml-auto text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded-full">{col.length}</span>
                    </div>
                    <div className="space-y-2 min-h-[60px]">
                      {col.map(task => {
                        const due = formatDue(task.dueDate);
                        const pc = PRIORITY_CONFIG[task.priority];
                        return (
                          <div key={task.id}
                            className="glass rounded-xl p-3 border border-white/5 hover:border-neon-purple/20 cursor-pointer group transition-all"
                            onClick={() => setOpenTaskId(task.id)}>
                            <div className="flex items-start gap-2 mb-2">
                              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${pc.dot}`} />
                              <span className="text-white text-sm font-medium flex-1 leading-snug">{task.title}</span>
                              <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                                className="w-5 h-5 flex items-center justify-center rounded text-white/0 group-hover:text-white/20 hover:!text-neon-pink transition-all">
                                <Icon name="X" size={11} />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap ml-3.5">
                              {task.assigneeName && (
                                <span className="text-white/35 text-[10px] flex items-center gap-1">
                                  <Icon name="User" size={9} />{task.assigneeName.split(" ")[0]}
                                </span>
                              )}
                              {due && <span className={`text-[10px] ${due.cls}`}>{due.label}</span>}
                              {task.estimatedHours && (
                                <span className="text-white/25 text-[10px]">{task.estimatedHours}ч</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
                      className="w-full mt-2 py-1.5 text-white/20 hover:text-white/50 text-xs flex items-center justify-center gap-1 rounded-lg hover:bg-white/5 transition-all">
                      <Icon name="Plus" size={11} />Задача
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST */}
          {viewMode === "list" && (
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="text-center py-10 glass rounded-2xl">
                  <Icon name="CheckSquare" size={32} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">Нет задач</p>
                </div>
              ) : (
                filtered.map(task => {
                  const due = formatDue(task.dueDate);
                  const pc = PRIORITY_CONFIG[task.priority];
                  const sc = STATUS_CONFIG[task.status];
                  return (
                    <div key={task.id}
                      className="glass rounded-xl p-4 border border-white/5 hover:border-neon-purple/20 cursor-pointer group transition-all flex items-center gap-4"
                      onClick={() => setOpenTaskId(task.id)}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${pc.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{task.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {task.assigneeName && <span className="text-white/35 text-xs">{task.assigneeName}</span>}
                          {due && <span className={`text-xs ${due.cls}`}>{due.label}</span>}
                        </div>
                      </div>
                      <Badge className={`text-xs border shrink-0 ${sc.cls}`}>{sc.label}</Badge>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={e => { e.stopPropagation(); startEdit(task); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-all">
                          <Icon name="Edit" size={12} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-neon-pink hover:bg-neon-pink/10 transition-all">
                          <Icon name="Trash2" size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* ── ЦЕЛИ ── */}
      {activeTab === "goals" && (
        <GoalsTab goals={goals} projectId={projectId} user={user} onReload={load} />
      )}

      {/* Task Detail Modal */}
      {openTask && (
        <TaskDetailModal
          task={openTask}
          employees={employees}
          onClose={() => setOpenTaskId(null)}
          onSave={t => setTasks(prev => prev.map(x => x.id === t.id ? t : x))}
          onStatusChange={(id, status) => { updateStatus(id, status); setOpenTaskId(null); }}
          user={user}
        />
      )}
    </div>
  );
}

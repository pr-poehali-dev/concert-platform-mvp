import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL } from "@/hooks/useProjects";
import { EMPLOYEES_URL, type Employee, ROLE_LABELS } from "@/components/dashboard/profile/types";
import { useAuth } from "@/context/AuthContext";

interface ProjectTask {
  id: string;
  projectId: string;
  companyUserId: string;
  assignedTo: string | null;
  createdBy: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  sortOrder: number;
  assigneeName: string;
  creatorName: string;
}

const STATUS_CONFIG = {
  todo:        { label: "К выполнению", cls: "text-white/50 bg-white/5 border-white/10", icon: "Circle" },
  in_progress: { label: "В работе",     cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20", icon: "Clock" },
  review:      { label: "На проверке",  cls: "text-neon-purple bg-neon-purple/10 border-neon-purple/20", icon: "Eye" },
  done:        { label: "Готово",       cls: "text-neon-green bg-neon-green/10 border-neon-green/20", icon: "CheckCircle2" },
} as const;

const PRIORITY_CONFIG = {
  low:    { label: "Низкий",   cls: "text-white/40",      dot: "bg-white/30" },
  medium: { label: "Средний",  cls: "text-neon-cyan",     dot: "bg-neon-cyan" },
  high:   { label: "Высокий",  cls: "text-neon-purple",   dot: "bg-neon-purple" },
  urgent: { label: "Срочно!",  cls: "text-neon-pink font-bold", dot: "bg-neon-pink" },
} as const;

const STATUS_ORDER = ["todo", "in_progress", "review", "done"] as const;

function isPastDue(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export default function ProjectCrmTab({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  const emptyForm = useMemo(() => ({
    title: "", description: "", assignedTo: "", priority: "medium" as const, dueDate: "",
  }), []);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [tasksRes, empsRes] = await Promise.all([
        fetch(`${PROJECTS_URL}?action=project_tasks_list&project_id=${projectId}&company_user_id=${user.id}`),
        fetch(`${EMPLOYEES_URL}?action=list&company_user_id=${user.id}`),
      ]);
      const tasksData = await tasksRes.json();
      const empsData = await empsRes.json();
      setTasks(tasksData.tasks || []);
      setEmployees((empsData.employees || []).filter((e: Employee) => e.isActive));
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
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo || "",
      priority: task.priority,
      dueDate: task.dueDate || "",
    });
    setShowForm(true);
  };

  const saveEdit = async () => {
    if (!editingId || !form.title.trim()) return;
    setSaving(true);
    await fetch(`${PROJECTS_URL}?action=project_task_update`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: editingId,
        title: form.title.trim(),
        description: form.description,
        assignedTo: form.assignedTo || null,
        priority: form.priority,
        dueDate: form.dueDate || null,
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

  // Группировка по статусам (канбан)
  const grouped = STATUS_ORDER.reduce((acc, st) => {
    acc[st] = filtered.filter(t => t.status === st);
    return acc;
  }, {} as Record<string, ProjectTask[]>);

  const totalDone = tasks.filter(t => t.status === "done").length;
  const progress = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;

  if (loading) return (
    <div className="space-y-3 animate-fade-in">
      {[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl h-20 animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Заголовок + прогресс */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1.5">
            <h3 className="font-oswald font-bold text-white text-lg">
              Задачи проекта
            </h3>
            <span className="text-white/40 text-sm">{totalDone}/{tasks.length}</span>
          </div>
          {tasks.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-xs">
                <div className={`h-full rounded-full transition-all ${progress === 100 ? "bg-neon-green" : "bg-gradient-to-r from-neon-purple to-neon-cyan"}`}
                  style={{ width: `${progress}%` }} />
              </div>
              <span className={`text-xs ${progress === 100 ? "text-neon-green" : "text-white/40"}`}>{progress}%</span>
            </div>
          )}
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 transition-opacity"
        >
          <Icon name="Plus" size={15} />Новая задача
        </button>
      </div>

      {/* Фильтры */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="glass rounded-xl px-3 py-1.5 text-white text-xs border border-white/10 outline-none appearance-none bg-transparent">
            <option value="all" className="bg-gray-900">Все статусы</option>
            {STATUS_ORDER.map(s => (
              <option key={s} value={s} className="bg-gray-900">{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
            className="glass rounded-xl px-3 py-1.5 text-white text-xs border border-white/10 outline-none appearance-none bg-transparent">
            <option value="all" className="bg-gray-900">Все сотрудники</option>
            {employees.map(e => (
              <option key={e.id} value={e.id} className="bg-gray-900">{e.name}</option>
            ))}
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
            <input
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Название задачи *"
              className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-neon-purple/50 text-sm"
            />
            <textarea
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Описание (необязательно)"
              rows={2}
              className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-neon-purple/50 text-sm resize-none"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Назначить</label>
                <select value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                  className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 outline-none appearance-none bg-transparent">
                  <option value="" className="bg-gray-900">Не назначено</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id} className="bg-gray-900">{e.name} ({ROLE_LABELS[e.roleInCompany] || e.roleInCompany})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Приоритет</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as ProjectTask["priority"] }))}
                  className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 outline-none appearance-none bg-transparent">
                  <option value="low" className="bg-gray-900">Низкий</option>
                  <option value="medium" className="bg-gray-900">Средний</option>
                  <option value="high" className="bg-gray-900">Высокий</option>
                  <option value="urgent" className="bg-gray-900">Срочно!</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Срок</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 outline-none bg-transparent" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={editingId ? saveEdit : createTask}
                disabled={saving || !form.title.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-neon-purple text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-neon-purple/80 transition-colors"
              >
                {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
                {editingId ? "Сохранить" : "Создать"}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                className="px-4 py-2 glass rounded-xl text-white/50 hover:text-white text-sm transition-colors border border-white/10">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Пустое состояние */}
      {tasks.length === 0 && !showForm && (
        <div className="glass rounded-2xl p-10 text-center">
          <Icon name="ClipboardList" size={36} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Задач пока нет</p>
          <p className="text-white/25 text-xs mt-1">Создайте задачи и назначьте их сотрудникам</p>
        </div>
      )}

      {/* Канбан-доски */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_ORDER.map(status => {
            const cfg = STATUS_CONFIG[status];
            const col = grouped[status] || [];
            return (
              <div key={status} className="glass rounded-2xl overflow-hidden">
                <div className={`px-4 py-2.5 border-b border-white/10 flex items-center justify-between`}>
                  <span className={`text-xs font-medium flex items-center gap-1.5 ${cfg.cls.split(" ")[0]}`}>
                    <Icon name={cfg.icon} size={13} />{cfg.label}
                  </span>
                  <span className="text-white/30 text-xs">{col.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[80px]">
                  {col.map(task => {
                    const pri = PRIORITY_CONFIG[task.priority];
                    const overdue = isPastDue(task.dueDate) && task.status !== "done";
                    return (
                      <div key={task.id} className={`glass rounded-xl p-3 border ${overdue ? "border-neon-pink/30" : "border-white/5"} group`}>
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${pri.dot}`} />
                            <p className={`text-sm font-medium leading-tight ${task.status === "done" ? "line-through text-white/40" : "text-white"}`}>
                              {task.title}
                            </p>
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => startEdit(task)} className="w-5 h-5 flex items-center justify-center text-white/30 hover:text-neon-cyan transition-colors">
                              <Icon name="Edit2" size={11} />
                            </button>
                            <button onClick={() => deleteTask(task.id)} className="w-5 h-5 flex items-center justify-center text-white/30 hover:text-neon-pink transition-colors">
                              <Icon name="Trash2" size={11} />
                            </button>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-white/30 text-xs mb-2 line-clamp-2">{task.description}</p>
                        )}
                        {task.assignedTo && (
                          <div className="flex items-center gap-1 mb-1.5">
                            <div className="w-4 h-4 rounded-full bg-neon-purple/30 flex items-center justify-center text-[9px] text-neon-purple font-bold">
                              {task.assigneeName[0]?.toUpperCase()}
                            </div>
                            <span className="text-white/40 text-[10px] truncate">{task.assigneeName}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <p className={`text-[10px] flex items-center gap-1 ${overdue ? "text-neon-pink" : "text-white/30"}`}>
                            <Icon name="Calendar" size={10} />{task.dueDate}
                            {overdue && " — просрочено!"}
                          </p>
                        )}
                        {/* Переключение статуса */}
                        <select
                          value={task.status}
                          onChange={e => updateStatus(task.id, e.target.value)}
                          className="mt-2 w-full text-[10px] glass rounded-lg px-2 py-1 text-white/50 border border-white/10 outline-none appearance-none bg-transparent"
                        >
                          {STATUS_ORDER.map(s => (
                            <option key={s} value={s} className="bg-gray-900">{STATUS_CONFIG[s].label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                  {col.length === 0 && (
                    <p className="text-white/15 text-xs text-center py-3">Пусто</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
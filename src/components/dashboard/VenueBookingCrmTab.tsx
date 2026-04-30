import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL } from "@/hooks/useProjects";
import { EMPLOYEES_URL, type Employee, ROLE_LABELS } from "@/components/dashboard/profile/types";
import { useAuth } from "@/context/AuthContext";

interface VenueTask {
  id: string;
  bookingId: string;
  venueUserId: string;
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
  todo:        { label: "К выполнению", cls: "text-white/70 bg-white/5 border-white/10",           icon: "Circle" },
  in_progress: { label: "В работе",     cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20", icon: "Clock" },
  review:      { label: "На проверке",  cls: "text-neon-purple bg-neon-purple/10 border-neon-purple/20", icon: "Eye" },
  done:        { label: "Готово",       cls: "text-neon-green bg-neon-green/10 border-neon-green/20", icon: "CheckCircle2" },
} as const;

const PRIORITY_CONFIG = {
  low:    { label: "Низкий",   cls: "text-white/65",           dot: "bg-white/30" },
  medium: { label: "Средний",  cls: "text-neon-cyan",          dot: "bg-neon-cyan" },
  high:   { label: "Высокий",  cls: "text-neon-purple",        dot: "bg-neon-purple" },
  urgent: { label: "Срочно!",  cls: "text-neon-pink font-bold",dot: "bg-neon-pink" },
} as const;

const STATUS_ORDER = ["todo", "in_progress", "review", "done"] as const;

function isPastDue(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export default function VenueBookingCrmTab({ bookingId }: { bookingId: string }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<VenueTask[]>([]);
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
        fetch(`${PROJECTS_URL}?action=venue_booking_tasks_list&booking_id=${bookingId}`),
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
  }, [bookingId, user]);

  useEffect(() => { load(); }, [load]);

  const createTask = async () => {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    await fetch(`${PROJECTS_URL}?action=venue_booking_task_create`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId, venueUserId: user.id, createdBy: user.id,
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
    await fetch(`${PROJECTS_URL}?action=venue_booking_task_update`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status }),
    });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as VenueTask["status"] } : t));
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`${PROJECTS_URL}?action=venue_booking_task_delete`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const startEdit = (task: VenueTask) => {
    setEditingId(task.id);
    setForm({ title: task.title, description: task.description, assignedTo: task.assignedTo || "", priority: task.priority, dueDate: task.dueDate || "" });
    setShowForm(true);
  };

  const saveEdit = async () => {
    if (!editingId || !form.title.trim()) return;
    setSaving(true);
    await fetch(`${PROJECTS_URL}?action=venue_booking_task_update`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: editingId, title: form.title.trim(), description: form.description, assignedTo: form.assignedTo || null, priority: form.priority, dueDate: form.dueDate || null }),
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
  }, {} as Record<string, VenueTask[]>);

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
            <h3 className="font-oswald font-bold text-white text-lg">Задачи мероприятия</h3>
            <span className="text-white/65 text-sm">{totalDone}/{tasks.length}</span>
          </div>
          {tasks.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-xs">
                <div className={`h-full rounded-full transition-all ${progress === 100 ? "bg-neon-green" : "bg-gradient-to-r from-neon-purple to-neon-cyan"}`}
                  style={{ width: `${progress}%` }} />
              </div>
              <span className={`text-xs ${progress === 100 ? "text-neon-green" : "text-white/65"}`}>{progress}%</span>
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
            {STATUS_ORDER.map(s => <option key={s} value={s} className="bg-gray-900">{STATUS_CONFIG[s].label}</option>)}
          </select>
          {employees.length > 0 && (
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
              className="glass rounded-xl px-3 py-1.5 text-white text-xs border border-white/10 outline-none appearance-none bg-transparent">
              <option value="all" className="bg-gray-900">Все сотрудники</option>
              {employees.map(e => <option key={e.id} value={e.id} className="bg-gray-900">{e.name}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Форма создания/редактирования */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingId(null); }} />
          <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl p-5 border border-neon-purple/30 animate-scale-in">
            <h4 className="font-oswald font-bold text-white mb-4 flex items-center gap-2">
              <Icon name={editingId ? "Edit" : "Plus"} size={16} className="text-neon-purple" />
              {editingId ? "Редактировать задачу" : "Новая задача"}
            </h4>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Название задачи *"
                className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/55 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Описание (необязательно)" rows={2}
                className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/55 outline-none border border-white/10 focus:border-neon-purple/50 text-sm resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/65 mb-1 block">Назначить</label>
                  <select value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                    className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 outline-none appearance-none bg-transparent">
                    <option value="" className="bg-gray-900">Не назначено</option>
                    {employees.map(e => <option key={e.id} value={e.id} className="bg-gray-900">{e.name} ({ROLE_LABELS[e.roleInCompany] || e.roleInCompany})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/65 mb-1 block">Приоритет</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as VenueTask["priority"] }))}
                    className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 outline-none appearance-none bg-transparent">
                    {Object.entries(PRIORITY_CONFIG).map(([v, c]) => <option key={v} value={v} className="bg-gray-900">{c.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-white/65 mb-1 block">Срок</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 outline-none bg-transparent" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                  className="flex-1 py-2.5 glass text-white/70 rounded-xl border border-white/10 text-sm hover:text-white transition-colors">
                  Отмена
                </button>
                <button onClick={editingId ? saveEdit : createTask} disabled={saving || !form.title.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-purple text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50">
                  {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
                  {editingId ? "Сохранить" : "Создать"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Пусто */}
      {tasks.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <Icon name="ClipboardList" size={36} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/65 text-sm">Нет задач</p>
          <p className="text-white/25 text-xs mt-1 mb-4">Создайте задачи для своих сотрудников по этому мероприятию</p>
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-neon-purple/20 text-neon-purple border border-neon-purple/30 rounded-xl text-sm hover:bg-neon-purple/30 transition-colors">
            Создать первую задачу
          </button>
        </div>
      )}

      {/* Канбан-доски */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_ORDER.map(st => {
            const col = STATUS_CONFIG[st];
            const colTasks = grouped[st] || [];
            return (
              <div key={st} className="glass rounded-2xl overflow-hidden">
                <div className={`px-4 py-3 border-b border-white/8 flex items-center gap-2`}>
                  <Icon name={col.icon} size={14} className={col.cls.split(" ")[0]} />
                  <span className="font-oswald font-semibold text-white text-sm">{col.label}</span>
                  <span className="ml-auto text-xs text-white/55">{colTasks.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[80px]">
                  {colTasks.map(task => {
                    const pr = PRIORITY_CONFIG[task.priority];
                    const overdue = isPastDue(task.dueDate) && task.status !== "done";
                    return (
                      <div key={task.id} className="glass rounded-xl p-3 space-y-2 group">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${pr.dot}`} />
                            <span className="text-white text-xs font-medium leading-tight line-clamp-2">{task.title}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => startEdit(task)} className="text-white/55 hover:text-neon-purple transition-colors">
                              <Icon name="Edit3" size={12} />
                            </button>
                            <button onClick={() => deleteTask(task.id)} className="text-white/55 hover:text-neon-pink transition-colors">
                              <Icon name="Trash2" size={12} />
                            </button>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-white/60 text-[10px] leading-relaxed line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-white/55 text-[10px] truncate">{task.assigneeName}</span>
                          {task.dueDate && (
                            <span className={`text-[10px] shrink-0 ${overdue ? "text-neon-pink" : "text-white/55"}`}>
                              {overdue && <Icon name="AlertCircle" size={9} className="inline mr-0.5" />}
                              {task.dueDate}
                            </span>
                          )}
                        </div>
                        {/* Переключатель статуса */}
                        <select value={task.status} onChange={e => updateStatus(task.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className={`w-full text-[10px] px-2 py-1 rounded-lg border outline-none appearance-none bg-transparent cursor-pointer ${col.cls}`}>
                          {STATUS_ORDER.map(s => <option key={s} value={s} className="bg-gray-900 text-white">{STATUS_CONFIG[s].label}</option>)}
                        </select>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div className="text-center py-4 text-white/15 text-xs">Пусто</div>
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
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { PROJECTS_URL } from "@/hooks/useProjects";
import { EMPLOYEES_URL, type Employee } from "@/components/dashboard/profile/types";
import { useAuth } from "@/context/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────
interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isDone: boolean;
  doneBy: string | null;
  doneByName?: string;
  doneAt: string | null;
  comment: string;
  sortOrder: number;
}

interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  targetValue: number | null;
  currentValue: number;
  unit: string;
  status: "active" | "completed" | "paused";
  deadline: string | null;
  color: string;
}

interface ProjectTask {
  id: string;
  projectId: string;
  companyUserId: string;
  assignedTo: string | null;
  parentTaskId: string | null;
  goalId: string | null;
  createdBy: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  sortOrder: number;
  assigneeName: string;
  creatorName: string;
  subtasks?: Subtask[];
  comments?: TaskComment[];
}

const STATUS_CONFIG = {
  todo:        { label: "К выполнению", cls: "text-white/50 bg-white/5 border-white/10",               icon: "Circle",      bg: "bg-white/5" },
  in_progress: { label: "В работе",     cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20",    icon: "Clock",       bg: "bg-neon-cyan/5" },
  review:      { label: "На проверке",  cls: "text-neon-purple bg-neon-purple/10 border-neon-purple/20", icon: "Eye",      bg: "bg-neon-purple/5" },
  done:        { label: "Готово",       cls: "text-neon-green bg-neon-green/10 border-neon-green/20",  icon: "CheckCircle2", bg: "bg-neon-green/5" },
} as const;

const PRIORITY_CONFIG = {
  low:    { label: "Низкий",  cls: "text-white/40",           dot: "bg-white/30",   icon: "ArrowDown" },
  medium: { label: "Средний", cls: "text-neon-cyan",          dot: "bg-neon-cyan",  icon: "Minus" },
  high:   { label: "Высокий", cls: "text-neon-purple",        dot: "bg-neon-purple",icon: "ArrowUp" },
  urgent: { label: "Срочно!", cls: "text-neon-pink font-bold",dot: "bg-neon-pink",  icon: "Flame" },
} as const;

const STATUS_ORDER = ["todo", "in_progress", "review", "done"] as const;

function formatDue(d: string | null) {
  if (!d) return null;
  const date = new Date(d);
  const now = new Date();
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const label = date.toLocaleDateString("ru", { day: "numeric", month: "short" });
  if (diff < 0) return { label, cls: "text-neon-pink" };
  if (diff === 0) return { label: "Сегодня", cls: "text-neon-pink" };
  if (diff <= 2) return { label, cls: "text-neon-cyan" };
  return { label, cls: "text-white/40" };
}

// ── Task Detail Modal ──────────────────────────────────────────────────────
function TaskDetailModal({
  task, employees, onClose, onSave, onStatusChange, user,
}: {
  task: ProjectTask;
  employees: Employee[];
  onClose: () => void;
  onSave: (t: ProjectTask) => void;
  onStatusChange: (id: string, status: string) => void;
  user: { id: string; name: string } | null;
}) {
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [comments, setComments] = useState<TaskComment[]>(task.comments || []);
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [subtaskComment, setSubtaskComment] = useState<Record<string, string>>({});
  const [loadingSubtasks, setLoadingSubtasks] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Загружаем подзадачи и комментарии
    Promise.all([
      fetch(`${PROJECTS_URL}?action=subtasks_list&task_id=${task.id}`).then(r => r.json()),
      fetch(`${PROJECTS_URL}?action=task_comments_list&task_id=${task.id}`).then(r => r.json()),
    ]).then(([sd, cd]) => {
      setSubtasks(sd.subtasks || []);
      setComments(cd.comments || []);
    }).finally(() => {
      setLoadingSubtasks(false);
      setLoadingComments(false);
    });
  }, [task.id]);

  const addSubtask = async () => {
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    const res = await fetch(`${PROJECTS_URL}?action=subtask_create`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, title: newSubtask.trim(), sortOrder: subtasks.length }),
    });
    const data = await res.json();
    setSubtasks(prev => [...prev, data]);
    setNewSubtask("");
    setAddingSubtask(false);
  };

  const toggleSubtask = async (st: Subtask) => {
    const comment = subtaskComment[st.id] || "";
    const res = await fetch(`${PROJECTS_URL}?action=subtask_toggle`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtaskId: st.id, isDone: !st.isDone, doneBy: user?.id, comment }),
    });
    const data = await res.json();
    setSubtasks(prev => prev.map(s => s.id === st.id ? data : s));
    setSubtaskComment(prev => ({ ...prev, [st.id]: "" }));
  };

  const addComment = async () => {
    if (!newComment.trim() || !user) return;
    setAddingComment(true);
    const res = await fetch(`${PROJECTS_URL}?action=task_comment_create`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, authorId: user.id, authorName: user.name, text: newComment.trim() }),
    });
    const data = await res.json();
    setComments(prev => [...prev, data]);
    setNewComment("");
    setAddingComment(false);
    setTimeout(() => commentsRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 100);
  };

  const doneCount = subtasks.filter(s => s.isDone).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0;
  const due = formatDue(task.dueDate);
  const cfg = STATUS_CONFIG[task.status];
  const pcfg = PRIORITY_CONFIG[task.priority];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl glass-strong rounded-2xl border border-white/10 shadow-2xl animate-scale-in flex flex-col"
        style={{ maxHeight: "calc(100vh - 2rem)" }}>

        {/* Header — фиксирован */}
        <div className="flex items-start gap-4 px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${cfg.cls}`}>
                <Icon name={cfg.icon as never} size={11} />{cfg.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs ${pcfg.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pcfg.dot}`} />{pcfg.label}
              </span>
              {due && <span className={`text-xs ${due.cls}`}><Icon name="CalendarDays" size={11} className="inline mr-0.5" />{due.label}</span>}
            </div>
            <h2 className="font-oswald font-bold text-lg text-white leading-snug">{task.title}</h2>
            {task.description && <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{task.description}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0">
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Body — скроллится внутри */}
        <div className="grid md:grid-cols-3 gap-0 min-h-0 flex-1 overflow-hidden">

          {/* Left — подзадачи + комментарии */}
          <div className="md:col-span-2 flex flex-col border-r border-white/5 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-5">

              {/* Подзадачи */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <h3 className="font-oswald font-semibold text-white text-sm">Подзадачи</h3>
                  <span className="text-white/30 text-xs">{doneCount}/{subtasks.length}</span>
                  {subtasks.length > 0 && (
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-neon-purple to-neon-green rounded-full transition-all" style={{ width: `${subtaskProgress}%` }} />
                    </div>
                  )}
                </div>

                {loadingSubtasks ? (
                  <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-9 glass rounded-xl animate-pulse" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {subtasks.map(st => (
                      <div key={st.id} className={`glass rounded-xl p-3 border transition-all ${st.isDone ? "border-neon-green/20 bg-neon-green/5" : "border-white/5"}`}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleSubtask(st)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                              st.isDone ? "bg-neon-green border-neon-green text-white" : "border-white/20 hover:border-neon-purple"
                            }`}
                          >
                            {st.isDone && <Icon name="Check" size={11} />}
                          </button>
                          <span className={`flex-1 text-sm ${st.isDone ? "line-through text-white/30" : "text-white/80"}`}>
                            {st.title}
                          </span>
                          {st.isDone && st.doneByName && (
                            <span className="text-neon-green/60 text-xs shrink-0">{st.doneByName}</span>
                          )}
                        </div>
                        {!st.isDone && (
                          <div className="mt-2 ml-8">
                            <input
                              value={subtaskComment[st.id] || ""}
                              onChange={e => setSubtaskComment(prev => ({ ...prev, [st.id]: e.target.value }))}
                              placeholder="Комментарий при выполнении..."
                              className="w-full bg-white/5 rounded-lg px-3 py-1.5 text-white/60 placeholder:text-white/20 text-xs outline-none border border-white/5 focus:border-neon-purple/30"
                            />
                          </div>
                        )}
                        {st.isDone && st.comment && (
                          <p className="ml-8 mt-1 text-white/30 text-xs italic">{st.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2.5">
                  <input
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    placeholder="Добавить подзадачу..."
                    className="flex-1 glass rounded-xl px-3 py-2 text-white placeholder:text-white/25 text-sm outline-none border border-white/10 focus:border-neon-purple/40"
                    onKeyDown={e => e.key === "Enter" && addSubtask()}
                  />
                  <button onClick={addSubtask} disabled={!newSubtask.trim() || addingSubtask}
                    className="px-3 py-2 bg-neon-purple/20 border border-neon-purple/30 text-neon-purple rounded-xl text-xs hover:bg-neon-purple/30 disabled:opacity-40 transition-all">
                    {addingSubtask ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Plus" size={13} />}
                  </button>
                </div>
              </div>

              {/* Комментарии */}
              <div>
                <h3 className="font-oswald font-semibold text-white text-sm mb-2.5 flex items-center gap-2">
                  Комментарии
                  {comments.length > 0 && <span className="text-white/30 text-xs">{comments.length}</span>}
                </h3>
                <div ref={commentsRef} className="space-y-2">
                  {loadingComments ? (
                    <div className="h-12 glass rounded-xl animate-pulse" />
                  ) : comments.length === 0 ? (
                    <p className="text-white/25 text-xs text-center py-3">Комментариев пока нет</p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="glass rounded-xl p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-neon-purple text-xs font-medium">{c.authorName}</span>
                          <span className="text-white/25 text-xs">
                            {new Date(c.createdAt).toLocaleDateString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-white/70 text-sm">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Поле комментария — прибито к низу левой колонки */}
            <div className="px-6 py-3 border-t border-white/5 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Написать комментарий... (Ctrl+Enter)"
                  rows={2}
                  className="flex-1 glass rounded-xl px-3 py-2 text-white placeholder:text-white/25 text-sm outline-none border border-white/10 focus:border-neon-purple/40 resize-none"
                  onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) addComment(); }}
                />
                <button onClick={addComment} disabled={!newComment.trim() || addingComment}
                  className="px-3 py-2 bg-neon-purple/20 border border-neon-purple/30 text-neon-purple rounded-xl text-xs hover:bg-neon-purple/30 disabled:opacity-40 transition-all">
                  {addingComment ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Send" size={13} />}
                </button>
              </div>
            </div>
          </div>

          {/* Right — инфо + статус, тоже скроллится */}
          <div className="overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
            <div>
              <p className="text-white/30 text-xs mb-1.5 uppercase tracking-wider">Статус</p>
              <div className="grid grid-cols-1 gap-1">
                {STATUS_ORDER.map(s => (
                  <button key={s} onClick={() => onStatusChange(task.id, s)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all ${task.status === s ? STATUS_CONFIG[s].cls : "text-white/30 border-white/5 hover:bg-white/5"}`}>
                    <Icon name={STATUS_CONFIG[s].icon as never} size={12} />{STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-white/30 text-xs mb-1.5 uppercase tracking-wider">Исполнитель</p>
              <p className="text-white text-sm">{task.assigneeName || "Не назначен"}</p>
            </div>

            {task.dueDate && (
              <div>
                <p className="text-white/30 text-xs mb-1.5 uppercase tracking-wider">Срок</p>
                {(() => { const d = formatDue(task.dueDate); return d ? <p className={`text-sm ${d.cls}`}>{d.label}</p> : null; })()}
              </div>
            )}

            {task.estimatedHours && (
              <div>
                <p className="text-white/30 text-xs mb-1.5 uppercase tracking-wider">Оценка</p>
                <p className="text-white text-sm">{task.estimatedHours} ч</p>
              </div>
            )}

            <div>
              <p className="text-white/30 text-xs mb-1.5 uppercase tracking-wider">Создал</p>
              <p className="text-white/60 text-sm">{task.creatorName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
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
                    <div className={`flex items-center gap-2 mb-3 px-1`}>
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

// ── Goals Tab ──────────────────────────────────────────────────────────────
function GoalsTab({ goals, projectId, user, onReload }: {
  goals: Goal[];
  projectId: string;
  user: { id: string; name: string } | null;
  onReload: () => void;
}) {
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
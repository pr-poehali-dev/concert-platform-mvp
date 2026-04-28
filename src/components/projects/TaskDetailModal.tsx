import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import {
  PROJECTS_URL,
  STATUS_CONFIG,
  STATUS_ORDER,
  PRIORITY_CONFIG,
  formatDue,
  type ProjectTask,
  type Subtask,
  type TaskComment,
} from "./crmTypes";
import type { Employee } from "@/components/dashboard/profile/types";

interface Props {
  task: ProjectTask;
  employees: Employee[];
  onClose: () => void;
  onSave: (t: ProjectTask) => void;
  onStatusChange: (id: string, status: string) => void;
  user: { id: string; name: string } | null;
}

export default function TaskDetailModal({
  task, employees, onClose, onSave, onStatusChange, user,
}: Props) {
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

  // suppress unused
  void employees; void onSave;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-3xl glass-strong rounded-2xl border border-white/10 shadow-2xl animate-scale-in flex flex-col"
        style={{ maxHeight: "calc(100vh - 2rem)" }}
      >

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
                  <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-9 glass rounded-xl animate-pulse" />)}</div>
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

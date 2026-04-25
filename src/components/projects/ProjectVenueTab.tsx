import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL, fmt } from "@/hooks/useProjects";

interface BookingTask {
  id: string;
  bookingId: string;
  projectId: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "done";
  sortOrder: number;
}

interface BookingInfo {
  id: string;
  venueId: string;
  venueName: string;
  projectId: string;
  projectTitle: string;
  eventDate: string;
  eventTime: string;
  artist: string;
  ageLimit: string;
  expectedGuests: number;
  status: string;
  rentalAmount: number | null;
  venueConditions: string;
  organizerId: string;
  venueUserId: string;
  conversationId: string;
  tasks: BookingTask[];
}

const TASK_STATUS_CONFIG = {
  pending: { label: "Ожидает", cls: "text-white/50 bg-white/5 border-white/10", icon: "Circle" },
  in_progress: { label: "В работе", cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20", icon: "Clock" },
  done: { label: "Готово", cls: "text-neon-green bg-neon-green/10 border-neon-green/20", icon: "CheckCircle2" },
} as const;

export default function ProjectVenueTab({ projectId, onOpenChat }: { projectId: string; onOpenChat?: (conversationId: string) => void }) {
  const [bookings, setBookings] = useState<BookingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bookRes = await fetch(`${PROJECTS_URL}?action=booking_by_project&project_id=${projectId}`);
      const bookData = await bookRes.json();
      const confirmedBookings = (bookData.bookings || []).filter(
        (b: { status: string }) => b.status === "accepted" || b.status === "confirmed"
      );

      const detailed = await Promise.all(
        confirmedBookings.map(async (b: { id: string }) => {
          const det = await fetch(`${PROJECTS_URL}?action=booking_detail&booking_id=${b.id}`).then(r => r.json());
          const booking = det.booking || null;
          // Если чата ещё нет — создаём автоматически
          if (booking && !booking.conversationId) {
            const chatRes = await fetch(`${PROJECTS_URL}?action=create_missing_chat`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId: booking.id }),
            }).then(r => r.json());
            if (chatRes.conversationId) booking.conversationId = chatRes.conversationId;
          }
          return booking;
        })
      );
      setBookings(detailed.filter(Boolean));
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const updateTask = async (taskId: string, status: "pending" | "in_progress" | "done") => {
    setUpdatingTask(taskId);
    await fetch(`${PROJECTS_URL}?action=update_task`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status }),
    });
    setUpdatingTask(null);
    setBookings(prev => prev.map(b => ({
      ...b,
      tasks: b.tasks.map(t => t.id === taskId ? { ...t, status } : t),
    })));
  };

  if (loading) return (
    <div className="space-y-3 animate-fade-in">
      {[1, 2].map(i => <div key={i} className="glass rounded-2xl h-24 animate-pulse" />)}
    </div>
  );

  if (bookings.length === 0) return (
    <div className="glass rounded-2xl p-10 text-center animate-fade-in">
      <Icon name="Building2" size={36} className="text-white/15 mx-auto mb-3" />
      <p className="text-white/40 text-sm">Нет подтверждённых бронирований площадок</p>
      <p className="text-white/25 text-xs mt-1">После принятия условий здесь появятся задачи по организации</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {bookings.map(booking => {
        const doneTasks = booking.tasks.filter(t => t.status === "done").length;
        const totalTasks = booking.tasks.length;
        const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        return (
          <div key={booking.id} className="glass rounded-2xl overflow-hidden border border-neon-purple/10">
            {/* Заголовок бронирования */}
            <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-oswald font-bold text-white text-lg flex items-center gap-2">
                  <Icon name="Building2" size={16} className="text-neon-purple" />
                  {booking.venueName}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Icon name="Calendar" size={11} />
                    {booking.eventDate}{booking.eventTime ? ` ${booking.eventTime}` : ""}
                  </span>
                  {booking.artist && <span className="flex items-center gap-1"><Icon name="Music" size={11} />{booking.artist}</span>}
                  {booking.rentalAmount !== null && (
                    <span className="flex items-center gap-1 text-neon-green font-medium">
                      <Icon name="Banknote" size={11} />Аренда: {fmt(booking.rentalAmount)} ₽
                    </span>
                  )}
                </div>
                {booking.venueConditions && (
                  <p className="text-white/30 text-xs mt-1.5 line-clamp-2">{booking.venueConditions}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {booking.conversationId && onOpenChat && (
                  <button
                    onClick={() => onOpenChat(booking.conversationId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 rounded-lg text-xs hover:bg-neon-cyan/20 transition-colors"
                  >
                    <Icon name="MessageCircle" size={13} />Открыть чат
                  </button>
                )}
                <span className="text-xs text-white/30">{doneTasks}/{totalTasks} задач</span>
              </div>
            </div>

            {/* Прогресс */}
            {totalTasks > 0 && (
              <div className="px-5 py-3 border-b border-white/5">
                <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
                  <span>Прогресс организации</span>
                  <span className={progress === 100 ? "text-neon-green font-medium" : ""}>{progress}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-neon-green" : "bg-neon-purple"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Задачи */}
            <div className="divide-y divide-white/5">
              {booking.tasks.map(task => {
                const cfg = TASK_STATUS_CONFIG[task.status];
                return (
                  <div key={task.id} className="px-5 py-3.5 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${task.status === "done" ? "line-through text-white/40" : "text-white"}`}>
                          {task.title}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg border ${cfg.cls}`}>
                          <Icon name={cfg.icon} size={10} className="inline mr-1" />{cfg.label}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-white/30 text-xs mt-0.5">{task.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(["pending", "in_progress", "done"] as const).map(s => (
                        <button
                          key={s}
                          disabled={task.status === s || updatingTask === task.id}
                          onClick={() => updateTask(task.id, s)}
                          title={TASK_STATUS_CONFIG[s].label}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all text-xs disabled:cursor-default
                            ${task.status === s
                              ? TASK_STATUS_CONFIG[s].cls
                              : "border-white/10 text-white/20 hover:text-white/60 hover:border-white/20"}`}
                        >
                          {updatingTask === task.id && task.status !== s ? (
                            <Icon name="Loader2" size={11} className="animate-spin" />
                          ) : (
                            <Icon name={TASK_STATUS_CONFIG[s].icon} size={11} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
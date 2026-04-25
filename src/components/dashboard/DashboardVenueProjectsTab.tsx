import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { PROJECTS_URL, fmt } from "@/hooks/useProjects";

interface ChecklistItem {
  id: string;
  stepKey: string;
  stepTitle: string;
  isDone: boolean;
  note: string;
  sortOrder: number;
}

interface VenueBookingProject {
  bookingId: string;
  eventDate: string;
  projectId: string;
  projectTitle: string;
  rentalAmount: number | null;
  venueConditions: string;
  organizerId: string;
  organizerName: string;
  eventTime: string;
  artist: string;
  status: string;
  conversationId: string;
  checklist: ChecklistItem[];
}

export default function DashboardVenueProjectsTab({ onOpenChat }: { onOpenChat?: (conversationId: string) => void }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<VenueBookingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [noteEditing, setNoteEditing] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=booking_checklist&venue_id=${user.id}`);
      const data = await res.json();
      setProjects(data.bookings || []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const toggleStep = async (itemId: string, currentDone: boolean, note: string, bookingId: string) => {
    setUpdatingItem(itemId);
    const newDone = !currentDone;
    await fetch(`${PROJECTS_URL}?action=update_checklist`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, isDone: newDone, note }),
    });
    setUpdatingItem(null);
    setProjects(prev => prev.map(p =>
      p.bookingId === bookingId
        ? { ...p, checklist: p.checklist.map(c => c.id === itemId ? { ...c, isDone: newDone } : c) }
        : p
    ));
  };

  const saveNote = async (itemId: string, isDone: boolean, bookingId: string) => {
    await fetch(`${PROJECTS_URL}?action=update_checklist`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, isDone, note: noteText }),
    });
    setProjects(prev => prev.map(p =>
      p.bookingId === bookingId
        ? { ...p, checklist: p.checklist.map(c => c.id === itemId ? { ...c, note: noteText } : c) }
        : p
    ));
    setNoteEditing(null);
  };

  if (loading) return (
    <div className="space-y-3">
      {[1, 2].map(i => <div key={i} className="glass rounded-2xl h-32 animate-pulse" />)}
    </div>
  );

  if (projects.length === 0) return (
    <div className="glass rounded-2xl p-10 text-center">
      <Icon name="FolderOpen" size={36} className="text-white/15 mx-auto mb-3" />
      <p className="text-white/40 text-sm">Нет подтверждённых проектов</p>
      <p className="text-white/25 text-xs mt-1">Здесь появятся проекты после подтверждения бронирований</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {projects.map(proj => {
        const doneSteps = proj.checklist.filter(c => c.isDone).length;
        const totalSteps = proj.checklist.length;
        const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

        return (
          <div key={proj.bookingId} className="glass-strong rounded-2xl overflow-hidden border border-white/8">
            {/* Заголовок проекта */}
            <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-oswald font-bold text-white text-base flex items-center gap-2 flex-wrap">
                  <Icon name="Music2" size={15} className="text-neon-purple shrink-0" />
                  {proj.projectTitle}
                  {proj.artist && <span className="text-neon-cyan text-sm font-normal">· {proj.artist}</span>}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Icon name="Calendar" size={11} />
                    {proj.eventDate}{proj.eventTime ? ` · ${proj.eventTime}` : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="User" size={11} />Организатор: {proj.organizerName}
                  </span>
                  {proj.rentalAmount !== null && (
                    <span className="flex items-center gap-1 text-neon-green font-medium">
                      <Icon name="Banknote" size={11} />{fmt(proj.rentalAmount)} ₽
                    </span>
                  )}
                </div>
                {proj.venueConditions && (
                  <p className="text-white/25 text-xs mt-1.5 line-clamp-2">{proj.venueConditions}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {proj.conversationId && onOpenChat && (
                  <button
                    onClick={() => onOpenChat(proj.conversationId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 rounded-lg text-xs hover:bg-neon-cyan/20 transition-colors"
                  >
                    <Icon name="MessageCircle" size={13} />Чат
                  </button>
                )}
              </div>
            </div>

            {/* Прогресс */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-neon-green" : "bg-gradient-to-r from-neon-purple to-neon-cyan"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={`text-xs font-medium shrink-0 ${progress === 100 ? "text-neon-green" : "text-white/40"}`}>
                {doneSteps}/{totalSteps}
                {progress === 100 && " — Готово!"}
              </span>
            </div>

            {/* Чеклист */}
            <div className="divide-y divide-white/5">
              {proj.checklist.map(item => (
                <div key={item.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <button
                      disabled={updatingItem === item.id}
                      onClick={() => toggleStep(item.id, item.isDone, item.note, proj.bookingId)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                        ${item.isDone
                          ? "bg-neon-green border-neon-green"
                          : "border-white/25 hover:border-neon-green/50"}`}
                    >
                      {updatingItem === item.id
                        ? <Icon name="Loader2" size={11} className="animate-spin text-white" />
                        : item.isDone
                          ? <Icon name="Check" size={11} className="text-white" />
                          : null}
                    </button>
                    <span className={`text-sm flex-1 ${item.isDone ? "line-through text-white/40" : "text-white"}`}>
                      {item.stepTitle}
                    </span>
                    <button
                      onClick={() => { setNoteEditing(item.id); setNoteText(item.note); }}
                      className="text-white/20 hover:text-white/60 transition-colors"
                      title="Добавить комментарий"
                    >
                      <Icon name="MessageSquare" size={13} />
                    </button>
                  </div>

                  {/* Заметка */}
                  {noteEditing === item.id ? (
                    <div className="mt-2 ml-9 flex gap-2">
                      <input
                        autoFocus
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveNote(item.id, item.isDone, proj.bookingId); if (e.key === "Escape") setNoteEditing(null); }}
                        placeholder="Комментарий..."
                        className="flex-1 glass rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/40"
                      />
                      <button onClick={() => saveNote(item.id, item.isDone, proj.bookingId)} className="px-2 py-1.5 bg-neon-purple/20 text-neon-purple rounded-lg text-xs hover:bg-neon-purple/30 transition-colors">
                        <Icon name="Check" size={12} />
                      </button>
                      <button onClick={() => setNoteEditing(null)} className="px-2 py-1.5 glass rounded-lg text-white/30 text-xs hover:text-white/60">
                        <Icon name="X" size={12} />
                      </button>
                    </div>
                  ) : item.note ? (
                    <p className="mt-1 ml-9 text-white/30 text-xs">{item.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

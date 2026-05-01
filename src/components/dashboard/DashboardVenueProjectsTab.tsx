import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { PROJECTS_URL, fmt } from "@/hooks/useProjects";
import VenueBookingCrmTab from "./VenueBookingCrmTab";
import DashboardCompanyTab from "./DashboardCompanyTab";
import BookingRequestsWidget from "./BookingRequestsWidget";

const CHAT_URL = "https://functions.poehali.dev/85035195-bd7b-44ce-b77c-db1255f711b5";

// Шаги где нужен файлообмен
const FILE_STEPS = ["contract_signed", "rent_paid"];

interface ChecklistItem {
  id: string;
  stepKey: string;
  stepTitle: string;
  isDone: boolean;
  note: string;
  sortOrder: number;
}

interface BookingFile {
  id: string;
  stepKey: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: string;
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

function isPast(dateStr: string) {
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export default function DashboardVenueProjectsTab({ onOpenChat, onNavigate }: { onOpenChat?: (conversationId: string) => void; onNavigate?: (page: string) => void }) {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<"requests" | "active">("requests");
  const [projects, setProjects] = useState<VenueBookingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [noteEditing, setNoteEditing] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [openTab, setOpenTab] = useState<Record<string, "checklist" | "crm" | "company">>({});
  const [search, setSearch] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [filesMap, setFilesMap] = useState<Record<string, BookingFile[]>>({});
  const [uploadingStep, setUploadingStep] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUpload, setPendingUpload] = useState<{ bookingId: string; stepKey: string } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

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

  useEffect(() => {
    if (!user) return;
    fetch(`${CHAT_URL}?action=conversations&user_id=${user.id}`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, number> = {};
        (data.conversations || []).forEach((c: { id: string; unread: number }) => { map[c.id] = c.unread; });
        setUnreadMap(map);
      }).catch(() => {});
  }, [user]);

  const loadFiles = async (bookingId: string) => {
    if (filesMap[bookingId]) return;
    try {
      const res = await fetch(`${PROJECTS_URL}?action=booking_files&booking_id=${bookingId}`);
      const data = await res.json();
      setFilesMap(prev => ({ ...prev, [bookingId]: data.files || [] }));
    } catch { /* silent */ }
  };

  const handleOpen = (bookingId: string) => {
    if (openId === bookingId) { setOpenId(null); return; }
    setOpenId(bookingId);
    loadFiles(bookingId);
  };

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

  const handleFileSelect = (bookingId: string, stepKey: string) => {
    setPendingUpload({ bookingId, stepKey });
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUpload || !user) return;
    const { bookingId, stepKey } = pendingUpload;
    setUploadingStep(`${bookingId}:${stepKey}`);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const res = await fetch(`${PROJECTS_URL}?action=upload_booking_file`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId, uploadedBy: user.id, stepKey,
          fileName: file.name, fileData: base64, mimeType: file.type,
        }),
      }).then(r => r.json());
      if (res.id) {
        const newFile: BookingFile = {
          id: res.id, stepKey, fileName: res.fileName, fileUrl: res.fileUrl,
          fileSize: file.size, mimeType: file.type,
          createdAt: new Date().toISOString(), uploadedBy: user.name || "Вы",
        };
        setFilesMap(prev => ({ ...prev, [bookingId]: [newFile, ...(prev[bookingId] || [])] }));
      }
      setUploadingStep(null);
      setPendingUpload(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const deleteFile = async (bookingId: string, fileId: string) => {
    await fetch(`${PROJECTS_URL}?action=delete_booking_file`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    setFilesMap(prev => ({ ...prev, [bookingId]: (prev[bookingId] || []).filter(f => f.id !== fileId) }));
  };

  const q = search.toLowerCase();
  const filtered = projects.filter(p => {
    const past = isPast(p.eventDate);
    if (showArchive ? !past : past) return false;
    if (!q) return true;
    return p.projectTitle.toLowerCase().includes(q) ||
      p.artist.toLowerCase().includes(q) ||
      p.organizerName.toLowerCase().includes(q) ||
      p.eventDate.includes(q);
  });

  const archiveCount = projects.filter(p => isPast(p.eventDate)).length;
  const activeCount = projects.filter(p => !isPast(p.eventDate)).length;

  return (
    <div className="space-y-4">
      {/* Скрытый input для файлов */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls" />

      {/* Главные табы: Запросы / Действующие проекты */}
      <div className="flex gap-1 glass rounded-xl p-1">
        <button
          onClick={() => setMainTab("requests")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mainTab === "requests" ? "bg-neon-purple text-white" : "text-white/65 hover:text-white"}`}
        >
          <Icon name="CalendarClock" size={15} />
          Запросы
          {pendingCount > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${mainTab === "requests" ? "bg-white/25 text-white" : "bg-neon-pink text-white"}`}>
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setMainTab("active")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mainTab === "active" ? "bg-neon-purple text-white" : "text-white/65 hover:text-white"}`}
        >
          <Icon name="FolderOpen" size={15} />
          Действующие проекты
          {activeCount > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${mainTab === "active" ? "bg-white/25 text-white" : "bg-white/15 text-white/70"}`}>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Раздел: Запросы на бронирование */}
      {mainTab === "requests" && (
        <BookingRequestsWidget onNavigate={onNavigate} onPendingCount={setPendingCount} />
      )}

      {/* Раздел: Действующие проекты */}
      {mainTab === "active" && <>

      {/* Поиск + переключатель архива */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-48 glass rounded-xl px-3 py-2">
          <Icon name="Search" size={14} className="text-white/55 shrink-0" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию, артисту, организатору..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/55 outline-none"
          />
          {search && <button onClick={() => setSearch("")}><Icon name="X" size={12} className="text-white/55" /></button>}
        </div>
        <div className="flex glass rounded-xl p-1 gap-1">
          <button onClick={() => setShowArchive(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!showArchive ? "bg-neon-purple text-white" : "text-white/65 hover:text-white"}`}>
            <Icon name="CalendarCheck" size={12} />Активные {activeCount > 0 && <span className="bg-neon-purple/30 rounded-full px-1.5">{activeCount}</span>}
          </button>
          <button onClick={() => setShowArchive(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showArchive ? "bg-white/10 text-white" : "text-white/65 hover:text-white"}`}>
            <Icon name="Archive" size={12} />Архив {archiveCount > 0 && <span className="bg-white/10 rounded-full px-1.5">{archiveCount}</span>}
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <Icon name="SearchX" size={28} className="text-white/15 mx-auto mb-2" />
          <p className="text-white/65 text-sm">{search ? "Ничего не найдено" : showArchive ? "Архив пуст" : "Нет активных проектов"}</p>
        </div>
      )}

      {filtered.map(proj => {
        const past = isPast(proj.eventDate);
        const doneSteps = proj.checklist.filter(c => c.isDone).length;
        const totalSteps = proj.checklist.length;
        const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
        const isOpen = openId === proj.bookingId;
        const projFiles = filesMap[proj.bookingId] || [];
        const unread = unreadMap[proj.conversationId] || 0;
        const activeInnerTab = openTab[proj.bookingId] || "checklist";
        const setInnerTab = (t: "checklist" | "crm" | "company") =>
          setOpenTab(prev => ({ ...prev, [proj.bookingId]: t }));

        return (
          <div key={proj.bookingId}
            className={`glass-strong rounded-2xl overflow-hidden border transition-all ${past ? "border-white/5 opacity-70" : "border-white/10"}`}>

            {/* Карточка — клик открывает детали */}
            <button
              onClick={() => handleOpen(proj.bookingId)}
              className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-white/3 transition-colors"
            >
              {/* Дата — крупно */}
              <div className={`shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl ${past ? "bg-white/5" : "bg-neon-purple/20 border border-neon-purple/30"}`}>
                <span className={`font-oswald font-bold text-2xl leading-none ${past ? "text-white/65" : "text-neon-purple"}`}>
                  {new Date(proj.eventDate).getDate()}
                </span>
                <span className={`text-xs mt-0.5 ${past ? "text-white/25" : "text-neon-purple/70"}`}>
                  {new Date(proj.eventDate).toLocaleDateString("ru", { month: "short" })}
                </span>
                <span className={`text-[10px] ${past ? "text-white/20" : "text-neon-purple/50"}`}>
                  {new Date(proj.eventDate).getFullYear()}
                </span>
              </div>

              {/* Основная инфо */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-oswald font-bold text-white text-base leading-tight">
                      {proj.projectTitle}
                    </h3>
                    {proj.artist && <p className="text-neon-cyan text-xs mt-0.5">{proj.artist}</p>}
                    <p className="text-white/65 text-xs mt-1">
                      {proj.organizerName}
                      {proj.eventTime && ` · ${proj.eventTime}`}
                      {proj.rentalAmount !== null && ` · ${fmt(proj.rentalAmount)} ₽`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {past && <span className="text-xs px-2 py-0.5 rounded-lg bg-white/5 text-white/55 border border-white/10">Архив</span>}
                    {unread > 0 && (
                      <span className="w-5 h-5 bg-neon-pink rounded-full text-white text-[10px] font-bold flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>
                    )}
                    <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={16} className="text-white/55" />
                  </div>
                </div>

                {/* Прогресс-полоса */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progress === 100 ? "bg-neon-green" : "bg-gradient-to-r from-neon-purple to-neon-cyan"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className={`text-[10px] shrink-0 ${progress === 100 ? "text-neon-green" : "text-white/55"}`}>
                    {doneSteps}/{totalSteps}
                  </span>
                </div>
              </div>
            </button>

            {/* Раскрытые детали */}
            {isOpen && (
              <div className="border-t border-white/10">

                {/* Условия */}
                {proj.venueConditions && (
                  <div className="px-5 py-3 bg-white/3 text-xs text-white/65 border-b border-white/5">
                    <Icon name="FileText" size={11} className="inline mr-1" />{proj.venueConditions}
                  </div>
                )}

                {/* Внутренние вкладки + кнопка чата */}
                <div className="px-5 py-3 flex items-center justify-between gap-3 border-b border-white/5 flex-wrap">
                  <div className="flex gap-1 glass rounded-xl p-1">
                    {([
                      { id: "checklist" as const, label: "Чеклист", icon: "CheckSquare" },
                      { id: "crm" as const,       label: "Задачи",  icon: "ClipboardList" },
                      { id: "company" as const,   label: "Компания",icon: "Users" },
                    ]).map(t => (
                      <button key={t.id} onClick={() => setInnerTab(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeInnerTab === t.id ? "bg-neon-purple text-white" : "text-white/65 hover:text-white"}`}>
                        <Icon name={t.icon} size={12} />{t.label}
                      </button>
                    ))}
                  </div>
                  {proj.conversationId && onOpenChat && (
                    <button
                      onClick={() => onOpenChat(proj.conversationId)}
                      className="relative flex items-center gap-1.5 px-3 py-1.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 rounded-lg text-xs hover:bg-neon-cyan/20 transition-colors"
                    >
                      <Icon name="MessageCircle" size={13} />Чат с организатором
                      {unread > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neon-pink rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {/* CRM Задачи */}
                {activeInnerTab === "crm" && (
                  <div className="p-5">
                    <VenueBookingCrmTab bookingId={proj.bookingId} />
                  </div>
                )}

                {/* Компания (чат + сотрудники) */}
                {activeInnerTab === "company" && (
                  <div className="p-5">
                    <DashboardCompanyTab />
                  </div>
                )}

                {/* Чеклист */}
                {activeInnerTab === "checklist" && <div className="divide-y divide-white/5">
                  {proj.checklist.map(item => {
                    const needsFile = FILE_STEPS.includes(item.stepKey);
                    const stepFiles = projFiles.filter(f => f.stepKey === item.stepKey);
                    const isUploading = uploadingStep === `${proj.bookingId}:${item.stepKey}`;

                    return (
                      <div key={item.id} className="px-5 py-3">
                        {/* Строка шага */}
                        <div className="flex items-center gap-3">
                          <button
                            disabled={updatingItem === item.id}
                            onClick={() => toggleStep(item.id, item.isDone, item.note, proj.bookingId)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                              ${item.isDone ? "bg-neon-green border-neon-green" : "border-white/25 hover:border-neon-green/50"}`}
                          >
                            {updatingItem === item.id
                              ? <Icon name="Loader2" size={11} className="animate-spin text-white" />
                              : item.isDone ? <Icon name="Check" size={11} className="text-white" /> : null}
                          </button>
                          <span className={`text-sm flex-1 ${item.isDone ? "line-through text-white/65" : "text-white"}`}>
                            {item.stepTitle}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {needsFile && (
                              <button
                                onClick={() => handleFileSelect(proj.bookingId, item.stepKey)}
                                disabled={isUploading}
                                className="flex items-center gap-1 px-2 py-1 bg-neon-purple/10 text-neon-purple border border-neon-purple/20 rounded-lg text-[11px] hover:bg-neon-purple/20 transition-colors"
                              >
                                {isUploading
                                  ? <Icon name="Loader2" size={11} className="animate-spin" />
                                  : <Icon name="Upload" size={11} />}
                                Файл
                              </button>
                            )}
                            <button
                              onClick={() => { setNoteEditing(item.id); setNoteText(item.note); }}
                              className="text-white/20 hover:text-white/60 transition-colors"
                            >
                              <Icon name="MessageSquare" size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Заметка */}
                        {noteEditing === item.id ? (
                          <div className="mt-2 ml-9 flex gap-2">
                            <input autoFocus value={noteText} onChange={e => setNoteText(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveNote(item.id, item.isDone, proj.bookingId); if (e.key === "Escape") setNoteEditing(null); }}
                              placeholder="Комментарий..." className="flex-1 glass rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/40" />
                            <button onClick={() => saveNote(item.id, item.isDone, proj.bookingId)} className="px-2 py-1.5 bg-neon-purple/20 text-neon-purple rounded-lg text-xs"><Icon name="Check" size={12} /></button>
                            <button onClick={() => setNoteEditing(null)} className="px-2 py-1.5 glass rounded-lg text-white/55 text-xs"><Icon name="X" size={12} /></button>
                          </div>
                        ) : item.note ? (
                          <p className="mt-1 ml-9 text-white/55 text-xs">{item.note}</p>
                        ) : null}

                        {/* Файлы шага */}
                        {needsFile && stepFiles.length > 0 && (
                          <div className="mt-2 ml-9 space-y-1">
                            {stepFiles.map(f => (
                              <div key={f.id} className="flex items-center gap-2 glass rounded-lg px-3 py-1.5">
                                <Icon name="FileText" size={12} className="text-neon-purple shrink-0" />
                                <a href={f.fileUrl} target="_blank" rel="noreferrer"
                                  className="flex-1 text-xs text-white/70 hover:text-white truncate transition-colors">
                                  {f.fileName}
                                </a>
                                <span className="text-white/25 text-[10px] shrink-0">{fileSize(f.fileSize)}</span>
                                <span className="text-white/20 text-[10px] shrink-0">{f.uploadedBy}</span>
                                <button onClick={() => deleteFile(proj.bookingId, f.id)} className="text-white/20 hover:text-neon-pink transition-colors ml-1">
                                  <Icon name="X" size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>}
              </div>
            )}
          </div>
        );
      })}
      </>}
    </div>
  );
}
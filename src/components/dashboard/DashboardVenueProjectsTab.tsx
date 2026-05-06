import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { BOOKING_TASKS_URL } from "@/lib/bookingUrls";
import BookingRequestsWidget from "./BookingRequestsWidget";
import VenueProjectsActiveTab from "./venue-projects/VenueProjectsActiveTab";

const CHAT_URL = "https://functions.poehali.dev/85035195-bd7b-44ce-b77c-db1255f711b5";

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

function isPast(dateStr: string) {
  return new Date(dateStr) < new Date(new Date().toDateString());
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
      const res = await fetch(`${BOOKING_TASKS_URL}?action=booking_checklist&venue_id=${user.id}`);
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
      const res = await fetch(`${BOOKING_TASKS_URL}?action=booking_files&booking_id=${bookingId}`);
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
    await fetch(`${BOOKING_TASKS_URL}?action=update_checklist`, {
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
    await fetch(`${BOOKING_TASKS_URL}?action=update_checklist`, {
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
      const res = await fetch(`${BOOKING_TASKS_URL}?action=upload_booking_file`, {
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
    await fetch(`${BOOKING_TASKS_URL}?action=delete_booking_file`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    setFilesMap(prev => ({ ...prev, [bookingId]: (prev[bookingId] || []).filter(f => f.id !== fileId) }));
  };

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
        <VenueProjectsActiveTab
          projects={projects}
          search={search}
          showArchive={showArchive}
          openId={openId}
          openTab={openTab}
          filesMap={filesMap}
          unreadMap={unreadMap}
          updatingItem={updatingItem}
          noteEditing={noteEditing}
          noteText={noteText}
          uploadingStep={uploadingStep}
          onSearchChange={setSearch}
          onShowArchive={setShowArchive}
          onOpen={handleOpen}
          onInnerTab={(bookingId, t) => setOpenTab(prev => ({ ...prev, [bookingId]: t }))}
          onOpenChat={onOpenChat}
          onToggleStep={toggleStep}
          onFileSelect={handleFileSelect}
          onNoteEdit={(itemId, currentNote) => { setNoteEditing(itemId); setNoteText(currentNote); }}
          onNoteTextChange={setNoteText}
          onNoteSave={saveNote}
          onNoteCancel={() => setNoteEditing(null)}
          onDeleteFile={deleteFile}
        />
      </>}
    </div>
  );
}
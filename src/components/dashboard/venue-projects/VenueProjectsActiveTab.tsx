import Icon from "@/components/ui/icon";
import VenueProjectCard from "./VenueProjectCard";

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

interface Props {
  projects: VenueBookingProject[];
  search: string;
  showArchive: boolean;
  openId: string | null;
  openTab: Record<string, "checklist" | "crm" | "company">;
  filesMap: Record<string, BookingFile[]>;
  unreadMap: Record<string, number>;
  updatingItem: string | null;
  noteEditing: string | null;
  noteText: string;
  uploadingStep: string | null;
  onSearchChange: (v: string) => void;
  onShowArchive: (v: boolean) => void;
  onOpen: (bookingId: string) => void;
  onInnerTab: (bookingId: string, t: "checklist" | "crm" | "company") => void;
  onOpenChat?: (conversationId: string) => void;
  onToggleStep: (itemId: string, currentDone: boolean, note: string, bookingId: string) => void;
  onFileSelect: (bookingId: string, stepKey: string) => void;
  onNoteEdit: (itemId: string, currentNote: string) => void;
  onNoteTextChange: (text: string) => void;
  onNoteSave: (itemId: string, isDone: boolean, bookingId: string) => void;
  onNoteCancel: () => void;
  onDeleteFile: (bookingId: string, fileId: string) => void;
}

export default function VenueProjectsActiveTab({
  projects, search, showArchive, openId, openTab, filesMap, unreadMap,
  updatingItem, noteEditing, noteText, uploadingStep,
  onSearchChange, onShowArchive, onOpen, onInnerTab, onOpenChat,
  onToggleStep, onFileSelect, onNoteEdit, onNoteTextChange,
  onNoteSave, onNoteCancel, onDeleteFile,
}: Props) {
  const q = search.toLowerCase();
  const filtered = projects.filter(p => {
    const past = isPast(p.eventDate);
    if (showArchive ? !past : past) return false;
    if (!q) return true;
    return (p.projectTitle || "").toLowerCase().includes(q) ||
      (p.artist || "").toLowerCase().includes(q) ||
      (p.organizerName || "").toLowerCase().includes(q) ||
      (p.eventDate || "").includes(q);
  });

  const archiveCount = projects.filter(p => isPast(p.eventDate)).length;
  const activeCount = projects.filter(p => !isPast(p.eventDate)).length;

  return (
    <>
      {/* Поиск + переключатель архива */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-48 glass rounded-xl px-3 py-2">
          <Icon name="Search" size={14} className="text-white/55 shrink-0" />
          <input
            type="text" value={search} onChange={e => onSearchChange(e.target.value)}
            placeholder="Поиск по названию, артисту, организатору..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/55 outline-none"
          />
          {search && <button onClick={() => onSearchChange("")}><Icon name="X" size={12} className="text-white/55" /></button>}
        </div>
        <div className="flex glass rounded-xl p-1 gap-1">
          <button onClick={() => onShowArchive(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!showArchive ? "bg-neon-purple text-white" : "text-white/65 hover:text-white"}`}>
            <Icon name="CalendarCheck" size={12} />Активные {activeCount > 0 && <span className="bg-neon-purple/30 rounded-full px-1.5">{activeCount}</span>}
          </button>
          <button onClick={() => onShowArchive(true)}
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
        const isOpen = openId === proj.bookingId;
        const projFiles = filesMap[proj.bookingId] || [];
        const unread = unreadMap[proj.conversationId] || 0;
        const activeInnerTab = openTab[proj.bookingId] || "checklist";

        return (
          <VenueProjectCard
            key={proj.bookingId}
            proj={proj}
            isOpen={isOpen}
            activeInnerTab={activeInnerTab}
            projFiles={projFiles}
            unread={unread}
            updatingItem={updatingItem}
            noteEditing={noteEditing}
            noteText={noteText}
            uploadingStep={uploadingStep}
            onToggle={() => onOpen(proj.bookingId)}
            onInnerTab={t => onInnerTab(proj.bookingId, t)}
            onOpenChat={onOpenChat}
            onToggleStep={(itemId, currentDone, note) => onToggleStep(itemId, currentDone, note, proj.bookingId)}
            onFileSelect={stepKey => onFileSelect(proj.bookingId, stepKey)}
            onNoteEdit={onNoteEdit}
            onNoteTextChange={onNoteTextChange}
            onNoteSave={(itemId, isDone) => onNoteSave(itemId, isDone, proj.bookingId)}
            onNoteCancel={onNoteCancel}
            onDeleteFile={fileId => onDeleteFile(proj.bookingId, fileId)}
          />
        );
      })}
    </>
  );
}
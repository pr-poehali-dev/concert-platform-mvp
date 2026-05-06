import Icon from "@/components/ui/icon";
import { fmt } from "@/hooks/useProjects";
import VenueBookingCrmTab from "../VenueBookingCrmTab";
import DashboardCompanyTab from "../DashboardCompanyTab";
import VenueProjectChecklist from "./VenueProjectChecklist";

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
  proj: VenueBookingProject;
  isOpen: boolean;
  activeInnerTab: "checklist" | "crm" | "company";
  projFiles: BookingFile[];
  unread: number;
  updatingItem: string | null;
  noteEditing: string | null;
  noteText: string;
  uploadingStep: string | null;
  onToggle: () => void;
  onInnerTab: (t: "checklist" | "crm" | "company") => void;
  onOpenChat?: (conversationId: string) => void;
  onToggleStep: (itemId: string, currentDone: boolean, note: string) => void;
  onFileSelect: (stepKey: string) => void;
  onNoteEdit: (itemId: string, currentNote: string) => void;
  onNoteTextChange: (text: string) => void;
  onNoteSave: (itemId: string, isDone: boolean) => void;
  onNoteCancel: () => void;
  onDeleteFile: (fileId: string) => void;
}

export default function VenueProjectCard({
  proj, isOpen, activeInnerTab, projFiles, unread,
  updatingItem, noteEditing, noteText, uploadingStep,
  onToggle, onInnerTab, onOpenChat,
  onToggleStep, onFileSelect, onNoteEdit, onNoteTextChange,
  onNoteSave, onNoteCancel, onDeleteFile,
}: Props) {
  const past = isPast(proj.eventDate);
  const doneSteps = proj.checklist.filter(c => c.isDone).length;
  const totalSteps = proj.checklist.length;
  const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  return (
    <div
      className={`glass-strong rounded-2xl overflow-hidden border transition-all ${past ? "border-white/5 opacity-70" : "border-white/10"}`}>

      {/* Карточка — клик открывает детали */}
      <button
        onClick={onToggle}
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
                <button key={t.id} onClick={() => onInnerTab(t.id)}
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
          {activeInnerTab === "checklist" && (
            <VenueProjectChecklist
              bookingId={proj.bookingId}
              checklist={proj.checklist}
              projFiles={projFiles}
              updatingItem={updatingItem}
              noteEditing={noteEditing}
              noteText={noteText}
              uploadingStep={uploadingStep}
              onToggleStep={onToggleStep}
              onFileSelect={onFileSelect}
              onNoteEdit={onNoteEdit}
              onNoteTextChange={onNoteTextChange}
              onNoteSave={onNoteSave}
              onNoteCancel={onNoteCancel}
              onDeleteFile={onDeleteFile}
            />
          )}
        </div>
      )}
    </div>
  );
}

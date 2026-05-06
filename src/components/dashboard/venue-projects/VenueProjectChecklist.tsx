import Icon from "@/components/ui/icon";

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

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

interface Props {
  bookingId: string;
  checklist: ChecklistItem[];
  projFiles: BookingFile[];
  updatingItem: string | null;
  noteEditing: string | null;
  noteText: string;
  uploadingStep: string | null;
  onToggleStep: (itemId: string, currentDone: boolean, note: string) => void;
  onFileSelect: (stepKey: string) => void;
  onNoteEdit: (itemId: string, currentNote: string) => void;
  onNoteTextChange: (text: string) => void;
  onNoteSave: (itemId: string, isDone: boolean) => void;
  onNoteCancel: () => void;
  onDeleteFile: (fileId: string) => void;
}

export default function VenueProjectChecklist({
  bookingId,
  checklist,
  projFiles,
  updatingItem,
  noteEditing,
  noteText,
  uploadingStep,
  onToggleStep,
  onFileSelect,
  onNoteEdit,
  onNoteTextChange,
  onNoteSave,
  onNoteCancel,
  onDeleteFile,
}: Props) {
  return (
    <div className="divide-y divide-white/5">
      {checklist.map(item => {
        const needsFile = FILE_STEPS.includes(item.stepKey);
        const stepFiles = projFiles.filter(f => f.stepKey === item.stepKey);
        const isUploading = uploadingStep === `${bookingId}:${item.stepKey}`;

        return (
          <div key={item.id} className="px-5 py-3">
            {/* Строка шага */}
            <div className="flex items-center gap-3">
              <button
                disabled={updatingItem === item.id}
                onClick={() => onToggleStep(item.id, item.isDone, item.note)}
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
                    onClick={() => onFileSelect(item.stepKey)}
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
                  onClick={() => onNoteEdit(item.id, item.note)}
                  className="text-white/20 hover:text-white/60 transition-colors"
                >
                  <Icon name="MessageSquare" size={13} />
                </button>
              </div>
            </div>

            {/* Заметка */}
            {noteEditing === item.id ? (
              <div className="mt-2 ml-9 flex gap-2">
                <input autoFocus value={noteText} onChange={e => onNoteTextChange(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") onNoteSave(item.id, item.isDone); if (e.key === "Escape") onNoteCancel(); }}
                  placeholder="Комментарий..." className="flex-1 glass rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/40" />
                <button onClick={() => onNoteSave(item.id, item.isDone)} className="px-2 py-1.5 bg-neon-purple/20 text-neon-purple rounded-lg text-xs"><Icon name="Check" size={12} /></button>
                <button onClick={onNoteCancel} className="px-2 py-1.5 glass rounded-lg text-white/55 text-xs"><Icon name="X" size={12} /></button>
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
                    <button onClick={() => onDeleteFile(f.id)} className="text-white/20 hover:text-neon-pink transition-colors ml-1">
                      <Icon name="X" size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

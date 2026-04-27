import Icon from "@/components/ui/icon";
import { type Category } from "./docTypes";

interface Props {
  file: File;
  categories: Category[];
  uploadCategory: string;
  uploadNote: string;
  uploadProgress: boolean;
  uploadError: string;
  onCategoryChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onUpload: () => void;
  onClose: () => void;
}

export default function DocUploadModal({
  file,
  categories,
  uploadCategory,
  uploadNote,
  uploadProgress,
  uploadError,
  onCategoryChange,
  onNoteChange,
  onUpload,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={() => !uploadProgress && onClose()} />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
        style={{ background: "#15152a" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-neon-purple/20 flex items-center justify-center flex-shrink-0">
            <Icon name="Upload" size={16} className="text-neon-purple" />
          </div>
          <div className="flex-1">
            <h3 className="font-oswald font-bold text-base text-white">Загрузка документа</h3>
            <p className="text-white/40 text-xs truncate">{file.name}</p>
          </div>
          <span className="text-white/25 text-xs flex-shrink-0">
            {file.size > 1024 * 1024
              ? `${(file.size / 1024 / 1024).toFixed(1)} МБ`
              : `${Math.round(file.size / 1024)} КБ`}
          </span>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Category */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Категория</label>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onCategoryChange(c.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    uploadCategory === c.value
                      ? "border-neon-purple/60 bg-neon-purple/20 text-white"
                      : "border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-white/20"
                  }`}
                >
                  <Icon name={c.icon as never} size={13} className={uploadCategory === c.value ? c.color : ""} />
                  <span className="truncate">{c.label}</span>
                  {uploadCategory === c.value && (
                    <Icon name="Check" size={11} className="ml-auto text-neon-purple flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
              Заметка <span className="normal-case text-white/20">(необязательно)</span>
            </label>
            <input
              type="text"
              value={uploadNote}
              onChange={e => onNoteChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !uploadProgress && onUpload()}
              placeholder="Например: версия от апреля 2025"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/20 outline-none focus:border-neon-purple/40 transition-colors"
            />
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 text-neon-pink text-xs bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2">
              <Icon name="AlertCircle" size={13} />
              {uploadError}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={uploadProgress}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all disabled:opacity-40"
            >
              Отмена
            </button>
            <button
              onClick={onUpload}
              disabled={uploadProgress}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {uploadProgress
                ? <><Icon name="Loader2" size={14} className="animate-spin" />Загружаю...</>
                : <><Icon name="Upload" size={14} />Загрузить</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

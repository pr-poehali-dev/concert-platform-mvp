import Icon from "@/components/ui/icon";

interface VenueFileUploadBlockProps {
  label: string;
  accept: string;
  hint: string;
  file: File | null;
  onChange: (f: File) => void;
  onClear: () => void;
  icon: string;
  color: string;
}

export default function VenueFileUploadBlock({
  label, accept, hint, file, onChange, onClear, icon, color,
}: VenueFileUploadBlockProps) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">{label}</label>
      <label className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${file ? `${color} bg-white/3` : "border-white/15 hover:border-white/30"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${file ? "bg-white/10" : "bg-white/5"}`}>
          <Icon name={icon} size={20} className={file ? "text-white/80" : "text-white/30"} />
        </div>
        <div className="flex-1 min-w-0">
          {file ? (
            <>
              <p className="text-white text-sm font-medium truncate">{file.name}</p>
              <p className="text-white/40 text-xs">{(file.size / 1024).toFixed(0)} КБ</p>
            </>
          ) : (
            <>
              <p className="text-white/50 text-sm">{hint}</p>
              <p className="text-white/25 text-xs">до 20 МБ</p>
            </>
          )}
        </div>
        {file && (
          <button type="button" onClick={e => { e.preventDefault(); onClear(); }}
            className="text-white/30 hover:text-neon-pink transition-colors shrink-0">
            <Icon name="X" size={16} />
          </button>
        )}
        <input type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
      </label>
    </div>
  );
}

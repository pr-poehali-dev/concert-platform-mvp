import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { Doc } from "./docTypes";

interface Props {
  docs: Doc[];
  search: string;
  isVenue: boolean;
  onSearchChange: (v: string) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${bytes} Б`;
};

export default function DocHeader({ docs, search, isVenue, onSearchChange, onFileSelect }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const totalSize = docs.reduce((sum, d) => sum + (d.size || 0), 0);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-neon-cyan/15 border border-neon-cyan/25 flex items-center justify-center shrink-0">
          <Icon name="FileArchive" size={20} className="text-neon-cyan" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-oswald font-bold text-2xl text-white uppercase leading-none">Документы</h2>
            {docs.length > 0 && (
              <span className="text-[10px] text-white/55 bg-white/5 border border-white/10 rounded px-2 py-0.5">
                {docs.length} · {formatSize(totalSize)}
              </span>
            )}
          </div>
          <p className="text-white/45 text-xs mt-0.5">
            {isVenue
              ? "Технические райдеры, договоры и другие файлы"
              : "Райдеры, договоры с артистами и другие файлы"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/55 pointer-events-none" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Поиск..."
            className="glass border border-white/10 rounded-lg pl-7 pr-3 py-2 text-white text-sm outline-none focus:border-neon-purple/50 transition-colors w-40 placeholder:text-white/25"
          />
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap text-sm"
        >
          <Icon name="Upload" size={16} />
          Загрузить
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
        onChange={onFileSelect}
      />
    </div>
  );
}
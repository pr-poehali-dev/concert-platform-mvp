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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="font-oswald font-bold text-xl text-white">Мои документы</h2>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-white/65 text-sm">
            {isVenue
              ? "Технические райдеры, договоры и другие файлы"
              : "Райдеры, договоры с артистами и другие файлы"}
          </p>
          {docs.length > 0 && (
            <span className="text-white/20 text-xs">
              {docs.length} файл{docs.length === 1 ? "" : docs.length < 5 ? "а" : "ов"} · {formatSize(totalSize)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/55 pointer-events-none" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Поиск по названию..."
            className="glass border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-white text-sm outline-none focus:border-neon-purple/50 transition-colors w-44 placeholder:text-white/25"
          />
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
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
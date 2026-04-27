import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";

const MONTHS_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAYS_RU = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

export function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface VenueInlineCalendarProps {
  selected: Set<string>;
  onToggle: (d: string) => void;
  // Необязательно: заметки по датам (date -> note)
  notes?: Map<string, string>;
  // Режим только просмотра (без кликов)
  readOnly?: boolean;
}

export default function VenueInlineCalendar({ selected, onToggle, notes, readOnly }: VenueInlineCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tooltip, setTooltip] = useState<{ ds: string; x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="glass rounded-2xl p-4 select-none relative">
      {/* Nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
          <Icon name="ChevronLeft" size={16} />
        </button>
        <span className="font-oswald font-semibold text-white text-sm">
          {MONTHS_RU[month]} {year}
        </span>
        <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
          <Icon name="ChevronRight" size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_RU.map(d => (
          <div key={d} className={`text-center text-xs py-1 font-medium ${d === "Сб" || d === "Вс" ? "text-neon-pink/60" : "text-white/30"}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5" ref={gridRef}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const ds = toDateStr(year, month, day);
          const isBusy = selected.has(ds);
          const isPast = ds < todayStr;
          const isToday = ds === todayStr;
          const dow = (startOffset + day - 1) % 7;
          const isWeekend = dow === 5 || dow === 6;
          const note = notes?.get(ds) || "";
          const hasNote = isBusy && note.length > 0;

          return (
            <div key={idx} className="relative">
              <button
                onClick={() => !isPast && !readOnly && onToggle(ds)}
                onMouseEnter={e => {
                  if (isBusy) {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const gridRect = gridRef.current?.getBoundingClientRect();
                    setTooltip({
                      ds,
                      x: rect.left - (gridRect?.left ?? 0) + rect.width / 2,
                      y: rect.top - (gridRect?.top ?? 0),
                    });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
                disabled={isPast && !isBusy}
                className={`
                  w-full aspect-square rounded-lg text-xs font-medium transition-all relative flex flex-col items-center justify-center gap-0
                  ${isPast && !isBusy ? "text-white/15 cursor-not-allowed" : readOnly ? "cursor-default" : "cursor-pointer hover:scale-105"}
                  ${isBusy
                    ? "bg-neon-pink text-white shadow-lg shadow-neon-pink/30 ring-1 ring-neon-pink/50"
                    : isToday
                    ? "ring-1 ring-neon-cyan/60 text-neon-cyan bg-neon-cyan/10"
                    : isWeekend && !isPast
                    ? "text-neon-pink/70 hover:bg-neon-pink/15"
                    : !isPast
                    ? "text-white/70 hover:bg-white/10"
                    : ""}
                `}
              >
                <span>{day}</span>
                {hasNote && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/70" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Тултип */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 4, transform: "translate(-50%, -100%)" }}
        >
          <div className="bg-[#1a1a2e] border border-neon-pink/30 rounded-xl px-3 py-2 shadow-xl min-w-[120px] max-w-[200px]">
            <p className="text-neon-pink text-xs font-semibold mb-0.5">
              {new Date(tooltip.ds + "T12:00:00").toLocaleDateString("ru", { day: "numeric", month: "short" })}
            </p>
            <p className="text-white/60 text-xs leading-snug">
              {notes?.get(tooltip.ds) || "Дата занята"}
            </p>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-5px] w-2 h-2 bg-[#1a1a2e] border-r border-b border-neon-pink/30 rotate-45" />
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-neon-pink">
            Занято: {selected.size} {selected.size === 1 ? "дата" : selected.size < 5 ? "даты" : "дат"}
          </span>
          {!readOnly && (
            <button onClick={() => selected.forEach(d => onToggle(d))}
              className="text-xs text-white/30 hover:text-white transition-colors">
              Очистить всё
            </button>
          )}
        </div>
      )}
    </div>
  );
}

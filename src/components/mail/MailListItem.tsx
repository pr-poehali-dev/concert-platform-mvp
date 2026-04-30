import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { formatMailDate, type MailListItem } from "./mailTypes";

interface Props {
  m: MailListItem;
  checked: boolean;
  isDragging: boolean;
  isOpen: boolean;
  hasSelection: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

const SWIPE_THRESHOLD = 72;
const SWIPE_MAX = 120;

export default function MailListItemRow({
  m, checked, isDragging, isOpen, hasSelection,
  onOpen, onToggleSelect, onDelete, onArchive,
  onDragStart, onDragEnd,
}: Props) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeDx, setSwipeDx] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [swipeAction, setSwipeAction] = useState<"delete" | "archive" | null>(null);
  const [animOut, setAnimOut] = useState<"left" | "right" | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwiping(false);
    setSwipeDx(0);
    setSwipeAction(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!swiping && Math.abs(dy) > Math.abs(dx)) return; // вертикальный скролл
    setSwiping(true);
    const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx));
    setSwipeDx(clamped);
    setSwipeAction(
      clamped <= -SWIPE_THRESHOLD ? "delete"
        : clamped >= SWIPE_THRESHOLD ? "archive"
        : null
    );
  };

  const handleTouchEnd = () => {
    if (!swiping) { setSwipeDx(0); return; }
    if (swipeAction === "delete") {
      setAnimOut("left");
      setTimeout(() => onDelete(), 250);
    } else if (swipeAction === "archive") {
      setAnimOut("right");
      setTimeout(() => onArchive(), 250);
    }
    setSwipeDx(0);
    setSwiping(false);
    setSwipeAction(null);
  };

  const bgLeft = swipeDx < -SWIPE_THRESHOLD / 2;
  const bgRight = swipeDx > SWIPE_THRESHOLD / 2;

  return (
    <div
      className={`group relative flex items-stretch overflow-hidden transition-all ${
        animOut === "left" ? "translate-x-[-110%] opacity-0 duration-200" :
        animOut === "right" ? "translate-x-[110%] opacity-0 duration-200" : "duration-75"
      }`}
    >
      {/* Фон под свайп-влево (удалить) */}
      <div className={`absolute inset-0 flex items-center justify-end pr-4 transition-opacity duration-100 ${bgLeft ? "opacity-100" : "opacity-0"}`}
        style={{ background: "linear-gradient(to left, #ff2d6e44, transparent)" }}>
        <Icon name="Trash2" size={18} className="text-neon-pink" />
      </div>
      {/* Фон под свайп-вправо (архив) */}
      <div className={`absolute inset-0 flex items-center justify-start pl-4 transition-opacity duration-100 ${bgRight ? "opacity-100" : "opacity-0"}`}
        style={{ background: "linear-gradient(to right, #00e5ff44, transparent)" }}>
        <Icon name="Archive" size={18} className="text-neon-cyan" />
      </div>

      {/* Карточка письма */}
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: swiping ? `translateX(${swipeDx}px)` : undefined }}
        className={`relative w-full flex items-stretch hover:bg-white/5 transition-colors cursor-grab active:cursor-grabbing select-none ${
          isOpen ? "bg-neon-purple/10" : ""
        } ${isDragging ? "opacity-40" : ""} ${!m.isRead ? "border-l-2 border-neon-purple" : "border-l-2 border-transparent"}`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className={`pl-3 pr-1 flex items-center transition-opacity ${
            checked || hasSelection ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          title={checked ? "Снять выделение" : "Выделить"}
        >
          <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
            checked ? "bg-neon-purple border-neon-purple" : "border-white/30 hover:border-white/55"
          }`}>
            {checked && <Icon name="Check" size={10} className="text-white" />}
          </span>
        </button>
        <button
          onClick={() => hasSelection ? onToggleSelect() : onOpen()}
          className="flex-1 text-left px-2 py-2.5 min-w-0"
        >
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`text-sm truncate ${!m.isRead ? "text-white font-bold" : "text-white/80"}`}>
              {m.fromName || m.fromEmail}
            </span>
            <span className="text-[10px] text-white/35 shrink-0">{formatMailDate(m.date)}</span>
          </div>
          <p className={`text-xs truncate ${!m.isRead ? "text-white/85 font-semibold" : "text-white/55"}`}>
            {m.subject || "(без темы)"}
          </p>
        </button>
      </div>
    </div>
  );
}

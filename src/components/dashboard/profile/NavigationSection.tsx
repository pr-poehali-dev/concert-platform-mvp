import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useHiddenSections } from "@/hooks/useHiddenSections";
import type { User } from "@/context/AuthContext";

interface SectionDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  group: string;
}

const ORG_SECTIONS: SectionDef[] = [
  { id: "search",        label: "Площадки",      icon: "Search",         color: "text-neon-cyan",    group: "Главное" },
  { id: "tours",         label: "Туры",           icon: "Route",          color: "text-neon-purple",  group: "Главное" },
  { id: "projects",      label: "Проекты",        icon: "FolderOpen",     color: "text-neon-purple",  group: "Главное" },
  { id: "chat",          label: "Чат",            icon: "MessageCircle",  color: "text-neon-green",   group: "Главное" },
  { id: "mail",          label: "Почта",          icon: "Mail",           color: "text-neon-cyan",    group: "Главное" },
  { id: "history",       label: "История",        icon: "Clock",          color: "text-neon-cyan",    group: "Личный кабинет" },
  { id: "documents",     label: "Документы",      icon: "FileArchive",    color: "text-neon-cyan",    group: "Личный кабинет" },
  { id: "signing",       label: "Подписание",     icon: "PenLine",        color: "text-neon-purple",  group: "Личный кабинет" },
  { id: "notifications", label: "Уведомления",    icon: "Bell",           color: "text-neon-pink",    group: "Личный кабинет" },
  { id: "company",       label: "Компания",       icon: "Building2",      color: "text-neon-green",   group: "Личный кабинет" },
  { id: "crm",           label: "CRM",            icon: "Kanban",         color: "text-neon-purple",  group: "Личный кабинет" },
  { id: "ai_help",       label: "ИИ-помощник",    icon: "Sparkles",       color: "text-neon-pink",    group: "Личный кабинет" },
  { id: "ai_lawyer",     label: "ИИ-юрист",       icon: "Scale",          color: "text-neon-cyan",    group: "Личный кабинет" },
];

const VENUE_SECTIONS: SectionDef[] = [
  { id: "search",        label: "Площадки",       icon: "Search",         color: "text-neon-cyan",    group: "Главное" },
  { id: "chat",          label: "Чат",            icon: "MessageCircle",  color: "text-neon-green",   group: "Главное" },
  { id: "mail",          label: "Почта",          icon: "Mail",           color: "text-neon-cyan",    group: "Главное" },
  { id: "venues",        label: "Площадки",       icon: "Building2",      color: "text-neon-cyan",    group: "Личный кабинет" },
  { id: "vprojects",     label: "Проекты",        icon: "FolderOpen",     color: "text-neon-purple",  group: "Личный кабинет" },
  { id: "concerts",      label: "Мои концерты",   icon: "Music",          color: "text-neon-pink",    group: "Личный кабинет" },
  { id: "bar",           label: "Бар",            icon: "Wine",           color: "text-neon-cyan",    group: "Личный кабинет" },
  { id: "documents",     label: "Документы",      icon: "FileArchive",    color: "text-neon-cyan",    group: "Личный кабинет" },
  { id: "signing",       label: "Подписание",     icon: "PenLine",        color: "text-neon-purple",  group: "Личный кабинет" },
  { id: "venue_crm",     label: "CRM",            icon: "Kanban",         color: "text-neon-purple",  group: "Личный кабинет" },
  { id: "notifications", label: "Уведомления",    icon: "Bell",           color: "text-neon-pink",    group: "Личный кабинет" },
  { id: "company",       label: "Компания",       icon: "Users",          color: "text-neon-green",   group: "Личный кабинет" },
  { id: "ai_help",       label: "ИИ-помощник",    icon: "Sparkles",       color: "text-neon-pink",    group: "Личный кабинет" },
  { id: "ai_lawyer",     label: "ИИ-юрист",       icon: "Scale",          color: "text-neon-cyan",    group: "Личный кабинет" },
];

// ── Группа с drag&drop ────────────────────────────────────────────────────────

interface GroupProps {
  group: string;
  items: SectionDef[];
  hidden: string[];
  onToggle: (id: string) => void;
  onReorder: (group: string, ids: string[]) => void;
}

function DraggableGroup({ group, items, hidden, onToggle, onReorder }: GroupProps) {
  const [localItems, setLocalItems] = useState(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragIdx = useRef<number>(-1);

  // Синхронизируем если родитель изменил порядок
  useEffect(() => { setLocalItems(items); }, [items]);

  const handleDragStart = (idx: number) => {
    dragIdx.current = idx;
    setDraggingId(localItems[idx].id);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };

  const handleDrop = (targetIdx: number) => {
    const src = dragIdx.current;
    if (src === targetIdx || src === -1) { finishDrag(); return; }
    const next = [...localItems];
    const [moved] = next.splice(src, 1);
    next.splice(targetIdx, 0, moved);
    setLocalItems(next);
    onReorder(group, next.map(i => i.id));
    finishDrag();
  };

  const finishDrag = () => {
    setDraggingId(null);
    setOverIdx(null);
    dragIdx.current = -1;
  };

  // Touch DnD
  const touchStartY = useRef(0);
  const touchSrcIdx = useRef(-1);
  const touchEl = useRef<HTMLDivElement | null>(null);
  const ghost = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    touchSrcIdx.current = idx;
    touchStartY.current = e.touches[0].clientY;
    setDraggingId(localItems[idx].id);
    // Ghost
    const el = e.currentTarget as HTMLDivElement;
    touchEl.current = el;
    const g = el.cloneNode(true) as HTMLDivElement;
    g.style.cssText = `position:fixed;z-index:9999;opacity:0.85;pointer-events:none;width:${el.offsetWidth}px;left:${el.getBoundingClientRect().left}px;top:${e.touches[0].clientY - el.offsetHeight / 2}px;border-radius:12px;`;
    document.body.appendChild(g);
    ghost.current = g;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const y = e.touches[0].clientY;
    if (ghost.current) ghost.current.style.top = `${y - 24}px`;
    // Найти элемент под пальцем
    const el = touchEl.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const children = Array.from(parent.children) as HTMLElement[];
    let newOver = -1;
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) { newOver = i; break; }
    }
    if (newOver !== -1) setOverIdx(newOver);
  };

  const handleTouchEnd = () => {
    if (ghost.current) { document.body.removeChild(ghost.current); ghost.current = null; }
    const src = touchSrcIdx.current;
    const tgt = overIdx ?? src;
    if (src !== -1 && src !== tgt) {
      const next = [...localItems];
      const [moved] = next.splice(src, 1);
      next.splice(tgt, 0, moved);
      setLocalItems(next);
      onReorder(group, next.map(i => i.id));
    }
    finishDrag();
    touchSrcIdx.current = -1;
  };

  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/8 bg-white/3 flex items-center justify-between">
        <p className="text-white/45 text-[11px] uppercase tracking-wider font-bold">{group}</p>
        <p className="text-white/25 text-[10px]">перетащи для сортировки</p>
      </div>
      <div className="divide-y divide-white/5">
        {localItems.map((item, idx) => {
          const isHid = hidden.includes(item.id);
          const isDrag = draggingId === item.id;
          const isOver = overIdx === idx && draggingId !== null && draggingId !== item.id;
          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={finishDrag}
              onTouchStart={e => handleTouchStart(e, idx)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`flex items-center gap-3 px-3 py-3 transition-all select-none
                ${isDrag ? "opacity-30 scale-[0.98]" : ""}
                ${isOver ? "bg-neon-purple/10 border-l-2 border-neon-purple" : "border-l-2 border-transparent"}
                ${isHid ? "opacity-45" : ""}
                hover:bg-white/4
              `}
            >
              {/* Ручка для перетаскивания */}
              <div className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 transition-colors shrink-0 touch-none">
                <Icon name="GripVertical" size={16} />
              </div>

              {/* Иконка */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${isHid ? "bg-white/5" : "bg-white/8"}`}
              >
                <Icon name={item.icon as never} size={15} className={isHid ? "text-white/30" : item.color} />
              </div>

              {/* Название */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium transition-colors truncate ${isHid ? "text-white/35 line-through" : "text-white/85"}`}>
                  {item.label}
                </p>
              </div>

              {/* Тоггл видимости */}
              <div
                onClick={() => onToggle(item.id)}
                className="shrink-0 cursor-pointer"
                title={isHid ? "Показать" : "Скрыть"}
              >
                <div className={`w-10 h-5 rounded-full transition-all relative ${!isHid ? "bg-neon-purple" : "bg-white/15"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${!isHid ? "left-5" : "left-0.5"}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Основной компонент ────────────────────────────────────────────────────────

interface Props { user: User }

export default function NavigationSection({ user }: Props) {
  const { hidden, toggle, reset, saveOrder, sortedIds } = useHiddenSections();
  const allSections = user.role === "venue" ? VENUE_SECTIONS : ORG_SECTIONS;
  const groups = [...new Set(allSections.map(s => s.group))];
  const hiddenCount = allSections.filter(s => hidden.includes(s.id)).length;

  const getSortedGroup = (group: string) => {
    const defaults = allSections.filter(s => s.group === group).map(s => s.id);
    const sorted = sortedIds(group, defaults);
    return sorted.map(id => allSections.find(s => s.id === id)!).filter(Boolean);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-oswald font-bold text-white text-xl">Навигация</h3>
          <p className="text-white/55 text-xs mt-0.5">
            Скрывай ненужные разделы и меняй их порядок в меню
          </p>
        </div>
        {(hiddenCount > 0) && (
          <button
            onClick={reset}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white border border-white/10 hover:border-white/25 transition-all"
          >
            <Icon name="RotateCcw" size={12} />
            Сбросить
          </button>
        )}
      </div>

      {groups.map(group => (
        <DraggableGroup
          key={group}
          group={group}
          items={getSortedGroup(group)}
          hidden={hidden}
          onToggle={toggle}
          onReorder={saveOrder}
        />
      ))}

      {hiddenCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neon-purple/8 border border-neon-purple/20">
          <Icon name="EyeOff" size={14} className="text-neon-purple shrink-0" />
          <p className="text-white/65 text-xs">
            Скрыто: <span className="text-white font-semibold">{hiddenCount}</span> разд.
            Порядок в меню обновится сразу.
          </p>
        </div>
      )}
    </div>
  );
}
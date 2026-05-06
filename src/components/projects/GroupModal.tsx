import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL, type Project, type ProjectGroup } from "@/hooks/useProjects";

const COLORS = [
  { key: "neon-purple", label: "Фиолетовый", cls: "bg-neon-purple" },
  { key: "neon-cyan",   label: "Голубой",    cls: "bg-neon-cyan" },
  { key: "neon-green",  label: "Зелёный",    cls: "bg-neon-green" },
  { key: "neon-pink",   label: "Розовый",    cls: "bg-neon-pink" },
  { key: "neon-yellow", label: "Жёлтый",     cls: "bg-neon-yellow" },
  { key: "white",       label: "Белый",      cls: "bg-white" },
];

// Статичные классы Tailwind (динамические не работают в JIT)
const COLOR_CLASSES: Record<string, {
  header: string; icon: string; text: string; btn: string;
  selectedBorder: string; selectedBg: string;
}> = {
  "neon-purple": {
    header: "via-neon-purple",
    icon: "bg-neon-purple/15 border-neon-purple/25",
    text: "text-neon-purple",
    btn: "bg-neon-purple/80 hover:bg-neon-purple/100",
    selectedBorder: "border-neon-purple/40",
    selectedBg: "bg-neon-purple/10",
  },
  "neon-cyan": {
    header: "via-neon-cyan",
    icon: "bg-neon-cyan/15 border-neon-cyan/25",
    text: "text-neon-cyan",
    btn: "bg-neon-cyan/80 hover:bg-neon-cyan/100",
    selectedBorder: "border-neon-cyan/40",
    selectedBg: "bg-neon-cyan/10",
  },
  "neon-green": {
    header: "via-neon-green",
    icon: "bg-neon-green/15 border-neon-green/25",
    text: "text-neon-green",
    btn: "bg-neon-green/80 hover:bg-neon-green/100",
    selectedBorder: "border-neon-green/40",
    selectedBg: "bg-neon-green/10",
  },
  "neon-pink": {
    header: "via-neon-pink",
    icon: "bg-neon-pink/15 border-neon-pink/25",
    text: "text-neon-pink",
    btn: "bg-neon-pink/80 hover:bg-neon-pink/100",
    selectedBorder: "border-neon-pink/40",
    selectedBg: "bg-neon-pink/10",
  },
  "neon-yellow": {
    header: "via-neon-yellow",
    icon: "bg-neon-yellow/15 border-neon-yellow/25",
    text: "text-neon-yellow",
    btn: "bg-neon-yellow/80 hover:bg-neon-yellow/100",
    selectedBorder: "border-neon-yellow/40",
    selectedBg: "bg-neon-yellow/10",
  },
  "white": {
    header: "via-white",
    icon: "bg-white/10 border-white/20",
    text: "text-white",
    btn: "bg-white/20 hover:bg-white/30",
    selectedBorder: "border-white/40",
    selectedBg: "bg-white/10",
  },
};

interface Props {
  userId: string;
  projects: Project[];            // все проекты пользователя (без группы и текущей)
  group?: ProjectGroup | null;    // если редактируем существующую
  groupProjects?: string[];       // id проектов уже в группе (при редактировании)
  onClose: () => void;
  onSaved: () => void;
}

export default function GroupModal({ userId, projects, group, groupProjects = [], onClose, onSaved }: Props) {
  const isEdit = !!group;
  const [title, setTitle] = useState(group?.title || "");
  const [description, setDescription] = useState(group?.description || "");
  const [color, setColor] = useState(group?.color || "neon-purple");
  const [selected, setSelected] = useState<Set<string>>(new Set(groupProjects));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // При открытии редактирования подгружаем уже выбранные
  // Используем join для стабильного сравнения содержимого массива
  const groupProjectsKey = groupProjects.join(",");
  useEffect(() => {
    setSelected(new Set(groupProjects));
  }, [groupProjectsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("Введите название группы"); return; }
    setSaving(true); setError("");
    try {
      const action = isEdit ? "group_update" : "group_create";
      const body: Record<string, unknown> = {
        userId,
        title: title.trim(),
        description,
        color,
        projectIds: [...selected],
      };
      if (isEdit) body.id = group!.id;

      const res = await fetch(`${PROJECTS_URL}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  // Проекты доступные для выбора: без группы OR уже в этой группе
  const available = projects.filter(p =>
    !p.groupId || p.groupId === group?.id
  );
  const filtered = available.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.artist || "").toLowerCase().includes(search.toLowerCase())
  );

  const colorCfg = COLORS.find(c => c.key === color) || COLORS[0];
  const cc = COLOR_CLASSES[color] || COLOR_CLASSES["neon-purple"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg glass-strong rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${cc.header} to-transparent`} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${cc.icon} flex items-center justify-center`}>
              <Icon name="FolderOpen" size={20} className={cc.text} />
            </div>
            <h2 className="font-oswald font-bold text-xl text-white">
              {isEdit ? "Редактировать группу" : "Новая группа"}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-2 space-y-5">
          {/* Название */}
          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Название группы *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Например: Тур CAPTOWN 2026"
              autoFocus
              className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm"
            />
          </div>

          {/* Описание */}
          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Описание (необязательно)</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Краткое описание"
              className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm"
            />
          </div>

          {/* Цвет */}
          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Цвет</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c.key}
                  onClick={() => setColor(c.key)}
                  className={`w-7 h-7 rounded-full ${c.cls} transition-all ${color === c.key ? "ring-2 ring-white ring-offset-2 ring-offset-black/50 scale-110" : "opacity-60 hover:opacity-100"}`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Выбор проектов */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/50 text-xs uppercase tracking-wider">
                Проекты в группе
              </label>
              <span className="text-white/30 text-xs">{selected.size} выбрано</span>
            </div>

            {available.length > 4 && (
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск проекта..."
                className="w-full glass rounded-xl px-3 py-2 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm mb-2"
              />
            )}

            {available.length === 0 ? (
              <div className="text-center py-6 glass rounded-xl border border-white/5">
                <Icon name="FolderOpen" size={22} className="text-white/15 mx-auto mb-2" />
                <p className="text-white/30 text-sm">Нет свободных проектов</p>
                <p className="text-white/20 text-xs mt-1">Все проекты уже в группах</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                {filtered.map(p => {
                  const isSelected = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                        isSelected
                          ? `${cc.selectedBorder} ${cc.selectedBg} text-white`
                          : "border-white/8 glass text-white/55 hover:text-white/80 hover:border-white/15"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? `${colorCfg.cls} border-transparent` : "border-white/20"
                      }`}>
                        {isSelected && <Icon name="Check" size={10} className="text-black" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.artist && <span className="text-xs text-white/35 truncate">{p.artist}</span>}
                          {p.dateStart && <span className="text-xs text-white/25">{p.dateStart}</span>}
                        </div>
                      </div>
                      {p.groupId && p.groupId !== group?.id && (
                        <span className="text-[10px] text-white/25 border border-white/10 px-1.5 py-0.5 rounded shrink-0">в группе</span>
                      )}
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="text-white/25 text-sm text-center py-3">Ничего не найдено</p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2">
              <Icon name="AlertCircle" size={14} />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 shrink-0">
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-white/50 hover:text-white text-sm transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className={`flex items-center gap-2 px-6 py-2.5 ${cc.btn} text-white font-oswald font-semibold rounded-xl disabled:opacity-40 text-sm transition-all`}
          >
            {saving
              ? <><Icon name="Loader2" size={15} className="animate-spin" />Сохраняю...</>
              : <><Icon name="Check" size={15} />{isEdit ? "Сохранить" : "Создать группу"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
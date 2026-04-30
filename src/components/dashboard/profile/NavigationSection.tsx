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
  { id: "tours",         label: "Мои туры",       icon: "Route",          color: "text-neon-purple",  group: "Личный кабинет" },
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
  { id: "documents",     label: "Документы",      icon: "FileArchive",    color: "text-neon-cyan",    group: "Личный кабинет" },
  { id: "signing",       label: "Подписание",     icon: "PenLine",        color: "text-neon-purple",  group: "Личный кабинет" },
  { id: "venue_crm",     label: "CRM",            icon: "Kanban",         color: "text-neon-purple",  group: "Личный кабинет" },
  { id: "notifications", label: "Уведомления",    icon: "Bell",           color: "text-neon-pink",    group: "Личный кабинет" },
  { id: "company",       label: "Компания",       icon: "Users",          color: "text-neon-green",   group: "Личный кабинет" },
  { id: "ai_help",       label: "ИИ-помощник",    icon: "Sparkles",       color: "text-neon-pink",    group: "Личный кабинет" },
  { id: "ai_lawyer",     label: "ИИ-юрист",       icon: "Scale",          color: "text-neon-cyan",    group: "Личный кабинет" },
];

interface Props { user: User }

export default function NavigationSection({ user }: Props) {
  const { hidden, toggle, reset } = useHiddenSections();
  const sections = user.role === "venue" ? VENUE_SECTIONS : ORG_SECTIONS;
  const groups = [...new Set(sections.map(s => s.group))];
  const hiddenCount = sections.filter(s => hidden.includes(s.id)).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-oswald font-bold text-white text-xl">Навигация</h3>
          <p className="text-white/55 text-xs mt-0.5">
            Скрой разделы, которыми не пользуешься — они исчезнут из бокового меню
          </p>
        </div>
        {hiddenCount > 0 && (
          <button
            onClick={reset}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white border border-white/10 hover:border-white/25 transition-all"
          >
            <Icon name="RotateCcw" size={12} />
            Сбросить ({hiddenCount})
          </button>
        )}
      </div>

      {groups.map(group => {
        const items = sections.filter(s => s.group === group);
        return (
          <div key={group} className="glass rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/8 bg-white/3">
              <p className="text-white/45 text-[11px] uppercase tracking-wider font-bold">{group}</p>
            </div>
            <div className="divide-y divide-white/5">
              {items.map(item => {
                const isHidden = hidden.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all hover:bg-white/4 ${isHidden ? "opacity-45" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isHidden ? "bg-white/5" : "bg-white/8"}`}>
                        <Icon name={item.icon as never} size={15} className={isHidden ? "text-white/30" : item.color} />
                      </div>
                      <div>
                        <p className={`text-sm font-medium transition-colors ${isHidden ? "text-white/40 line-through" : "text-white/85"}`}>
                          {item.label}
                        </p>
                        <p className="text-[10px] text-white/30">{item.group}</p>
                      </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${!isHidden ? "bg-neon-purple" : "bg-white/15"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${!isHidden ? "left-5" : "left-0.5"}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {hiddenCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neon-purple/8 border border-neon-purple/20">
          <Icon name="EyeOff" size={14} className="text-neon-purple shrink-0" />
          <p className="text-white/65 text-xs">
            Скрыто разделов: <span className="text-white font-semibold">{hiddenCount}</span>.
            Они не показываются в меню, но всё равно доступны через настройки.
          </p>
        </div>
      )}
    </div>
  );
}
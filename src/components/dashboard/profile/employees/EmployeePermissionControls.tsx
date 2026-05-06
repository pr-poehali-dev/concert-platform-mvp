import Icon from "@/components/ui/icon";
import { type AccessPermissions, type SectionId } from "../types";

// Разделы, которыми можно управлять через интерфейс
export const SECTION_ITEMS: { id: SectionId; label: string; icon: string; color: string }[] = [
  { id: "tours",         label: "Мои туры",       icon: "Route",          color: "text-neon-purple" },
  { id: "history",       label: "История",         icon: "Clock",          color: "text-neon-cyan"   },
  { id: "documents",     label: "Документы",       icon: "FileArchive",    color: "text-neon-cyan"   },
  { id: "signing",       label: "Подписание",      icon: "PenLine",        color: "text-neon-purple" },
  { id: "notifications", label: "Уведомления",     icon: "Bell",           color: "text-neon-pink"   },
  { id: "company",       label: "Компания",        icon: "Building2",      color: "text-neon-green"  },
  { id: "crm",           label: "CRM",             icon: "Kanban",         color: "text-neon-purple" },
  { id: "ai_help",       label: "ИИ-помощник",     icon: "Sparkles",       color: "text-neon-pink"   },
  { id: "ai_lawyer",     label: "ИИ-юрист",        icon: "Scale",          color: "text-neon-cyan"   },
  { id: "chat",          label: "Чат",             icon: "MessageCircle",  color: "text-neon-green"  },
  { id: "mail",          label: "Почта",           icon: "Mail",           color: "text-neon-cyan"   },
  { id: "projects",      label: "Проекты",         icon: "FolderOpen",     color: "text-neon-purple" },
];

export const PERM_ITEMS: { key: keyof AccessPermissions; label: string; description: string; icon: string; color: string }[] = [
  { key: "canViewExpenses", label: "Видит расходы",       description: "Вкладка «Бюджет расходов»",       icon: "TrendingDown", color: "text-neon-pink"   },
  { key: "canViewIncome",   label: "Видит доходы",        description: "Вкладка «Доходы»",                icon: "TrendingUp",   color: "text-neon-green" },
  { key: "canViewSummary",  label: "Видит P&L",           description: "Итоговый отчёт прибыли",          icon: "BarChart3",    color: "text-neon-cyan"  },
  { key: "canEditExpenses", label: "Редактирует расходы", description: "Добавлять/изменять/удалять",       icon: "Pencil",       color: "text-neon-pink"  },
  { key: "canEditIncome",   label: "Редактирует доходы",  description: "Добавлять/изменять/удалять",       icon: "Pencil",       color: "text-neon-green" },
  { key: "canViewSalary",   label: "Видит свою зарплату", description: "Раздел «Зарплаты» в Компании",    icon: "Banknote",     color: "text-neon-cyan"  },
];

export function SectionToggle({
  item, allowed, onChange,
}: { item: typeof SECTION_ITEMS[number]; allowed: SectionId[]; onChange: (sections: SectionId[]) => void }) {
  const checked = allowed.includes(item.id);
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer ${checked ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5 opacity-60"}`}
      onClick={() => onChange(checked ? allowed.filter(s => s !== item.id) : [...allowed, item.id])}
    >
      <div className="flex items-center gap-2">
        <Icon name={item.icon as never} size={13} className={checked ? item.color : "text-white/25"} />
        <span className="text-white/80 text-xs font-medium">{item.label}</span>
      </div>
      <button
        type="button"
        className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${checked ? "bg-neon-purple" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? "left-4" : "left-0.5"}`} />
      </button>
    </div>
  );
}

interface PermToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon: string;
  color: string;
}

export function PermToggle({ label, description, value, onChange, icon, color }: PermToggleProps) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${value ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5 opacity-60"}`}>
      <div className="flex items-center gap-2.5">
        <Icon name={icon} size={14} className={value ? color : "text-white/25"} />
        <div>
          <p className="text-white/80 text-xs font-medium">{label}</p>
          <p className="text-white/60 text-[10px]">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${value ? "bg-neon-purple" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? "left-4" : "left-0.5"}`} />
      </button>
    </div>
  );
}

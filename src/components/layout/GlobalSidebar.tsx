import Icon from "@/components/ui/icon";
import { useNotifications } from "@/context/NotificationsContext";
import { useAuth } from "@/context/AuthContext";

interface Props {
  activePage: string;
  dashboardTab?: string;
  onNavigate: (page: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: () => number;
  page: string;       // page to navigate
  dashTab?: string;   // if set — navigate to dashboard:dashTab
  isSection?: boolean;
  color?: "purple" | "cyan" | "green" | "pink";
}

// Палитра цветов для активного пункта (полные классы — чтобы Tailwind их не вырезал)
const COLOR_CLASSES: Record<string, { bg: string; shadow: string; iconActive: string; hoverIcon: string }> = {
  purple: {
    bg: "bg-gradient-to-r from-neon-purple to-neon-purple/80 text-white",
    shadow: "shadow-lg shadow-neon-purple/30",
    iconActive: "text-white",
    hoverIcon: "group-hover:text-neon-purple",
  },
  cyan: {
    bg: "bg-gradient-to-r from-neon-cyan to-neon-cyan/80 text-background",
    shadow: "shadow-lg shadow-neon-cyan/30",
    iconActive: "text-background",
    hoverIcon: "group-hover:text-neon-cyan",
  },
  green: {
    bg: "bg-gradient-to-r from-neon-green to-neon-green/80 text-background",
    shadow: "shadow-lg shadow-neon-green/30",
    iconActive: "text-background",
    hoverIcon: "group-hover:text-neon-green",
  },
  pink: {
    bg: "bg-gradient-to-r from-neon-pink to-neon-pink/80 text-white",
    shadow: "shadow-lg shadow-neon-pink/30",
    iconActive: "text-white",
    hoverIcon: "group-hover:text-neon-pink",
  },
};

export default function GlobalSidebar({ activePage, dashboardTab, onNavigate }: Props) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  if (!user) return null;

  const isVenue = user.role === "venue";
  const isOrg   = user.role === "organizer";

  const isDash = activePage === "dashboard";

  // ── Главные страницы ───────────────────────────────────────────────────
  const mainItems: NavItem[] = [
    { id: "search",    label: "Площадки",    icon: "Search",        page: "search",                                 color: "cyan"   },
    ...(!isVenue ? [{ id: "tours",    label: "Туры",     icon: "Route",         page: "tours",    color: "purple" as const }] : []),
    ...(isOrg ? [{ id: "projects", label: "Проекты",  icon: "FolderOpen",    page: "projects", color: "purple" as const }] : []),
    { id: "chat",      label: "Чат",         icon: "MessageCircle", page: "chat",                                   color: "green"  },
  ];

  // ── Личный кабинет ──────────────────────────────────────────────────────
  const dashOrgItems: NavItem[] = [
    { id: "tours",         label: "Мои туры",     icon: "Route",        page: "dashboard", dashTab: "tours",         color: "purple" },
    { id: "history",       label: "История",      icon: "Clock",        page: "dashboard", dashTab: "history",       color: "cyan"   },
    { id: "documents",     label: "Документы",    icon: "FileArchive",  page: "dashboard", dashTab: "documents",     color: "cyan"   },
    { id: "signing",       label: "Подписание",   icon: "PenLine",      page: "dashboard", dashTab: "signing",       color: "purple" },
    { id: "notifications", label: "Уведомления",  icon: "Bell",         page: "dashboard", dashTab: "notifications", badge: () => unreadCount, color: "pink" },
    { id: "company",       label: "Компания",     icon: "Building2",    page: "dashboard", dashTab: "company",       color: "green"  },
    { id: "crm",           label: "CRM",          icon: "Kanban",       page: "crm",                                  color: "purple" },
    { id: "ai_help",       label: "Помощь",       icon: "Sparkles",     page: "dashboard", dashTab: "ai_help",       color: "pink"   },
    { id: "ai_lawyer",     label: "ИИ-юрист",     icon: "Scale",        page: "dashboard", dashTab: "ai_lawyer",     color: "cyan"   },
  ];

  const dashVenueItems: NavItem[] = [
    { id: "venues",        label: "Площадки",      icon: "Building2",    page: "dashboard", dashTab: "venues",        color: "cyan"   },
    { id: "vprojects",     label: "Проекты",       icon: "FolderOpen",   page: "dashboard", dashTab: "projects",      color: "purple" },
    { id: "concerts",      label: "Мои концерты",  icon: "Music",        page: "dashboard", dashTab: "concerts",      color: "pink"   },
    { id: "documents",     label: "Документы",     icon: "FileArchive",  page: "dashboard", dashTab: "documents",     color: "cyan"   },
    { id: "signing",       label: "Подписание",    icon: "PenLine",      page: "dashboard", dashTab: "signing",       color: "purple" },
    { id: "venue_crm",     label: "CRM",           icon: "Kanban",       page: "dashboard", dashTab: "venue_crm",     color: "purple" },
    { id: "notifications", label: "Уведомления",   icon: "Bell",         page: "dashboard", dashTab: "notifications", badge: () => unreadCount, color: "pink" },
    { id: "company",       label: "Компания",      icon: "Users",        page: "dashboard", dashTab: "company",       color: "green"  },
    { id: "ai_help",       label: "Помощь",        icon: "Sparkles",     page: "dashboard", dashTab: "ai_help",       color: "pink"   },
    { id: "ai_lawyer",     label: "ИИ-юрист",      icon: "Scale",        page: "dashboard", dashTab: "ai_lawyer",     color: "cyan"   },
  ];

  const dashItems = isVenue ? dashVenueItems : dashOrgItems;

  const isItemActive = (item: NavItem) => {
    if (item.dashTab) {
      return isDash && (dashboardTab === item.dashTab || (!dashboardTab && item.dashTab === (isVenue ? "venues" : "tours")));
    }
    return activePage === item.page;
  };

  const handleClick = (item: NavItem) => {
    if (item.dashTab) {
      onNavigate(`dashboard:${item.dashTab}`);
    } else {
      onNavigate(item.page);
    }
  };

  const renderItem = (item: NavItem, isMain: boolean) => {
    const active = isMain ? activePage === item.page : isItemActive(item);
    const badge = item.badge ? item.badge() : 0;
    const c = COLOR_CLASSES[item.color || "purple"];
    return (
      <button
        key={item.id}
        onClick={() => handleClick(item)}
        className={`group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[15px] font-semibold transition-all text-left ${
          active
            ? `${c.bg} ${c.shadow}`
            : "text-white/85 hover:text-white hover:bg-white/8"
        }`}
      >
        <Icon name={item.icon as never} size={20} className={active ? c.iconActive : `text-white/70 ${c.hoverIcon}`} />
        <span className="flex-1 leading-none">{item.label}</span>
        {badge > 0 && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
            active ? "bg-white/25 text-white" : "bg-neon-pink text-white shadow-md shadow-neon-pink/30"
          }`}>
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="hidden xl:flex flex-col w-60 shrink-0 gap-1 sticky top-20 self-start max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-thin">

      {/* Профиль */}
      <div
        className="glass rounded-xl border border-white/15 px-3 py-2 cursor-pointer hover:border-neon-purple/40 transition-all group mb-1"
        onClick={() => onNavigate("dashboard:profile")}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-base shrink-0`}>
            {user.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-bold truncate leading-tight">{user.name}</p>
            <p className={`text-xs font-semibold leading-tight ${isVenue ? "text-neon-cyan" : "text-neon-purple"}`}>
              {isVenue ? "Площадка" : "Организатор"}
            </p>
          </div>
          <Icon name="Settings" size={16} className="text-white/35 shrink-0 group-hover:text-white/70 transition-colors" />
        </div>
      </div>

      {/* Главная навигация — без обёрток-карточек, просто вертикальный список */}
      <nav className="flex flex-col gap-0.5 px-1">
        {mainItems.map(item => renderItem(item, true))}
      </nav>

      <div className="h-px bg-white/10 mx-3 my-1" />

      <nav className="flex flex-col gap-0.5 px-1">
        {dashItems.map(item => renderItem(item, false))}
      </nav>

      <div className="h-px bg-white/10 mx-3 my-1" />

      {/* Выйти */}
      <button
        onClick={logout}
        className="flex items-center gap-3 px-3 py-2 mx-1 rounded-xl text-[15px] font-semibold text-neon-pink/80 hover:text-neon-pink hover:bg-neon-pink/10 transition-all"
      >
        <Icon name="LogOut" size={18} />
        <span className="leading-none">Выйти</span>
      </button>
    </aside>
  );
}
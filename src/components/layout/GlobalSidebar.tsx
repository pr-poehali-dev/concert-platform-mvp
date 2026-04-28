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
}

export default function GlobalSidebar({ activePage, dashboardTab, onNavigate }: Props) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  if (!user) return null;

  const isVenue = user.role === "venue";
  const isOrg   = user.role === "organizer";

  const isDash = activePage === "dashboard";

  // ── Главные страницы ───────────────────────────────────────────────────
  const mainItems: NavItem[] = [
    { id: "search",    label: "Площадки",    icon: "Search",        page: "search" },
    ...(!isVenue ? [{ id: "tours", label: "Туры", icon: "Route", page: "tours" }] : []),
    ...(isOrg ? [{ id: "projects", label: "Проекты", icon: "FolderOpen", page: "projects" }] : []),
    { id: "chat",      label: "Чат",         icon: "MessageCircle", page: "chat" },
  ];

  // ── Личный кабинет ──────────────────────────────────────────────────────
  const dashOrgItems: NavItem[] = [
    { id: "tours",         label: "Мои туры",     icon: "Route",        page: "dashboard", dashTab: "tours" },
    { id: "history",       label: "История",       icon: "Clock",        page: "dashboard", dashTab: "history" },
    { id: "documents",     label: "Документы",     icon: "FileArchive",  page: "dashboard", dashTab: "documents" },
    { id: "signing",       label: "Подписание",    icon: "PenLine",      page: "dashboard", dashTab: "signing" },
    { id: "notifications", label: "Уведомления",   icon: "Bell",         page: "dashboard", dashTab: "notifications", badge: () => unreadCount },
    { id: "company",       label: "Компания",      icon: "Building2",    page: "dashboard", dashTab: "company" },
    { id: "crm",           label: "CRM",           icon: "Kanban",       page: "crm" },
  ];

  const dashVenueItems: NavItem[] = [
    { id: "venues",        label: "Площадки",      icon: "Building2",    page: "dashboard", dashTab: "venues" },
    { id: "vprojects",     label: "Проекты",        icon: "FolderOpen",   page: "dashboard", dashTab: "projects" },
    { id: "concerts",      label: "Мои концерты",   icon: "Music",        page: "dashboard", dashTab: "concerts" },
    { id: "documents",     label: "Документы",      icon: "FileArchive",  page: "dashboard", dashTab: "documents" },
    { id: "signing",       label: "Подписание",     icon: "PenLine",      page: "dashboard", dashTab: "signing" },
    { id: "venue_crm",     label: "CRM",            icon: "Kanban",       page: "dashboard", dashTab: "venue_crm" },
    { id: "notifications", label: "Уведомления",    icon: "Bell",         page: "dashboard", dashTab: "notifications", badge: () => unreadCount },
    { id: "company",       label: "Компания",       icon: "Users",        page: "dashboard", dashTab: "company" },
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

  return (
    <aside className="hidden xl:flex flex-col w-52 shrink-0 gap-2 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin pb-4">

      {/* Профиль */}
      <div
        className="glass rounded-2xl border border-white/10 px-3 py-3 cursor-pointer hover:border-white/20 transition-all"
        onClick={() => onNavigate("dashboard:profile")}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-sm shrink-0`}>
            {user.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-semibold truncate">{user.name}</p>
            <p className={`text-[10px] font-medium ${isVenue ? "text-neon-cyan" : "text-neon-purple"}`}>
              {isVenue ? "Площадка" : "Организатор"}
            </p>
          </div>
          <Icon name="Settings" size={13} className="text-white/20 shrink-0" />
        </div>
      </div>

      {/* Платформа */}
      <nav className="glass rounded-2xl border border-white/10 p-1.5 flex flex-col gap-0.5">
        <p className="text-white/25 text-[10px] uppercase tracking-wider px-2 pt-1 pb-0.5 font-medium">Платформа</p>
        {mainItems.map(item => {
          const active = activePage === item.page;
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                active
                  ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon name={item.icon as never} size={14} className={active ? "text-white" : "text-white/35"} />
              <span className="flex-1">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Личный кабинет */}
      <nav className="glass rounded-2xl border border-white/10 p-1.5 flex flex-col gap-0.5">
        <p className="text-white/25 text-[10px] uppercase tracking-wider px-2 pt-1 pb-0.5 font-medium">Кабинет</p>
        {dashItems.map(item => {
          const active = isItemActive(item);
          const badge = item.badge ? item.badge() : 0;
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                active
                  ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon name={item.icon as never} size={14} className={active ? "text-white" : "text-white/35"} />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center ${
                  active ? "bg-white/20 text-white" : "bg-neon-pink text-white"
                }`}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Выйти */}
      <button
        onClick={logout}
        className="flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs text-neon-pink/60 hover:text-neon-pink hover:bg-neon-pink/10 border border-transparent hover:border-neon-pink/20 transition-all glass"
      >
        <Icon name="LogOut" size={13} />
        <span>Выйти</span>
      </button>
    </aside>
  );
}
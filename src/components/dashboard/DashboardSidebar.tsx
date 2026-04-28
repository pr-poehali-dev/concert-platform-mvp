import Icon from "@/components/ui/icon";
import { useNotifications } from "@/context/NotificationsContext";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  orgOnly?: boolean;
  venueOnly?: boolean;
}

const ORG_TABS: NavItem[] = [
  { id: "tours",         label: "Мои туры",      icon: "Route" },
  { id: "history",       label: "История",        icon: "Clock" },
  { id: "documents",     label: "Документы",      icon: "FileArchive" },
  { id: "signing",       label: "Подписание",     icon: "PenLine" },
  { id: "notifications", label: "Уведомления",    icon: "Bell" },
  { id: "company",       label: "Компания",       icon: "Building2" },
];

const VENUE_TABS: NavItem[] = [
  { id: "venues",        label: "Мои площадки",   icon: "Building2" },
  { id: "projects",      label: "Проекты",        icon: "FolderOpen" },
  { id: "documents",     label: "Документы",      icon: "FileArchive" },
  { id: "signing",       label: "Подписание",     icon: "PenLine" },
  { id: "notifications", label: "Уведомления",    icon: "Bell" },
  { id: "company",       label: "Компания",       icon: "Users" },
];

const BOTTOM_TABS: NavItem[] = [
  { id: "profile", label: "Профиль", icon: "User" },
];

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function DashboardSidebar({ activeTab, onTabChange }: Props) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const isVenue = user?.role === "venue";
  const tabs = isVenue ? VENUE_TABS : ORG_TABS;

  return (
    <aside className="hidden flex-col w-56 shrink-0 gap-1 sticky top-24 self-start">
      {/* Логотип / имя */}
      <div className="glass rounded-2xl border border-white/10 px-4 py-3 mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${user?.avatarColor || "from-neon-purple to-neon-cyan"} flex items-center justify-center font-oswald font-bold text-white text-base shrink-0`}>
            {user?.avatar || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
            <p className={`text-[11px] font-medium ${isVenue ? "text-neon-cyan" : "text-neon-purple"}`}>
              {isVenue ? "Площадка" : "Организатор"}
            </p>
          </div>
        </div>
      </div>

      {/* Основные вкладки */}
      <nav className="glass rounded-2xl border border-white/10 p-1.5 flex flex-col gap-0.5">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const badge = tab.id === "notifications" ? unreadCount : 0;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                isActive
                  ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon name={tab.icon as never} size={16} className={isActive ? "text-white" : "text-white/40"} />
              <span className="flex-1">{tab.label}</span>
              {badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  isActive ? "bg-white/20 text-white" : "bg-neon-pink text-white"
                }`}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Нижние вкладки */}
      <nav className="glass rounded-2xl border border-white/10 p-1.5 flex flex-col gap-0.5 mt-1">
        {BOTTOM_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                isActive
                  ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon name={tab.icon as never} size={16} className={isActive ? "text-white" : "text-white/40"} />
              <span className="flex-1">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neon-pink/70 hover:text-neon-pink hover:bg-neon-pink/10 transition-all text-left"
        >
          <Icon name="LogOut" size={16} className="text-neon-pink/50" />
          <span>Выйти</span>
        </button>
      </nav>
    </aside>
  );
}
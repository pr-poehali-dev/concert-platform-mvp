import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth, type User } from "@/context/AuthContext";
import VenueSetupModal from "@/components/VenueSetupModal";
import { useNotifications } from "@/context/NotificationsContext";
import DashboardVenuesTab from "@/components/dashboard/DashboardVenuesTab";
import DashboardToursTab from "@/components/dashboard/DashboardToursTab";
import DashboardNotificationsTab from "@/components/dashboard/DashboardNotificationsTab";
import DashboardProfileTab from "@/components/dashboard/DashboardProfileTab";
import DashboardVenueProjectsTab from "@/components/dashboard/DashboardVenueProjectsTab";
import DashboardCompanyTab from "@/components/dashboard/DashboardCompanyTab";
import DashboardDocumentsTab from "@/components/dashboard/DashboardDocumentsTab";

const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";

interface Venue {
  id: string; name: string; city: string; venueType: string;
  capacity: number; priceFrom: number; photoUrl: string;
  tags: string[]; rating: number; reviewsCount: number;
  busyDates?: { date: string; note: string }[];
}

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, logout, updateProfile } = useAuth();
  const [tab, setTab] = useState(user?.role === "venue" ? "venues" : "tours");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showVenueSetup, setShowVenueSetup] = useState(false);
  const [myVenues, setMyVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const [editForm, setEditForm] = useState({
    name: user?.name || "",
    city: user?.city || "",
  });

  const loadMyVenues = async () => {
    if (!user || user.role !== "venue") return;
    setVenuesLoading(true);
    try {
      const res = await fetch(`${VENUES_URL}?action=my&user_id=${user.id}`);
      const data = await res.json();
      setMyVenues(data.venues || []);
    } catch { setMyVenues([]); }
    finally { setVenuesLoading(false); }
  };

  useEffect(() => {
    if (tab === "venues") loadMyVenues();
  }, [tab]);

  if (!user) return null;

  const isVenue = user.role === "venue";
  const tabs = isVenue
    ? [
        { id: "venues",    label: "Мои площадки", icon: "Building2" },
        { id: "projects",  label: "Проекты",       icon: "FolderOpen" },
        { id: "documents", label: "Документы",     icon: "FileArchive" },
        { id: "company",   label: "Компания",      icon: "Users" },
        { id: "notifications", label: "Уведомления", icon: "Bell", badge: unreadCount },
        { id: "profile",   label: "Профиль",       icon: "User" },
      ]
    : [
        { id: "tours",     label: "Мои туры",      icon: "Route" },
        { id: "history",   label: "История",        icon: "Clock" },
        { id: "documents", label: "Документы",     icon: "FileArchive" },
        { id: "company",   label: "Компания",      icon: "Users" },
        { id: "notifications", label: "Уведомления", icon: "Bell", badge: unreadCount },
        { id: "profile",   label: "Профиль",       icon: "User" },
      ];

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setEditMode(false);
  };

  return (
    <div className="min-h-screen pt-20">
      {/* Pending / Rejected banner */}
      {user.status === "pending" && (
        <div className="bg-gradient-to-r from-neon-purple/20 to-neon-cyan/10 border-b border-neon-purple/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neon-purple/20 flex items-center justify-center shrink-0">
              <Icon name="ClipboardList" size={16} className="text-neon-purple" />
            </div>
            <div className="flex-1">
              <span className="text-white font-medium text-sm">Аккаунт на проверке</span>
              <span className="text-white/50 text-sm ml-2">— администратор рассматривает вашу заявку. Мы уведомим вас о результате.</span>
            </div>
            <span className="text-neon-purple text-xs px-2 py-1 bg-neon-purple/10 rounded-lg border border-neon-purple/20 shrink-0">Ожидание</span>
          </div>
        </div>
      )}
      {user.status === "rejected" && (
        <div className="bg-gradient-to-r from-neon-pink/20 to-neon-pink/5 border-b border-neon-pink/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
            <Icon name="XCircle" size={18} className="text-neon-pink shrink-0" />
            <span className="text-white font-medium text-sm">Заявка отклонена</span>
            <span className="text-white/50 text-sm">— свяжитесь с поддержкой для уточнения причины.</span>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="relative py-12 overflow-hidden">
        <div className="absolute inset-0 gradient-bg-purple opacity-30" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-5 flex-wrap">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-oswald font-bold text-3xl text-white border-2 border-white/10 shadow-xl animate-glow-pulse shrink-0`}>
              {user.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-oswald font-bold text-3xl text-white">{user.name}</h1>
                {user.verified && (
                  <Badge className="bg-neon-green/20 text-neon-green border-neon-green/40 flex items-center gap-1">
                    <Icon name="BadgeCheck" size={12} />Верифицирован
                  </Badge>
                )}
                <Badge className={isVenue ? "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40" : "bg-neon-purple/20 text-neon-purple border-neon-purple/40"}>
                  {isVenue ? "Площадка" : "Организатор"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-white/50 text-sm">
                <span className="flex items-center gap-1"><Icon name="Mail" size={13} />{user.email}</span>
                {user.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={13} />{user.city}</span>}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setTab("profile")}
                className="flex items-center gap-2 px-4 py-2 glass text-white/60 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm">
                <Icon name="Settings" size={15} />Настройки
              </button>
              <button onClick={logout}
                className="flex items-center gap-2 px-4 py-2 glass text-neon-pink hover:bg-neon-pink/10 rounded-xl border border-neon-pink/20 transition-all text-sm">
                <Icon name="LogOut" size={15} />Выйти
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-8 glass rounded-xl p-1 w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-oswald font-medium transition-all ${tab === t.id ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}>
              <Icon name={t.icon} size={15} />{t.label}
              {"badge" in t && (t.badge as number) > 0 && (
                <span className="w-4 h-4 bg-neon-pink rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                  {(t.badge as number) > 9 ? "9+" : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "venues" && (
          <DashboardVenuesTab
            venues={myVenues}
            loading={venuesLoading}
            onAddVenue={() => setShowVenueSetup(true)}
          />
        )}

        {tab === "projects" && isVenue && (
          <DashboardVenueProjectsTab
            onOpenChat={onNavigate ? (convId) => onNavigate(`chat:${convId}`) : undefined}
          />
        )}

        {(tab === "tours" || tab === "history") && (
          <DashboardToursTab
            activeTab={tab as "tours" | "history"}
            onNavigate={onNavigate}
          />
        )}

        {tab === "documents" && (
          <DashboardDocumentsTab />
        )}

        {tab === "company" && (
          <DashboardCompanyTab />
        )}

        {tab === "notifications" && (
          <DashboardNotificationsTab
            notifications={notifications}
            unreadCount={unreadCount}
            markRead={markRead}
            markAllRead={markAllRead}
            onNavigate={onNavigate}
          />
        )}

        {tab === "profile" && (
          <DashboardProfileTab
            user={user}
            isVenue={isVenue}
            editMode={editMode}
            saving={saving}
            editForm={editForm}
            onEditFormChange={setEditForm}
            onEditToggle={() => setEditMode(true)}
            onSave={handleSave}
            onCancelEdit={() => setEditMode(false)}
            onLogout={logout}
            onProfileUpdate={(fields: Partial<User>) => updateProfile(fields)}
          />
        )}
      </div>

      <VenueSetupModal
        open={showVenueSetup}
        onClose={() => setShowVenueSetup(false)}
        onCreated={() => { loadMyVenues(); setShowVenueSetup(false); }}
      />
    </div>
  );
}
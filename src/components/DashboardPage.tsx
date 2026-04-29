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
import DashboardSigningTab from "@/components/dashboard/DashboardSigningTab";
import DashboardAITab from "@/components/dashboard/DashboardAITab";
import CrmPage from "@/pages/CrmPage";
import ProjectsPage from "@/components/projects/ProjectsPage";

const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";

interface Venue {
  id: string; name: string; city: string; venueType: string;
  capacity: number; priceFrom: number; photoUrl: string;
  tags: string[]; rating: number; reviewsCount: number;
  busyDates?: { date: string; note: string }[];
}

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
  initialTab?: string;
}

export default function DashboardPage({ onNavigate, initialTab }: DashboardPageProps) {
  const { user, logout, updateProfile } = useAuth();
  const [tab, setTab] = useState(initialTab || (user?.role === "venue" ? "venues" : "tours"));
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

  // Sync tab when initialTab changes (e.g. from notifications deep-link)
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: editForm.name.trim(),
        city: editForm.city.trim(),
      });
      setEditMode(false);
    } catch (e) {
      // Ошибка показывается через toast в updateProfile
    } finally {
      setSaving(false);
    }
  };

  // Мобильный таб-бар (только на маленьких экранах, до lg)
  const mobileTabs = isVenue
    ? [
        { id: "venues",        icon: "Building2" },
        { id: "projects",      icon: "FolderOpen" },
        { id: "concerts",      icon: "Music" },
        { id: "documents",     icon: "FileArchive" },
        { id: "signing",       icon: "PenLine" },
        { id: "venue_crm",     icon: "Kanban" },
        { id: "notifications", icon: "Bell" },
        { id: "profile",       icon: "User" },
        { id: "ai_help",       icon: "Sparkles" },
      ]
    : [
        { id: "tours",         icon: "Route" },
        { id: "history",       icon: "Clock" },
        { id: "documents",     icon: "FileArchive" },
        { id: "signing",       icon: "PenLine" },
        { id: "notifications", icon: "Bell" },
        { id: "profile",       icon: "User" },
        { id: "ai_help",       icon: "Sparkles" },
      ];

  return (
    <div className="min-h-screen">
      {/* Pending / Rejected banner */}
      {user.status === "pending" && (
        <div className="bg-gradient-to-r from-neon-purple/20 to-neon-cyan/10 border-b border-neon-purple/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neon-purple/20 flex items-center justify-center shrink-0">
              <Icon name="ClipboardList" size={16} className="text-neon-purple" />
            </div>
            <div className="flex-1">
              <span className="text-white font-medium text-sm">Аккаунт на проверке</span>
              <span className="text-white/50 text-sm ml-2">— администратор рассматривает вашу заявку.</span>
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
            <span className="text-white/50 text-sm">— свяжитесь с поддержкой.</span>
          </div>
        </div>
      )}

      {/* Hero — компактный, только на мобильных и планшетах (до lg) */}
      <div className="lg:hidden relative py-8 overflow-hidden">
        <div className="absolute inset-0 gradient-bg-purple opacity-30" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-oswald font-bold text-2xl text-white border-2 border-white/10 shadow-xl shrink-0`}>
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-oswald font-bold text-2xl text-white truncate">{user.name}</h1>
                {user.verified && (
                  <Badge className="bg-neon-green/20 text-neon-green border-neon-green/40 flex items-center gap-1 shrink-0">
                    <Icon name="BadgeCheck" size={11} />Верифицирован
                  </Badge>
                )}
              </div>
              <p className="text-white/50 text-xs mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Основной layout: контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 lg:pt-6">
        <div className="flex gap-6 items-start">

          {/* Контент */}
          <div className="flex-1 min-w-0">
            {/* Заголовок страницы — только на десктопе */}
            <div className="hidden lg:block mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-oswald font-bold text-2xl text-white border-2 border-white/10 shadow-xl animate-glow-pulse shrink-0`}>
                  {user.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-oswald font-bold text-2xl text-white">{user.name}</h1>
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
              </div>
            </div>

            {/* Мобильный горизонтальный таб-бар (до lg) */}
            <div className="lg:hidden flex gap-1 mb-6 glass rounded-xl p-1 overflow-x-auto scrollbar-thin">
              {mobileTabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center justify-center w-10 h-9 rounded-lg shrink-0 transition-all relative ${tab === t.id ? "bg-neon-purple text-white" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                >
                  <Icon name={t.icon as never} size={16} />
                  {t.id === "notifications" && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-neon-pink rounded-full text-white text-[8px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? "9" : unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Контент вкладок */}
            {tab === "venues" && (
              <DashboardVenuesTab
                venues={myVenues}
                loading={venuesLoading}
                onAddVenue={() => setShowVenueSetup(true)}
                onReload={loadMyVenues}
              />
            )}

            {tab === "projects" && isVenue && (
              <DashboardVenueProjectsTab
                onOpenChat={onNavigate ? (convId) => onNavigate(`chat:${convId}`) : undefined}
              />
            )}

            {tab === "concerts" && isVenue && (
              <ProjectsPage onNavigate={onNavigate} />
            )}

            {tab === "venue_crm" && isVenue && (
              <CrmPage onNavigate={onNavigate} />
            )}

            {(tab === "tours" || tab === "history") && (
              <DashboardToursTab
                activeTab={tab as "tours" | "history"}
                onNavigate={onNavigate}
              />
            )}

            {tab === "documents" && <DashboardDocumentsTab />}

            {tab === "signing" && <DashboardSigningTab />}

            {tab === "company" && <DashboardCompanyTab />}

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

            {tab === "ai_help" && <DashboardAITab />}
          </div>
        </div>
      </div>

      <VenueSetupModal
        open={showVenueSetup}
        onClose={() => setShowVenueSetup(false)}
        onCreated={() => { loadMyVenues(); setShowVenueSetup(false); }}
      />
    </div>
  );
}
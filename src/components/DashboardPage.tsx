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
import DashboardAILawyerTab from "@/components/dashboard/DashboardAILawyerTab";
import DashboardBarTab from "@/components/dashboard/DashboardBarTab";
import CrmPage from "@/pages/CrmPage";
import ProjectsPage from "@/components/projects/ProjectsPage";
import { useEmployeePing } from "@/hooks/useEmployeePing";

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
  useEmployeePing(user?.employeeId, user?.isEmployee);
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
        { id: "bar",           icon: "Wine" },
        { id: "documents",     icon: "FileArchive" },
        { id: "signing",       icon: "PenLine" },
        { id: "venue_crm",     icon: "Kanban" },
        { id: "notifications", icon: "Bell" },
        { id: "profile",       icon: "User" },
        { id: "ai_help",       icon: "Sparkles" },
        { id: "ai_lawyer",     icon: "Scale" },
      ]
    : [
        { id: "tours",         icon: "Route" },
        { id: "history",       icon: "Clock" },
        { id: "documents",     icon: "FileArchive" },
        { id: "signing",       icon: "PenLine" },
        { id: "notifications", icon: "Bell" },
        { id: "profile",       icon: "User" },
        { id: "ai_help",       icon: "Sparkles" },
        { id: "ai_lawyer",     icon: "Scale" },
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

      {/* Основной layout: контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-4 lg:pt-2">
        <div className="flex gap-6 items-start">

          {/* Контент */}
          <div className="flex-1 min-w-0">
            {/* Мобильный горизонтальный таб-бар (до lg) */}
            <div className="lg:hidden flex gap-1 mb-4 glass rounded-xl p-1 overflow-x-auto scrollbar-thin">
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
                onNavigate={onNavigate}
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
            {tab === "ai_lawyer" && <DashboardAILawyerTab />}
            {tab === "bar" && isVenue && <DashboardBarTab />}
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
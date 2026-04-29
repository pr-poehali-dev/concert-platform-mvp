import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { ADMIN_URL, type Stats, type AdminUser, type PendingUser, type AdminVenue } from "./admin/types";
import AdminOverviewTab from "./admin/AdminOverviewTab";
import AdminPendingTab from "./admin/AdminPendingTab";
import AdminUsersTab from "./admin/AdminUsersTab";
import AdminVenuesTab from "./admin/AdminVenuesTab";
import AdminSupportTab from "./admin/AdminSupportTab";
import AdminImportTab from "./admin/AdminImportTab";
import AdminAITab from "./admin/AdminAITab";
import AdminSettingsTab, { loadSettings } from "./admin/AdminSettingsTab";

// ─── Login screen ─────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${ADMIN_URL}?action=login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Неверный пароль"); return; }
      localStorage.setItem("gl_admin_token", data.token);
      onLogin(data.token);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-strong rounded-2xl p-8 border border-white/10">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent rounded-t-2xl" />
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
            <Icon name="ShieldCheck" size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-oswald font-bold text-xl text-white">Admin Panel</h1>
            <p className="text-white/40 text-xs">GLOBAL LINK</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Введите пароль администратора"
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/20 outline-none border border-white/10 focus:border-neon-purple/50 transition-colors text-sm"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-3 py-2 border border-neon-pink/20">
              <Icon name="AlertCircle" size={14} />
              {error}
            </div>
          )}
          <button onClick={handleLogin} disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? <><Icon name="Loader2" size={16} className="animate-spin" />Вход...</> : <><Icon name="LogIn" size={16} />Войти</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface AdminPageProps {
  externalToken?: string;
  onExternalLogout?: () => void;
}

export default function AdminPage({ externalToken, onExternalLogout }: AdminPageProps = {}) {
  const PRESENTATION_URL = "https://functions.poehali.dev/3a1c12fb-cacd-4731-961b-2f37badc2c08";

  const [token, setToken] = useState(() => externalToken || localStorage.getItem("gl_admin_token") || "");
  const [tab, setTab] = useState<"overview" | "pending" | "users" | "venues" | "support" | "import" | "ai" | "settings">("overview");

  // Инициализируем глобальные флаги из настроек при старте
  useEffect(() => {
    const s = loadSettings();
    const gl = window as never as Record<string, unknown>;
    gl.__GL_POLLING_ENABLED__ = s.pollingEnabled;
    gl.__GL_POLLING_INTERVAL__ = s.pollingInterval * 1000;
    gl.__GL_DEV_MODE__ = s.devMode;
    gl.__GL_AI_ENABLED__ = s.aiEnabled;
  }, []);
  const [presMenuOpen, setPresMenuOpen] = useState(false);
  const [presLoading, setPresLoading]   = useState<string | null>(null);
  const presRef = useRef<HTMLDivElement>(null);
  const [supportUnread, setSupportUnread] = useState(0);

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [pending, setPending] = useState<PendingUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersRole, setUsersRole] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [venuesTotal, setVenuesTotal] = useState(0);
  const [venuesPage, setVenuesPage] = useState(1);
  const [venuesPages, setVenuesPages] = useState(1);
  const [venuesSearch, setVenuesSearch] = useState("");
  const [venuesLoading, setVenuesLoading] = useState(false);

  const apiFetch = useCallback(async (path: string, opts?: RequestInit) => {
    const res = await fetch(`${ADMIN_URL}${path}`, {
      ...opts,
      headers: { "X-Admin-Token": token, "Content-Type": "application/json", ...(opts?.headers || {}) },
    });
    if (res.status === 403) { setToken(""); localStorage.removeItem("gl_admin_token"); }
    return res.json();
  }, [token]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const data = await apiFetch("/?action=stats");
    setStats(data);
    setStatsLoading(false);
  }, [apiFetch]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const params = new URLSearchParams({ action: "users", page: String(usersPage) });
    if (usersSearch) params.set("search", usersSearch);
    if (usersRole) params.set("role", usersRole);
    const data = await apiFetch(`/?${params}`);
    setUsers(data.users || []);
    setUsersTotal(data.total || 0);
    setUsersPages(data.pages || 1);
    setUsersLoading(false);
  }, [apiFetch, usersPage, usersSearch, usersRole]);

  const loadVenues = useCallback(async () => {
    setVenuesLoading(true);
    const params = new URLSearchParams({ action: "venues", page: String(venuesPage) });
    if (venuesSearch) params.set("search", venuesSearch);
    const data = await apiFetch(`/?${params}`);
    setVenues(data.venues || []);
    setVenuesTotal(data.total || 0);
    setVenuesPages(data.pages || 1);
    setVenuesLoading(false);
  }, [apiFetch, venuesPage, venuesSearch]);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    const data = await apiFetch("/?action=pending");
    setPending(data.users || []);
    setPendingLoading(false);
  }, [apiFetch]);

  useEffect(() => { if (token && tab === "overview") loadStats(); }, [token, tab, loadStats]);
  useEffect(() => { if (token && tab === "pending") loadPending(); }, [token, tab, loadPending]);
  useEffect(() => { if (token && tab === "users") loadUsers(); }, [token, tab, loadUsers]);
  useEffect(() => { if (token && tab === "venues") loadVenues(); }, [token, tab, loadVenues]);

  // Закрытие меню презентаций при клике вне
  useEffect(() => {
    if (!presMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (presRef.current && !presRef.current.contains(e.target as Node)) {
        setPresMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [presMenuOpen]);

  // Polling непрочитанных сообщений поддержки
  useEffect(() => {
    if (!token) return;
    const loadSupportUnread = async () => {
      try {
        const data = await apiFetch("/?action=support_dialogs");
        const total = (data.dialogs || []).reduce((s: number, d: { unread: number }) => s + (d.unread || 0), 0);
        setSupportUnread(total);
      } catch { /* silent */ }
    };
    loadSupportUnread();
    const t = setInterval(loadSupportUnread, 15000);
    return () => clearInterval(t);
  }, [token, apiFetch]);

  const approveUser = async (id: string) => {
    await apiFetch("/?action=approve", { method: "POST", body: JSON.stringify({ id }) });
    setPending(prev => prev.filter(u => u.id !== id));
    setStats(prev => prev ? { ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) } : prev);
  };

  const rejectUser = async (id: string, reason: string) => {
    await apiFetch("/?action=reject", { method: "POST", body: JSON.stringify({ id, reason }) });
    setPending(prev => prev.filter(u => u.id !== id));
    setStats(prev => prev ? { ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) } : prev);
  };

  const toggleVerifyUser = async (id: string) => {
    const data = await apiFetch("/?action=verify_user", { method: "POST", body: JSON.stringify({ id }) });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, verified: data.verified } : u));
  };

  const toggleVerifyVenue = async (id: string) => {
    const data = await apiFetch("/?action=verify_venue", { method: "POST", body: JSON.stringify({ id }) });
    setVenues(prev => prev.map(v => v.id === id ? { ...v, verified: data.verified } : v));
  };

  const toggleAdmin = async (id: string) => {
    const data = await apiFetch("/?action=toggle_admin", { method: "POST", body: JSON.stringify({ id }) });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isAdmin: data.isAdmin } : u));
  };

  const deleteUser = async (id: string) => {
    await apiFetch("/?action=delete_user", { method: "POST", body: JSON.stringify({ id }) });
    setUsers(prev => prev.filter(u => u.id !== id));
    setUsersTotal(prev => Math.max(0, prev - 1));
  };

  const deleteVenue = async (id: string) => {
    await apiFetch("/?action=delete_venue", { method: "POST", body: JSON.stringify({ id }) });
    setVenues(prev => prev.filter(v => v.id !== id));
    setVenuesTotal(prev => Math.max(0, prev - 1));
  };

  if (!token) return <AdminLogin onLogin={setToken} />;

  const pendingCount = stats?.pendingCount ?? pending.length;

  const TABS = [
    { id: "overview", label: "Обзор", icon: "LayoutDashboard", badge: 0 },
    { id: "pending", label: "Заявки", icon: "ClipboardList", badge: pendingCount },
    { id: "users", label: "Пользователи", icon: "Users", badge: 0 },
    { id: "venues", label: "Площадки", icon: "Building2", badge: 0 },
    { id: "support", label: "Поддержка", icon: "Headphones", badge: supportUnread },
    { id: "import", label: "Импорт", icon: "Download", badge: 0 },
    { id: "ai",       label: "ИИ-запросы", icon: "Sparkles", badge: 0 },
    { id: "settings", label: "Настройки",  icon: "Settings2", badge: 0 },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <div className="glass-strong border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
              <Icon name="ShieldCheck" size={14} className="text-white" />
            </div>
            <span className="font-oswald font-bold text-white">GLOBAL LINK <span className="text-neon-purple">ADMIN</span></span>
          </div>
          <div className="flex items-center gap-3">
            {/* Кнопка скачать презентацию */}
            <div className="relative" ref={presRef}>
              <button
                onClick={() => setPresMenuOpen(v => !v)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/20 rounded-lg transition-all"
              >
                <Icon name="FileDown" size={14} />
                Презентация
                <Icon name="ChevronDown" size={12} className={`transition-transform ${presMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {presMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 glass-strong border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-2.5 border-b border-white/5">
                    <p className="text-white/40 text-xs uppercase tracking-wider">Скачать презентацию</p>
                  </div>
                  {[
                    { type: "investors", label: "Для инвесторов",   icon: "TrendingUp",  color: "text-neon-purple", desc: "Метрики, рынок, монетизация" },
                    { type: "users",     label: "Для пользователей", icon: "Users",       color: "text-neon-cyan",   desc: "Функции для организаторов и площадок" },
                    { type: "partners",  label: "Для партнёров",     icon: "Handshake",   color: "text-neon-green",  desc: "Форматы сотрудничества" },
                  ].map(({ type, label, icon, color, desc }) => (
                    <button
                      key={type}
                      disabled={presLoading === type}
                      onClick={async () => {
                        setPresLoading(type);
                        setPresMenuOpen(false);
                        try {
                          const r = await fetch(`${PRESENTATION_URL}?type=${type}`);
                          const d = await r.json();
                          if (d.url) window.open(d.url, "_blank");
                        } catch { /* silent */ }
                        finally { setPresLoading(null); }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 disabled:opacity-50"
                    >
                      {presLoading === type
                        ? <Icon name="Loader2" size={16} className={`${color} animate-spin shrink-0`} />
                        : <Icon name={icon as never} size={16} className={`${color} shrink-0`} />}
                      <div className="text-left">
                        <p className="text-white text-sm font-medium">{label}</p>
                        <p className="text-white/30 text-xs">{desc}</p>
                      </div>
                      {presLoading !== type && <Icon name="Download" size={13} className="text-white/20 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setToken("");
                localStorage.removeItem("gl_admin_token");
                if (onExternalLogout) onExternalLogout();
              }}
              className="flex items-center gap-1.5 text-white/40 hover:text-neon-pink transition-colors text-sm"
            >
              <Icon name="LogOut" size={14} />Выйти
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-1 mb-8 glass rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-oswald font-medium transition-all ${tab === t.id ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}>
              <Icon name={t.icon} size={15} />{t.label}
              {t.badge > 0 && (
                <span className="w-5 h-5 bg-neon-pink rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                  {t.badge > 99 ? "99+" : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <AdminOverviewTab
            stats={stats}
            statsLoading={statsLoading}
            onGoToPending={() => setTab("pending")}
          />
        )}

        {tab === "pending" && (
          <AdminPendingTab
            pending={pending}
            pendingLoading={pendingLoading}
            onApprove={approveUser}
            onReject={rejectUser}
            onRefresh={loadPending}
          />
        )}

        {tab === "users" && (
          <AdminUsersTab
            users={users}
            usersTotal={usersTotal}
            usersPage={usersPage}
            usersPages={usersPages}
            usersSearch={usersSearch}
            usersRole={usersRole}
            usersLoading={usersLoading}
            token={token}
            onSearchChange={val => { setUsersSearch(val); setUsersPage(1); }}
            onRoleChange={val => { setUsersRole(val); setUsersPage(1); }}
            onPageChange={setUsersPage}
            onRefresh={loadUsers}
            onToggleVerify={toggleVerifyUser}
            onToggleAdmin={toggleAdmin}
            onDelete={deleteUser}
          />
        )}

        {tab === "venues" && (
          <AdminVenuesTab
            venues={venues}
            venuesTotal={venuesTotal}
            venuesPage={venuesPage}
            venuesPages={venuesPages}
            venuesSearch={venuesSearch}
            venuesLoading={venuesLoading}
            onSearchChange={val => { setVenuesSearch(val); setVenuesPage(1); }}
            onPageChange={setVenuesPage}
            onRefresh={loadVenues}
            onToggleVerify={toggleVerifyVenue}
            onDelete={deleteVenue}
          />
        )}

        {tab === "support" && (
          <AdminSupportTab token={token} />
        )}

        {tab === "import" && (
          <AdminImportTab token={token} />
        )}

        {tab === "ai" && (
          <AdminAITab token={token} />
        )}

        {tab === "settings" && (
          <AdminSettingsTab />
        )}
      </div>
    </div>
  );
}
import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

const ADMIN_URL = "https://functions.poehali.dev/19ba5519-e548-4443-845c-9cb446cfc909";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stats {
  totalUsers: number;
  organizers: number;
  venueOwners: number;
  verifiedUsers: number;
  totalVenues: number;
  verifiedVenues: number;
  totalConversations: number;
  totalMessages: number;
  newUsersWeek: number;
  recentUsers: AdminUser[];
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string;
  verified: boolean;
  isAdmin: boolean;
  avatar: string;
  avatarColor: string;
  createdAt: string;
  venuesCount: number;
}

interface AdminVenue {
  id: string;
  name: string;
  city: string;
  venueType: string;
  capacity: number;
  priceFrom: number;
  verified: boolean;
  rating: number;
  reviewsCount: number;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" });
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon name={icon} size={20} className="text-white" />
      </div>
      <div className="font-oswald font-bold text-3xl text-white mb-0.5">{value}</div>
      <div className="text-white/50 text-sm">{label}</div>
      {sub && <div className="text-white/30 text-xs mt-1">{sub}</div>}
    </div>
  );
}

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

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem("gl_admin_token") || "");
  const [tab, setTab] = useState<"overview" | "users" | "venues">("overview");

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersRole, setUsersRole] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  // Venues
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

  useEffect(() => { if (token && tab === "overview") loadStats(); }, [token, tab, loadStats]);
  useEffect(() => { if (token && tab === "users") loadUsers(); }, [token, tab, loadUsers]);
  useEffect(() => { if (token && tab === "venues") loadVenues(); }, [token, tab, loadVenues]);

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

  if (!token) return <AdminLogin onLogin={setToken} />;

  const TABS = [
    { id: "overview", label: "Обзор", icon: "LayoutDashboard" },
    { id: "users", label: `Пользователи${usersTotal ? ` (${usersTotal})` : ""}`, icon: "Users" },
    { id: "venues", label: `Площадки${venuesTotal ? ` (${venuesTotal})` : ""}`, icon: "Building2" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="glass-strong border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
              <Icon name="ShieldCheck" size={14} className="text-white" />
            </div>
            <span className="font-oswald font-bold text-white">GLOBAL LINK <span className="text-neon-purple">ADMIN</span></span>
          </div>
          <button
            onClick={() => { setToken(""); localStorage.removeItem("gl_admin_token"); }}
            className="flex items-center gap-1.5 text-white/40 hover:text-neon-pink transition-colors text-sm"
          >
            <Icon name="LogOut" size={14} />Выйти
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 glass rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-oswald font-medium transition-all ${tab === t.id ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}>
              <Icon name={t.icon} size={15} />{t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="animate-fade-in space-y-8">
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <div key={i} className="glass rounded-2xl h-28 animate-pulse" />)}
              </div>
            ) : stats ? (
              <>
                <div>
                  <h2 className="font-oswald font-bold text-xl text-white mb-4 flex items-center gap-2">
                    <Icon name="Users" size={18} className="text-neon-purple" />Пользователи
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon="Users" label="Всего пользователей" value={stats.totalUsers} sub={`+${stats.newUsersWeek} за неделю`} color="bg-neon-purple/20" />
                    <StatCard icon="Route" label="Организаторы" value={stats.organizers} color="bg-neon-pink/20" />
                    <StatCard icon="Building2" label="Площадки" value={stats.venueOwners} color="bg-neon-cyan/20" />
                    <StatCard icon="BadgeCheck" label="Верифицировано" value={stats.verifiedUsers} color="bg-neon-green/20" />
                  </div>
                </div>

                <div>
                  <h2 className="font-oswald font-bold text-xl text-white mb-4 flex items-center gap-2">
                    <Icon name="Building2" size={18} className="text-neon-cyan" />Площадки и активность
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon="Building2" label="Всего площадок" value={stats.totalVenues} color="bg-neon-cyan/20" />
                    <StatCard icon="BadgeCheck" label="Верифицировано" value={stats.verifiedVenues} color="bg-neon-green/20" />
                    <StatCard icon="MessageCircle" label="Диалоги" value={stats.totalConversations} color="bg-neon-purple/20" />
                    <StatCard icon="Send" label="Сообщений" value={stats.totalMessages} color="bg-neon-pink/20" />
                  </div>
                </div>

                {/* Recent registrations */}
                <div>
                  <h2 className="font-oswald font-bold text-xl text-white mb-4 flex items-center gap-2">
                    <Icon name="Clock" size={18} className="text-neon-pink" />Последние регистрации
                  </h2>
                  <div className="glass rounded-2xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          {["Пользователь","Email","Роль","Дата"].map(h => (
                            <th key={h} className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentUsers.map((u, i) => (
                          <tr key={u.id} className={`hover:bg-white/3 transition-colors ${i < stats.recentUsers.length - 1 ? "border-b border-white/5" : ""}`}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center font-oswald font-bold text-white text-xs shrink-0`}>
                                  {u.name[0]?.toUpperCase()}
                                </div>
                                <span className="text-white text-sm font-medium">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-white/50 text-sm">{u.email}</td>
                            <td className="px-5 py-3">
                              <Badge className={u.role === "organizer" ? "bg-neon-purple/20 text-neon-purple border-neon-purple/30 text-xs" : "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30 text-xs"}>
                                {u.role === "organizer" ? "Организатор" : "Площадка"}
                              </Badge>
                            </td>
                            <td className="px-5 py-3 text-white/40 text-sm">{formatDate(u.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-white/30">Нет данных</div>
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div className="animate-fade-in space-y-5">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5 border border-white/10 flex-1 min-w-48">
                <Icon name="Search" size={15} className="text-white/30 shrink-0" />
                <input
                  type="text" placeholder="Поиск по имени или email..."
                  value={usersSearch}
                  onChange={e => { setUsersSearch(e.target.value); setUsersPage(1); }}
                  className="bg-transparent text-white placeholder:text-white/25 outline-none text-sm flex-1"
                />
              </div>
              <div className="flex gap-1 glass rounded-xl p-1 border border-white/10">
                {[["", "Все"], ["organizer", "Организаторы"], ["venue", "Площадки"]].map(([val, label]) => (
                  <button key={val} onClick={() => { setUsersRole(val); setUsersPage(1); }}
                    className={`px-4 py-1.5 rounded-lg text-sm transition-all ${usersRole === val ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={loadUsers} className="p-2.5 glass rounded-xl border border-white/10 text-white/40 hover:text-white transition-colors">
                <Icon name={usersLoading ? "Loader2" : "RefreshCw"} size={16} className={usersLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Table */}
            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Пользователь","Роль","Город","Площадок","Дата рег.","Статус","Действия"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-white/40 uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 bg-white/5 rounded animate-pulse" /></td></tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-white/30">Пользователи не найдены</td></tr>
                  ) : users.map((u, i) => (
                    <tr key={u.id} className={`hover:bg-white/3 transition-colors ${i < users.length - 1 ? "border-b border-white/5" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${u.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-xs shrink-0`}>
                            {u.avatar || u.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white text-sm font-medium">{u.name}</span>
                              {u.isAdmin && <Icon name="ShieldCheck" size={13} className="text-neon-purple" />}
                            </div>
                            <span className="text-white/40 text-xs">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={u.role === "organizer" ? "bg-neon-purple/20 text-neon-purple border-neon-purple/30 text-xs" : "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30 text-xs"}>
                          {u.role === "organizer" ? "Организатор" : "Площадка"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-sm">{u.city || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {u.role === "venue" ? (
                          <span className="text-white/70 text-sm font-medium">{u.venuesCount}</span>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge className={u.verified ? "bg-neon-green/20 text-neon-green border-neon-green/30 text-xs" : "bg-white/5 text-white/40 border-white/10 text-xs"}>
                          {u.verified ? "Верифицирован" : "Не верифицирован"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleVerifyUser(u.id)}
                            title={u.verified ? "Снять верификацию" : "Верифицировать"}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${u.verified ? "bg-neon-green/20 text-neon-green hover:bg-neon-green/30" : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-neon-green"}`}>
                            <Icon name="BadgeCheck" size={13} />
                          </button>
                          <button
                            onClick={() => toggleAdmin(u.id)}
                            title={u.isAdmin ? "Снять права админа" : "Сделать администратором"}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${u.isAdmin ? "bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30" : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-neon-purple"}`}>
                            <Icon name="ShieldCheck" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {usersPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-sm">Всего: {usersTotal}</span>
                <div className="flex gap-1">
                  <button onClick={() => setUsersPage(p => Math.max(1, p - 1))} disabled={usersPage === 1}
                    className="w-8 h-8 glass rounded-lg flex items-center justify-center text-white/50 hover:text-white disabled:opacity-30 border border-white/10">
                    <Icon name="ChevronLeft" size={15} />
                  </button>
                  {[...Array(usersPages)].map((_, i) => (
                    <button key={i} onClick={() => setUsersPage(i + 1)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${usersPage === i + 1 ? "bg-neon-purple text-white" : "glass text-white/50 hover:text-white border border-white/10"}`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setUsersPage(p => Math.min(usersPages, p + 1))} disabled={usersPage === usersPages}
                    className="w-8 h-8 glass rounded-lg flex items-center justify-center text-white/50 hover:text-white disabled:opacity-30 border border-white/10">
                    <Icon name="ChevronRight" size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── VENUES ── */}
        {tab === "venues" && (
          <div className="animate-fade-in space-y-5">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5 border border-white/10 flex-1 min-w-48">
                <Icon name="Search" size={15} className="text-white/30 shrink-0" />
                <input
                  type="text" placeholder="Поиск по названию или городу..."
                  value={venuesSearch}
                  onChange={e => { setVenuesSearch(e.target.value); setVenuesPage(1); }}
                  className="bg-transparent text-white placeholder:text-white/25 outline-none text-sm flex-1"
                />
              </div>
              <button onClick={loadVenues} className="p-2.5 glass rounded-xl border border-white/10 text-white/40 hover:text-white transition-colors">
                <Icon name={venuesLoading ? "Loader2" : "RefreshCw"} size={16} className={venuesLoading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Площадка","Город","Тип","Вмест.","Цена","Владелец","Дата","Статус","Верификация"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-white/40 uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {venuesLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-8 bg-white/5 rounded animate-pulse" /></td></tr>
                    ))
                  ) : venues.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-white/30">Площадки не найдены</td></tr>
                  ) : venues.map((v, i) => (
                    <tr key={v.id} className={`hover:bg-white/3 transition-colors ${i < venues.length - 1 ? "border-b border-white/5" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="text-white font-medium text-sm">{v.name}</span>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-sm">{v.city}</td>
                      <td className="px-4 py-3 text-white/50 text-sm">{v.venueType}</td>
                      <td className="px-4 py-3 text-white/60 text-sm">{v.capacity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-neon-cyan text-sm whitespace-nowrap">
                        {v.priceFrom > 0 ? `от ${v.priceFrom.toLocaleString()} ₽` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-white/70 text-xs">{v.ownerName}</div>
                          <div className="text-white/30 text-xs">{v.ownerEmail}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">{formatDate(v.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {v.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-neon-green text-xs">
                              <Icon name="Star" size={11} className="fill-current" />{v.rating}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleVerifyVenue(v.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors ${v.verified ? "bg-neon-green/20 text-neon-green border-neon-green/30 hover:bg-neon-green/30" : "bg-white/5 text-white/40 border-white/10 hover:border-neon-green/40 hover:text-neon-green"}`}>
                          <Icon name="BadgeCheck" size={12} />
                          {v.verified ? "Верифицирована" : "Верифицировать"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {venuesPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-sm">Всего: {venuesTotal}</span>
                <div className="flex gap-1">
                  <button onClick={() => setVenuesPage(p => Math.max(1, p - 1))} disabled={venuesPage === 1}
                    className="w-8 h-8 glass rounded-lg flex items-center justify-center text-white/50 hover:text-white disabled:opacity-30 border border-white/10">
                    <Icon name="ChevronLeft" size={15} />
                  </button>
                  {[...Array(venuesPages)].map((_, i) => (
                    <button key={i} onClick={() => setVenuesPage(i + 1)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${venuesPage === i + 1 ? "bg-neon-purple text-white" : "glass text-white/50 hover:text-white border border-white/10"}`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setVenuesPage(p => Math.min(venuesPages, p + 1))} disabled={venuesPage === venuesPages}
                    className="w-8 h-8 glass rounded-lg flex items-center justify-center text-white/50 hover:text-white disabled:opacity-30 border border-white/10">
                    <Icon name="ChevronRight" size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

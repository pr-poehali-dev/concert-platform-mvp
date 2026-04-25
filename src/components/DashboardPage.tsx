import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import VenueSetupModal from "@/components/VenueSetupModal";
import { useNotifications } from "@/context/NotificationsContext";

const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";
const FALLBACK_IMG = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/2d0113c6-c12e-42b6-9cd4-2141cf50ef4f.jpg";

const CITIES = ["Москва","Санкт-Петербург","Екатеринбург","Новосибирск","Казань","Ростов-на-Дону","Краснодар","Воронеж","Самара","Уфа"];

// mock tours for organizer
const MOCK_TOURS = [
  { id: "1", name: "Осенний тур 2025", artist: "Звери", status: "active", cities: 5, confirmed: 3, dates: "Сент — Окт 2025", budget: "1 800 000 ₽" },
  { id: "2", name: "Зимний тур", artist: "Би-2", status: "planning", cities: 3, confirmed: 1, dates: "Дек 2025", budget: "900 000 ₽" },
  { id: "3", name: "Весенний тур 2025", artist: "Noize MC", status: "completed", cities: 6, confirmed: 6, dates: "Апр — Май 2025", budget: "3 200 000 ₽" },
];

const MOCK_HISTORY = [
  { id: "1", venue: "Volta", city: "Москва", date: "15 сент 2025", status: "confirmed", amount: "85 000 ₽" },
  { id: "2", venue: "Космонавт", city: "СПб", date: "20 сент 2025", status: "confirmed", amount: "55 000 ₽" },
  { id: "3", venue: "Arena", city: "Екб", date: "27 сент 2025", status: "negotiating", amount: "120 000 ₽" },
  { id: "4", venue: "ГлавClub", city: "Москва", date: "3 мая 2025", status: "completed", amount: "95 000 ₽" },
  { id: "5", venue: "Teleclub", city: "Екб", date: "20 апр 2025", status: "completed", amount: "110 000 ₽" },
];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active: { label: "Активный", cls: "text-neon-green bg-neon-green/10 border-neon-green/30" },
  planning: { label: "Планируется", cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30" },
  completed: { label: "Завершён", cls: "text-white/40 bg-white/5 border-white/10" },
  confirmed: { label: "Подтверждено", cls: "text-neon-green bg-neon-green/10 border-neon-green/30" },
  negotiating: { label: "Переговоры", cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30" },
};

interface Venue {
  id: string; name: string; city: string; venueType: string;
  capacity: number; priceFrom: number; photoUrl: string;
  tags: string[]; rating: number; reviewsCount: number;
  busyDates?: { date: string; note: string }[];
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
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
        { id: "venues", label: "Мои площадки", icon: "Building2" },
        { id: "notifications", label: "Уведомления", icon: "Bell", badge: unreadCount },
        { id: "profile", label: "Профиль", icon: "User" },
      ]
    : [
        { id: "tours", label: "Мои туры", icon: "Route" },
        { id: "history", label: "История", icon: "Clock" },
        { id: "notifications", label: "Уведомления", icon: "Bell", badge: unreadCount },
        { id: "profile", label: "Профиль", icon: "User" },
      ];

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setEditMode(false);
  };

  return (
    <div className="min-h-screen pt-20">
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

        {/* VENUES TAB (for venue role) */}
        {tab === "venues" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-oswald font-bold text-2xl text-white">Мои площадки</h2>
              <button onClick={() => setShowVenueSetup(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-cyan to-neon-green text-background font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm">
                <Icon name="Plus" size={16} />Добавить площадку
              </button>
            </div>

            {venuesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-64 animate-pulse" />)}
              </div>
            ) : myVenues.length === 0 ? (
              <div className="text-center py-20 glass rounded-2xl">
                <Icon name="Building2" size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg font-oswald">У вас пока нет площадок</p>
                <p className="text-white/25 text-sm mt-1 mb-6">Добавьте первую площадку — она появится в поиске</p>
                <button onClick={() => setShowVenueSetup(true)}
                  className="px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity">
                  Добавить площадку
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {myVenues.map(v => (
                  <div key={v.id} className="glass rounded-2xl overflow-hidden hover-lift">
                    <div className="relative h-40 overflow-hidden">
                      <img src={v.photoUrl || FALLBACK_IMG} alt={v.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      <Badge className="absolute top-3 right-3 bg-background/60 backdrop-blur text-white border-white/20 text-xs">{v.venueType}</Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="font-oswald font-bold text-lg text-white mb-1">{v.name}</h3>
                      <div className="flex items-center gap-3 text-white/50 text-xs mb-3">
                        <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{v.city}</span>
                        <span className="flex items-center gap-1"><Icon name="Users" size={11} />{v.capacity.toLocaleString()} чел.</span>
                      </div>
                      {v.busyDates && v.busyDates.length > 0 && (
                        <div className="flex items-center gap-1 text-neon-pink text-xs mb-3">
                          <Icon name="Calendar" size={11} />
                          Занято: {v.busyDates.length} {v.busyDates.length === 1 ? "дата" : "дат"}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button className="flex-1 py-1.5 text-xs glass text-white/50 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                          Редактировать
                        </button>
                        <button className="px-3 py-1.5 text-xs bg-neon-purple/20 text-neon-purple rounded-lg border border-neon-purple/30 hover:bg-neon-purple/30 transition-colors">
                          <Icon name="Eye" size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TOURS TAB (for organizer role) */}
        {tab === "tours" && (
          <div className="animate-fade-in space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-oswald font-bold text-2xl text-white">Мои туры</h2>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm">
                <Icon name="Plus" size={16} />Новый тур
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { icon: "Route", label: "Всего туров", value: MOCK_TOURS.length },
                { icon: "CheckCircle", label: "Завершено", value: MOCK_TOURS.filter(t => t.status === "completed").length },
                { icon: "MapPin", label: "Городов охвачено", value: 47 },
                { icon: "Building2", label: "Площадок", value: 32 },
              ].map((s, i) => (
                <div key={i} className="glass rounded-2xl p-4 text-center">
                  <Icon name={s.icon} size={20} className="text-neon-purple mx-auto mb-2" />
                  <div className="font-oswald font-bold text-2xl gradient-text">{s.value}</div>
                  <div className="text-white/40 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {MOCK_TOURS.map(tour => (
              <div key={tour.id} className="glass rounded-2xl p-5 hover-lift">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-neon-purple/15 flex items-center justify-center shrink-0">
                      <Icon name="Route" size={20} className="text-neon-purple" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-oswald font-semibold text-white text-lg">{tour.name}</h3>
                        <Badge className={`text-xs border ${STATUS_CONFIG[tour.status].cls}`}>
                          {STATUS_CONFIG[tour.status].label}
                        </Badge>
                      </div>
                      <p className="text-neon-cyan text-sm">{tour.artist} · {tour.dates}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-oswald font-bold text-xl gradient-text">{tour.budget}</p>
                    <p className="text-white/30 text-xs">{tour.confirmed}/{tour.cities} городов</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full"
                      style={{ width: `${(tour.confirmed / tour.cities) * 100}%` }} />
                  </div>
                  <span className="text-white/40 text-xs shrink-0">{tour.confirmed}/{tour.cities}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === "history" && (
          <div className="animate-fade-in">
            <h2 className="font-oswald font-bold text-2xl text-white mb-6">История взаимодействий</h2>
            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Площадка","Город","Дата","Сумма","Статус"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_HISTORY.map((item, i) => (
                    <tr key={item.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i === MOCK_HISTORY.length - 1 ? "border-0" : ""}`}>
                      <td className="px-5 py-4">
                        <span className="font-medium text-white text-sm">{item.venue}</span>
                      </td>
                      <td className="px-5 py-4 text-white/50 text-sm">{item.city}</td>
                      <td className="px-5 py-4 text-white/50 text-sm">{item.date}</td>
                      <td className="px-5 py-4 text-neon-cyan font-medium text-sm">{item.amount}</td>
                      <td className="px-5 py-4">
                        <Badge className={`text-xs border ${STATUS_CONFIG[item.status]?.cls || ""}`}>
                          {STATUS_CONFIG[item.status]?.label || item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {tab === "notifications" && (
          <div className="animate-fade-in max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="font-oswald font-bold text-2xl text-white">Уведомления</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-neon-pink/20 text-neon-pink rounded-lg font-medium border border-neon-pink/20">
                    {unreadCount} новых
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="flex items-center gap-2 px-4 py-2 glass text-white/50 hover:text-neon-cyan rounded-xl border border-white/10 text-sm transition-colors">
                  <Icon name="CheckCheck" size={14} />Прочитать все
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-20 glass rounded-2xl">
                <Icon name="BellOff" size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg font-oswald">Нет уведомлений</p>
                <p className="text-white/25 text-sm mt-1">Здесь будут появляться сообщения и запросы</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => {
                  const typeColor: Record<string, string> = {
                    message: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20",
                    booking: "text-neon-purple bg-neon-purple/10 border-neon-purple/20",
                    review: "text-neon-green bg-neon-green/10 border-neon-green/20",
                    tour: "text-neon-pink bg-neon-pink/10 border-neon-pink/20",
                    venue: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20",
                    system: "text-white/50 bg-white/5 border-white/10",
                  };
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markRead(n.id)}
                      className={`flex items-start gap-4 glass rounded-2xl p-4 cursor-pointer hover:bg-white/5 transition-all ${!n.isRead ? "border border-neon-purple/20" : ""}`}
                    >
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${typeColor[n.type] || typeColor.system}`}>
                        {n.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${!n.isRead ? "text-white" : "text-white/70"}`}>{n.title}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-white/25">
                              {new Date(n.createdAt).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {!n.isRead && <span className="w-2 h-2 bg-neon-purple rounded-full" />}
                          </div>
                        </div>
                        {n.body && <p className="text-xs text-white/40 mt-0.5">{n.body}</p>}
                        <p className="text-xs text-white/20 mt-1">
                          {new Date(n.createdAt).toLocaleDateString("ru", { day: "numeric", month: "long" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div className="animate-fade-in max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-oswald font-bold text-2xl text-white">Редактирование профиля</h2>
              {!editMode ? (
                <button onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2 glass text-white/60 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm">
                  <Icon name="Pencil" size={14} />Редактировать
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)}
                    className="px-4 py-2 glass text-white/50 rounded-xl border border-white/10 text-sm hover:text-white transition-colors">
                    Отмена
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                    {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
                    Сохранить
                  </button>
                </div>
              )}
            </div>

            <div className="glass rounded-2xl p-6 space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-oswald font-bold text-2xl text-white`}>
                  {user.avatar}
                </div>
                <div>
                  <p className="text-white font-medium">{user.name}</p>
                  <p className="text-white/40 text-sm">{user.email}</p>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                    {isVenue ? "Название площадки" : "Имя"}
                  </label>
                  {editMode ? (
                    <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 transition-colors text-sm" />
                  ) : (
                    <p className="text-white text-sm py-3 px-4 glass rounded-xl border border-white/5">{user.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Город</label>
                  {editMode ? (
                    <select value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 transition-colors text-sm appearance-none bg-transparent">
                      {CITIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                    </select>
                  ) : (
                    <p className="text-white text-sm py-3 px-4 glass rounded-xl border border-white/5">{user.city || "Не указан"}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Email</label>
                <p className="text-white/50 text-sm py-3 px-4 glass rounded-xl border border-white/5">{user.email}</p>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Роль</label>
                <div className="flex items-center gap-2 py-3 px-4 glass rounded-xl border border-white/5">
                  <Icon name={isVenue ? "Building2" : "Route"} size={15} className={isVenue ? "text-neon-cyan" : "text-neon-purple"} />
                  <span className="text-white text-sm">{isVenue ? "Концертная площадка" : "Организатор туров"}</span>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Смена пароля</label>
                <button className="flex items-center gap-2 px-4 py-2.5 glass text-white/60 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm">
                  <Icon name="Lock" size={14} />Изменить пароль
                </button>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <button onClick={logout}
                  className="flex items-center gap-2 text-neon-pink hover:text-white text-sm transition-colors">
                  <Icon name="LogOut" size={14} />Выйти из аккаунта
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <VenueSetupModal open={showVenueSetup} onClose={() => setShowVenueSetup(false)} onCreated={() => { loadMyVenues(); setShowVenueSetup(false); }} />
    </div>
  );
}
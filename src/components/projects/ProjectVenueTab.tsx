import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL, fmt } from "@/hooks/useProjects";
import { useAuth } from "@/context/AuthContext";

const CHAT_URL = "https://functions.poehali.dev/85035195-bd7b-44ce-b77c-db1255f711b5";

interface BookingTask {
  id: string;
  bookingId: string;
  projectId: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "done";
  sortOrder: number;
}

interface BookingInfo {
  id: string;
  venueId: string;
  venueName: string;
  projectId: string;
  projectTitle: string;
  eventDate: string;
  eventTime: string;
  artist: string;
  ageLimit: string;
  expectedGuests: number;
  status: string;
  rentalAmount: number | null;
  venueConditions: string;
  organizerId: string;
  venueUserId: string;
  conversationId: string;
  tasks: BookingTask[];
}

interface VenueOption {
  id: string;
  userId: string;
  name: string;
  city: string;
  venueType: string;
  capacity: number;
  priceFrom: number;
  photoUrl: string;
}

interface BookedDate { date: string; note: string; }

const TASK_STATUS_CONFIG = {
  pending:     { label: "Ожидает", cls: "text-white/50 bg-white/5 border-white/10", icon: "Circle" },
  in_progress: { label: "В работе", cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20", icon: "Clock" },
  done:        { label: "Готово", cls: "text-neon-green bg-neon-green/10 border-neon-green/20", icon: "CheckCircle2" },
} as const;

const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Ожидает ответа", cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20" },
  confirmed: { label: "Подтверждено площадкой", cls: "text-neon-green bg-neon-green/10 border-neon-green/20" },
  accepted:  { label: "Бронирование активно", cls: "text-neon-green bg-neon-green/10 border-neon-green/20" },
  rejected:  { label: "Отклонено", cls: "text-neon-pink bg-neon-pink/10 border-neon-pink/20" },
  cancelled: { label: "Отменено", cls: "text-white/40 bg-white/5 border-white/10" },
};

interface Props {
  projectId: string;
  onOpenChat?: (conversationId: string) => void;
  projectCity?: string;
  projectDateStart?: string;
  projectArtist?: string;
}

export default function ProjectVenueTab({ projectId, onOpenChat, projectCity = "", projectDateStart = "", projectArtist = "" }: Props) {
  const { user } = useAuth();

  // Бронирования
  const [bookings, setBookings] = useState<BookingInfo[]>([]);
  const [allBookings, setAllBookings] = useState<{ id: string; status: string; venueName: string; eventDate: string; conversationId?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  // Форма бронирования
  const [showBookForm, setShowBookForm] = useState(false);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venueSearch, setVenueSearch] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<VenueOption | null>(null);
  const [bookedDates, setBookedDates] = useState<BookedDate[]>([]);
  const [bookForm, setBookForm] = useState({
    eventDate: projectDateStart,
    eventTime: "",
    artist: projectArtist,
    ageLimit: "",
    expectedGuests: "",
  });
  const [bookError, setBookError] = useState("");
  const [bookSending, setBookSending] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bookRes = await fetch(`${PROJECTS_URL}?action=booking_by_project&project_id=${projectId}`);
      const bookData = await bookRes.json();
      setAllBookings(bookData.bookings || []);

      const confirmedBookings = (bookData.bookings || []).filter(
        (b: { status: string }) => b.status === "accepted" || b.status === "confirmed"
      );
      const detailed = await Promise.all(
        confirmedBookings.map(async (b: { id: string; conversationId?: string }) => {
          const det = await fetch(`${PROJECTS_URL}?action=booking_detail&booking_id=${b.id}`).then(r => r.json());
          const booking = det.booking || null;
          if (booking && !booking.conversationId && b.conversationId) {
            booking.conversationId = b.conversationId;
          }
          if (booking && !booking.conversationId) {
            fetch(`${PROJECTS_URL}?action=create_missing_chat`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId: booking.id }),
            }).then(r => r.json()).then(chatRes => {
              if (chatRes.conversationId) {
                setBookings(prev => prev.map(bk =>
                  bk.id === booking.id ? { ...bk, conversationId: chatRes.conversationId } : bk
                ));
              }
            }).catch(() => {});
          }
          return booking;
        })
      );
      setBookings(detailed.filter(Boolean));
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    fetch(`${CHAT_URL}?action=conversations&user_id=${user.id}`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, number> = {};
        (data.conversations || []).forEach((c: { id: string; unread: number }) => { map[c.id] = c.unread; });
        setUnreadMap(map);
      }).catch(() => {});
  }, [user]);

  const loadVenues = async () => {
    setVenuesLoading(true);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=venues_list${projectCity ? `&city=${encodeURIComponent(projectCity)}` : ""}`);
      const data = await res.json();
      setVenues(data.venues || []);
    } catch { setVenues([]); }
    finally { setVenuesLoading(false); }
  };

  const loadBookedDates = async (venueId: string) => {
    try {
      const res = await fetch(`${PROJECTS_URL}?action=booked_dates&venue_id=${venueId}`);
      const data = await res.json();
      setBookedDates(data.bookedDates || []);
    } catch { setBookedDates([]); }
  };

  const handleSelectVenue = (v: VenueOption) => {
    setSelectedVenue(v);
    loadBookedDates(v.id);
  };

  const openBookForm = () => {
    setShowBookForm(true);
    setBookSuccess(false);
    setBookError("");
    setBookForm({ eventDate: projectDateStart, eventTime: "", artist: projectArtist, ageLimit: "", expectedGuests: "" });
    loadVenues();
  };

  const sendBookingRequest = async () => {
    if (!user || !selectedVenue) { setBookError("Выберите площадку"); return; }
    if (!bookForm.eventDate) { setBookError("Укажите дату мероприятия"); return; }
    const isDateBusy = bookedDates.some(d => d.date === bookForm.eventDate);
    if (isDateBusy) { setBookError("Эта дата уже занята на площадке"); return; }
    setBookSending(true); setBookError("");
    try {
      const res = await fetch(`${PROJECTS_URL}?action=request_booking`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          venueId: selectedVenue.id,
          organizerId: user.id,
          venueUserId: selectedVenue.userId,
          eventDate: bookForm.eventDate,
          eventTime: bookForm.eventTime,
          artist: bookForm.artist,
          ageLimit: bookForm.ageLimit,
          expectedGuests: Number(bookForm.expectedGuests) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setBookError(data.error || "Ошибка"); return; }
      setBookSuccess(true);
      setShowBookForm(false);
      load();
    } catch { setBookError("Ошибка соединения"); }
    finally { setBookSending(false); }
  };

  const updateTask = async (taskId: string, status: "pending" | "in_progress" | "done") => {
    setUpdatingTask(taskId);
    await fetch(`${PROJECTS_URL}?action=update_task`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status }),
    });
    setUpdatingTask(null);
    setBookings(prev => prev.map(b => ({
      ...b,
      tasks: b.tasks.map(t => t.id === taskId ? { ...t, status } : t),
    })));
  };

  const dateIsBusy = bookedDates.some(d => d.date === bookForm.eventDate);
  const filteredVenues = venues.filter(v => !venueSearch || v.name.toLowerCase().includes(venueSearch.toLowerCase()));

  if (loading) return (
    <div className="space-y-3 animate-fade-in">
      {[1, 2].map(i => <div key={i} className="glass rounded-2xl h-24 animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Кнопка добавления площадки — показываем всегда */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-oswald font-bold text-white text-lg">Площадки проекта</h3>
          {allBookings.length > 0 && (
            <p className="text-white/40 text-xs mt-0.5">{allBookings.length} запросов · {bookings.length} подтверждено</p>
          )}
        </div>
        <button
          onClick={openBookForm}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 transition-opacity"
        >
          <Icon name="Plus" size={15} />Забронировать площадку
        </button>
      </div>

      {/* Форма бронирования */}
      {showBookForm && (
        <div className="glass-strong rounded-2xl border border-neon-purple/30 overflow-hidden animate-scale-in">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h4 className="font-oswald font-bold text-white flex items-center gap-2">
              <Icon name="Building2" size={16} className="text-neon-purple" />
              Выбор площадки и дата
            </h4>
            <button onClick={() => setShowBookForm(false)} className="text-white/30 hover:text-white transition-colors">
              <Icon name="X" size={16} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Поиск площадок */}
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                Площадка {projectCity && <span className="text-neon-cyan">· {projectCity}</span>}
              </label>
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 border border-white/10 mb-3">
                <Icon name="Search" size={14} className="text-white/30 shrink-0" />
                <input
                  type="text" placeholder="Поиск по названию..."
                  value={venueSearch} onChange={e => setVenueSearch(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm"
                />
              </div>

              {venuesLoading ? (
                <div className="space-y-2">{[1, 2].map(i => <div key={i} className="glass rounded-xl h-16 animate-pulse" />)}</div>
              ) : filteredVenues.length === 0 ? (
                <div className="text-center py-6 glass rounded-xl">
                  <Icon name="Building2" size={28} className="text-white/15 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">Площадок не найдено</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredVenues.map(v => {
                    const isSelected = selectedVenue?.id === v.id;
                    return (
                      <div key={v.id} onClick={() => handleSelectVenue(v)}
                        className={`glass rounded-xl p-3.5 cursor-pointer border transition-all ${isSelected ? "border-neon-purple/60 bg-neon-purple/10" : "border-white/10 hover:border-white/25"}`}>
                        <div className="flex items-center gap-3">
                          {v.photoUrl ? (
                            <img src={v.photoUrl} alt={v.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center shrink-0">
                              <Icon name="Building2" size={18} className="text-neon-cyan/50" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-oswald font-semibold text-white text-sm">{v.name}</span>
                              {isSelected && <Icon name="CheckCircle" size={14} className="text-neon-purple shrink-0" />}
                            </div>
                            <div className="flex items-center gap-3 text-white/40 text-xs mt-0.5">
                              <span>{v.venueType}</span>
                              <span>{v.capacity.toLocaleString()} чел.</span>
                              {v.priceFrom > 0 && <span>от {v.priceFrom.toLocaleString()} ₽</span>}
                            </div>
                          </div>
                        </div>
                        {isSelected && bookedDates.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <p className="text-[10px] text-white/40 mb-1.5 flex items-center gap-1"><Icon name="CalendarX" size={10} />Занято:</p>
                            <div className="flex flex-wrap gap-1">
                              {bookedDates.slice(0, 8).map(b => (
                                <span key={b.date} className="text-[10px] px-1.5 py-0.5 bg-neon-pink/10 text-neon-pink border border-neon-pink/20 rounded">{b.date}</span>
                              ))}
                              {bookedDates.length > 8 && <span className="text-[10px] text-white/30">+{bookedDates.length - 8}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Детали бронирования */}
            {selectedVenue && (
              <div className="space-y-3 pt-2 border-t border-white/10">
                <label className="text-xs text-white/40 uppercase tracking-wider block">Детали мероприятия</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Дата *</label>
                    <input type="date" value={bookForm.eventDate}
                      onChange={e => setBookForm(f => ({ ...f, eventDate: e.target.value }))}
                      className={`w-full glass rounded-xl px-3 py-2 text-white text-sm border outline-none bg-transparent ${dateIsBusy ? "border-neon-pink/50" : "border-white/10 focus:border-neon-purple/50"}`}
                    />
                    {dateIsBusy && <p className="text-neon-pink text-xs mt-1 flex items-center gap-1"><Icon name="AlertCircle" size={10} />Дата занята</p>}
                    {bookForm.eventDate && !dateIsBusy && (
                      <p className="text-neon-green text-xs mt-1 flex items-center gap-1"><Icon name="CheckCircle" size={10} />Дата свободна</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Время начала</label>
                    <input type="time" value={bookForm.eventTime}
                      onChange={e => setBookForm(f => ({ ...f, eventTime: e.target.value }))}
                      className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 focus:border-neon-purple/50 outline-none bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Артист</label>
                    <input type="text" value={bookForm.artist} placeholder="Имя артиста"
                      onChange={e => setBookForm(f => ({ ...f, artist: e.target.value }))}
                      className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 focus:border-neon-purple/50 outline-none placeholder:text-white/25"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Возраст, +</label>
                    <input type="text" value={bookForm.ageLimit} placeholder="18"
                      onChange={e => setBookForm(f => ({ ...f, ageLimit: e.target.value }))}
                      className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 focus:border-neon-purple/50 outline-none placeholder:text-white/25"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-white/40 mb-1 block">Ожидаемых гостей</label>
                    <input type="number" value={bookForm.expectedGuests} placeholder="500"
                      onChange={e => setBookForm(f => ({ ...f, expectedGuests: e.target.value }))}
                      className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 focus:border-neon-purple/50 outline-none placeholder:text-white/25"
                    />
                  </div>
                </div>
              </div>
            )}

            {bookError && (
              <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-4 py-3">
                <Icon name="AlertCircle" size={15} />{bookError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={sendBookingRequest}
                disabled={bookSending || !selectedVenue || !bookForm.eventDate || dateIsBusy}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {bookSending ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Send" size={14} />}
                Отправить запрос
              </button>
              <button onClick={() => setShowBookForm(false)}
                className="px-4 py-2.5 glass rounded-xl text-white/50 hover:text-white text-sm transition-colors border border-white/10">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Успех */}
      {bookSuccess && (
        <div className="glass rounded-2xl p-4 border border-neon-green/30 flex items-center gap-3 animate-fade-in">
          <Icon name="CheckCircle2" size={20} className="text-neon-green shrink-0" />
          <div>
            <p className="text-neon-green font-medium text-sm">Запрос отправлен!</p>
            <p className="text-white/40 text-xs">Площадка получила уведомление и ответит в ближайшее время</p>
          </div>
        </div>
      )}

      {/* Все запросы (pending/rejected) */}
      {allBookings.filter(b => !["accepted", "confirmed"].includes(b.status)).length > 0 && (
        <div className="space-y-2">
          <p className="text-white/40 text-xs uppercase tracking-wider">Активные запросы</p>
          {allBookings.filter(b => !["accepted", "confirmed"].includes(b.status)).map(b => {
            const st = BOOKING_STATUS[b.status] || { label: b.status, cls: "text-white/40 bg-white/5 border-white/10" };
            return (
              <div key={b.id} className="glass rounded-xl p-4 border border-white/8 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-medium">{b.venueName}</p>
                  <p className="text-white/40 text-xs">{b.eventDate}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg border ${st.cls}`}>{st.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Пустое состояние */}
      {bookings.length === 0 && allBookings.length === 0 && !showBookForm && (
        <div className="glass rounded-2xl p-10 text-center">
          <Icon name="Building2" size={36} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Площадка ещё не выбрана</p>
          <p className="text-white/25 text-xs mt-1 mb-4">Нажмите «Забронировать площадку» чтобы отправить запрос</p>
        </div>
      )}

      {/* Подтверждённые бронирования */}
      {bookings.map(booking => {
        const doneTasks = booking.tasks.filter(t => t.status === "done").length;
        const totalTasks = booking.tasks.length;
        const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        return (
          <div key={booking.id} className="glass rounded-2xl overflow-hidden border border-neon-purple/10">
            <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-oswald font-bold text-white text-lg flex items-center gap-2">
                  <Icon name="Building2" size={16} className="text-neon-purple" />
                  {booking.venueName}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-white/40">
                  <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />
                    {booking.eventDate}{booking.eventTime ? ` ${booking.eventTime}` : ""}
                  </span>
                  {booking.artist && <span className="flex items-center gap-1"><Icon name="Music" size={11} />{booking.artist}</span>}
                  {booking.rentalAmount !== null && (
                    <span className="flex items-center gap-1 text-neon-green font-medium">
                      <Icon name="Banknote" size={11} />Аренда: {fmt(booking.rentalAmount)} ₽
                    </span>
                  )}
                </div>
                {booking.venueConditions && (
                  <p className="text-white/30 text-xs mt-1.5 line-clamp-2">{booking.venueConditions}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {booking.conversationId && onOpenChat && (
                  <button
                    onClick={() => onOpenChat(booking.conversationId)}
                    className="relative flex items-center gap-1.5 px-3 py-1.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 rounded-lg text-xs hover:bg-neon-cyan/20 transition-colors"
                  >
                    <Icon name="MessageCircle" size={13} />Чат
                    {(unreadMap[booking.conversationId] || 0) > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neon-pink rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                        {unreadMap[booking.conversationId] > 9 ? "9+" : unreadMap[booking.conversationId]}
                      </span>
                    )}
                  </button>
                )}
                <span className="text-xs text-white/30">{doneTasks}/{totalTasks} задач</span>
              </div>
            </div>

            {totalTasks > 0 && (
              <div className="px-5 py-3 border-b border-white/5">
                <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
                  <span>Прогресс организации</span>
                  <span className={progress === 100 ? "text-neon-green font-medium" : ""}>{progress}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-neon-green" : "bg-neon-purple"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {totalTasks > 0 && (
              <div className="divide-y divide-white/5">
                {booking.tasks.map(task => {
                  const cfg = TASK_STATUS_CONFIG[task.status];
                  return (
                    <div key={task.id} className="px-5 py-3.5 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${task.status === "done" ? "line-through text-white/40" : "text-white"}`}>
                            {task.title}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-lg border ${cfg.cls}`}>
                            <Icon name={cfg.icon} size={10} className="inline mr-1" />{cfg.label}
                          </span>
                        </div>
                        {task.description && <p className="text-white/30 text-xs mt-0.5">{task.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(["pending", "in_progress", "done"] as const).map(s => (
                          <button key={s} disabled={task.status === s || updatingTask === task.id}
                            onClick={() => updateTask(task.id, s)} title={TASK_STATUS_CONFIG[s].label}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all text-xs disabled:cursor-default
                              ${task.status === s ? TASK_STATUS_CONFIG[s].cls : "border-white/10 text-white/20 hover:text-white/60 hover:border-white/20"}`}>
                            {updatingTask === task.id && task.status !== s
                              ? <Icon name="Loader2" size={11} className="animate-spin" />
                              : <Icon name={TASK_STATUS_CONFIG[s].icon} size={11} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { BOOKING_DATA_URL, BOOKING_TASKS_URL, BOOKING_REQUESTS_URL } from "@/lib/bookingUrls";
import { useAuth } from "@/context/AuthContext";
import VenueBookingForm from "./VenueBookingForm";
import ConfirmedBookingCard from "./ConfirmedBookingCard";
import { BOOKING_STATUS, type BookingInfo, type VenueOption, type BookedDate, type BookForm } from "./venueTabTypes";

const CHAT_URL = "https://functions.poehali.dev/85035195-bd7b-44ce-b77c-db1255f711b5";

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
  const [allBookings, setAllBookings] = useState<{ id: string; status: string; venueName: string; eventDate: string; eventTime?: string; rentalAmount?: number | null; venueConditions?: string; conversationId?: string }[]>([]);
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
  const [bookForm, setBookForm] = useState<BookForm>({
    eventDate: projectDateStart,
    eventTime: "",
    artist: projectArtist,
    ageLimit: "",
    expectedGuests: "",
  });
  const [bookError, setBookError] = useState("");
  const [bookSending, setBookSending] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);

  // Модалка «Принять условия» площадки
  const [acceptModal, setAcceptModal] = useState<{ id: string; venueName: string; eventDate: string; eventTime: string; rentalAmount: number | null; venueConditions: string } | null>(null);
  const [acceptSaving, setAcceptSaving] = useState<"accepted" | "cancelled" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bookRes = await fetch(`${BOOKING_DATA_URL}?action=booking_by_project&project_id=${projectId}`);
      const bookData = await bookRes.json();
      setAllBookings(bookData.bookings || []);

      const confirmedBookings = (bookData.bookings || []).filter(
        (b: { status: string }) => b.status === "accepted" || b.status === "confirmed"
      );
      const detailed = await Promise.all(
        confirmedBookings.map(async (b: { id: string; conversationId?: string }) => {
          const det = await fetch(`${BOOKING_DATA_URL}?action=booking_detail&booking_id=${b.id}`).then(r => r.json());
          const booking = det.booking || null;
          if (booking && !booking.conversationId && b.conversationId) {
            booking.conversationId = b.conversationId;
          }
          if (booking && !booking.conversationId) {
            fetch(`${BOOKING_DATA_URL}?action=create_missing_chat`, {
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
      const res = await fetch(`${BOOKING_DATA_URL}?action=venues_list${projectCity ? `&city=${encodeURIComponent(projectCity)}` : ""}`);
      const data = await res.json();
      setVenues(data.venues || []);
    } catch { setVenues([]); }
    finally { setVenuesLoading(false); }
  };

  const loadBookedDates = async (venueId: string) => {
    try {
      const res = await fetch(`${BOOKING_DATA_URL}?action=booked_dates&venue_id=${venueId}`);
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
      const res = await fetch(`${BOOKING_REQUESTS_URL}?action=request_booking`, {
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

  const handleOrganizerRespond = async (bookingId: string, response: "accepted" | "cancelled") => {
    setAcceptSaving(response);
    await fetch(`${BOOKING_REQUESTS_URL}?action=organizer_respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, response, organizerName: user?.name || "Организатор" }),
    });
    setAcceptSaving(null);
    setAcceptModal(null);
    load();
  };

  const updateTask = async (taskId: string, status: "pending" | "in_progress" | "done") => {
    setUpdatingTask(taskId);
    await fetch(`${BOOKING_TASKS_URL}?action=update_task`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status }),
    });
    setUpdatingTask(null);
    setBookings(prev => prev.map(b => ({
      ...b,
      tasks: b.tasks.map(t => t.id === taskId ? { ...t, status } : t),
    })));
  };

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
        <VenueBookingForm
          projectCity={projectCity}
          venues={venues}
          venuesLoading={venuesLoading}
          venueSearch={venueSearch}
          selectedVenue={selectedVenue}
          bookedDates={bookedDates}
          bookForm={bookForm}
          bookError={bookError}
          bookSending={bookSending}
          onSearchChange={setVenueSearch}
          onSelectVenue={handleSelectVenue}
          onBookFormChange={setBookForm}
          onSend={sendBookingRequest}
          onClose={() => setShowBookForm(false)}
        />
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

      {/* Бронирования, ожидающие принятия условий организатором */}
      {allBookings.filter(b => b.status === "confirmed").length > 0 && (
        <div className="space-y-2">
          <p className="text-white/40 text-xs uppercase tracking-wider flex items-center gap-2">
            <Icon name="Bell" size={12} className="text-neon-green" />
            Ожидают вашего решения
          </p>
          {allBookings.filter(b => b.status === "confirmed").map(b => (
            <div key={b.id} className="glass rounded-xl p-4 border border-neon-green/30 bg-neon-green/5 flex items-center justify-between gap-3">
              <div>
                <p className="text-white text-sm font-medium">{b.venueName}</p>
                <p className="text-white/40 text-xs">{b.eventDate}{b.eventDate && " · "}<span className="text-neon-green">Площадка подтвердила дату</span></p>
              </div>
              <button
                onClick={() => {
                  setAcceptModal({
                    id: b.id,
                    venueName: b.venueName,
                    eventDate: b.eventDate,
                    eventTime: b.eventTime || "",
                    rentalAmount: b.rentalAmount ?? null,
                    venueConditions: b.venueConditions || "",
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-green/20 text-neon-green border border-neon-green/30 rounded-lg text-xs font-semibold hover:bg-neon-green/30 transition-colors shrink-0"
              >
                <Icon name="CheckCircle" size={13} />Рассмотреть условия
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Все остальные запросы (pending/rejected/cancelled) */}
      {allBookings.filter(b => !["accepted", "confirmed"].includes(b.status)).length > 0 && (
        <div className="space-y-2">
          <p className="text-white/40 text-xs uppercase tracking-wider">Запросы</p>
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

      {/* Модалка принятия условий — через portal чтобы всегда быть по центру экрана */}
      {acceptModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAcceptModal(null)} />
          <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl p-6 border border-neon-green/20 animate-scale-in">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green to-transparent rounded-t-2xl" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-oswald font-bold text-white text-lg flex items-center gap-2">
                <Icon name="CalendarCheck" size={18} className="text-neon-green" />Площадка подтвердила дату
              </h3>
              <button onClick={() => setAcceptModal(null)} className="text-white/30 hover:text-white transition-colors">
                <Icon name="X" size={16} />
              </button>
            </div>
            <div className="glass rounded-xl p-4 space-y-2 mb-4 text-sm">
              <div className="flex justify-between"><span className="text-white/50">Площадка</span><span className="text-white font-medium">{acceptModal.venueName}</span></div>
              <div className="flex justify-between"><span className="text-white/50">Дата</span><span className="text-neon-cyan font-medium">{acceptModal.eventDate}{acceptModal.eventTime ? ` ${acceptModal.eventTime}` : ""}</span></div>
              {acceptModal.rentalAmount !== null && (
                <div className="flex justify-between"><span className="text-white/50">Сумма аренды</span><span className="text-neon-green font-oswald font-bold text-base">{acceptModal.rentalAmount?.toLocaleString("ru-RU")} ₽</span></div>
              )}
              {acceptModal.venueConditions && (
                <div><span className="text-white/50 block mb-1">Условия</span><span className="text-white/80">{acceptModal.venueConditions}</span></div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleOrganizerRespond(acceptModal.id, "cancelled")}
                disabled={acceptSaving !== null}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-pink/10 text-neon-pink border border-neon-pink/20 rounded-xl hover:bg-neon-pink/20 text-sm disabled:opacity-50 transition-colors"
              >
                {acceptSaving === "cancelled" ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="XCircle" size={14} />}Отменить
              </button>
              <button
                onClick={() => handleOrganizerRespond(acceptModal.id, "accepted")}
                disabled={acceptSaving !== null}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-green/20 text-neon-green border border-neon-green/30 rounded-xl hover:bg-neon-green/30 text-sm font-oswald font-semibold disabled:opacity-50 transition-colors"
              >
                {acceptSaving === "accepted" ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}Принять условия
              </button>
            </div>
          </div>
        </div>,
        document.body
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
      {bookings.map(booking => (
        <ConfirmedBookingCard
          key={booking.id}
          booking={booking}
          unreadMap={unreadMap}
          updatingTask={updatingTask}
          onOpenChat={onOpenChat}
          onUpdateTask={updateTask}
        />
      ))}
    </div>
  );
}
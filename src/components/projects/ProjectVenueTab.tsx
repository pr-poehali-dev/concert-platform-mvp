import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL } from "@/hooks/useProjects";
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

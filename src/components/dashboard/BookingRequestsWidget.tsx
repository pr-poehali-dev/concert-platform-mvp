import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { PROJECTS_URL } from "@/hooks/useProjects";

interface Booking {
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
  organizerName?: string;
}

interface VenueRespondModalProps {
  booking: Booking;
  onClose: () => void;
  onSubmit: (bookingId: string, response: "confirmed" | "rejected", amount: number | null, conditions: string) => Promise<void>;
}

function VenueRespondModal({ booking, onClose, onSubmit }: VenueRespondModalProps) {
  const [rentalAmount, setRentalAmount] = useState("");
  const [conditions, setConditions] = useState("");
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<"confirmed" | "rejected" | null>(null);

  const handle = async (resp: "confirmed" | "rejected") => {
    setAction(resp);
    setSaving(true);
    await onSubmit(booking.id, resp, resp === "confirmed" && rentalAmount ? Number(rentalAmount) : null, conditions);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl p-6 border border-neon-purple/20 animate-scale-in">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent rounded-t-2xl"/>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-oswald font-bold text-white text-lg flex items-center gap-2">
            <Icon name="CalendarCheck" size={18} className="text-neon-purple"/>Запрос бронирования
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><Icon name="X" size={16}/></button>
        </div>

        {/* Детали */}
        <div className="glass rounded-xl p-4 space-y-2 mb-4 text-sm">
          <div className="flex justify-between"><span className="text-white/50">Проект</span><span className="text-white font-medium">{booking.projectTitle}</span></div>
          {booking.organizerName && <div className="flex justify-between"><span className="text-white/50">Организатор</span><span className="text-white">{booking.organizerName}</span></div>}
          <div className="flex justify-between"><span className="text-white/50">Дата</span><span className="text-neon-cyan font-medium">{booking.eventDate}{booking.eventTime ? ` ${booking.eventTime}` : ""}</span></div>
          {booking.artist && <div className="flex justify-between"><span className="text-white/50">Артист</span><span className="text-white">{booking.artist}</span></div>}
          {booking.ageLimit && <div className="flex justify-between"><span className="text-white/50">Возраст</span><span className="text-white">{booking.ageLimit}+</span></div>}
          {booking.expectedGuests > 0 && <div className="flex justify-between"><span className="text-white/50">Гостей</span><span className="text-white">{booking.expectedGuests.toLocaleString()}</span></div>}
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Сумма аренды (₽)</label>
            <input type="number" value={rentalAmount} onChange={e=>setRentalAmount(e.target.value)} placeholder="Укажите стоимость аренды"
              className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm"/>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Условия и комментарий</label>
            <textarea value={conditions} onChange={e=>setConditions(e.target.value)} rows={3}
              placeholder="Технический райдер, требования, особые условия..."
              className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm resize-none"/>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={()=>handle("rejected")} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-pink/10 text-neon-pink border border-neon-pink/20 rounded-xl hover:bg-neon-pink/20 text-sm disabled:opacity-50 transition-colors">
            {saving && action==="rejected" ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="XCircle" size={14}/>}Отклонить
          </button>
          <button onClick={()=>handle("confirmed")} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-green/20 text-neon-green border border-neon-green/30 rounded-xl hover:bg-neon-green/30 text-sm font-oswald font-semibold disabled:opacity-50 transition-colors">
            {saving && action==="confirmed" ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="CheckCircle" size={14}/>}Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}

interface OrganizerRespondModalProps {
  booking: Booking;
  onClose: () => void;
  onSubmit: (bookingId: string, response: "accepted" | "cancelled") => Promise<void>;
}

function OrganizerRespondModal({ booking, onClose, onSubmit }: OrganizerRespondModalProps) {
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<"accepted" | "cancelled" | null>(null);

  const handle = async (resp: "accepted" | "cancelled") => {
    setAction(resp);
    setSaving(true);
    await onSubmit(booking.id, resp);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl p-6 border border-neon-green/20 animate-scale-in">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green to-transparent rounded-t-2xl"/>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-oswald font-bold text-white text-lg flex items-center gap-2">
            <Icon name="CalendarCheck" size={18} className="text-neon-green"/>Площадка подтвердила дату
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><Icon name="X" size={16}/></button>
        </div>

        <div className="glass rounded-xl p-4 space-y-2 mb-4 text-sm">
          <div className="flex justify-between"><span className="text-white/50">Площадка</span><span className="text-white font-medium">{booking.venueName}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Дата</span><span className="text-neon-cyan font-medium">{booking.eventDate}{booking.eventTime ? ` ${booking.eventTime}` : ""}</span></div>
          {booking.rentalAmount !== null && (
            <div className="flex justify-between"><span className="text-white/50">Сумма аренды</span><span className="text-neon-green font-oswald font-bold text-base">{booking.rentalAmount.toLocaleString("ru-RU")} ₽</span></div>
          )}
          {booking.venueConditions && (
            <div><span className="text-white/50 block mb-1">Условия</span><span className="text-white/80">{booking.venueConditions}</span></div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={()=>handle("cancelled")} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-pink/10 text-neon-pink border border-neon-pink/20 rounded-xl hover:bg-neon-pink/20 text-sm disabled:opacity-50 transition-colors">
            {saving && action==="cancelled" ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="XCircle" size={14}/>}Отменить
          </button>
          <button onClick={()=>handle("accepted")} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-green/20 text-neon-green border border-neon-green/30 rounded-xl hover:bg-neon-green/30 text-sm font-oswald font-semibold disabled:opacity-50 transition-colors">
            {saving && action==="accepted" ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="Check" size={14}/>}Принять условия
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookingRequestsWidget() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [modalType, setModalType] = useState<"venue" | "organizer" | null>(null);

  const isVenue = user?.role === "venue";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const action = isVenue ? "bookings_for_venue" : "booking_by_project";
      const param = isVenue ? `venue_user_id=${user.id}` : "";
      // Для организатора грузим все проекты сначала, потом бронирования
      // Упрощённо: загружаем по venue_user_id или all pending confirmed
      const url = isVenue
        ? `${PROJECTS_URL}?action=bookings_for_venue&venue_user_id=${user.id}`
        : `${PROJECTS_URL}?action=bookings_for_organizer&organizer_id=${user.id}`;
      const res = await fetch(url);
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const venueRespond = async (bookingId: string, response: "confirmed" | "rejected", rentalAmount: number | null, conditions: string) => {
    await fetch(`${PROJECTS_URL}?action=venue_respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, response, rentalAmount, venueConditions: conditions }),
    });
    setActiveBooking(null); setModalType(null);
    load();
  };

  const organizerRespond = async (bookingId: string, response: "accepted" | "cancelled") => {
    await fetch(`${PROJECTS_URL}?action=organizer_respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, response, organizerName: user?.name || "Организатор" }),
    });
    setActiveBooking(null); setModalType(null);
    load();
  };

  // Фильтруем — показываем только те, где нужно действие
  const actionNeeded = bookings.filter(b =>
    (isVenue && b.status === "pending") ||
    (!isVenue && b.status === "confirmed")
  );
  const others = bookings.filter(b => !actionNeeded.find(a => a.id === b.id));

  const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    pending:   { label: "Ожидает ответа площадки", cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20" },
    confirmed: { label: "Площадка подтвердила — ожидает организатора", cls: "text-neon-green bg-neon-green/10 border-neon-green/20" },
    accepted:  { label: "Бронирование подтверждено", cls: "text-neon-green bg-neon-green/10 border-neon-green/20" },
    rejected:  { label: "Отклонено площадкой", cls: "text-neon-pink bg-neon-pink/10 border-neon-pink/20" },
    cancelled: { label: "Отменено организатором", cls: "text-white/40 bg-white/5 border-white/10" },
  };

  if (loading) return (
    <div className="space-y-2">{[1,2].map(i=><div key={i} className="glass rounded-2xl h-20 animate-pulse"/>)}</div>
  );

  if (bookings.length === 0) return null;

  const BookingCard = ({ b, action }: { b: Booking; action?: boolean }) => {
    const st = STATUS_LABEL[b.status] || { label: b.status, cls: "text-white/40 bg-white/5 border-white/10" };
    return (
      <div className={`glass rounded-2xl p-4 border ${action ? "border-neon-purple/30" : "border-white/5"}`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-white font-medium text-sm">{isVenue ? b.projectTitle : b.venueName}</p>
            <p className="text-white/40 text-xs mt-0.5">
              {b.eventDate}{b.eventTime ? ` ${b.eventTime}` : ""}
              {b.artist ? ` · ${b.artist}` : ""}
              {b.ageLimit ? ` · ${b.ageLimit}+` : ""}
              {b.expectedGuests > 0 ? ` · ${b.expectedGuests.toLocaleString()} гостей` : ""}
            </p>
            {b.organizerName && <p className="text-white/30 text-xs">Организатор: {b.organizerName}</p>}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-lg border shrink-0 ${st.cls}`}>{st.label}</span>
        </div>
        {b.rentalAmount !== null && (
          <p className="text-neon-green text-xs font-medium">Аренда: {b.rentalAmount.toLocaleString("ru-RU")} ₽{b.venueConditions ? ` · ${b.venueConditions}` : ""}</p>
        )}
        {action && (
          <button
            onClick={()=>{ setActiveBooking(b); setModalType(isVenue ? "venue" : "organizer"); }}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-xs font-oswald font-semibold hover:opacity-90 transition-opacity">
            <Icon name="ArrowRight" size={13}/>
            {isVenue ? "Ответить на запрос" : "Рассмотреть условия"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 mb-6">
      <h3 className="font-oswald font-semibold text-white flex items-center gap-2">
        <Icon name="CalendarClock" size={16} className="text-neon-purple"/>
        {isVenue ? "Запросы на бронирование" : "Бронирования площадок"}
      </h3>

      {actionNeeded.length > 0 && (
        <div className="space-y-2">
          {actionNeeded.map(b => <BookingCard key={b.id} b={b} action/>)}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-2">
          {others.map(b => <BookingCard key={b.id} b={b}/>)}
        </div>
      )}

      {activeBooking && modalType === "venue" && (
        <VenueRespondModal booking={activeBooking} onClose={()=>{setActiveBooking(null);setModalType(null);}} onSubmit={venueRespond}/>
      )}
      {activeBooking && modalType === "organizer" && (
        <OrganizerRespondModal booking={activeBooking} onClose={()=>{setActiveBooking(null);setModalType(null);}} onSubmit={organizerRespond}/>
      )}
    </div>
  );
}
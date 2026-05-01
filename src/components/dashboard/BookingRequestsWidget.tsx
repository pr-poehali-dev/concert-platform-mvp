import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { BOOKING_DATA_URL, BOOKING_REQUESTS_URL } from "@/lib/bookingUrls";

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
  conversationId?: string;
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
          <button onClick={onClose} className="text-white/55 hover:text-white transition-colors"><Icon name="X" size={16}/></button>
        </div>

        {/* Детали */}
        <div className="glass rounded-xl p-4 space-y-2 mb-4 text-sm">
          <div className="flex justify-between"><span className="text-white/70">Проект</span><span className="text-white font-medium">{booking.projectTitle}</span></div>
          {booking.organizerName && <div className="flex justify-between"><span className="text-white/70">Организатор</span><span className="text-white">{booking.organizerName}</span></div>}
          <div className="flex justify-between"><span className="text-white/70">Дата</span><span className="text-neon-cyan font-medium">{booking.eventDate}{booking.eventTime ? ` ${booking.eventTime}` : ""}</span></div>
          {booking.artist && <div className="flex justify-between"><span className="text-white/70">Артист</span><span className="text-white">{booking.artist}</span></div>}
          {booking.ageLimit && <div className="flex justify-between"><span className="text-white/70">Возраст</span><span className="text-white">{booking.ageLimit}+</span></div>}
          {booking.expectedGuests > 0 && <div className="flex justify-between"><span className="text-white/70">Гостей</span><span className="text-white">{booking.expectedGuests.toLocaleString()}</span></div>}
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-white/65 uppercase tracking-wider mb-1.5 block">Сумма аренды (₽)</label>
            <input type="number" value={rentalAmount} onChange={e=>setRentalAmount(e.target.value)} placeholder="Укажите стоимость аренды"
              className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm"/>
          </div>
          <div>
            <label className="text-xs text-white/65 uppercase tracking-wider mb-1.5 block">Условия и комментарий</label>
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
          <button onClick={onClose} className="text-white/55 hover:text-white transition-colors"><Icon name="X" size={16}/></button>
        </div>

        <div className="glass rounded-xl p-4 space-y-2 mb-4 text-sm">
          <div className="flex justify-between"><span className="text-white/70">Площадка</span><span className="text-white font-medium">{booking.venueName}</span></div>
          <div className="flex justify-between"><span className="text-white/70">Дата</span><span className="text-neon-cyan font-medium">{booking.eventDate}{booking.eventTime ? ` ${booking.eventTime}` : ""}</span></div>
          {booking.rentalAmount !== null && (
            <div className="flex justify-between"><span className="text-white/70">Сумма аренды</span><span className="text-neon-green font-oswald font-bold text-base">{booking.rentalAmount.toLocaleString("ru-RU")} ₽</span></div>
          )}
          {booking.venueConditions && (
            <div><span className="text-white/70 block mb-1">Условия</span><span className="text-white/80">{booking.venueConditions}</span></div>
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

const CHAT_URL = "https://functions.poehali.dev/85035195-bd7b-44ce-b77c-db1255f711b5";

export default function BookingRequestsWidget({ onNavigate, onPendingCount }: { onNavigate?: (page: string) => void; onPendingCount?: (count: number) => void }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [modalType, setModalType] = useState<"venue" | "organizer" | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  const isVenue = user?.role === "venue";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const url = isVenue
        ? `${BOOKING_DATA_URL}?action=bookings_for_venue&venue_user_id=${user.id}`
        : `${BOOKING_DATA_URL}?action=bookings_for_organizer&organizer_id=${user.id}`;
      const res = await fetch(url);
      const data = await res.json();
      const all = data.bookings || [];
      setBookings(all);
      if (isVenue && onPendingCount) {
        onPendingCount(all.filter((b: Booking) => b.status === "pending").length);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

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

  const venueRespond = async (bookingId: string, response: "confirmed" | "rejected", rentalAmount: number | null, conditions: string) => {
    await fetch(`${BOOKING_REQUESTS_URL}?action=venue_respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, response, rentalAmount, venueConditions: conditions, venueUserName: user?.name || "Площадка" }),
    });
    setActiveBooking(null); setModalType(null);
    load();
  };

  const organizerRespond = async (bookingId: string, response: "accepted" | "cancelled") => {
    await fetch(`${BOOKING_REQUESTS_URL}?action=organizer_respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, response, organizerName: user?.name || "Организатор" }),
    });
    setActiveBooking(null); setModalType(null);
    load();
  };

  const STATUS_LABEL: Record<string, { label: string; cls: string; icon: string }> = {
    pending:   { label: "Ожидает вашего ответа",           icon: "Clock",       cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20" },
    confirmed: { label: "Ожидает подтверждения организатора", icon: "Hourglass", cls: "text-neon-purple bg-neon-purple/10 border-neon-purple/20" },
    accepted:  { label: "Подтверждено обеими сторонами",   icon: "CheckCircle2",cls: "text-neon-green bg-neon-green/10 border-neon-green/20" },
    rejected:  { label: "Отклонено вами",                  icon: "XCircle",     cls: "text-neon-pink bg-neon-pink/10 border-neon-pink/20" },
    cancelled: { label: "Отменено организатором",          icon: "Ban",         cls: "text-white/65 bg-white/5 border-white/10" },
  };

  // Для площадки — все запросы. Для организатора — только где нужно действие
  const actionNeeded = bookings.filter(b =>
    (isVenue && b.status === "pending") ||
    (!isVenue && b.status === "confirmed")
  );
  const others = bookings.filter(b => !actionNeeded.find(a => a.id === b.id));

  // Для площадки: группируем по статусу
  const pendingList   = isVenue ? bookings.filter(b => b.status === "pending")   : [];
  const confirmedList = isVenue ? bookings.filter(b => b.status === "confirmed") : [];
  const otherVenue    = isVenue ? bookings.filter(b => !["pending","confirmed"].includes(b.status)) : [];

  if (loading) return (
    <div className="space-y-2">{[1,2].map(i=><div key={i} className="glass rounded-2xl h-20 animate-pulse"/>)}</div>
  );

  if (bookings.length === 0) return (
    <div className="glass rounded-2xl p-10 text-center">
      <Icon name="CalendarClock" size={36} className="text-white/15 mx-auto mb-3" />
      <p className="text-white/65 text-sm">Нет запросов на бронирование</p>
      <p className="text-white/25 text-xs mt-1">Запросы от организаторов появятся здесь</p>
    </div>
  );

  const BookingCard = ({ b, action }: { b: Booking; action?: boolean }) => {
    const st = STATUS_LABEL[b.status] || { label: b.status, icon: "Circle", cls: "text-white/65 bg-white/5 border-white/10" };
    return (
      <div className={`glass rounded-2xl p-4 border transition-all ${action ? "border-neon-purple/40 bg-neon-purple/5" : "border-white/8"}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{isVenue ? b.projectTitle : b.venueName}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-neon-cyan text-xs font-medium">{b.eventDate}{b.eventTime ? ` · ${b.eventTime}` : ""}</span>
              {b.artist && <span className="text-white/55 text-xs">{b.artist}</span>}
              {b.expectedGuests > 0 && <span className="text-white/40 text-xs">{b.expectedGuests.toLocaleString()} гостей</span>}
            </div>
            {b.organizerName && <p className="text-white/40 text-xs mt-0.5">Организатор: {b.organizerName}</p>}
          </div>
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border shrink-0 ${st.cls}`}>
            <Icon name={st.icon} size={11}/>{st.label}
          </span>
        </div>
        {b.rentalAmount !== null && (
          <div className="flex items-center gap-2 mb-2 text-xs">
            <Icon name="Banknote" size={13} className="text-neon-green"/>
            <span className="text-neon-green font-semibold">{b.rentalAmount.toLocaleString("ru-RU")} ₽</span>
            {b.venueConditions && <span className="text-white/45 truncate">{b.venueConditions}</span>}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {action && (
            <button
              onClick={()=>{ setActiveBooking(b); setModalType(isVenue ? "venue" : "organizer"); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-xs font-oswald font-semibold hover:opacity-90 transition-opacity">
              <Icon name="ArrowRight" size={13}/>
              {isVenue ? "Ответить на запрос" : "Рассмотреть условия"}
            </button>
          )}
          {b.conversationId && onNavigate && (
            <button
              onClick={() => onNavigate(`chat:${b.conversationId}`)}
              className="relative flex items-center gap-1.5 px-3 py-2 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 rounded-xl text-xs font-medium hover:bg-neon-cyan/20 transition-colors">
              <Icon name="MessageCircle" size={13}/>Чат
              {(unreadMap[b.conversationId] || 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neon-pink rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadMap[b.conversationId] > 9 ? "9+" : unreadMap[b.conversationId]}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {isVenue ? (
        <>
          {/* Новые запросы — требуют ответа */}
          {pendingList.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-neon-cyan font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="BellRing" size={12}/>Требуют ответа · {pendingList.length}
              </p>
              {pendingList.map(b => <BookingCard key={b.id} b={b} action/>)}
            </div>
          )}

          {/* Подтверждены вами — ждём организатора */}
          {confirmedList.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-neon-purple/80 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="Hourglass" size={12}/>Ждут организатора · {confirmedList.length}
              </p>
              {confirmedList.map(b => <BookingCard key={b.id} b={b}/>)}
            </div>
          )}

          {/* Остальные (принятые, отклонённые, отменённые) */}
          {otherVenue.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-white/35 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="History" size={12}/>История · {otherVenue.length}
              </p>
              {otherVenue.map(b => <BookingCard key={b.id} b={b}/>)}
            </div>
          )}

          {pendingList.length === 0 && confirmedList.length === 0 && otherVenue.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center">
              <Icon name="CalendarClock" size={36} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/65 text-sm">Нет запросов на бронирование</p>
            </div>
          )}
        </>
      ) : (
        <>
          {actionNeeded.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-neon-green font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="BellRing" size={12}/>Требуют ответа · {actionNeeded.length}
              </p>
              {actionNeeded.map(b => <BookingCard key={b.id} b={b} action/>)}
            </div>
          )}
          {others.length > 0 && (
            <div className="space-y-2">
              {actionNeeded.length > 0 && <p className="text-xs text-white/35 font-semibold uppercase tracking-wider flex items-center gap-1.5"><Icon name="History" size={12}/>Остальные</p>}
              {others.map(b => <BookingCard key={b.id} b={b}/>)}
            </div>
          )}
        </>
      )}

      {activeBooking && modalType === "venue" && createPortal(
        <VenueRespondModal booking={activeBooking} onClose={()=>{setActiveBooking(null);setModalType(null);}} onSubmit={venueRespond}/>,
        document.body
      )}
      {activeBooking && modalType === "organizer" && createPortal(
        <OrganizerRespondModal booking={activeBooking} onClose={()=>{setActiveBooking(null);setModalType(null);}} onSubmit={organizerRespond}/>,
        document.body
      )}
    </div>
  );
}
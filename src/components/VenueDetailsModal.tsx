import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

const FALLBACK_IMG = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/e1d7542c-8ded-4ad1-8101-77b43e4b65bf.jpg";

export interface VenueDetailsData {
  id: string;
  name: string;
  city: string;
  address?: string;
  venueType: string;
  capacity: number;
  priceFrom: number;
  description?: string;
  photoUrl?: string;
  photos?: string[];
  riderUrl?: string;
  riderName?: string;
  schemaUrl?: string;
  schemaName?: string;
  tags?: string[];
  rating?: number;
  reviewsCount?: number;
  verified?: boolean;
  phone?: string;
  email?: string;
  website?: string;
  telegram?: string;
  vk?: string;
  instagram?: string;
  whatsapp?: string;
  youtube?: string;
  busyDates?: { date: string; note: string }[];
  userId?: string;
}

type Tab = "info" | "photos" | "documents" | "calendar";

interface Props {
  venue: VenueDetailsData;
  onClose: () => void;
  onContact?: () => void;
  showContactButton?: boolean;
  initialTab?: Tab;
}

const RU_MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const RU_WEEKDAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

function CalendarView({ busyDates }: { busyDates: { date: string; note: string }[] }) {
  const [year, setYear]   = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  const busySet = useMemo(() => new Set(busyDates.map(b => b.date)), [busyDates]);
  const noteMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const b of busyDates) m[b.date] = b.note || "";
    return m;
  }, [busyDates]);

  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Пн=0
  const daysInMonth  = lastDay.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const prev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const next = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const fmtKey = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const sortedBusy = [...busyDates].sort((a, b) => a.date.localeCompare(b.date));
  const futureBusy = sortedBusy.filter(b => b.date >= fmtKey(today.getDate()) || new Date(b.date) >= new Date(today.toISOString().slice(0, 10)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={prev} className="w-9 h-9 rounded-lg glass hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
          <Icon name="ChevronLeft" size={16} />
        </button>
        <div className="text-white font-oswald font-semibold text-base">
          {RU_MONTHS[month]} {year}
        </div>
        <button onClick={next} className="w-9 h-9 rounded-lg glass hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
          <Icon name="ChevronRight" size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {RU_WEEKDAYS.map(w => (
          <div key={w} className="text-center text-xs text-white/30 uppercase tracking-wider py-1">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const key = fmtKey(d);
          const busy = busySet.has(key);
          const note = noteMap[key];
          return (
            <div
              key={i}
              title={busy ? `Занято${note ? `: ${note}` : ""}` : "Свободно"}
              className={`aspect-square rounded-lg flex items-center justify-center text-sm border transition-colors ${
                busy
                  ? "bg-neon-pink/20 border-neon-pink/40 text-neon-pink"
                  : isToday(d)
                    ? "bg-neon-cyan/15 border-neon-cyan/40 text-neon-cyan"
                    : "border-white/5 text-white/70"
              }`}
            >
              {d}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-white/50">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-neon-pink/30 border border-neon-pink/40 inline-block" />
          Занято
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-neon-cyan/15 border border-neon-cyan/40 inline-block" />
          Сегодня
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-white/10 inline-block" />
          Свободно
        </span>
      </div>

      {futureBusy.length > 0 && (
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Ближайшие занятые даты</p>
          <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
            {futureBusy.slice(0, 12).map(b => (
              <div key={b.date} className="flex items-center justify-between text-sm">
                <span className="text-neon-pink">{fmtDate(b.date)}</span>
                {b.note && <span className="text-white/40 text-xs truncate ml-3">{b.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeUrl(value: string, prefix = ""): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("@") && prefix === "https://t.me/") return prefix + value.slice(1);
  return prefix ? prefix + value.replace(/^@/, "") : "https://" + value;
}

export default function VenueDetailsModal({ venue, onClose, onContact, showContactButton, initialTab }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab || "info");
  const [photoIdx, setPhotoIdx] = useState(0);

  const photos = (venue.photos && venue.photos.length > 0)
    ? venue.photos
    : (venue.photoUrl ? [venue.photoUrl] : []);
  const showPhotos = photos.length > 0 ? photos : [FALLBACK_IMG];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (tab === "photos") {
        if (e.key === "ArrowLeft")  setPhotoIdx(i => (i - 1 + showPhotos.length) % showPhotos.length);
        if (e.key === "ArrowRight") setPhotoIdx(i => (i + 1) % showPhotos.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, tab, showPhotos.length]);

  const tagsBlock = venue.tags && venue.tags.length > 0 && (
    <div>
      <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Удобства и оснащение</p>
      <div className="flex flex-wrap gap-1.5">
        {venue.tags.map((t, i) => (
          <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-white/5 text-white/70 border border-white/10">{t}</span>
        ))}
      </div>
    </div>
  );

  const contactRow = (icon: string, label: string, value?: string, href?: string) => {
    if (!value) return null;
    const inner = (
      <span className="flex items-center gap-2 text-white/80 hover:text-neon-cyan transition-colors">
        <Icon name={icon} size={14} className="text-white/40" />
        <span className="text-sm break-all">{label}</span>
      </span>
    );
    return (
      <div className="flex items-center justify-between py-1.5">
        {href ? <a href={href} target="_blank" rel="noreferrer">{inner}</a> : inner}
      </div>
    );
  };

  const docs: { url: string; name: string; type: string; icon: string }[] = [];
  if (venue.riderUrl)  docs.push({ url: venue.riderUrl,  name: venue.riderName  || "Технический райдер", type: "Райдер", icon: "FileText" });
  if (venue.schemaUrl) docs.push({ url: venue.schemaUrl, name: venue.schemaName || "Схема площадки",     type: "Схема",  icon: "Map" });

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl glass-strong rounded-2xl animate-scale-in flex flex-col my-auto overflow-hidden" style={{ maxHeight: "calc(100dvh - 32px)" }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />

        {/* Hero / Header */}
        <div className="relative h-56 shrink-0 overflow-hidden">
          <img
            src={showPhotos[0]}
            alt={venue.name}
            onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

          <button onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-background/70 backdrop-blur flex items-center justify-center text-white/70 hover:text-white hover:bg-background/90 transition-colors">
            <Icon name="X" size={18} />
          </button>

          {venue.verified && (
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-neon-green/20 backdrop-blur border border-neon-green/40 text-neon-green text-xs px-2 py-1 rounded-lg">
              <Icon name="BadgeCheck" size={12} />Верифицирован
            </div>
          )}

          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <Badge className="mb-2 bg-background/60 backdrop-blur text-white border-white/20 text-xs">{venue.venueType}</Badge>
              <h2 className="font-oswald font-bold text-3xl text-white leading-tight truncate">{venue.name}</h2>
              <div className="flex items-center gap-3 text-white/70 text-sm mt-1 flex-wrap">
                <span className="flex items-center gap-1"><Icon name="MapPin" size={13} />{venue.city}</span>
                {venue.capacity > 0 && <span className="flex items-center gap-1"><Icon name="Users" size={13} />{venue.capacity.toLocaleString()} чел.</span>}
                {(venue.rating ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-neon-green"><Icon name="Star" size={13} className="fill-current" />{venue.rating}</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-white/40">Стоимость</p>
              <p className="text-neon-cyan font-oswald font-bold text-xl">
                {venue.priceFrom > 0 ? `от ${venue.priceFrom.toLocaleString()} ₽` : "по запросу"}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-white/10 shrink-0 overflow-x-auto scrollbar-thin">
          {([
            { id: "info",      label: "Информация", icon: "Info" },
            { id: "photos",    label: `Фото (${photos.length || 0})`, icon: "Image" },
            { id: "documents", label: `Документы (${docs.length})`,    icon: "FileText" },
            { id: "calendar",  label: "Календарь",  icon: "Calendar" },
          ] as { id: Tab; label: string; icon: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-t-lg transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "bg-white/5 text-neon-cyan border-b-2 border-neon-cyan"
                  : "text-white/50 hover:text-white border-b-2 border-transparent"
              }`}
            >
              <Icon name={t.icon} size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-5 py-5">
          {tab === "info" && (
            <div className="space-y-5 animate-fade-in">
              {venue.description && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1.5">Описание</p>
                  <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{venue.description}</p>
                </div>
              )}

              {venue.address && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1.5">Адрес</p>
                  <p className="text-white/80 text-sm flex items-center gap-2">
                    <Icon name="Navigation" size={13} className="text-white/40" />
                    {venue.address}
                  </p>
                </div>
              )}

              {tagsBlock}

              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Контакты</p>
                <div className="grid sm:grid-cols-2 gap-x-6 divide-y divide-white/5">
                  {contactRow("Phone", venue.phone || "Не указан",   venue.phone, venue.phone ? `tel:${venue.phone}` : undefined)}
                  {contactRow("Mail",  venue.email || "",            venue.email, venue.email ? `mailto:${venue.email}` : undefined)}
                  {contactRow("Globe", venue.website?.replace(/^https?:\/\//, "") || "", venue.website, venue.website ? normalizeUrl(venue.website) : undefined)}
                  {contactRow("Send",  venue.telegram || "",         venue.telegram, venue.telegram ? normalizeUrl(venue.telegram, "https://t.me/") : undefined)}
                  {contactRow("MessageCircle", venue.whatsapp || "", venue.whatsapp, venue.whatsapp ? `https://wa.me/${venue.whatsapp.replace(/[^0-9]/g, "")}` : undefined)}
                  {contactRow("Users", venue.vk || "",               venue.vk, venue.vk ? normalizeUrl(venue.vk) : undefined)}
                  {contactRow("Instagram", venue.instagram || "",    venue.instagram, venue.instagram ? normalizeUrl(venue.instagram, "https://instagram.com/") : undefined)}
                  {contactRow("Youtube", venue.youtube || "",        venue.youtube, venue.youtube ? normalizeUrl(venue.youtube) : undefined)}
                </div>
                {!venue.phone && !venue.email && !venue.website && !venue.telegram && !venue.whatsapp && !venue.vk && !venue.instagram && !venue.youtube && (
                  <p className="text-white/30 text-sm">Контакты не указаны</p>
                )}
              </div>
            </div>
          )}

          {tab === "photos" && (
            <div className="space-y-4 animate-fade-in">
              {photos.length === 0 ? (
                <div className="text-center py-16 text-white/30">
                  <Icon name="ImageOff" size={48} className="mx-auto mb-3" />
                  <p className="text-sm">Фотографии не добавлены</p>
                </div>
              ) : (
                <>
                  <div className="relative rounded-xl overflow-hidden bg-black/40 aspect-video flex items-center justify-center">
                    <img
                      src={showPhotos[photoIdx]}
                      alt={`${venue.name} ${photoIdx + 1}`}
                      onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                      className="max-w-full max-h-full object-contain"
                    />
                    {showPhotos.length > 1 && (
                      <>
                        <button
                          onClick={() => setPhotoIdx(i => (i - 1 + showPhotos.length) % showPhotos.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-white hover:bg-background/90 transition-colors">
                          <Icon name="ChevronLeft" size={18} />
                        </button>
                        <button
                          onClick={() => setPhotoIdx(i => (i + 1) % showPhotos.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-white hover:bg-background/90 transition-colors">
                          <Icon name="ChevronRight" size={18} />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/70 backdrop-blur px-3 py-1 rounded-lg text-xs text-white/80">
                          {photoIdx + 1} / {showPhotos.length}
                        </div>
                      </>
                    )}
                  </div>
                  {showPhotos.length > 1 && (
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                      {showPhotos.map((src, i) => (
                        <button
                          key={i}
                          onClick={() => setPhotoIdx(i)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            i === photoIdx ? "border-neon-cyan scale-95" : "border-transparent hover:border-white/20"
                          }`}
                        >
                          <img src={src} alt="" onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                            className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "documents" && (
            <div className="space-y-3 animate-fade-in">
              {docs.length === 0 ? (
                <div className="text-center py-16 text-white/30">
                  <Icon name="FileX" size={48} className="mx-auto mb-3" />
                  <p className="text-sm">Документы не загружены</p>
                </div>
              ) : (
                docs.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 glass rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center shrink-0">
                        <Icon name={doc.icon} size={18} className="text-neon-cyan" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-white/40 text-xs">{doc.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={doc.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 text-white/70 hover:text-white hover:bg-white/10 text-xs border border-white/10 transition-colors">
                        <Icon name="Eye" size={13} />Открыть
                      </a>
                      <a href={doc.url} download
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan hover:bg-neon-cyan/25 text-xs border border-neon-cyan/30 transition-colors">
                        <Icon name="Download" size={13} />Скачать
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "calendar" && (
            <div className="animate-fade-in">
              <p className="text-white/50 text-sm mb-4">
                Розовым выделены даты, когда площадка занята. На свободные даты можно бронировать.
              </p>
              <CalendarView busyDates={venue.busyDates || []} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-white/10 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 glass rounded-xl text-white/60 hover:text-white transition-colors text-sm">
            Закрыть
          </button>
          <div className="flex items-center gap-2">
            {venue.riderUrl && (
              <a href={venue.riderUrl} target="_blank" rel="noreferrer"
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-white/70 hover:text-white hover:bg-white/10 text-sm border border-white/10 transition-colors">
                <Icon name="Download" size={14} />Райдер
              </a>
            )}
            {showContactButton && onContact && (
              <button
                onClick={onContact}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm">
                <Icon name="MessageCircle" size={14} />Написать площадке
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
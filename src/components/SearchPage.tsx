import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import VenueSetupModal from "@/components/VenueSetupModal";
import StartChatModal from "@/components/StartChatModal";
import VenueDetailsModal, { type VenueDetailsData } from "@/components/VenueDetailsModal";

const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";
const IMPORT_URL = "https://functions.poehali.dev/c7f2752f-6618-495c-9f9e-8553dce85384";
const FALLBACK_IMG = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/e1d7542c-8ded-4ad1-8101-77b43e4b65bf.jpg";

function VenuePhotoSlider({ photos, fallback, alt, verified, venueType }: {
  photos: string[];
  fallback: string;
  alt: string;
  verified: boolean;
  venueType: string;
}) {
  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const imgs = photos.length > 0 ? photos : [fallback];

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx(i => (i - 1 + imgs.length) % imgs.length);
  }, [imgs.length]);

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx(i => (i + 1) % imgs.length);
  }, [imgs.length]);

  return (
    <div
      className="relative h-44 overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {imgs.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`${alt} ${i + 1}`}
          onError={e => { (e.target as HTMLImageElement).src = fallback; }}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${i === idx ? "opacity-100 scale-100" : "opacity-0 scale-105"} ${hovered && i === idx ? "scale-105" : ""}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

      {/* Стрелки — только при наведении и если фото > 1 */}
      {imgs.length > 1 && hovered && (
        <>
          <button onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-white hover:bg-background/90 transition-all z-10">
            <Icon name="ChevronLeft" size={14} />
          </button>
          <button onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-white hover:bg-background/90 transition-all z-10">
            <Icon name="ChevronRight" size={14} />
          </button>
        </>
      )}

      {/* Точки-индикаторы */}
      {imgs.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {imgs.map((_, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
              className={`rounded-full transition-all ${i === idx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>
      )}

      {verified && (
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-neon-green/20 backdrop-blur border border-neon-green/40 text-neon-green text-xs px-2 py-1 rounded-lg z-10">
          <Icon name="BadgeCheck" size={12} />Верифицирован
        </div>
      )}
      <Badge className="absolute top-3 right-3 bg-background/60 backdrop-blur text-white border-white/20 text-xs z-10">{venueType}</Badge>
    </div>
  );
}

const CITIES = ["Все города","Москва","Санкт-Петербург","Екатеринбург","Новосибирск","Казань","Ростов-на-Дону","Краснодар"];
const TYPES = ["Все типы","Клуб","Концертный зал","Театр","Арена","Площадка на открытом воздухе","Бар","Арт-пространство"];

interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  venueType: string;
  capacity: number;
  priceFrom: number;
  description: string;
  photoUrl: string;
  photos?: string[];
  riderUrl: string;
  riderName: string;
  schemaUrl?: string;
  schemaName?: string;
  tags: string[];
  rating: number;
  reviewsCount: number;
  verified: boolean;
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
  ownerUserId?: string;
  importedFrom?: string;
}

interface SearchPageProps {
  onNavigate?: (page: string) => void;
}

export default function SearchPage({ onNavigate }: SearchPageProps) {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("Все города");
  const [selectedType, setSelectedType] = useState("Все типы");
  const [capacityMin, setCapacityMin] = useState(0);
  const [sortBy, setSortBy] = useState("rating");
  const [chatModal, setChatModal] = useState<{ venueId: string; venueUserId: string; venueName: string } | null>(null);
  const [details, setDetails] = useState<{ data: VenueDetailsData; initialTab?: "info" | "photos" | "documents" | "calendar" } | null>(null);

  const openDetails = (v: Venue, initialTab?: "info" | "photos" | "documents" | "calendar") =>
    setDetails({ data: { ...v, busyDates: v.busyDates || [] }, initialTab });
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimDone, setClaimDone] = useState<Set<string>>(new Set());

  const claimVenue = async (venueId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    setClaimingId(venueId);
    try {
      const res = await fetch(`${IMPORT_URL}/?action=claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, userId: user.id }),
      });
      const data = await res.json();
      if (res.ok) setClaimDone(prev => new Set([...prev, venueId]));
      else alert(data.error || "Ошибка");
    } catch { alert("Ошибка соединения"); }
    finally { setClaimingId(null); }
  };

  const loadVenues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "list" });
      if (selectedCity !== "Все города") params.set("city", selectedCity);
      if (selectedType !== "Все типы") params.set("type", selectedType);
      if (capacityMin > 0) params.set("capacity_min", String(capacityMin));
      const res = await fetch(`${VENUES_URL}?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVenues(data.venues || []);
    } catch {
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVenues(); }, [selectedCity, selectedType, capacityMin]);

  const filtered = venues
    .filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.city.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === "rating" ? b.rating - a.rating : b.capacity - a.capacity);

  return (
    <div className="min-h-screen pt-2">
      <div className="relative py-4 overflow-hidden">
        <div className="absolute inset-0 bg-neon-cyan/5" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-neon-cyan/15 border border-neon-cyan/25 flex items-center justify-center shrink-0">
                <Icon name="MapPin" size={20} className="text-neon-cyan" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-oswald font-bold text-2xl text-white uppercase leading-none">
                    Найдите <span className="gradient-text">площадку</span>
                  </h1>
                  <Badge className="bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30 text-[10px] py-0 px-2">Каталог</Badge>
                </div>
                <p className="text-white/45 text-xs mt-0.5">Концертные залы, клубы и арены по всей стране</p>
              </div>
            </div>
            {user?.role === "venue" && (
              <button onClick={() => setShowSetup(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-cyan to-neon-green text-background font-oswald font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm">
                <Icon name="Plus" size={16} />Добавить площадку
              </button>
            )}
          </div>
          <div className="flex gap-2 mt-3 max-w-2xl">
            <div className="flex-1 flex items-center gap-2 glass-strong rounded-lg px-3 py-2 border border-white/10">
              <Icon name="Search" size={16} className="text-white/40" />
              <input type="text" placeholder="Название или город..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm" />
            </div>
            <button onClick={loadVenues} className="px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm">
              Найти
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-24">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0">
            <div className="glass rounded-2xl p-5 sticky top-24">
              <div className="flex items-center gap-2 mb-5">
                <Icon name="SlidersHorizontal" size={18} className="text-neon-purple" />
                <span className="font-oswald font-semibold text-white">Фильтры</span>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Город</label>
                  <div className="space-y-1">
                    {CITIES.map(city => (
                      <button key={city} onClick={() => setSelectedCity(city)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCity === city ? "bg-neon-purple/20 text-neon-purple" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Тип площадки</label>
                  <div className="space-y-1">
                    {TYPES.map(type => (
                      <button key={type} onClick={() => setSelectedType(type)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedType === type ? "bg-neon-cyan/20 text-neon-cyan" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                    Вместимость от {capacityMin > 0 ? capacityMin : "любой"}
                  </label>
                  <input type="range" min={0} max={3000} step={100} value={capacityMin}
                    onChange={e => setCapacityMin(Number(e.target.value))} className="w-full accent-neon-purple" />
                  <div className="flex justify-between text-xs text-white/30 mt-1"><span>0</span><span>3000+</span></div>
                </div>
                <div className="h-px bg-white/10" />
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Сортировка</label>
                  {[["rating","По рейтингу"],["capacity","По вместимости"]].map(([val, label]) => (
                    <button key={val} onClick={() => setSortBy(val)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${sortBy === val ? "bg-neon-pink/20 text-neon-pink" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/50 text-sm">
                Найдено: <span className="text-white font-medium">{filtered.length}</span> площадок
              </p>
              {loading && <span className="text-white/30 text-xs flex items-center gap-1"><Icon name="Loader2" size={14} className="animate-spin" />Загрузка...</span>}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="glass rounded-2xl overflow-hidden">
                    <div className="h-44 bg-white/5 animate-pulse" />
                    <div className="p-5 space-y-3">
                      <div className="h-5 bg-white/5 rounded animate-pulse w-2/3" />
                      <div className="h-4 bg-white/5 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 glass rounded-2xl">
                <Icon name="SearchX" size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg font-oswald">Площадки не найдены</p>
                <p className="text-white/30 text-sm mt-1 mb-6">Попробуйте изменить параметры поиска</p>
                {user?.role === "venue" && (
                  <button onClick={() => setShowSetup(true)}
                    className="px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity">
                    Добавить первую площадку
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filtered.map(venue => (
                  <div key={venue.id}
                    onClick={() => openDetails(venue, "info")}
                    className="glass rounded-2xl overflow-hidden hover-lift group cursor-pointer">
                    <VenuePhotoSlider
                      photos={venue.photos && venue.photos.length > 0 ? venue.photos : (venue.photoUrl ? [venue.photoUrl] : [])}
                      fallback={FALLBACK_IMG}
                      alt={venue.name}
                      verified={venue.verified}
                      venueType={venue.venueType}
                    />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-oswald font-bold text-xl text-white">{venue.name}</h3>
                        <div className="flex items-center gap-1 text-neon-green">
                          <Icon name="Star" size={14} className="fill-current" />
                          <span className="text-sm font-medium">{venue.rating > 0 ? venue.rating : "Новая"}</span>
                          {venue.reviewsCount > 0 && <span className="text-white/30 text-xs">({venue.reviewsCount})</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 text-white/50 text-sm mb-3">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Icon name="MapPin" size={13} />{venue.city}</span>
                          {venue.capacity > 0 && <span className="flex items-center gap-1"><Icon name="Users" size={13} />{venue.capacity.toLocaleString()} чел.</span>}
                        </div>
                        {venue.address && (
                          <span className="flex items-center gap-1 text-white/35 text-xs truncate">
                            <Icon name="Navigation" size={11} />{venue.address}
                          </span>
                        )}
                        {venue.phone && (
                          <span className="flex items-center gap-1 text-white/40 text-xs">
                            <Icon name="Phone" size={11} />{venue.phone}
                          </span>
                        )}
                        {venue.website && (
                          <a href={venue.website.startsWith("http") ? venue.website : `https://${venue.website}`}
                            target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-neon-cyan/70 text-xs hover:text-neon-cyan transition-colors truncate">
                            <Icon name="Globe" size={11} />{venue.website.replace(/^https?:\/\//, "")}
                          </a>
                        )}
                      </div>
                      {venue.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {venue.tags.slice(0, 4).map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-white/50">{tag}</span>
                          ))}
                          {venue.tags.length > 4 && <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-white/30">+{venue.tags.length - 4}</span>}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-neon-cyan font-medium text-sm">
                          {venue.priceFrom > 0 ? `от ${venue.priceFrom.toLocaleString()} ₽` : "Цена по запросу"}
                        </span>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <button
                            onClick={e => { e.stopPropagation(); openDetails(venue); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-neon-cyan/15 text-neon-cyan text-xs rounded-lg hover:bg-neon-cyan/25 transition-colors border border-neon-cyan/30"
                            title="Открыть карточку площадки">
                            <Icon name="Eye" size={13} />Подробнее
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); openDetails(venue, "calendar"); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-neon-pink/10 text-neon-pink text-xs rounded-lg hover:bg-neon-pink/20 transition-colors border border-neon-pink/30"
                            title="Посмотреть занятые даты">
                            <Icon name="Calendar" size={13} />Календарь
                          </button>
                          {venue.riderUrl && (
                            <a href={venue.riderUrl} target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 px-3 py-1.5 bg-white/5 text-white/50 text-xs rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10">
                              <Icon name="FileText" size={13} />Райдер
                            </a>
                          )}
                          {user?.role === "organizer" && (
                            <button
                              onClick={e => { e.stopPropagation(); setChatModal({ venueId: venue.id, venueUserId: venue.userId ?? "", venueName: venue.name }); }}
                              className="flex items-center gap-2 px-4 py-1.5 bg-neon-purple/20 text-neon-purple text-xs rounded-lg hover:bg-neon-purple/30 transition-colors border border-neon-purple/30">
                              Написать<Icon name="MessageCircle" size={13} />
                            </button>
                          )}
                          {user?.role === "venue" && venue.importedFrom && !venue.ownerUserId && (
                            claimDone.has(venue.id) ? (
                              <span className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 text-xs rounded-lg border border-green-500/20">
                                <Icon name="CheckCircle2" size={13} />Заявка отправлена
                              </span>
                            ) : (
                              <button
                                onClick={e => claimVenue(venue.id, e)}
                                disabled={claimingId === venue.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-neon-cyan/15 text-neon-cyan text-xs rounded-lg hover:bg-neon-cyan/25 transition-colors border border-neon-cyan/30 disabled:opacity-50">
                                {claimingId === venue.id ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="KeyRound" size={13} />}
                                Это моя площадка
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <VenueSetupModal open={showSetup} onClose={() => setShowSetup(false)} onCreated={loadVenues} />

      {chatModal && (
        <StartChatModal
          open={!!chatModal}
          venueName={chatModal.venueName}
          venueId={chatModal.venueId}
          venueUserId={chatModal.venueUserId}
          onClose={() => setChatModal(null)}
          onStarted={() => { setChatModal(null); onNavigate?.("chat"); }}
        />
      )}

      {details && (
        <VenueDetailsModal
          venue={details.data}
          initialTab={details.initialTab}
          onClose={() => setDetails(null)}
          showContactButton={user?.role === "organizer"}
          onContact={() => {
            const v = details.data;
            setDetails(null);
            setChatModal({ venueId: v.id, venueUserId: v.userId ?? "", venueName: v.name });
          }}
        />
      )}
    </div>
  );
}
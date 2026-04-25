import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import VenueSetupModal from "@/components/VenueSetupModal";

const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";
const FALLBACK_IMG = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/e1d7542c-8ded-4ad1-8101-77b43e4b65bf.jpg";

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
  riderUrl: string;
  riderName: string;
  tags: string[];
  rating: number;
  reviewsCount: number;
  verified: boolean;
}

export default function SearchPage() {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("Все города");
  const [selectedType, setSelectedType] = useState("Все типы");
  const [capacityMin, setCapacityMin] = useState(0);
  const [sortBy, setSortBy] = useState("rating");

  const loadVenues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "list" });
      if (selectedCity !== "Все города") params.set("city", selectedCity);
      if (selectedType !== "Все типы") params.set("type", selectedType);
      if (capacityMin > 0) params.set("capacity_min", String(capacityMin));
      const res = await fetch(`${VENUES_URL}?${params}`);
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
    <div className="min-h-screen pt-20">
      <div className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 gradient-bg-purple opacity-40" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <Badge className="bg-neon-purple/20 text-neon-purple border-neon-purple/40 mb-4">Поиск площадок</Badge>
              <h1 className="font-oswald font-bold text-5xl sm:text-6xl text-white uppercase mb-2">
                Найдите <span className="gradient-text">идеальную</span>
              </h1>
              <h1 className="font-oswald font-bold text-5xl sm:text-6xl text-white/40 uppercase mb-6">Площадку</h1>
              <div className="flex gap-3 max-w-2xl">
                <div className="flex-1 flex items-center gap-3 glass-strong rounded-xl px-4 py-3 border border-white/10">
                  <Icon name="Search" size={18} className="text-white/40" />
                  <input type="text" placeholder="Название или город..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm" />
                </div>
                <button onClick={loadVenues} className="px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity">
                  Найти
                </button>
              </div>
            </div>
            {user?.role === "venue" && (
              <button onClick={() => setShowSetup(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-green text-background font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity mt-4">
                <Icon name="Plus" size={18} />
                Добавить площадку
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
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
                  <div key={venue.id} className="glass rounded-2xl overflow-hidden hover-lift group cursor-pointer">
                    <div className="relative h-44 overflow-hidden">
                      <img src={venue.photoUrl || FALLBACK_IMG} alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      {venue.verified && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 bg-neon-green/20 backdrop-blur border border-neon-green/40 text-neon-green text-xs px-2 py-1 rounded-lg">
                          <Icon name="BadgeCheck" size={12} />Верифицирован
                        </div>
                      )}
                      <Badge className="absolute top-3 right-3 bg-background/60 backdrop-blur text-white border-white/20 text-xs">{venue.venueType}</Badge>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-oswald font-bold text-xl text-white">{venue.name}</h3>
                        <div className="flex items-center gap-1 text-neon-green">
                          <Icon name="Star" size={14} className="fill-current" />
                          <span className="text-sm font-medium">{venue.rating > 0 ? venue.rating : "Новая"}</span>
                          {venue.reviewsCount > 0 && <span className="text-white/30 text-xs">({venue.reviewsCount})</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-white/50 text-sm mb-3">
                        <span className="flex items-center gap-1"><Icon name="MapPin" size={13} />{venue.city}</span>
                        <span className="flex items-center gap-1"><Icon name="Users" size={13} />{venue.capacity.toLocaleString()} чел.</span>
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
                        <div className="flex gap-2">
                          {venue.riderUrl && (
                            <a href={venue.riderUrl} target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 px-3 py-1.5 bg-white/5 text-white/50 text-xs rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10">
                              <Icon name="FileText" size={13} />Райдер
                            </a>
                          )}
                          <button className="flex items-center gap-2 px-4 py-1.5 bg-neon-purple/20 text-neon-purple text-xs rounded-lg hover:bg-neon-purple/30 transition-colors border border-neon-purple/30">
                            Написать<Icon name="MessageCircle" size={13} />
                          </button>
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
    </div>
  );
}

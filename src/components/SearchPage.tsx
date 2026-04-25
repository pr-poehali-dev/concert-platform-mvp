import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

const HERO_IMAGE = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/e1d7542c-8ded-4ad1-8101-77b43e4b65bf.jpg";
const VENUE_IMAGE = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/2d0113c6-c12e-42b6-9cd4-2141cf50ef4f.jpg";
const CONCERT_IMAGE = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/69adfe90-676c-44a2-b9f1-8f6bf1c0f9b9.jpg";

const venues = [
  {
    id: 1,
    name: "Volta",
    city: "Москва",
    capacity: 1200,
    rating: 4.9,
    reviews: 142,
    type: "Клуб",
    price: "от 80 000 ₽",
    tags: ["Свет", "Звук", "Гримёрки", "Бар"],
    verified: true,
    img: HERO_IMAGE,
  },
  {
    id: 2,
    name: "Зал Ожидания",
    city: "Санкт-Петербург",
    capacity: 600,
    rating: 4.8,
    reviews: 98,
    type: "Концертный зал",
    price: "от 50 000 ₽",
    tags: ["Стоянка", "Бар", "Сцена", "Пресс-зона"],
    verified: true,
    img: VENUE_IMAGE,
  },
  {
    id: 3,
    name: "Teleclub",
    city: "Екатеринбург",
    capacity: 2500,
    rating: 4.7,
    reviews: 201,
    type: "Клуб",
    price: "от 120 000 ₽",
    tags: ["Свет", "Звук", "VIP", "Сцена"],
    verified: false,
    img: CONCERT_IMAGE,
  },
  {
    id: 4,
    name: "ГлавClub",
    city: "Москва",
    capacity: 1800,
    rating: 4.6,
    reviews: 315,
    type: "Клуб",
    price: "от 95 000 ₽",
    tags: ["Гримёрки", "Звук", "Свет", "Бар"],
    verified: true,
    img: VENUE_IMAGE,
  },
  {
    id: 5,
    name: "Космонавт",
    city: "Санкт-Петербург",
    capacity: 700,
    rating: 4.8,
    reviews: 167,
    type: "Площадка",
    price: "от 45 000 ₽",
    tags: ["Терраса", "Звук", "Сцена"],
    verified: true,
    img: HERO_IMAGE,
  },
  {
    id: 6,
    name: "Арена",
    city: "Новосибирск",
    capacity: 5000,
    rating: 4.5,
    reviews: 88,
    type: "Арена",
    price: "от 300 000 ₽",
    tags: ["LED экран", "VIP", "Парковка", "Свет"],
    verified: false,
    img: CONCERT_IMAGE,
  },
];

const cities = ["Все города", "Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Казань"];
const types = ["Все типы", "Клуб", "Концертный зал", "Арена", "Площадка"];

export default function SearchPage() {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("Все города");
  const [selectedType, setSelectedType] = useState("Все типы");
  const [capacityMin, setCapacityMin] = useState(0);
  const [sortBy, setSortBy] = useState("rating");

  const filtered = venues
    .filter((v) => {
      const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.city.toLowerCase().includes(search.toLowerCase());
      const matchCity = selectedCity === "Все города" || v.city === selectedCity;
      const matchType = selectedType === "Все типы" || v.type === selectedType;
      const matchCapacity = v.capacity >= capacityMin;
      return matchSearch && matchCity && matchType && matchCapacity;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "capacity") return b.capacity - a.capacity;
      return 0;
    });

  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <div className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 gradient-bg-purple opacity-40" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-neon-purple/20 text-neon-purple border-neon-purple/40 mb-4">Поиск площадок</Badge>
          <h1 className="font-oswald font-bold text-5xl sm:text-6xl text-white uppercase mb-2">
            Найдите <span className="gradient-text">идеальную</span>
          </h1>
          <h1 className="font-oswald font-bold text-5xl sm:text-6xl text-white/40 uppercase mb-6">
            Площадку
          </h1>

          {/* Search bar */}
          <div className="flex gap-3 max-w-2xl">
            <div className="flex-1 flex items-center gap-3 glass-strong rounded-xl px-4 py-3 border border-white/10">
              <Icon name="Search" size={18} className="text-white/40" />
              <input
                type="text"
                placeholder="Название или город..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm"
              />
            </div>
            <button className="px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity">
              Найти
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters */}
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
                    {cities.map((city) => (
                      <button
                        key={city}
                        onClick={() => setSelectedCity(city)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedCity === city
                            ? "bg-neon-purple/20 text-neon-purple"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Тип площадки</label>
                  <div className="space-y-1">
                    {types.map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedType === type
                            ? "bg-neon-cyan/20 text-neon-cyan"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
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
                  <input
                    type="range"
                    min={0}
                    max={3000}
                    step={100}
                    value={capacityMin}
                    onChange={(e) => setCapacityMin(Number(e.target.value))}
                    className="w-full accent-neon-purple"
                  />
                  <div className="flex justify-between text-xs text-white/30 mt-1">
                    <span>0</span>
                    <span>3000+</span>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Сортировка</label>
                  <div className="space-y-1">
                    {[["rating", "По рейтингу"], ["capacity", "По вместимости"]].map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setSortBy(val)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          sortBy === val
                            ? "bg-neon-pink/20 text-neon-pink"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/50 text-sm">
                Найдено: <span className="text-white font-medium">{filtered.length}</span> площадок
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((venue) => (
                <div key={venue.id} className="glass rounded-2xl overflow-hidden hover-lift group cursor-pointer">
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={venue.img}
                      alt={venue.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    {venue.verified && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-neon-green/20 backdrop-blur border border-neon-green/40 text-neon-green text-xs px-2 py-1 rounded-lg">
                        <Icon name="BadgeCheck" size={12} />
                        Верифицирован
                      </div>
                    )}
                    <Badge className="absolute top-3 right-3 bg-background/60 backdrop-blur text-white border-white/20 text-xs">
                      {venue.type}
                    </Badge>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-oswald font-bold text-xl text-white">{venue.name}</h3>
                      <div className="flex items-center gap-1 text-neon-green">
                        <Icon name="Star" size={14} className="fill-current" />
                        <span className="text-sm font-medium">{venue.rating}</span>
                        <span className="text-white/30 text-xs">({venue.reviews})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-white/50 text-sm mb-3">
                      <span className="flex items-center gap-1">
                        <Icon name="MapPin" size={13} />
                        {venue.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="Users" size={13} />
                        {venue.capacity.toLocaleString()} чел.
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {venue.tags.map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-white/50">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neon-cyan font-medium text-sm">{venue.price}</span>
                      <button className="flex items-center gap-2 px-4 py-2 bg-neon-purple/20 text-neon-purple text-sm rounded-lg hover:bg-neon-purple/30 transition-colors border border-neon-purple/30">
                        Написать
                        <Icon name="MessageCircle" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20 glass rounded-2xl">
                <Icon name="SearchX" size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg font-oswald">Площадки не найдены</p>
                <p className="text-white/30 text-sm mt-1">Попробуйте изменить параметры поиска</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

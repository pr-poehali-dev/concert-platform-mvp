import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

const tours = [
  {
    id: 1,
    name: "Осенний тур 2025",
    artist: "Звери",
    status: "active",
    cities: ["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Казань"],
    dates: "15 сент — 30 окт 2025",
    confirmed: 3,
    total: 5,
    budget: "1 800 000 ₽",
  },
  {
    id: 2,
    name: "Зимний тур",
    artist: "Би-2",
    status: "planning",
    cities: ["Москва", "Самара", "Уфа"],
    dates: "10 дек — 25 дек 2025",
    confirmed: 1,
    total: 3,
    budget: "900 000 ₽",
  },
  {
    id: 3,
    name: "Большой тур 2025",
    artist: "Noize MC",
    status: "completed",
    cities: ["Москва", "СПб", "Ростов", "Краснодар", "Воронеж", "Нижний Новгород"],
    dates: "Апр — Май 2025",
    confirmed: 6,
    total: 6,
    budget: "3 200 000 ₽",
  },
];

const tourCities = [
  { city: "Москва", venue: "Volta", date: "15 сент", status: "confirmed", capacity: 1200 },
  { city: "Санкт-Петербург", venue: "Космонавт", date: "20 сент", status: "confirmed", capacity: 700 },
  { city: "Екатеринбург", venue: "Teleclub", date: "27 сент", status: "confirmed", capacity: 2500 },
  { city: "Новосибирск", venue: "Поиск...", date: "4 окт", status: "searching", capacity: 0 },
  { city: "Казань", venue: "Arena", date: "12 окт", status: "negotiating", capacity: 1500 },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Активный", color: "text-neon-green bg-neon-green/10 border-neon-green/30" },
  planning: { label: "Планируется", color: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30" },
  completed: { label: "Завершён", color: "text-white/40 bg-white/5 border-white/10" },
  confirmed: { label: "Подтверждено", color: "text-neon-green" },
  searching: { label: "Ищем площадку", color: "text-neon-pink" },
  negotiating: { label: "Переговоры", color: "text-neon-cyan" },
};

export default function ToursPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [activeTour, setActiveTour] = useState(1);
  const selectedTour = tours.find((t) => t.id === activeTour) || tours[0];

  return (
    <div className="min-h-screen pt-20">
      <div className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 gradient-bg-purple opacity-30" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40 mb-4">Управление турами</Badge>
              <h1 className="font-oswald font-bold text-5xl sm:text-6xl text-white uppercase">
                Проекты <span className="gradient-text">туров</span>
              </h1>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity mt-4">
              <Icon name="Plus" size={18} />
              Новый тур
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Tours list */}
          <aside className="lg:w-80 shrink-0 space-y-3">
            {tours.map((tour) => (
              <div
                key={tour.id}
                onClick={() => setActiveTour(tour.id)}
                className={`glass rounded-2xl p-5 cursor-pointer transition-all duration-200 ${
                  activeTour === tour.id
                    ? "neon-border-purple ring-1 ring-neon-purple/40"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-oswald font-semibold text-white text-lg">{tour.name}</h3>
                  <Badge className={`text-xs border ${statusConfig[tour.status].color}`}>
                    {statusConfig[tour.status].label}
                  </Badge>
                </div>
                <p className="text-neon-cyan text-sm font-medium mb-2">{tour.artist}</p>
                <div className="flex items-center gap-1 text-white/40 text-xs mb-3">
                  <Icon name="Calendar" size={12} />
                  {tour.dates}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full"
                      style={{ width: `${(tour.confirmed / tour.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/40">{tour.confirmed}/{tour.total} городов</span>
                </div>
              </div>
            ))}
          </aside>

          {/* Tour detail */}
          <div className="flex-1 space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h2 className="font-oswald font-bold text-3xl text-white mb-1">{selectedTour.name}</h2>
                  <p className="text-neon-cyan font-medium">{selectedTour.artist}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-xs mb-1">Общий бюджет</p>
                  <p className="font-oswald font-bold text-2xl gradient-text">{selectedTour.budget}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { icon: "MapPin", label: "Городов", value: selectedTour.total },
                  { icon: "CheckCircle", label: "Подтверждено", value: selectedTour.confirmed },
                  { icon: "Clock", label: "Ожидают", value: selectedTour.total - selectedTour.confirmed },
                ].map((s, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 text-center">
                    <Icon name={s.icon} size={20} className="text-neon-purple mx-auto mb-2" />
                    <div className="font-oswald font-bold text-2xl text-white">{s.value}</div>
                    <div className="text-white/40 text-xs">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Cities timeline */}
              <div>
                <h3 className="font-oswald font-semibold text-white text-lg mb-4 flex items-center gap-2">
                  <Icon name="Route" size={18} className="text-neon-purple" />
                  Маршрут тура
                </h3>
                <div className="space-y-3">
                  {tourCities.map((stop, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white/3 rounded-xl p-4 hover:bg-white/5 transition-colors group">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-oswald font-bold ${
                          stop.status === "confirmed" ? "bg-neon-green/20 text-neon-green border border-neon-green/40" :
                          stop.status === "negotiating" ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40" :
                          "bg-neon-pink/20 text-neon-pink border border-neon-pink/40"
                        }`}>
                          {i + 1}
                        </div>
                        {i < tourCities.length - 1 && (
                          <div className="w-px h-4 bg-white/10 mt-1" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-oswald font-semibold text-white">{stop.city}</span>
                          <span className={`text-xs ${statusConfig[stop.status].color}`}>
                            {statusConfig[stop.status].label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/50">
                          <span className="flex items-center gap-1">
                            <Icon name="Building2" size={12} />
                            {stop.venue}
                          </span>
                          {stop.capacity > 0 && (
                            <span className="flex items-center gap-1">
                              <Icon name="Users" size={12} />
                              {stop.capacity.toLocaleString()} чел.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-white/50 text-sm flex items-center gap-1">
                          <Icon name="Calendar" size={13} />
                          {stop.date}
                        </span>
                      </div>

                      {stop.status === "searching" && (
                        <button className="ml-2 px-3 py-1.5 bg-neon-purple/20 text-neon-purple text-xs rounded-lg hover:bg-neon-purple/30 transition-colors border border-neon-purple/30 whitespace-nowrap">
                          Найти площадку
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rider section */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-oswald font-semibold text-white text-lg flex items-center gap-2">
                  <Icon name="FileText" size={18} className="text-neon-cyan" />
                  Технический райдер
                </h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/20 text-neon-cyan text-sm rounded-lg hover:bg-neon-cyan/30 transition-colors border border-neon-cyan/30">
                  <Icon name="Download" size={14} />
                  Скачать PDF
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: "Volume2", label: "Звуковое оборудование", count: "12 позиций" },
                  { icon: "Lightbulb", label: "Световое оборудование", count: "8 позиций" },
                  { icon: "Users", label: "Гримёрки", count: "3 комнаты" },
                  { icon: "Wifi", label: "Технические требования", count: "5 позиций" },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 text-center hover:bg-white/8 transition-colors cursor-pointer">
                    <Icon name={item.icon} size={22} className="text-neon-cyan mx-auto mb-2" />
                    <p className="text-xs text-white/60 mb-1">{item.label}</p>
                    <p className="text-sm font-medium text-white">{item.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
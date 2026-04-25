import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

const MOCK_TOURS = [
  { id: "1", name: "Осенний тур 2025", artist: "Звери", status: "active", cities: 5, confirmed: 3, dates: "Сент — Окт 2025", budget: "1 800 000 ₽" },
  { id: "2", name: "Зимний тур", artist: "Би-2", status: "planning", cities: 3, confirmed: 1, dates: "Дек 2025", budget: "900 000 ₽" },
  { id: "3", name: "Весенний тур 2025", artist: "Noize MC", status: "completed", cities: 6, confirmed: 6, dates: "Апр — Май 2025", budget: "3 200 000 ₽" },
];

const MOCK_HISTORY = [
  { id: "1", venue: "Volta", city: "Москва", date: "15 сент 2025", status: "confirmed", amount: "85 000 ₽" },
  { id: "2", venue: "Космонавт", city: "СПб", date: "20 сент 2025", status: "confirmed", amount: "55 000 ₽" },
  { id: "3", venue: "Arena", city: "Екб", date: "27 сент 2025", status: "negotiating", amount: "120 000 ₽" },
  { id: "4", venue: "ГлавClub", city: "Москва", date: "3 мая 2025", status: "completed", amount: "95 000 ₽" },
  { id: "5", venue: "Teleclub", city: "Екб", date: "20 апр 2025", status: "completed", amount: "110 000 ₽" },
];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:      { label: "Активный",      cls: "text-neon-green bg-neon-green/10 border-neon-green/30" },
  planning:    { label: "Планируется",   cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30" },
  completed:   { label: "Завершён",      cls: "text-white/40 bg-white/5 border-white/10" },
  confirmed:   { label: "Подтверждено", cls: "text-neon-green bg-neon-green/10 border-neon-green/30" },
  negotiating: { label: "Переговоры",   cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30" },
};

interface DashboardToursTabProps {
  activeTab: "tours" | "history";
  onNavigate?: (page: string) => void;
}

export default function DashboardToursTab({ activeTab, onNavigate }: DashboardToursTabProps) {
  if (activeTab === "history") {
    return (
      <div className="animate-fade-in">
        <h2 className="font-oswald font-bold text-2xl text-white mb-6">История взаимодействий</h2>
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {["Площадка", "Город", "Дата", "Сумма", "Статус"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_HISTORY.map((item, i) => (
                <tr key={item.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i === MOCK_HISTORY.length - 1 ? "border-0" : ""}`}>
                  <td className="px-5 py-4">
                    <span className="font-medium text-white text-sm">{item.venue}</span>
                  </td>
                  <td className="px-5 py-4 text-white/50 text-sm">{item.city}</td>
                  <td className="px-5 py-4 text-white/50 text-sm">{item.date}</td>
                  <td className="px-5 py-4 text-neon-cyan font-medium text-sm">{item.amount}</td>
                  <td className="px-5 py-4">
                    <Badge className={`text-xs border ${STATUS_CONFIG[item.status]?.cls || ""}`}>
                      {STATUS_CONFIG[item.status]?.label || item.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h2 className="font-oswald font-bold text-2xl text-white">Мои туры и проекты</h2>
        <button
          onClick={() => onNavigate?.("projects")}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm">
          <Icon name="FolderOpen" size={16} />Перейти к проектам
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: "Route", label: "Всего туров", value: MOCK_TOURS.length },
          { icon: "CheckCircle", label: "Завершено", value: MOCK_TOURS.filter(t => t.status === "completed").length },
          { icon: "MapPin", label: "Городов охвачено", value: 47 },
          { icon: "Building2", label: "Площадок", value: 32 },
        ].map((s, i) => (
          <div key={i} className="glass rounded-2xl p-4 text-center">
            <Icon name={s.icon} size={20} className="text-neon-purple mx-auto mb-2" />
            <div className="font-oswald font-bold text-2xl gradient-text">{s.value}</div>
            <div className="text-white/40 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {MOCK_TOURS.map(tour => (
        <div key={tour.id} className="glass rounded-2xl p-5 hover-lift">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-neon-purple/15 flex items-center justify-center shrink-0">
                <Icon name="Route" size={20} className="text-neon-purple" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-oswald font-semibold text-white text-lg">{tour.name}</h3>
                  <Badge className={`text-xs border ${STATUS_CONFIG[tour.status].cls}`}>
                    {STATUS_CONFIG[tour.status].label}
                  </Badge>
                </div>
                <p className="text-neon-cyan text-sm">{tour.artist} · {tour.dates}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-oswald font-bold text-xl gradient-text">{tour.budget}</p>
              <p className="text-white/30 text-xs">{tour.confirmed}/{tour.cities} городов</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full"
                style={{ width: `${(tour.confirmed / tour.cities) * 100}%` }} />
            </div>
            <span className="text-white/40 text-xs shrink-0">{tour.confirmed}/{tour.cities}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

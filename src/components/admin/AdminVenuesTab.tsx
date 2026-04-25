import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { type AdminVenue, formatDate } from "./types";

interface Props {
  venues: AdminVenue[];
  venuesTotal: number;
  venuesPage: number;
  venuesPages: number;
  venuesSearch: string;
  venuesLoading: boolean;
  onSearchChange: (val: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onToggleVerify: (id: string) => void;
}

export default function AdminVenuesTab({
  venues, venuesTotal, venuesPage, venuesPages,
  venuesSearch, venuesLoading,
  onSearchChange, onPageChange, onRefresh, onToggleVerify,
}: Props) {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5 border border-white/10 flex-1 min-w-48">
          <Icon name="Search" size={15} className="text-white/30 shrink-0" />
          <input
            type="text" placeholder="Поиск по названию или городу..."
            value={venuesSearch}
            onChange={e => onSearchChange(e.target.value)}
            className="bg-transparent text-white placeholder:text-white/25 outline-none text-sm flex-1"
          />
        </div>
        <button onClick={onRefresh} className="p-2.5 glass rounded-xl border border-white/10 text-white/40 hover:text-white transition-colors">
          <Icon name={venuesLoading ? "Loader2" : "RefreshCw"} size={16} className={venuesLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {["Площадка","Город","Тип","Вмест.","Цена","Владелец","Дата","Статус","Верификация"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-white/40 uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {venuesLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-8 bg-white/5 rounded animate-pulse" /></td></tr>
              ))
            ) : venues.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-white/30">Площадки не найдены</td></tr>
            ) : venues.map((v, i) => (
              <tr key={v.id} className={`hover:bg-white/3 transition-colors ${i < venues.length - 1 ? "border-b border-white/5" : ""}`}>
                <td className="px-4 py-3">
                  <span className="text-white font-medium text-sm">{v.name}</span>
                </td>
                <td className="px-4 py-3 text-white/50 text-sm">{v.city}</td>
                <td className="px-4 py-3 text-white/50 text-sm">{v.venueType}</td>
                <td className="px-4 py-3 text-white/60 text-sm">{v.capacity.toLocaleString()}</td>
                <td className="px-4 py-3 text-neon-cyan text-sm whitespace-nowrap">
                  {v.priceFrom > 0 ? `от ${v.priceFrom.toLocaleString()} ₽` : "—"}
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="text-white/70 text-xs">{v.ownerName}</div>
                    <div className="text-white/30 text-xs">{v.ownerEmail}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">{formatDate(v.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {v.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-neon-green text-xs">
                        <Icon name="Star" size={11} className="fill-current" />{v.rating}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleVerify(v.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors ${v.verified ? "bg-neon-green/20 text-neon-green border-neon-green/30 hover:bg-neon-green/30" : "bg-white/5 text-white/40 border-white/10 hover:border-neon-green/40 hover:text-neon-green"}`}>
                    <Icon name="BadgeCheck" size={12} />
                    {v.verified ? "Верифицирована" : "Верифицировать"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {venuesPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-sm">Всего: {venuesTotal}</span>
          <div className="flex gap-1">
            <button onClick={() => onPageChange(Math.max(1, venuesPage - 1))} disabled={venuesPage === 1}
              className="w-8 h-8 glass rounded-lg flex items-center justify-center text-white/50 hover:text-white disabled:opacity-30 border border-white/10">
              <Icon name="ChevronLeft" size={15} />
            </button>
            {[...Array(venuesPages)].map((_, i) => (
              <button key={i} onClick={() => onPageChange(i + 1)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${venuesPage === i + 1 ? "bg-neon-purple text-white" : "glass text-white/50 hover:text-white border border-white/10"}`}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => onPageChange(Math.min(venuesPages, venuesPage + 1))} disabled={venuesPage === venuesPages}
              className="w-8 h-8 glass rounded-lg flex items-center justify-center text-white/50 hover:text-white disabled:opacity-30 border border-white/10">
              <Icon name="ChevronRight" size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

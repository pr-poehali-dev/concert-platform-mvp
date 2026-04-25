import { useState } from "react";
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
  onDelete: (id: string) => void;
}

export default function AdminVenuesTab({
  venues, venuesTotal, venuesPage, venuesPages,
  venuesSearch, venuesLoading,
  onSearchChange, onPageChange, onRefresh, onToggleVerify, onDelete,
}: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmVenue = venues.find(v => v.id === confirmId);
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
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleVerify(v.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors ${v.verified ? "bg-neon-green/20 text-neon-green border-neon-green/30 hover:bg-neon-green/30" : "bg-white/5 text-white/40 border-white/10 hover:border-neon-green/40 hover:text-neon-green"}`}>
                      <Icon name="BadgeCheck" size={12} />
                      {v.verified ? "Верифицирована" : "Верифицировать"}
                    </button>
                    <button
                      onClick={() => setConfirmId(v.id)}
                      title="Удалить площадку"
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors bg-white/5 text-white/30 hover:bg-neon-pink/20 hover:text-neon-pink">
                      <Icon name="Trash2" size={13} />
                    </button>
                  </div>
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

      {confirmId && confirmVenue && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmId(null)} />
          <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl p-6 border border-neon-pink/20 animate-scale-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-neon-pink/20 flex items-center justify-center shrink-0">
                <Icon name="Trash2" size={18} className="text-neon-pink" />
              </div>
              <h3 className="font-oswald font-bold text-white text-lg">Удалить площадку?</h3>
            </div>
            <p className="text-white/50 text-sm mb-1"><span className="text-white font-medium">{confirmVenue.name}</span></p>
            <p className="text-white/40 text-xs mb-5">{confirmVenue.city} · Это действие необратимо.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)}
                className="flex-1 py-2.5 glass text-white/60 hover:text-white rounded-xl border border-white/10 text-sm transition-colors">
                Отмена
              </button>
              <button onClick={() => { onDelete(confirmId); setConfirmId(null); }}
                className="flex-1 py-2.5 bg-neon-pink/90 hover:bg-neon-pink text-white font-oswald font-semibold rounded-xl text-sm transition-colors">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
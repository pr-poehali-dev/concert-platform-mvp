import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import VenueEditModal, { type VenueData } from "@/components/VenueEditModal";
import VenueCalendarModal from "@/components/VenueCalendarModal";
import TabHeader from "@/components/dashboard/TabHeader";

const FALLBACK_IMG = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/2d0113c6-c12e-42b6-9cd4-2141cf50ef4f.jpg";

interface BusyDate { date: string; note: string; }

interface Venue {
  id: string; name: string; city: string; venueType: string;
  capacity: number; priceFrom: number; photoUrl: string;
  photos?: string[];
  tags: string[]; rating: number; reviewsCount: number;
  description?: string; address?: string;
  riderUrl?: string; riderName?: string;
  schemaUrl?: string; schemaName?: string;
  busyDates?: BusyDate[];
}

interface DashboardVenuesTabProps {
  venues: Venue[];
  loading: boolean;
  onAddVenue: () => void;
  onReload?: () => void;
}

interface CalendarTarget {
  id: string;
  name: string;
  busyDates: BusyDate[];
}

export default function DashboardVenuesTab({ venues, loading, onAddVenue, onReload }: DashboardVenuesTabProps) {
  const { user } = useAuth();
  const [editVenue, setEditVenue]       = useState<VenueData | null>(null);
  const [calTarget, setCalTarget]       = useState<CalendarTarget | null>(null);
  // Локальные даты для каждой площадки (обновляются после сохранения без reload)
  const [localDates, setLocalDates]     = useState<Record<string, BusyDate[]>>({});

  const getBusyDates = (v: Venue) => localDates[v.id] ?? v.busyDates ?? [];

  const openEdit = (v: Venue) => {
    setEditVenue({
      id:          v.id,
      name:        v.name,
      city:        v.city,
      address:     v.address     || "",
      venueType:   v.venueType,
      capacity:    v.capacity,
      priceFrom:   v.priceFrom,
      description: v.description || "",
      tags:        v.tags        || [],
      photos:      v.photos      || (v.photoUrl ? [v.photoUrl] : []),
      photoUrl:    v.photoUrl    || "",
      riderUrl:    v.riderUrl    || "",
      riderName:   v.riderName   || "",
      schemaUrl:   v.schemaUrl   || "",
      schemaName:  v.schemaName  || "",
      busyDates:   getBusyDates(v),
    });
  };

  const openCalendar = (v: Venue) => {
    setCalTarget({ id: v.id, name: v.name, busyDates: getBusyDates(v) });
  };

  return (
    <div className="animate-fade-in">
      <TabHeader
        icon="Building2"
        title="Мои площадки"
        description="Управление вашими концертными площадками"
        iconColor="neon-cyan"
        actions={
          <button onClick={onAddVenue}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-cyan to-neon-green text-background font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm">
            <Icon name="Plus" size={16} />Добавить площадку
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl h-64 animate-pulse" />)}
        </div>
      ) : venues.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <Icon name="Building2" size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/65 text-lg font-oswald">У вас пока нет площадок</p>
          <p className="text-white/25 text-sm mt-1 mb-6">Добавьте первую площадку — она появится в поиске</p>
          <button onClick={onAddVenue}
            className="px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity">
            Добавить площадку
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {venues.map(v => {
            const busyDates = getBusyDates(v);
            return (
              <div key={v.id} className="glass rounded-2xl overflow-hidden hover-lift">
                <div className="relative h-40 overflow-hidden">
                  <img src={v.photoUrl || FALLBACK_IMG} alt={v.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <Badge className="absolute top-3 right-3 bg-background/60 backdrop-blur text-white border-white/20 text-xs">{v.venueType}</Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-oswald font-bold text-lg text-white mb-1">{v.name}</h3>
                  <div className="flex items-center gap-3 text-white/70 text-xs mb-3">
                    <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{v.city}</span>
                    <span className="flex items-center gap-1"><Icon name="Users" size={11} />{v.capacity.toLocaleString()} чел.</span>
                  </div>

                  {/* Занятые даты — кликабельный бейдж */}
                  <button
                    onClick={() => openCalendar(v)}
                    className={`flex items-center gap-1.5 text-xs mb-3 transition-colors ${
                      busyDates.length > 0
                        ? "text-neon-pink hover:text-neon-pink/80"
                        : "text-white/25 hover:text-white/70"
                    }`}
                  >
                    <Icon name="Calendar" size={11} />
                    {busyDates.length > 0
                      ? `Занято: ${busyDates.length} ${busyDates.length === 1 ? "дата" : busyDates.length < 5 ? "даты" : "дат"} · изменить`
                      : "Управлять расписанием"}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(v)}
                      className="flex-1 py-1.5 text-xs bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 rounded-lg border border-neon-purple/30 hover:border-neon-purple/50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Icon name="Pencil" size={12} />Редактировать
                    </button>
                    <button
                      onClick={() => openCalendar(v)}
                      className="px-3 py-1.5 text-xs bg-neon-pink/10 text-neon-pink rounded-lg border border-neon-pink/20 hover:bg-neon-pink/20 transition-colors"
                      title="Расписание"
                    >
                      <Icon name="CalendarDays" size={13} />
                    </button>
                    <button className="px-3 py-1.5 text-xs bg-neon-purple/20 text-neon-purple rounded-lg border border-neon-purple/30 hover:bg-neon-purple/30 transition-colors">
                      <Icon name="Eye" size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editVenue && (
        <VenueEditModal
          venue={editVenue}
          onClose={() => setEditVenue(null)}
          onSaved={() => { setEditVenue(null); onReload?.(); }}
        />
      )}

      {calTarget && (
        <VenueCalendarModal
          venueId={calTarget.id}
          venueName={calTarget.name}
          userId={user?.id || ""}
          initialDates={calTarget.busyDates}
          onClose={() => setCalTarget(null)}
          onSaved={dates => {
            // Обновляем локально без перезагрузки страницы
            setLocalDates(prev => ({ ...prev, [calTarget.id]: dates }));
            setCalTarget(null);
          }}
        />
      )}
    </div>
  );
}
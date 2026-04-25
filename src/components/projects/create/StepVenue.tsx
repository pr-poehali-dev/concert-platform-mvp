import Icon from "@/components/ui/icon";
import type { VenueOption, BookedDate } from "./types";

interface Props {
  city: string;
  dateStart: string;
  venues: VenueOption[];
  venuesLoading: boolean;
  selectedVenue: VenueOption | null;
  bookedDates: BookedDate[];
  venueSearch: string;
  dateStartBooked: boolean | string;
  onSearchChange: (v: string) => void;
  onSelectVenue: (v: VenueOption) => void;
  onClearVenue: () => void;
}

export default function StepVenue({
  city, dateStart, venues, venuesLoading, selectedVenue,
  bookedDates, venueSearch, dateStartBooked,
  onSearchChange, onSelectVenue, onClearVenue,
}: Props) {
  const filteredVenues = venues.filter(v =>
    !venueSearch || v.name.toLowerCase().includes(venueSearch.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-white/50 text-sm">Выберите площадку из базы или пропустите — запрос на бронирование отправится автоматически.</p>

      <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5 border border-white/10">
        <Icon name="Search" size={14} className="text-white/30 shrink-0" />
        <input type="text" placeholder="Поиск по названию..." value={venueSearch} onChange={e => onSearchChange(e.target.value)}
          className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm" />
      </div>

      {venuesLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="glass rounded-xl h-16 animate-pulse" />)}</div>
      ) : venues.length === 0 ? (
        <div className="text-center py-8 glass rounded-2xl">
          <Icon name="Building2" size={32} className="text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-sm">Площадок в городе {city} нет</p>
          <p className="text-white/25 text-xs mt-1">Можете продолжить без выбора площадки</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredVenues.map(v => {
            const isSelected = selectedVenue?.id === v.id;
            return (
              <div key={v.id} onClick={() => onSelectVenue(v)}
                className={`glass rounded-xl p-4 cursor-pointer border transition-all ${isSelected ? "border-neon-purple/60 bg-neon-purple/10" : "border-white/10 hover:border-white/25"}`}>
                <div className="flex items-center gap-3">
                  {v.photoUrl ? (
                    <img src={v.photoUrl} alt={v.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-neon-cyan/10 flex items-center justify-center shrink-0">
                      <Icon name="Building2" size={20} className="text-neon-cyan/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-oswald font-semibold text-white text-sm">{v.name}</span>
                      {isSelected && <Icon name="CheckCircle" size={14} className="text-neon-purple shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 text-white/40 text-xs mt-0.5">
                      <span>{v.venueType}</span>
                      <span>{v.capacity.toLocaleString()} чел.</span>
                      {v.priceFrom > 0 && <span>от {v.priceFrom.toLocaleString()} ₽</span>}
                    </div>
                  </div>
                </div>

                {isSelected && bookedDates.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-white/40 mb-2 flex items-center gap-1"><Icon name="CalendarX" size={11} />Занятые даты:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {bookedDates.map(b => (
                        <span key={b.date} className="text-xs px-2 py-0.5 bg-neon-pink/10 text-neon-pink border border-neon-pink/20 rounded-lg" title={b.note}>{b.date}</span>
                      ))}
                    </div>
                  </div>
                )}

                {isSelected && dateStartBooked && (
                  <div className="mt-2 flex items-center gap-2 text-neon-pink text-xs bg-neon-pink/10 rounded-lg px-3 py-2">
                    <Icon name="AlertCircle" size={12} />Дата {dateStart} уже занята — выберите другую или другую площадку
                  </div>
                )}

                {isSelected && dateStart && !dateStartBooked && (
                  <div className="mt-2 flex items-center gap-2 text-neon-green text-xs bg-neon-green/10 rounded-lg px-3 py-2">
                    <Icon name="CheckCircle" size={12} />{dateStart} — дата свободна, запрос на бронирование будет отправлен
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedVenue && (
        <button onClick={onClearVenue} className="text-white/40 hover:text-neon-pink text-xs flex items-center gap-1 transition-colors">
          <Icon name="X" size={11} />Отменить выбор площадки
        </button>
      )}
    </div>
  );
}

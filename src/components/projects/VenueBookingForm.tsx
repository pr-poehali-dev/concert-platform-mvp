import Icon from "@/components/ui/icon";
import type { VenueOption, BookedDate, BookForm } from "./venueTabTypes";

interface Props {
  projectCity: string;
  venues: VenueOption[];
  venuesLoading: boolean;
  venueSearch: string;
  selectedVenue: VenueOption | null;
  bookedDates: BookedDate[];
  bookForm: BookForm;
  bookError: string;
  bookSending: boolean;
  onSearchChange: (v: string) => void;
  onSelectVenue: (v: VenueOption) => void;
  onBookFormChange: (f: BookForm) => void;
  onSend: () => void;
  onClose: () => void;
}

export default function VenueBookingForm({
  projectCity, venues, venuesLoading, venueSearch, selectedVenue,
  bookedDates, bookForm, bookError, bookSending,
  onSearchChange, onSelectVenue, onBookFormChange, onSend, onClose,
}: Props) {
  const dateIsBusy = bookedDates.some(d => d.date === bookForm.eventDate);
  const filteredVenues = venues.filter(v =>
    !venueSearch || v.name.toLowerCase().includes(venueSearch.toLowerCase())
  );

  return (
    <div className="glass-strong rounded-2xl border border-neon-purple/30 overflow-hidden animate-scale-in">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h4 className="font-oswald font-bold text-white flex items-center gap-2">
          <Icon name="Building2" size={16} className="text-neon-purple" />
          Выбор площадки и дата
        </h4>
        <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
          <Icon name="X" size={16} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Поиск площадок */}
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
            Площадка {projectCity && <span className="text-neon-cyan">· {projectCity}</span>}
          </label>
          <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 border border-white/10 mb-3">
            <Icon name="Search" size={14} className="text-white/30 shrink-0" />
            <input
              type="text" placeholder="Поиск по названию..."
              value={venueSearch} onChange={e => onSearchChange(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm"
            />
          </div>

          {venuesLoading ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="glass rounded-xl h-16 animate-pulse" />)}</div>
          ) : filteredVenues.length === 0 ? (
            <div className="text-center py-6 glass rounded-xl">
              <Icon name="Building2" size={28} className="text-white/15 mx-auto mb-2" />
              <p className="text-white/40 text-sm">Площадок не найдено</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredVenues.map(v => {
                const isSelected = selectedVenue?.id === v.id;
                return (
                  <div key={v.id} onClick={() => onSelectVenue(v)}
                    className={`glass rounded-xl p-3.5 cursor-pointer border transition-all ${isSelected ? "border-neon-purple/60 bg-neon-purple/10" : "border-white/10 hover:border-white/25"}`}>
                    <div className="flex items-center gap-3">
                      {v.photoUrl ? (
                        <img src={v.photoUrl} alt={v.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center shrink-0">
                          <Icon name="Building2" size={18} className="text-neon-cyan/50" />
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
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <p className="text-[10px] text-white/40 mb-1.5 flex items-center gap-1"><Icon name="CalendarX" size={10} />Занято:</p>
                        <div className="flex flex-wrap gap-1">
                          {bookedDates.slice(0, 8).map(b => (
                            <span key={b.date} className="text-[10px] px-1.5 py-0.5 bg-neon-pink/10 text-neon-pink border border-neon-pink/20 rounded">{b.date}</span>
                          ))}
                          {bookedDates.length > 8 && <span className="text-[10px] text-white/30">+{bookedDates.length - 8}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Детали бронирования */}
        {selectedVenue && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            <label className="text-xs text-white/40 uppercase tracking-wider block">Детали мероприятия</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Дата *</label>
                <input type="date" value={bookForm.eventDate}
                  onChange={e => onBookFormChange({ ...bookForm, eventDate: e.target.value })}
                  className={`w-full glass rounded-xl px-3 py-2 text-white text-sm border outline-none bg-transparent ${dateIsBusy ? "border-neon-pink/50" : "border-white/10 focus:border-neon-purple/50"}`}
                />
                {dateIsBusy && <p className="text-neon-pink text-xs mt-1 flex items-center gap-1"><Icon name="AlertCircle" size={10} />Дата занята</p>}
                {bookForm.eventDate && !dateIsBusy && (
                  <p className="text-neon-green text-xs mt-1 flex items-center gap-1"><Icon name="CheckCircle" size={10} />Дата свободна</p>
                )}
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Время начала</label>
                <input type="time" value={bookForm.eventTime}
                  onChange={e => onBookFormChange({ ...bookForm, eventTime: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 focus:border-neon-purple/50 outline-none bg-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Артист</label>
                <input type="text" value={bookForm.artist} placeholder="Имя артиста"
                  onChange={e => onBookFormChange({ ...bookForm, artist: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 focus:border-neon-purple/50 outline-none placeholder:text-white/25"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Возраст, +</label>
                <input type="text" value={bookForm.ageLimit} placeholder="18"
                  onChange={e => onBookFormChange({ ...bookForm, ageLimit: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 focus:border-neon-purple/50 outline-none placeholder:text-white/25"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-white/40 mb-1 block">Ожидаемых гостей</label>
                <input type="number" value={bookForm.expectedGuests} placeholder="500"
                  onChange={e => onBookFormChange({ ...bookForm, expectedGuests: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2 text-white text-sm border border-white/10 focus:border-neon-purple/50 outline-none placeholder:text-white/25"
                />
              </div>
            </div>
          </div>
        )}

        {bookError && (
          <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-4 py-3">
            <Icon name="AlertCircle" size={15} />{bookError}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onSend}
            disabled={bookSending || !selectedVenue || !bookForm.eventDate || dateIsBusy}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {bookSending ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Send" size={14} />}
            Отправить запрос
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 glass rounded-xl text-white/50 hover:text-white text-sm transition-colors border border-white/10">
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

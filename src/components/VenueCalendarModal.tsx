import { useState, useCallback, useEffect } from "react";
import Icon from "@/components/ui/icon";
import VenueInlineCalendar from "@/components/venue-setup/VenueInlineCalendar";

const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";

interface BusyDate {
  date: string;
  note: string;
}

interface Props {
  venueId: string;
  venueName: string;
  userId: string;
  initialDates: BusyDate[];
  onClose: () => void;
  onSaved: (dates: BusyDate[]) => void;
}

export default function VenueCalendarModal({ venueId, venueName, userId, initialDates, onClose, onSaved }: Props) {
  // Map: date -> note
  const [notesMap, setNotesMap] = useState<Map<string, string>>(
    () => new Map(initialDates.map(d => [d.date, d.note]))
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialDates.map(d => d.date))
  );

  // Выбранная дата для редактирования заметки
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");

  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleToggle = useCallback((ds: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(ds)) {
        next.delete(ds);
        setNotesMap(m => { const nm = new Map(m); nm.delete(ds); return nm; });
        if (activeDate === ds) setActiveDate(null);
      } else {
        next.add(ds);
        // Сразу открываем поле заметки
        setActiveDate(ds);
        setNoteInput(notesMap.get(ds) || "");
      }
      return next;
    });
  }, [activeDate, notesMap]);

  const handleSelectDate = (ds: string) => {
    if (!selected.has(ds)) return;
    setActiveDate(ds);
    setNoteInput(notesMap.get(ds) || "");
  };

  const handleSaveNote = () => {
    if (!activeDate) return;
    setNotesMap(m => new Map(m).set(activeDate, noteInput.trim()));
    setActiveDate(null);
    setNoteInput("");
  };

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const busyDates = Array.from(selected).map(date => ({
        date,
        note: notesMap.get(date) || "",
      }));
      const res = await fetch(`${VENUES_URL}?action=update_busy_dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, userId, busyDates }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Ошибка сохранения");
      setSaved(true);
      onSaved(d.busyDates || busyDates);
      setTimeout(() => onClose(), 900);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  // Форматируем дату для отображения
  const formatDate = (ds: string) => {
    try { return new Date(ds + "T12:00:00").toLocaleDateString("ru", { day: "numeric", month: "long", weekday: "long" }); }
    catch { return ds; }
  };

  // Список занятых дат (для боковой панели)
  const sortedDates = Array.from(selected).sort();

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl glass-strong rounded-2xl overflow-hidden animate-scale-in flex flex-col max-h-[92vh]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-pink to-transparent" />

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-neon-pink/10 border border-neon-pink/20 flex items-center justify-center">
            <Icon name="Calendar" size={17} className="text-neon-pink" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-oswald font-bold text-xl text-white">Занятые даты</h2>
            <p className="text-white/40 text-xs truncate">{venueName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Левая часть — календарь */}
          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-white/40 text-xs mb-3">
              Нажмите на дату чтобы отметить её как занятую. Нажмите снова — снять отметку.
            </p>
            <VenueInlineCalendar
              selected={selected}
              onToggle={handleToggle}
              notes={notesMap}
            />

            {/* Поле заметки для выбранной даты */}
            {activeDate && selected.has(activeDate) && (
              <div className="mt-4 glass rounded-2xl p-4 border border-neon-pink/20">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="CalendarDays" size={14} className="text-neon-pink" />
                  <p className="text-white/70 text-sm font-medium capitalize">{formatDate(activeDate)}</p>
                </div>
                <p className="text-white/40 text-xs mb-2">Что проходит в этот день?</p>
                <input
                  type="text"
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveNote(); if (e.key === "Escape") setActiveDate(null); }}
                  placeholder="Например: концерт группы «Название», репетиция..."
                  className="gl-input w-full mb-3"
                  autoFocus
                  maxLength={120}
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveNote}
                    className="flex-1 py-2 text-sm bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-xl hover:bg-neon-pink/30 transition-colors flex items-center justify-center gap-1.5">
                    <Icon name="Check" size={14} />Сохранить заметку
                  </button>
                  <button onClick={() => setActiveDate(null)}
                    className="px-4 py-2 text-sm text-white/40 hover:text-white/60 transition-colors">
                    Пропустить
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Правая панель — список занятых дат */}
          <div className="w-64 border-l border-white/10 flex flex-col shrink-0">
            <div className="px-4 pt-4 pb-2 shrink-0">
              <p className="text-white/40 text-xs uppercase tracking-wider">
                Занято {sortedDates.length} {sortedDates.length === 1 ? "дата" : sortedDates.length < 5 ? "даты" : "дат"}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
              {sortedDates.length === 0 ? (
                <div className="text-center py-8 text-white/20 text-xs">
                  Нет занятых дат
                </div>
              ) : (
                sortedDates.map(ds => {
                  const note = notesMap.get(ds) || "";
                  const isActive = activeDate === ds;
                  return (
                    <div
                      key={ds}
                      onClick={() => handleSelectDate(ds)}
                      className={`rounded-xl px-3 py-2.5 cursor-pointer transition-all border ${
                        isActive
                          ? "bg-neon-pink/15 border-neon-pink/40"
                          : "bg-white/3 border-white/5 hover:bg-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white/80 text-xs font-medium">
                            {new Date(ds + "T12:00:00").toLocaleDateString("ru", { day: "numeric", month: "short" })}
                          </p>
                          {note ? (
                            <p className="text-white/40 text-xs mt-0.5 truncate">{note}</p>
                          ) : (
                            <p className="text-white/20 text-xs mt-0.5 italic">Без описания</p>
                          )}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleToggle(ds); }}
                          className="text-white/20 hover:text-neon-pink transition-colors shrink-0 mt-0.5"
                        >
                          <Icon name="X" size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {sortedDates.length > 0 && (
              <div className="px-3 pb-3 shrink-0">
                <button
                  onClick={() => { setSelected(new Set()); setNotesMap(new Map()); setActiveDate(null); }}
                  className="w-full py-2 text-xs text-white/30 hover:text-neon-pink border border-white/5 hover:border-neon-pink/20 rounded-xl transition-all"
                >
                  Очистить все даты
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 shrink-0">
          {error && (
            <div className="flex items-center gap-2 text-neon-pink text-sm">
              <Icon name="AlertCircle" size={14} />{error}
            </div>
          )}
          {!error && <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 glass rounded-xl text-white/60 hover:text-white transition-colors text-sm">
              Отмена
            </button>
            <button onClick={handleSave} disabled={saving || saved}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity text-sm">
              {saved
                ? <><Icon name="CheckCircle2" size={16} />Сохранено!</>
                : saving
                ? <><Icon name="Loader2" size={16} className="animate-spin" />Сохранение...</>
                : <><Icon name="Save" size={16} />Сохранить</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const TICKETS_URL = "https://functions.poehali.dev/e8e3c7c9-b452-4e77-8db2-ca0266399006";

export interface TicketIntegrationForm {
  skip: boolean;
  apiKey: string;
  eventId: string;
  // если пользователь выбрал из списка событий TC
  selectedEvent: TcEvent | null;
}

export interface TcEvent {
  id: string;
  title: string;
  status: string;
  date_start: string;
  city: string;
}

interface SavedApiKey {
  apiKey: string;
  label: string;
}

interface Props {
  userId: string;
  value: TicketIntegrationForm;
  onChange: (v: TicketIntegrationForm) => void;
}

function fmtDate(s: string) {
  if (!s) return "";
  try {
    const [y, m, d] = s.split("-");
    const months = ["", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    return `${parseInt(d)} ${months[parseInt(m)]} ${y}`;
  } catch { return s; }
}

export default function StepTickets({ userId, value, onChange }: Props) {
  const set = (patch: Partial<TicketIntegrationForm>) => onChange({ ...value, ...patch });

  // Сохранённые API-ключи пользователя (из прошлых интеграций)
  const [savedKeys, setSavedKeys] = useState<SavedApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [hasSavedKey, setHasSavedKey] = useState(false);

  // Список событий TC
  const [tcEvents, setTcEvents] = useState<TcEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [eventSearch, setEventSearch] = useState("");

  // Загружаем прошлые ключи из интеграций пользователя
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`${TICKETS_URL}?action=list&user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const ints = data.integrations || [];
        const seen = new Set<string>();
        const keys: SavedApiKey[] = [];
        for (const i of ints) {
          if (i.hasApiKey && i.apiKey && !seen.has(i.apiKey)) {
            seen.add(i.apiKey);
            keys.push({ apiKey: i.apiKey, label: i.name || "TicketsCloud" });
          }
        }
        setSavedKeys(keys);
        setHasSavedKey(keys.length > 0);
        // Если есть сохранённый ключ и поле ещё пустое — подставляем
        if (keys.length > 0) {
          set({ apiKey: keys[0].apiKey });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setKeysLoading(false); });
    return () => { cancelled = true; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Когда apiKey заполнен — загружаем события (только при монтировании с ключом)
  const loadEvents = async (key: string) => {
    if (!key.trim()) return;
    setEventsLoading(true);
    setEventsError("");
    setTcEvents([]);
    try {
      const res = await fetch(`${TICKETS_URL}?action=list_tc_events&api_key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка API");
      setTcEvents(data.events || []);
    } catch (e: unknown) {
      setEventsError(e instanceof Error ? e.message : "Не удалось загрузить события");
    } finally {
      setEventsLoading(false);
    }
  };

  // При автоподстановке ключа — загружаем события один раз
  const prevApiKeyRef = useRef("");
  useEffect(() => {
    if (value.apiKey && !value.skip && value.apiKey !== prevApiKeyRef.current) {
      prevApiKeyRef.current = value.apiKey;
      loadEvents(value.apiKey);
    }
  }, [value.apiKey, value.skip]);  

  const filteredEvents = tcEvents.filter(e =>
    !eventSearch || e.title.toLowerCase().includes(eventSearch.toLowerCase()) ||
    e.city.toLowerCase().includes(eventSearch.toLowerCase())
  );

  if (value.skip) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 glass rounded-2xl border border-white/5">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Icon name="SkipForward" size={22} className="text-white/30" />
          </div>
          <p className="text-white/50 text-sm mb-1">Интеграция пропущена</p>
          <p className="text-white/25 text-xs">Подключить TicketsCloud можно позже во вкладке «Билеты»</p>
        </div>
        <button
          onClick={() => set({ skip: false })}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 glass border border-white/10 hover:border-neon-purple/40 text-white/50 hover:text-white rounded-xl text-sm transition-all"
        >
          <Icon name="Ticket" size={15} />
          Всё же подключить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-white/60 text-sm mb-4">
          Подключите TicketsCloud — продажи и тираж билетов подтянутся автоматически.
        </p>

        {/* API ключ */}
        <div className="space-y-2">
          <label className="text-white/50 text-xs uppercase tracking-wider block">
            API-ключ TicketsCloud
          </label>

          {keysLoading ? (
            <div className="flex items-center gap-2 text-white/30 text-sm py-2">
              <Icon name="Loader2" size={14} className="animate-spin" />
              Проверяю прошлые интеграции...
            </div>
          ) : hasSavedKey ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2.5 glass rounded-xl border border-neon-green/30 bg-neon-green/5">
                <Icon name="CheckCircle" size={15} className="text-neon-green shrink-0" />
                <span className="text-neon-green text-sm">API-ключ подтянут из прошлой интеграции</span>
              </div>
              {savedKeys.length > 1 && (
                <select
                  value={value.apiKey}
                  onChange={e => { set({ apiKey: e.target.value, selectedEvent: null }); loadEvents(e.target.value); }}
                  className="w-full glass rounded-xl px-4 py-2.5 text-white/70 outline-none border border-white/10 focus:border-neon-purple/50 text-sm bg-transparent"
                >
                  {savedKeys.map((k, i) => (
                    <option key={i} value={k.apiKey} className="bg-gray-900">{k.label}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="password"
                value={value.apiKey}
                onChange={e => set({ apiKey: e.target.value, selectedEvent: null })}
                placeholder="Вставьте API-ключ из личного кабинета TicketsCloud"
                className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm font-mono"
              />
              <button
                onClick={() => loadEvents(value.apiKey)}
                disabled={!value.apiKey.trim() || eventsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-neon-purple/15 border border-neon-purple/30 text-neon-purple rounded-xl text-sm hover:bg-neon-purple/25 transition-colors disabled:opacity-40"
              >
                <Icon name={eventsLoading ? "Loader2" : "Search"} size={14} className={eventsLoading ? "animate-spin" : ""} />
                Загрузить мои события
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Список событий */}
      {eventsError && (
        <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2">
          <Icon name="AlertCircle" size={14} />{eventsError}
        </div>
      )}

      {eventsLoading && (
        <div className="flex items-center justify-center py-6 gap-2 text-white/40 text-sm">
          <Icon name="Loader2" size={18} className="animate-spin" />
          Загружаю события из TicketsCloud...
        </div>
      )}

      {tcEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-white/50 text-xs uppercase tracking-wider">
              Выберите событие
            </label>
            <span className="text-white/25 text-xs">({tcEvents.length} найдено)</span>
          </div>

          {tcEvents.length > 4 && (
            <input
              value={eventSearch}
              onChange={e => setEventSearch(e.target.value)}
              placeholder="Поиск по названию или городу..."
              className="w-full glass rounded-xl px-3 py-2 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm"
            />
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
            {filteredEvents.map(ev => {
              const isSelected = value.selectedEvent?.id === ev.id;
              return (
                <button
                  key={ev.id}
                  onClick={() => set({ selectedEvent: isSelected ? null : ev, eventId: isSelected ? "" : ev.id })}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    isSelected
                      ? "border-neon-purple/60 bg-neon-purple/10 text-white"
                      : "border-white/8 glass hover:border-white/20 text-white/70 hover:text-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ev.date_start && (
                          <span className="text-xs text-white/40 flex items-center gap-1">
                            <Icon name="Calendar" size={10} />{fmtDate(ev.date_start)}
                          </span>
                        )}
                        {ev.city && (
                          <span className="text-xs text-white/40 flex items-center gap-1">
                            <Icon name="MapPin" size={10} />{ev.city}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        ev.status === "public"
                          ? "text-neon-green border-neon-green/30 bg-neon-green/10"
                          : "text-white/30 border-white/10"
                      }`}>
                        {ev.status === "public" ? "активно" : ev.status}
                      </span>
                      {isSelected && <Icon name="CheckCircle" size={16} className="text-neon-purple" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Или ввести ID вручную */}
          <div className="pt-1">
            <p className="text-white/30 text-xs mb-2">или введите ID события вручную</p>
            <input
              value={value.selectedEvent ? value.selectedEvent.id : value.eventId}
              onChange={e => set({ eventId: e.target.value, selectedEvent: null })}
              placeholder="ID события из TicketsCloud"
              className="w-full glass rounded-xl px-3 py-2 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm font-mono"
            />
          </div>
        </div>
      )}

      {/* Если нет событий и не загружаем — просто поле для ID */}
      {!eventsLoading && tcEvents.length === 0 && value.apiKey && (
        <div className="space-y-2">
          <label className="text-white/50 text-xs uppercase tracking-wider block">ID события</label>
          <input
            value={value.eventId}
            onChange={e => set({ eventId: e.target.value })}
            placeholder="Например: 69e553b7a5419b5aa5a7a675"
            className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm font-mono"
          />
        </div>
      )}

      {/* Выбранное событие — подтверждение */}
      {(value.selectedEvent || value.eventId) && (
        <div className="flex items-center gap-2 px-3 py-2.5 glass rounded-xl border border-neon-cyan/30 bg-neon-cyan/5">
          <Icon name="Ticket" size={15} className="text-neon-cyan shrink-0" />
          <div className="min-w-0">
            <p className="text-neon-cyan text-sm">
              {value.selectedEvent ? value.selectedEvent.title : `Событие ${value.eventId}`}
            </p>
            <p className="text-white/30 text-xs">
              Данные о тираже и продажах подтянутся при создании проекта
            </p>
          </div>
        </div>
      )}

      {/* Пропустить */}
      <button
        onClick={() => set({ skip: true, apiKey: "", eventId: "", selectedEvent: null })}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white/30 hover:text-white/60 text-sm transition-colors"
      >
        <Icon name="SkipForward" size={14} />
        Пропустить, подключу позже
      </button>
    </div>
  );
}
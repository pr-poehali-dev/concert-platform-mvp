import { useState } from "react";
import Icon from "@/components/ui/icon";

const TICKETS_URL = "https://functions.poehali.dev/e8e3c7c9-b452-4e77-8db2-ca0266399006";

interface TcEvent {
  id: string;
  title: string;
  status: string;
  date_start: string;
  city: string;
  selected?: boolean;
}

interface Props {
  userId: string;
  onClose: () => void;
  onImported: (lastProjectId: string) => void;
}

function fmtDate(s: string) {
  if (!s) return "";
  try {
    const [y, m, d] = s.split("-");
    const months = ["", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    return `${parseInt(d)} ${months[parseInt(m)]} ${y}`;
  } catch { return s; }
}

export default function TcImportModal({ userId, onClose, onImported }: Props) {
  const [step, setStep] = useState<"key" | "events" | "importing" | "done">("key");
  const [apiKey, setApiKey] = useState("");
  const [events, setEvents] = useState<TcEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<{ title: string; ok: boolean; msg: string }[]>([]);
  const [lastProjectId, setLastProjectId] = useState("");
  const [search, setSearch] = useState("");

  const loadEvents = async () => {
    if (!apiKey.trim()) return;
    setLoadingEvents(true);
    setEventsError("");
    try {
      const res = await fetch(`${TICKETS_URL}?action=list_tc_events&api_key=${encodeURIComponent(apiKey)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка API TicketsCloud");
      const evs: TcEvent[] = (data.events || []).map((e: TcEvent) => ({ ...e, selected: true }));
      setEvents(evs);
      setStep("events");
    } catch (e: unknown) {
      setEventsError(e instanceof Error ? e.message : "Не удалось загрузить события");
    } finally {
      setLoadingEvents(false);
    }
  };

  const toggleEvent = (id: string) => {
    setEvents(ev => ev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
  };

  const toggleAll = () => {
    const allSelected = events.every(e => e.selected);
    setEvents(ev => ev.map(e => ({ ...e, selected: !allSelected })));
  };

  const selectedEvents = events.filter(e => e.selected);

  const runImport = async () => {
    if (!selectedEvents.length) return;
    setImporting(true);
    setStep("importing");
    const log: { title: string; ok: boolean; msg: string }[] = [];
    let lastId = "";

    for (const ev of selectedEvents) {
      try {
        const res = await fetch(`${TICKETS_URL}?action=create_from_tc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, apiKey, eventId: ev.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ошибка");
        lastId = data.projectId;
        log.push({ title: ev.title, ok: true, msg: "Создан" });
      } catch (e: unknown) {
        log.push({ title: ev.title, ok: false, msg: e instanceof Error ? e.message : "Ошибка" });
      }
      setImportLog([...log]);
    }

    setLastProjectId(lastId);
    setImporting(false);
    setStep("done");
  };

  const filteredEvents = events.filter(e =>
    !search ||
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={step !== "importing" ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-lg glass-strong rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-xl">
              🎫
            </div>
            <div>
              <h2 className="font-oswald font-bold text-xl text-white">Импорт из TicketsCloud</h2>
              <p className="text-white/40 text-xs">Создать проекты из событий TC</p>
            </div>
          </div>
          {step !== "importing" && (
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
              <Icon name="X" size={16} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-4 space-y-4">

          {/* Шаг 1: API ключ */}
          {step === "key" && (
            <div className="space-y-4">
              <p className="text-white/55 text-sm">
                Введите API-ключ из личного кабинета TicketsCloud — мы загрузим список всех ваших событий и создадим проекты автоматически.
              </p>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">API-ключ TicketsCloud</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && loadEvents()}
                  placeholder="Вставьте API-ключ..."
                  autoFocus
                  className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm font-mono"
                />
                <a
                  href="https://manager.ticketscloud.com/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neon-cyan/60 text-xs mt-1 flex items-center gap-1 hover:text-neon-cyan transition-colors"
                >
                  <Icon name="ExternalLink" size={11} />
                  Где найти API-ключ в TicketsCloud
                </a>
              </div>
              {eventsError && (
                <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2">
                  <Icon name="AlertCircle" size={14} />{eventsError}
                </div>
              )}
            </div>
          )}

          {/* Шаг 2: Список событий */}
          {step === "events" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white/55 text-sm">Выберите события для импорта</p>
                <button onClick={toggleAll} className="text-xs text-neon-cyan/70 hover:text-neon-cyan transition-colors">
                  {events.every(e => e.selected) ? "Снять все" : "Выбрать все"}
                </button>
              </div>

              {events.length > 5 && (
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full glass rounded-xl px-3 py-2 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm"
                />
              )}

              <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                {filteredEvents.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => toggleEvent(ev.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                      ev.selected
                        ? "border-neon-cyan/40 bg-neon-cyan/8 text-white"
                        : "border-white/8 glass text-white/50 hover:text-white/70"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      ev.selected ? "bg-neon-cyan border-neon-cyan" : "border-white/20"
                    }`}>
                      {ev.selected && <Icon name="Check" size={10} className="text-black" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{ev.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ev.date_start && (
                          <span className="text-xs text-white/35">{fmtDate(ev.date_start)}</span>
                        )}
                        {ev.city && (
                          <span className="text-xs text-white/35">{ev.city}</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                      ev.status === "public"
                        ? "text-neon-green border-neon-green/30"
                        : "text-white/25 border-white/10"
                    }`}>
                      {ev.status === "public" ? "активно" : ev.status}
                    </span>
                  </button>
                ))}
                {filteredEvents.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-4">Ничего не найдено</p>
                )}
              </div>

              {selectedEvents.length > 0 && (
                <div className="px-3 py-2 glass rounded-xl border border-white/8 text-white/50 text-xs">
                  Выбрано <span className="text-white font-semibold">{selectedEvents.length}</span> из {events.length} событий
                </div>
              )}
            </div>
          )}

          {/* Шаг 3: Импорт */}
          {step === "importing" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Icon name="Loader2" size={16} className="animate-spin" />
                Создаю проекты...
              </div>
              <div className="space-y-2">
                {importLog.map((l, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                    l.ok ? "bg-neon-green/8 border border-neon-green/20 text-neon-green" : "bg-neon-pink/8 border border-neon-pink/20 text-neon-pink"
                  }`}>
                    <Icon name={l.ok ? "CheckCircle" : "XCircle"} size={14} className="shrink-0" />
                    <span className="truncate">{l.title}</span>
                    <span className="text-xs opacity-60 ml-auto shrink-0">{l.msg}</span>
                  </div>
                ))}
                {importLog.length < selectedEvents.length && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-white/30 text-sm">
                    <Icon name="Clock" size={14} />
                    Осталось: {selectedEvents.length - importLog.length} событий...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Шаг 4: Готово */}
          {step === "done" && (
            <div className="space-y-3">
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-neon-green/10 border border-neon-green/25 flex items-center justify-center mx-auto mb-3">
                  <Icon name="CheckCircle" size={28} className="text-neon-green" />
                </div>
                <p className="text-white font-semibold text-lg">
                  Импорт завершён
                </p>
                <p className="text-white/40 text-sm mt-1">
                  {importLog.filter(l => l.ok).length} из {importLog.length} проектов создано
                </p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {importLog.map((l, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                    l.ok ? "bg-neon-green/8 border border-neon-green/20 text-neon-green" : "bg-neon-pink/8 border border-neon-pink/20 text-neon-pink"
                  }`}>
                    <Icon name={l.ok ? "CheckCircle" : "XCircle"} size={14} className="shrink-0" />
                    <span className="truncate">{l.title}</span>
                    <span className="text-xs opacity-60 ml-auto shrink-0">{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 shrink-0 flex items-center justify-between gap-3">
          {step === "key" && (
            <>
              <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-white/50 hover:text-white text-sm transition-colors">
                Отмена
              </button>
              <button
                onClick={loadEvents}
                disabled={!apiKey.trim() || loadingEvents}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 text-sm transition-opacity"
              >
                {loadingEvents
                  ? <><Icon name="Loader2" size={15} className="animate-spin" />Загружаю события...</>
                  : <><Icon name="Download" size={15} />Загрузить события</>
                }
              </button>
            </>
          )}

          {step === "events" && (
            <>
              <button onClick={() => setStep("key")} className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-white/50 hover:text-white text-sm transition-colors">
                <Icon name="ChevronLeft" size={16} />Назад
              </button>
              <button
                onClick={runImport}
                disabled={selectedEvents.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 text-sm transition-opacity"
              >
                <Icon name="Download" size={15} />
                Импортировать {selectedEvents.length > 0 ? `${selectedEvents.length} событий` : ""}
              </button>
            </>
          )}

          {step === "done" && (
            <button
              onClick={() => lastProjectId ? onImported(lastProjectId) : onClose()}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-green to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 text-sm transition-opacity"
            >
              <Icon name="Check" size={15} />
              {lastProjectId ? "Открыть последний проект" : "Готово"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

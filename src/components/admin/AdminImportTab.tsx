import { useState } from "react";
import Icon from "@/components/ui/icon";

const IMPORT_URL = "https://functions.poehali.dev/c7f2752f-6618-495c-9f9e-8553dce85384";

interface YandexVenue {
  yandexOrgId: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  website: string;
  tags: string[];
  venueType: string;
  latitude: number | null;
  longitude: number | null;
  alreadyImported?: boolean;
}

const CITIES = ["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Казань", "Краснодар", "Нижний Новгород", "Ростов-на-Дону", "Уфа", "Самара"];
const QUERIES = ["концертный клуб", "клуб живой музыки", "концертный зал", "рок-клуб", "джаз-клуб", "ночной клуб концерты", "арена концерты", "бар живая музыка"];

export default function AdminImportTab({ token }: { token: string }) {
  const [query, setQuery] = useState("концертный клуб");
  const [city, setCity] = useState("Москва");
  const [results, setResults] = useState<YandexVenue[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const search = async () => {
    setLoading(true);
    setMessage(null);
    setSelected(new Set());
    try {
      const res = await fetch(`${IMPORT_URL}/?action=search&query=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка поиска");
      setResults(data.results || []);
      if ((data.results || []).length === 0) setMessage({ type: "err", text: "Ничего не найдено. Попробуй другой запрос или город." });
    } catch (e: unknown) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Ошибка" });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const selectAll = () => {
    const available = results.filter(r => !r.alreadyImported).map(r => r.yandexOrgId || r.name);
    setSelected(new Set(available));
  };

  const importSelected = async () => {
    const toImport = results.filter(r => selected.has(r.yandexOrgId || r.name));
    if (!toImport.length) return;
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch(`${IMPORT_URL}/?action=import`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Secret": token },
        body: JSON.stringify({ venues: toImport }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка импорта");
      setMessage({ type: "ok", text: `Импортировано: ${data.imported}, пропущено (уже есть): ${data.skipped}` });
      setResults(prev => prev.map(r =>
        selected.has(r.yandexOrgId || r.name) ? { ...r, alreadyImported: true } : r
      ));
      setSelected(new Set());
    } catch (e: unknown) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Ошибка" });
    } finally {
      setImporting(false);
    }
  };

  const availableCount = results.filter(r => !r.alreadyImported).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-oswald font-bold text-xl text-white">Импорт площадок</h2>
          <p className="text-white/40 text-sm mt-0.5">Поиск через Яндекс API — поиск по организациям</p>
        </div>
      </div>

      {/* Форма поиска */}
      <div className="glass rounded-2xl p-6 border border-white/10 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Запрос</label>
            <select
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 transition-colors text-sm bg-transparent"
            >
              {QUERIES.map(q => <option key={q} value={q} className="bg-gray-900">{q}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Город</label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 transition-colors text-sm bg-transparent"
            >
              {CITIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={search}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <><Icon name="Loader2" size={16} className="animate-spin" />Поиск...</> : <><Icon name="Search" size={16} />Найти площадки</>}
            </button>
          </div>
        </div>
      </div>

      {/* Сообщения */}
      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${message.type === "ok" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-neon-pink/10 border-neon-pink/20 text-neon-pink"}`}>
          <Icon name={message.type === "ok" ? "CheckCircle2" : "AlertCircle"} size={16} />
          {message.text}
        </div>
      )}

      {/* Результаты */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-sm">
              Найдено: <span className="text-white font-semibold">{results.length}</span> площадок
              {availableCount < results.length && <span className="text-white/40"> · уже в базе: {results.length - availableCount}</span>}
            </p>
            <div className="flex items-center gap-3">
              {availableCount > 0 && (
                <button onClick={selectAll} className="text-neon-purple text-sm hover:underline">
                  Выбрать все ({availableCount})
                </button>
              )}
              {selected.size > 0 && (
                <button
                  onClick={importSelected}
                  disabled={importing}
                  className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                >
                  {importing ? <><Icon name="Loader2" size={14} className="animate-spin" />Импорт...</> : <><Icon name="Download" size={14} />Импортировать ({selected.size})</>}
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            {results.map((venue, i) => {
              const key = venue.yandexOrgId || venue.name;
              const isSelected = selected.has(key);
              const isImported = venue.alreadyImported;
              return (
                <div
                  key={i}
                  onClick={() => !isImported && toggleSelect(key)}
                  className={`glass rounded-xl p-4 border transition-all ${isImported ? "border-white/5 opacity-50 cursor-default" : isSelected ? "border-neon-purple/50 bg-neon-purple/5 cursor-pointer" : "border-white/10 hover:border-white/20 cursor-pointer"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0 border transition-all ${isImported ? "border-white/20 bg-white/5" : isSelected ? "border-neon-purple bg-neon-purple" : "border-white/20"}`}>
                      {isImported
                        ? <Icon name="Check" size={12} className="text-white/40" />
                        : isSelected && <Icon name="Check" size={12} className="text-white" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-oswald font-semibold text-white">{venue.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neon-purple/15 text-neon-purple border border-neon-purple/20">{venue.venueType}</span>
                        {isImported && <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">Уже в базе</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="text-white/50 text-sm flex items-center gap-1">
                          <Icon name="MapPin" size={12} />{venue.city}{venue.address ? `, ${venue.address}` : ""}
                        </span>
                        {venue.phone && (
                          <span className="text-white/50 text-sm flex items-center gap-1">
                            <Icon name="Phone" size={12} />{venue.phone}
                          </span>
                        )}
                        {venue.website && (
                          <span className="text-neon-cyan text-sm flex items-center gap-1 truncate max-w-xs">
                            <Icon name="Globe" size={12} />{venue.website}
                          </span>
                        )}
                      </div>
                      {venue.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {venue.tags.slice(0, 4).map((tag, ti) => (
                            <span key={ti} className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/40">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {results.length === 0 && !loading && !message && (
        <div className="glass rounded-2xl p-12 border border-white/5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-neon-purple/10 flex items-center justify-center mx-auto mb-4">
            <Icon name="Search" size={24} className="text-neon-purple/50" />
          </div>
          <p className="text-white/30 text-sm">Выбери запрос и город, нажми «Найти площадки»</p>
        </div>
      )}
    </div>
  );
}
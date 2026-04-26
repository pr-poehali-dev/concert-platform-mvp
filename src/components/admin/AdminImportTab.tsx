import { useState } from "react";
import Icon from "@/components/ui/icon";

const IMPORT_URL = "https://functions.poehali.dev/c7f2752f-6618-495c-9f9e-8553dce85384";
const OG_URL = "https://functions.poehali.dev/5c748a1f-294a-4d95-95f2-e574b07c7d21";

interface OsmVenue {
  osmId: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  website: string;
  tags: string[];
  capacity: number;
  venueType: string;
  latitude: number | null;
  longitude: number | null;
  alreadyImported?: boolean;
}

interface Claim {
  venueId: string;
  venueName: string;
  city: string;
  venueType: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
}

const CITIES = [
  "Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск",
  "Казань", "Краснодар", "Нижний Новгород", "Ростов-на-Дону",
  "Уфа", "Самара", "Челябинск", "Омск", "Воронеж", "Пермь", "Волгоград",
];

const TYPES = [
  { value: "all", label: "Все типы" },
  { value: "club", label: "Ночные клубы" },
  { value: "concert", label: "Концертные залы" },
  { value: "theatre", label: "Театры" },
];

interface OgResult { name: string; photo: string | null; status: string; }
interface OgStatus { needsFetch: number; hasPhoto: number; total: number; }

type TabId = "search" | "claims" | "photos";

export default function AdminImportTab({ token }: { token: string }) {
  const [tab, setTab] = useState<TabId>("search");

  // Search state
  const [city, setCity] = useState("Москва");
  const [venueType, setVenueType] = useState("all");
  const [results, setResults] = useState<OsmVenue[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Claims state
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Photos state
  const [ogStatus, setOgStatus] = useState<OgStatus | null>(null);
  const [ogLoading, setOgLoading] = useState(false);
  const [ogFetching, setOgFetching] = useState(false);
  const [ogResults, setOgResults] = useState<OgResult[]>([]);
  const [ogMessage, setOgMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadOgStatus = async () => {
    setOgLoading(true);
    try {
      const res = await fetch(`${OG_URL}/?action=status`, { headers: { "X-Admin-Secret": token } });
      const data = await res.json();
      setOgStatus(data);
    } catch { /* silent */ }
    finally { setOgLoading(false); }
  };

  const runOgFetch = async () => {
    setOgFetching(true);
    setOgResults([]);
    setOgMessage(null);
    try {
      const res = await fetch(`${OG_URL}/?action=fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Secret": token },
        body: JSON.stringify({ limit: 20 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setOgResults(data.results || []);
      setOgMessage({ type: "ok", text: `Обновлено: ${data.updated} из ${data.total} площадок` });
      loadOgStatus();
    } catch (e: unknown) {
      setOgMessage({ type: "err", text: e instanceof Error ? e.message : "Ошибка" });
    } finally { setOgFetching(false); }
  };

  const search = async () => {
    setLoading(true);
    setMessage(null);
    setSelected(new Set());
    try {
      const res = await fetch(`${IMPORT_URL}/?action=search&city=${encodeURIComponent(city)}&type=${venueType}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка поиска");
      setResults(data.results || []);
      if ((data.results || []).length === 0)
        setMessage({ type: "err", text: "Ничего не найдено в OpenStreetMap для этого города. Попробуй другой тип или город." });
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
    setSelected(new Set(results.filter(r => !r.alreadyImported).map(r => r.osmId)));
  };

  const importSelected = async () => {
    const toImport = results.filter(r => selected.has(r.osmId));
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
      setResults(prev => prev.map(r => selected.has(r.osmId) ? { ...r, alreadyImported: true } : r));
      setSelected(new Set());
    } catch (e: unknown) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Ошибка" });
    } finally {
      setImporting(false);
    }
  };

  const loadClaims = async () => {
    setClaimsLoading(true);
    try {
      const res = await fetch(`${IMPORT_URL}/?action=claims`, {
        headers: { "X-Admin-Secret": token },
      });
      const data = await res.json();
      setClaims(data.claims || []);
    } catch { /* silent */ }
    finally { setClaimsLoading(false); }
  };

  const processClaim = async (venueId: string, approve: boolean) => {
    setProcessingId(venueId);
    try {
      await fetch(`${IMPORT_URL}/?action=approve_claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Secret": token },
        body: JSON.stringify({ venueId, approve }),
      });
      setClaims(prev => prev.filter(c => c.venueId !== venueId));
    } catch { /* silent */ }
    finally { setProcessingId(null); }
  };

  const availableCount = results.filter(r => !r.alreadyImported).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-oswald font-bold text-xl text-white">Импорт площадок</h2>
          <p className="text-white/40 text-sm mt-0.5">OpenStreetMap — открытые данные, бесплатно</p>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 glass rounded-xl p-1 w-fit">
        {([["search", "Поиск OSM", "Search"], ["claims", "Заявки владельцев", "KeyRound"], ["photos", "Фото с сайтов", "Image"]] as const).map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => { setTab(id); if (id === "claims") loadClaims(); if (id === "photos") loadOgStatus(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-oswald font-medium transition-all ${tab === id ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}
          >
            <Icon name={icon} size={14} />{label}
            {id === "claims" && claims.length > 0 && (
              <span className="w-5 h-5 bg-neon-pink rounded-full text-white text-[10px] font-bold flex items-center justify-center">{claims.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Поиск ── */}
      {tab === "search" && (
        <>
          <div className="glass rounded-2xl p-6 border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Тип площадки</label>
                <select value={venueType} onChange={e => setVenueType(e.target.value)}
                  className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 text-sm bg-transparent">
                  {TYPES.map(t => <option key={t.value} value={t.value} className="bg-gray-900">{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Город</label>
                <select value={city} onChange={e => setCity(e.target.value)}
                  className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 text-sm bg-transparent">
                  {CITIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={search} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                  {loading ? <><Icon name="Loader2" size={16} className="animate-spin" />Ищу в OSM...</> : <><Icon name="Search" size={16} />Найти площадки</>}
                </button>
              </div>
            </div>
            <p className="text-white/30 text-xs mt-3 flex items-center gap-1.5">
              <Icon name="Info" size={12} />
              Данные из OpenStreetMap — открытый реестр, обновляется сообществом. Поиск занимает ~5 сек.
            </p>
          </div>

          {message && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${message.type === "ok" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-neon-pink/10 border-neon-pink/20 text-neon-pink"}`}>
              <Icon name={message.type === "ok" ? "CheckCircle2" : "AlertCircle"} size={16} />
              {message.text}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-sm">
                  Найдено: <span className="text-white font-semibold">{results.length}</span>
                  {availableCount < results.length && <span className="text-white/40"> · уже в базе: {results.length - availableCount}</span>}
                </p>
                <div className="flex items-center gap-3">
                  {availableCount > 0 && (
                    <button onClick={selectAll} className="text-neon-purple text-sm hover:underline">Выбрать все ({availableCount})</button>
                  )}
                  {selected.size > 0 && (
                    <button onClick={importSelected} disabled={importing}
                      className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 text-sm">
                      {importing ? <><Icon name="Loader2" size={14} className="animate-spin" />Импорт...</> : <><Icon name="Download" size={14} />Импортировать ({selected.size})</>}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                {results.map((venue, i) => {
                  const isSelected = selected.has(venue.osmId);
                  const isImported = venue.alreadyImported;
                  return (
                    <div key={i} onClick={() => !isImported && toggleSelect(venue.osmId)}
                      className={`glass rounded-xl p-4 border transition-all ${isImported ? "border-white/5 opacity-50 cursor-default" : isSelected ? "border-neon-purple/50 bg-neon-purple/5 cursor-pointer" : "border-white/10 hover:border-white/20 cursor-pointer"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0 border transition-all ${isImported ? "border-white/20 bg-white/5" : isSelected ? "border-neon-purple bg-neon-purple" : "border-white/20"}`}>
                          {(isImported || isSelected) && <Icon name="Check" size={12} className={isImported ? "text-white/40" : "text-white"} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-oswald font-semibold text-white">{venue.name}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-neon-purple/15 text-neon-purple border border-neon-purple/20">{venue.venueType}</span>
                            {venue.capacity > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/50">{venue.capacity} чел.</span>}
                            {isImported && <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">Уже в базе</span>}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            <span className="text-white/50 text-sm flex items-center gap-1">
                              <Icon name="MapPin" size={12} />{venue.city}{venue.address ? `, ${venue.address}` : ""}
                            </span>
                            {venue.phone && <span className="text-white/50 text-sm flex items-center gap-1"><Icon name="Phone" size={12} />{venue.phone}</span>}
                            {venue.website && <span className="text-neon-cyan text-sm flex items-center gap-1 truncate max-w-xs"><Icon name="Globe" size={12} />{venue.website}</span>}
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
                <Icon name="Map" size={24} className="text-neon-purple/50" />
              </div>
              <p className="text-white/30 text-sm">Выбери тип площадки и город, нажми «Найти площадки»</p>
            </div>
          )}
        </>
      )}

      {/* ── Заявки владельцев ── */}
      {tab === "claims" && (
        <div className="space-y-4">
          {claimsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="Loader2" size={24} className="animate-spin text-neon-purple" />
            </div>
          ) : claims.length === 0 ? (
            <div className="glass rounded-2xl p-12 border border-white/5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Icon name="CheckCircle2" size={24} className="text-green-400/50" />
              </div>
              <p className="text-white/30 text-sm">Нет заявок на рассмотрении</p>
            </div>
          ) : (
            <>
              <p className="text-white/50 text-sm">{claims.length} заявок ожидают проверки</p>
              {claims.map(claim => (
                <div key={claim.venueId} className="glass rounded-xl p-5 border border-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-oswald font-semibold text-white">{claim.venueName}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neon-purple/15 text-neon-purple border border-neon-purple/20">{claim.venueType}</span>
                      </div>
                      <p className="text-white/40 text-sm mb-3 flex items-center gap-1"><Icon name="MapPin" size={12} />{claim.city}</p>
                      <div className="glass rounded-lg p-3 border border-white/5 space-y-1">
                        <p className="text-white/70 text-sm font-medium">{claim.userName}</p>
                        <p className="text-white/40 text-xs">{claim.userEmail}</p>
                        {claim.userPhone && <p className="text-white/40 text-xs">{claim.userPhone}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => processClaim(claim.venueId, true)}
                        disabled={processingId === claim.venueId}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 font-oswald font-semibold rounded-xl hover:bg-green-500/30 disabled:opacity-50 text-sm whitespace-nowrap"
                      >
                        <Icon name="CheckCircle2" size={14} />Одобрить
                      </button>
                      <button
                        onClick={() => processClaim(claim.venueId, false)}
                        disabled={processingId === claim.venueId}
                        className="flex items-center gap-2 px-4 py-2 bg-neon-pink/10 text-neon-pink border border-neon-pink/20 font-oswald font-semibold rounded-xl hover:bg-neon-pink/20 disabled:opacity-50 text-sm whitespace-nowrap"
                      >
                        <Icon name="XCircle" size={14} />Отклонить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Фото с сайтов ── */}
      {tab === "photos" && (
        <div className="space-y-5">
          {/* Статус */}
          <div className="glass rounded-2xl p-6 border border-white/10">
            {ogLoading ? (
              <div className="flex items-center gap-3 text-white/50 text-sm">
                <Icon name="Loader2" size={16} className="animate-spin" />Загружаю статистику...
              </div>
            ) : ogStatus ? (
              <div className="flex flex-wrap items-center gap-6">
                <div className="text-center">
                  <div className="font-oswald font-bold text-3xl text-neon-cyan">{ogStatus.hasPhoto}</div>
                  <div className="text-white/40 text-xs mt-0.5">Есть фото</div>
                </div>
                <div className="text-center">
                  <div className="font-oswald font-bold text-3xl text-neon-pink">{ogStatus.needsFetch}</div>
                  <div className="text-white/40 text-xs mt-0.5">Нет фото (есть сайт)</div>
                </div>
                <div className="text-center">
                  <div className="font-oswald font-bold text-3xl text-white/40">{ogStatus.total}</div>
                  <div className="text-white/40 text-xs mt-0.5">Всего из OSM</div>
                </div>
                <div className="flex-1" />
                <button
                  onClick={runOgFetch}
                  disabled={ogFetching || ogStatus.needsFetch === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {ogFetching
                    ? <><Icon name="Loader2" size={16} className="animate-spin" />Парсю сайты...</>
                    : <><Icon name="Image" size={16} />Подтянуть фото (до 20 шт.)</>
                  }
                </button>
              </div>
            ) : (
              <p className="text-white/30 text-sm">Нажми на вкладку чтобы загрузить статус</p>
            )}
            <p className="text-white/25 text-xs mt-4 flex items-center gap-1.5">
              <Icon name="Info" size={12} />
              Скрипт заходит на сайт каждой площадки и берёт главное фото (og:image). За раз обрабатывается до 20 площадок.
            </p>
          </div>

          {ogMessage && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${ogMessage.type === "ok" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-neon-pink/10 border-neon-pink/20 text-neon-pink"}`}>
              <Icon name={ogMessage.type === "ok" ? "CheckCircle2" : "AlertCircle"} size={16} />
              {ogMessage.text}
            </div>
          )}

          {ogResults.length > 0 && (
            <div className="grid gap-3">
              {ogResults.map((r, i) => (
                <div key={i} className="glass rounded-xl p-4 border border-white/10 flex items-center gap-4">
                  {r.photo ? (
                    <img src={r.photo} alt={r.name}
                      className="w-16 h-12 rounded-lg object-cover flex-shrink-0 border border-white/10"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-16 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Icon name="ImageOff" size={16} className="text-white/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{r.name}</p>
                    {r.photo
                      ? <p className="text-green-400 text-xs flex items-center gap-1 mt-0.5"><Icon name="CheckCircle2" size={11} />Фото найдено</p>
                      : <p className="text-white/30 text-xs flex items-center gap-1 mt-0.5"><Icon name="XCircle" size={11} />og:image не найден</p>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
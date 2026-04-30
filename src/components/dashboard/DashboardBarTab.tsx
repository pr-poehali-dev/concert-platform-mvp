import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import TabHeader from "@/components/dashboard/TabHeader";

const BAR_URL = "https://functions.poehali.dev/506e1ffe-4de6-4c2c-acd7-e558c2b91ce1";

interface Integration {
  id: string;
  type: "iiko" | "rkeeper";
  displayName: string;
  iikoApiLogin: string;
  iikoOrgId: string;
  rkServerUrl: string;
  rkCashId: string;
  rkLicenseCode: string;
  isActive: boolean;
  lastSyncAt: string | null;
}

interface BarEvent { id: string; name: string; startDate: string | null; endDate: string | null }

const TYPE_LABELS = { iiko: "iiko Cloud", rkeeper: "R-Keeper" };
const TYPE_COLORS = { iiko: "neon-cyan", rkeeper: "neon-purple" };

// ── Маленькая карточка KPI ────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: string; color: string }) {
  return (
    <div className="glass rounded-2xl border border-white/10 p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center shrink-0`}>
        <Icon name={icon as never} size={18} className={`text-${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-white/45 text-[11px] uppercase tracking-wide">{label}</p>
        <p className="text-white font-oswald font-bold text-2xl leading-tight truncate">{value}</p>
        {sub && <p className="text-white/40 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Форма добавления интеграции ───────────────────────────────────────────
function IntegrationForm({ onSaved, onCancel, userId }: { onSaved: () => void; onCancel: () => void; userId: string }) {
  const [type, setType]                = useState<"iiko" | "rkeeper">("iiko");
  const [displayName, setDisplayName]  = useState("Бар");
  const [iikoApiLogin, setIikoApiLogin]= useState("");
  const [iikoOrgId, setIikoOrgId]      = useState("");
  const [rkUrl, setRkUrl]              = useState("");
  const [rkCashId, setRkCashId]        = useState("");
  const [rkLicense, setRkLicense]      = useState("");
  const [testing, setTesting]          = useState(false);
  const [saving, setSaving]            = useState(false);
  const [testResult, setTestResult]    = useState<{ ok: boolean; message: string; organizations?: {id:string;name:string}[] } | null>(null);
  const [error, setError]              = useState("");

  const testConnection = async () => {
    setTesting(true); setTestResult(null); setError("");
    try {
      const res = await fetch(`${BAR_URL}?action=test_connection`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, iikoApiLogin, rkServerUrl: rkUrl, rkCashId, rkLicenseCode: rkLicense }),
      });
      const data = await res.json();
      setTestResult(data);
      // Автоподстановка первой организации iiko
      if (data.ok && data.organizations?.length && !iikoOrgId) {
        setIikoOrgId(data.organizations[0].id);
      }
    } catch { setTestResult({ ok: false, message: "Ошибка соединения" }); }
    finally { setTesting(false); }
  };

  const save = async () => {
    setError(""); setSaving(true);
    try {
      const res = await fetch(`${BAR_URL}?action=add_integration`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueUserId: userId, type, displayName,
          iikoApiLogin, iikoOrgId,
          rkServerUrl: rkUrl, rkCashId, rkLicenseCode: rkLicense,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка"); return; }
      onSaved();
    } catch { setError("Ошибка соединения"); }
    finally { setSaving(false); }
  };

  const inp = "w-full glass rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm";

  return (
    <div className="glass rounded-2xl border border-neon-purple/20 p-5 space-y-4 animate-fade-in">
      <h4 className="font-oswald font-bold text-white text-base">Подключить кассовую систему</h4>

      {/* Тип */}
      <div className="flex gap-2">
        {(["iiko", "rkeeper"] as const).map(t => (
          <button key={t} onClick={() => { setType(t); setTestResult(null); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-oswald font-semibold border transition-all ${
              type === t ? "bg-neon-purple text-white border-neon-purple" : "text-white/65 border-white/10 hover:text-white hover:border-white/25"
            }`}>
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs text-white/55 mb-1 block">Название (для отображения)</label>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Бар" className={inp} />
      </div>

      {type === "iiko" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/55 mb-1 block">API-логин iiko Cloud <span className="text-white/30">(из личного кабинета iiko.biz)</span></label>
            <input value={iikoApiLogin} onChange={e => setIikoApiLogin(e.target.value)} placeholder="ваш-api-login" className={inp} />
          </div>
          {testResult?.organizations && testResult.organizations.length > 0 && (
            <div>
              <label className="text-xs text-white/55 mb-1 block">Организация iiko</label>
              <select value={iikoOrgId} onChange={e => setIikoOrgId(e.target.value)}
                className="w-full glass rounded-xl px-3 py-2.5 text-white outline-none border border-white/10 text-sm bg-transparent appearance-none">
                {testResult.organizations.map(o => (
                  <option key={o.id} value={o.id} className="bg-gray-900">{o.name}</option>
                ))}
              </select>
            </div>
          )}
          {iikoOrgId && !testResult?.organizations && (
            <div>
              <label className="text-xs text-white/55 mb-1 block">ID организации iiko</label>
              <input value={iikoOrgId} onChange={e => setIikoOrgId(e.target.value)} placeholder="uuid организации" className={inp} />
            </div>
          )}
        </div>
      )}

      {type === "rkeeper" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/55 mb-1 block">URL XML-сервиса R-Keeper</label>
            <input value={rkUrl} onChange={e => setRkUrl(e.target.value)} placeholder="http://192.168.1.100:8080" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/55 mb-1 block">ID кассы</label>
              <input value={rkCashId} onChange={e => setRkCashId(e.target.value)} placeholder="1" className={inp} />
            </div>
            <div>
              <label className="text-xs text-white/55 mb-1 block">Лицензионный код</label>
              <input value={rkLicense} onChange={e => setRkLicense(e.target.value)} placeholder="код" className={inp} />
            </div>
          </div>
        </div>
      )}

      {/* Результат теста */}
      {testResult && (
        <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs border ${
          testResult.ok ? "bg-neon-green/10 border-neon-green/25 text-neon-green" : "bg-neon-pink/10 border-neon-pink/25 text-neon-pink"
        }`}>
          <Icon name={testResult.ok ? "CheckCircle" : "XCircle"} size={14} className="shrink-0 mt-0.5" />
          <span>{testResult.message}</span>
        </div>
      )}

      {error && <p className="text-neon-pink text-xs flex items-center gap-1"><Icon name="AlertCircle" size={12} />{error}</p>}

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 glass text-white/65 rounded-xl border border-white/10 text-sm hover:text-white">
          Отмена
        </button>
        <button onClick={testConnection} disabled={testing}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/8 border border-white/15 text-white/85 rounded-xl text-sm hover:bg-white/12 disabled:opacity-50">
          {testing ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Zap" size={14} />}
          Проверить
        </button>
        <button onClick={save} disabled={saving || !testResult?.ok}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-neon-purple text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-40">
          {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Plus" size={14} />}
          Подключить
        </button>
      </div>
    </div>
  );
}

// ── Панель отчётов ────────────────────────────────────────────────────────
function ReportPanel({ integration, events }: { integration: Integration; events: BarEvent[] }) {
  const [reportType, setReportType] = useState<"sales" | "stock" | "shifts">("sales");
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo]     = useState(() => new Date().toISOString().slice(0, 10));
  const [eventId, setEventId]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [report, setReport]     = useState<Record<string, unknown> | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [error, setError]       = useState("");

  const fetch_ = useCallback(async (refresh = false) => {
    setLoading(true); setError("");
    const dfmt = (d: string) => `${d} 00:00:00.000`;
    const dtmt = (d: string) => `${d} 23:59:59.999`;
    const url = `${BAR_URL}?action=report&integration_id=${integration.id}&type=${reportType}`
      + `&date_from=${encodeURIComponent(dfmt(dateFrom))}&date_to=${encodeURIComponent(dtmt(dateTo))}`
      + (eventId ? `&event_id=${eventId}` : "")
      + (refresh ? "&refresh=1" : "");
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка получения отчёта"); setReport(null); return; }
      setReport(data.report);
      setFromCache(data.fromCache);
      setCachedAt(data.cachedAt || null);
    } catch { setError("Ошибка соединения"); }
    finally { setLoading(false); }
  }, [integration.id, reportType, dateFrom, dateTo, eventId]);

  // Авто-загрузка при смене параметров
  useEffect(() => { fetch_(); }, [fetch_]);

  // Привязка к мероприятию — автозаполняет даты
  const onEventChange = (eid: string) => {
    setEventId(eid);
    if (eid) {
      const ev = events.find(e => e.id === eid);
      if (ev?.startDate) setDateFrom(ev.startDate.slice(0, 10));
      if (ev?.endDate)   setDateTo(ev.endDate.slice(0, 10));
    }
  };

  // ── Рендер отчёта продаж ────────────────────────────────────────────────
  const renderSales = () => {
    if (!report) return null;
    const r = report as Record<string, unknown>;
    // iiko: report.sales.correlationId + данные
    // rkeeper: totalSum, count, orders[]
    const totalSum   = (r.totalSum as number) ?? ((r.sales as Record<string,unknown>)?.totalSum as number) ?? 0;
    const count      = (r.count as number) ?? ((r.sales as Record<string,unknown>)?.count as number) ?? 0;
    const orders     = (r.orders as unknown[]) ?? ((r.sales as Record<string,unknown>)?.orders as unknown[]) ?? [];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard label="Выручка" value={`${Number(totalSum).toLocaleString("ru")} ₽`} icon="TrendingUp" color="neon-green" />
          <KpiCard label="Чеков" value={String(count)} icon="Receipt" color="neon-cyan" />
          <KpiCard label="Средний чек" value={count > 0 ? `${Math.round(Number(totalSum) / count).toLocaleString("ru")} ₽` : "—"} icon="Calculator" color="neon-purple" />
        </div>

        {orders.length > 0 && (
          <div className="glass rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/8 bg-white/3">
              <p className="text-white/45 text-[11px] uppercase tracking-wider font-bold">Последние чеки</p>
            </div>
            <div className="divide-y divide-white/5 max-h-72 overflow-y-auto scrollbar-thin">
              {(orders as Record<string,unknown>[]).slice(0, 30).map((o, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-white/85 text-xs font-medium">{(o.table as string) || `Чек #${o.id}`}</p>
                    <p className="text-white/35 text-[10px]">{(o.closed as string || "").replace("T", " ").slice(0, 16)}</p>
                  </div>
                  <span className="text-neon-green font-semibold text-sm">{Number(o.sum).toLocaleString("ru")} ₽</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {orders.length === 0 && !loading && (
          <div className="text-center py-10 text-white/30 text-sm">Нет данных за выбранный период</div>
        )}
      </div>
    );
  };

  // ── Рендер остатков склада ──────────────────────────────────────────────
  const renderStock = () => {
    if (!report) return null;
    const r = report as Record<string, unknown>;
    const items = (r.items as unknown[]) ?? [];
    const iikoRows = ((r.stock as Record<string,unknown>)?.data as unknown[]) ?? [];
    const allItems = items.length > 0 ? items : iikoRows;

    if (allItems.length === 0) return (
      <div className="text-center py-10 text-white/30 text-sm">Нет данных об остатках</div>
    );

    return (
      <div className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/8 bg-white/3 flex items-center justify-between">
          <p className="text-white/45 text-[11px] uppercase tracking-wider font-bold">Остатки на складе</p>
          <span className="text-white/30 text-xs">{allItems.length} позиций</span>
        </div>
        <div className="divide-y divide-white/5 max-h-96 overflow-y-auto scrollbar-thin">
          {(allItems as Record<string,unknown>[]).map((item, i) => {
            const name   = (item.name as string) || (item.GoodsName as string) || `Позиция ${i+1}`;
            const amount = item.amount ?? item.Amount ?? "—";
            const unit   = (item.unit as string) || (item.MeasureUnit as string) || "";
            const low    = Number(amount) < 5;
            return (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-white/85 text-xs font-medium truncate">{name}</p>
                  {item.category && <p className="text-white/30 text-[10px]">{item.category as string}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`font-semibold text-sm ${low ? "text-neon-pink" : "text-neon-green"}`}>
                    {String(amount)} {unit}
                  </span>
                  {low && <span className="text-[9px] px-1.5 py-0.5 bg-neon-pink/15 text-neon-pink rounded-full border border-neon-pink/25">мало</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Рендер отчёта по сменам ────────────────────────────────────────────
  const renderShifts = () => {
    if (!report) return null;
    const r = report as Record<string, unknown>;
    const shifts = (r.shifts as unknown[]) ?? [];
    const iikoData = (r.data as unknown[]) ?? [];
    const allShifts = shifts.length > 0 ? shifts : iikoData;

    if (allShifts.length === 0) return (
      <div className="text-center py-10 text-white/30 text-sm">Нет данных по сменам</div>
    );

    return (
      <div className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/8 bg-white/3">
          <p className="text-white/45 text-[11px] uppercase tracking-wider font-bold">Смены</p>
        </div>
        <div className="divide-y divide-white/5 max-h-96 overflow-y-auto scrollbar-thin">
          {(allShifts as Record<string,unknown>[]).map((s, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white/85 text-xs font-semibold">
                  {(s.cashier as string) || `Смена #${s.id || i+1}`}
                </p>
                <span className="text-neon-green font-semibold text-sm">
                  {Number(s.sum ?? 0).toLocaleString("ru")} ₽
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-white/35">
                {s.opened && <span>Открыта: {String(s.opened).replace("T"," ").slice(0,16)}</span>}
                {s.closed && <span>Закрыта: {String(s.closed).replace("T"," ").slice(0,16)}</span>}
                {s.checks && <span>{s.checks} чеков</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const inp = "glass rounded-xl px-3 py-2 text-white text-xs outline-none border border-white/10 focus:border-neon-purple/50 bg-transparent";

  return (
    <div className="space-y-4">
      {/* Тулбар фильтров */}
      <div className="glass rounded-2xl border border-white/10 p-4 space-y-3">
        {/* Тип отчёта */}
        <div className="flex gap-1.5 flex-wrap">
          {([
            { id: "sales",  label: "Продажи",  icon: "TrendingUp"  },
            { id: "stock",  label: "Остатки",  icon: "Package"     },
            { id: "shifts", label: "Смены",    icon: "Clock"       },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setReportType(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-oswald font-semibold transition-all ${
                reportType === t.id ? "bg-neon-purple text-white" : "text-white/55 hover:text-white border border-white/10 hover:border-white/25"
              }`}>
              <Icon name={t.icon as never} size={12} />{t.label}
            </button>
          ))}
        </div>

        {/* Даты + мероприятие */}
        <div className="flex flex-wrap gap-2 items-center">
          {reportType !== "stock" && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-white/40 text-xs">с</span>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inp} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-white/40 text-xs">по</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inp} />
              </div>
            </>
          )}
          {events.length > 0 && (
            <select value={eventId} onChange={e => onEventChange(e.target.value)}
              className={`${inp} appearance-none`}>
              <option value="" className="bg-gray-900">Все периоды</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id} className="bg-gray-900">
                  {ev.name}{ev.startDate ? ` (${ev.startDate.slice(0,10)})` : ""}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => fetch_(true)} disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/55 hover:text-white border border-white/10 hover:border-white/25 disabled:opacity-50 ml-auto">
            <Icon name={loading ? "Loader2" : "RefreshCw"} size={12} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
        </div>

        {fromCache && cachedAt && (
          <p className="text-white/25 text-[10px]">
            Кэш от {new Date(cachedAt).toLocaleTimeString("ru")} · нажмите «Обновить» для свежих данных
          </p>
        )}
      </div>

      {/* Ошибка */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neon-pink/10 border border-neon-pink/20 text-neon-pink text-xs">
          <Icon name="AlertCircle" size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Загрузка */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-white/35">
          <Icon name="Loader2" size={28} className="animate-spin" />
          <p className="text-sm">Загружаем данные из {integration.type === "iiko" ? "iiko" : "R-Keeper"}…</p>
        </div>
      )}

      {/* Данные */}
      {!loading && report && (
        <>
          {reportType === "sales"  && renderSales()}
          {reportType === "stock"  && renderStock()}
          {reportType === "shifts" && renderShifts()}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Главный компонент
// ══════════════════════════════════════════════════════════════════════════════

export default function DashboardBarTab() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [activeIntId, setActiveIntId]   = useState<string | null>(null);
  const [events, setEvents]             = useState<BarEvent[]>([]);

  const loadIntegrations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res  = await fetch(`${BAR_URL}?action=integrations&venue_user_id=${user.id}`);
      const data = await res.json();
      const list: Integration[] = (data.integrations || []).filter((i: Integration) => i.isActive);
      setIntegrations(list);
      if (list.length > 0 && !activeIntId) setActiveIntId(list[0].id);
    } catch { setIntegrations([]); }
    finally { setLoading(false); }
  }, [user, activeIntId]);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    try {
      const res  = await fetch(`${BAR_URL}?action=events&venue_user_id=${user.id}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch { setEvents([]); }
  }, [user]);

  useEffect(() => { loadIntegrations(); loadEvents(); }, []);

  const activeInt = integrations.find(i => i.id === activeIntId) ?? null;

  const removeIntegration = async (id: string) => {
    if (!confirm("Отключить интеграцию?")) return;
    await fetch(`${BAR_URL}?action=delete_integration`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (activeIntId === id) setActiveIntId(null);
    loadIntegrations();
  };

  return (
    <div className="animate-fade-in max-w-4xl space-y-5">
      <TabHeader icon="Wine" title="Бар" description="Интеграция с кассовой системой — продажи, остатки и смены" iconColor="neon-cyan" />

      {/* Список интеграций + кнопка добавить */}
      <div className="flex flex-wrap items-center gap-2">
        {integrations.map(int => (
          <div key={int.id}
            className={`group flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
              activeIntId === int.id
                ? "bg-neon-purple/15 border-neon-purple/40 text-white"
                : "border-white/10 text-white/65 hover:text-white hover:border-white/25"
            }`}
            onClick={() => setActiveIntId(int.id)}
          >
            <div className={`w-2 h-2 rounded-full ${int.type === "iiko" ? "bg-neon-cyan" : "bg-neon-purple"}`} />
            <span className="text-sm font-medium">{int.displayName}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              int.type === "iiko" ? "bg-neon-cyan/10 text-neon-cyan" : "bg-neon-purple/10 text-neon-purple"
            }`}>{TYPE_LABELS[int.type]}</span>
            <button
              onClick={e => { e.stopPropagation(); removeIntegration(int.id); }}
              className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-neon-pink transition-all ml-1"
              title="Отключить"
            >
              <Icon name="X" size={12} />
            </button>
          </div>
        ))}

        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/40 text-sm transition-all">
            <Icon name="Plus" size={14} />
            Подключить систему
          </button>
        )}
      </div>

      {/* Форма добавления */}
      {showForm && (
        <IntegrationForm
          userId={user!.id}
          onSaved={() => { setShowForm(false); loadIntegrations(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Пустое состояние */}
      {!loading && integrations.length === 0 && !showForm && (
        <div className="glass rounded-2xl border border-white/10 py-16 flex flex-col items-center gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-neon-cyan/10 flex items-center justify-center">
            <Icon name="Wine" size={28} className="text-neon-cyan" />
          </div>
          <div>
            <p className="text-white font-oswald font-bold text-xl mb-1">Подключите кассовую систему</p>
            <p className="text-white/45 text-sm max-w-sm">
              Выберите iiko Cloud или R-Keeper — данные о продажах, остатках и сменах появятся здесь автоматически
            </p>
          </div>
          <div className="flex gap-2">
            {(["iiko", "rkeeper"] as const).map(t => (
              <div key={t} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm bg-${TYPE_COLORS[t]}/10 border-${TYPE_COLORS[t]}/25 text-${TYPE_COLORS[t]}`}>
                <Icon name={t === "iiko" ? "Zap" : "Server"} size={14} />
                {TYPE_LABELS[t]}
              </div>
            ))}
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-6 py-2.5 bg-neon-purple text-white rounded-xl font-oswald font-semibold text-sm hover:opacity-90">
            Подключить
          </button>
        </div>
      )}

      {/* Панель отчётов */}
      {activeInt && !showForm && (
        <ReportPanel integration={activeInt} events={events} />
      )}

      {/* Загрузка */}
      {loading && (
        <div className="flex justify-center py-16">
          <Icon name="Loader2" size={24} className="animate-spin text-white/30" />
        </div>
      )}
    </div>
  );
}

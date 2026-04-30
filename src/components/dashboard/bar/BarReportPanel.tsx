import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import BarKpiCard from "./BarKpiCard";
import BarEmailSchedule from "./BarEmailSchedule";
import { exportCSV, exportExcel, type ReportType } from "./exportReport";

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
  emailReportEnabled: boolean;
  emailReportTo: string;
  emailReportTime: string;
  emailReportTypes: string[];
  emailReportLastSent: string | null;
}

interface BarEvent { id: string; name: string; startDate: string | null; endDate: string | null }

interface Props {
  integration: Integration;
  events: BarEvent[];
  onUpdated: () => void;
}

export default function BarReportPanel({ integration, events, onUpdated }: Props) {
  const [reportType, setReportType] = useState<"sales" | "stock" | "shifts">("sales");
  const [dateFrom, setDateFrom]     = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo]         = useState(() => new Date().toISOString().slice(0, 10));
  const [eventId, setEventId]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [report, setReport]         = useState<Record<string, unknown> | null>(null);
  const [fromCache, setFromCache]   = useState(false);
  const [cachedAt, setCachedAt]     = useState<string | null>(null);
  const [error, setError]           = useState("");

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

  useEffect(() => { fetch_(); }, [fetch_]);

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
    const totalSum = (r.totalSum as number) ?? ((r.sales as Record<string,unknown>)?.totalSum as number) ?? 0;
    const count    = (r.count as number) ?? ((r.sales as Record<string,unknown>)?.count as number) ?? 0;
    const orders   = (r.orders as unknown[]) ?? ((r.sales as Record<string,unknown>)?.orders as unknown[]) ?? [];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <BarKpiCard label="Выручка" value={`${Number(totalSum).toLocaleString("ru")} ₽`} icon="TrendingUp" color="neon-green" />
          <BarKpiCard label="Чеков" value={String(count)} icon="Receipt" color="neon-cyan" />
          <BarKpiCard label="Средний чек" value={count > 0 ? `${Math.round(Number(totalSum) / count).toLocaleString("ru")} ₽` : "—"} icon="Calculator" color="neon-purple" />
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
    const items    = (r.items as unknown[]) ?? [];
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
    const shifts   = (r.shifts as unknown[]) ?? [];
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
  const REPORT_NAMES: Record<ReportType, string> = { sales: "Продажи", stock: "Остатки", shifts: "Смены" };

  const buildFilename = () => {
    const ev = events.find(e => e.id === eventId);
    const evPart   = ev ? `_${ev.name.slice(0, 20).replace(/\s+/g, "_")}` : "";
    const datePart = reportType !== "stock" ? `_${dateFrom}_${dateTo}` : "";
    return `Бар_${REPORT_NAMES[reportType]}${evPart}${datePart}`;
  };

  const handleExportCSV = () => {
    if (!report) return;
    exportCSV(reportType, report, buildFilename());
  };

  const handleExportExcel = () => {
    if (!report) return;
    const ev = events.find(e => e.id === eventId);
    exportExcel(reportType, report, buildFilename(), {
      integrationName: `${integration.displayName} (${integration.type === "iiko" ? "iiko Cloud" : "R-Keeper"})`,
      dateFrom,
      dateTo,
      eventName: ev?.name,
    });
  };

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

        {/* Строка с кнопками экспорта + кэш */}
        <div className="flex items-center justify-between gap-3 pt-0.5 border-t border-white/8">
          <div className="flex items-center gap-1.5">
            {fromCache && cachedAt && (
              <p className="text-white/25 text-[10px]">
                Кэш от {new Date(cachedAt).toLocaleTimeString("ru")}
              </p>
            )}
          </div>
          {report && !loading && (
            <div className="flex items-center gap-1.5">
              <span className="text-white/30 text-[10px] mr-1">Экспорт:</span>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-neon-cyan/80 hover:text-neon-cyan border border-neon-cyan/20 hover:border-neon-cyan/40 hover:bg-neon-cyan/5 transition-all"
                title="Скачать CSV"
              >
                <Icon name="FileText" size={12} />
                CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-neon-green/80 hover:text-neon-green border border-neon-green/20 hover:border-neon-green/40 hover:bg-neon-green/5 transition-all"
                title="Скачать Excel"
              >
                <Icon name="FileSpreadsheet" size={12} />
                Excel
              </button>
            </div>
          )}
        </div>
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

      {/* Email-расписание */}
      <BarEmailSchedule integration={integration} onUpdated={onUpdated} />
    </div>
  );
}

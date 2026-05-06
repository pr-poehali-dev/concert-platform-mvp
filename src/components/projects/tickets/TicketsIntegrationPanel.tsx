import Icon from "@/components/ui/icon";
import { fmt } from "@/hooks/useProjects";
import { WebhookInstructions } from "./TicketsWebhookGuides";

const PROVIDERS: Record<string, { label: string; logo: string; color: string; docsUrl: string }> = {
  ticketscloud: {
    label: "TicketsCloud",
    logo: "🎫",
    color: "neon-purple",
    docsUrl: "https://ticketscloud.com/developers",
  },
};

const STATUS_COLORS: Record<string, string> = {
  paid:     "text-neon-green bg-neon-green/10 border-neon-green/25",
  refunded: "text-neon-pink bg-neon-pink/10 border-neon-pink/25",
  reserved: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/25",
};
const STATUS_LABELS: Record<string, string> = {
  paid: "Оплачен", refunded: "Возврат", reserved: "Бронь",
};

function fmtDt(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

interface Integration {
  id: string;
  provider: string;
  name: string;
  eventId: string;
  isActive: boolean;
  hasApiKey: boolean;
  webhookSecret: string;
  lastSyncAt: string | null;
  projectTitle?: string;
}

interface Stats {
  ordersTotal: number;
  ticketsSold: number;
  revenuePaid: number;
  revenueRefunded: number;
  ticketsReserved: number;
  firstSale: string | null;
  lastSale: string | null;
  byType: { ticketType: string; qty: number; amount: number }[];
}

interface Sale {
  id: string;
  orderId: string;
  ticketType: string;
  quantity: number;
  price: number;
  totalAmount: number;
  status: string;
  buyerName: string;
  buyerEmail: string;
  soldAt: string;
}

type DiffField = { current: string; new: string; raw?: string };

interface Props {
  int: Integration;
  isActive: boolean;
  syncing: boolean;
  syncMsg: string;
  salesLoading: boolean;
  stats: Stats | null;
  sales: Sale[];
  eventDiff: Record<string, DiffField> | null;
  applying: boolean;
  fieldLabels: Record<string, string>;
  onToggleActive: () => void;
  onSync: () => void;
  onApplyDiff: () => void;
  onClearDiff: () => void;
}

export default function TicketsIntegrationPanel({
  int, isActive, syncing, syncMsg, salesLoading, stats, sales,
  eventDiff, applying, fieldLabels,
  onToggleActive, onSync, onApplyDiff, onClearDiff,
}: Props) {
  const p = PROVIDERS[int.provider];

  return (
    <div className="glass rounded-2xl border border-white/8 overflow-hidden">
      {/* Шапка интеграции */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/3 transition-colors"
        onClick={onToggleActive}
      >
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
          {p?.logo || "🎫"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{int.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${int.isActive ? "text-neon-green border-neon-green/30 bg-neon-green/10" : "text-white/30 border-white/10 bg-white/5"}`}>
              {int.isActive ? "активна" : "выкл"}
            </span>
          </div>
          <p className="text-white/35 text-xs mt-0.5">
            {p?.label} · ID события: <code className="text-neon-cyan/70">{int.eventId}</code>
            {int.lastSyncAt ? ` · Синхр.: ${fmtDt(int.lastSyncAt)}` : " · Не синхронизировалась"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onSync(); }}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 glass border border-white/10 hover:border-neon-cyan/30 text-white/50 hover:text-neon-cyan rounded-lg text-xs transition-all disabled:opacity-50"
            title="Загрузить историю заказов"
          >
            <Icon name={syncing ? "Loader2" : "RefreshCw"} size={12} className={syncing ? "animate-spin" : ""} />
            Синхр.
          </button>
          <Icon name={isActive ? "ChevronUp" : "ChevronDown"} size={16} className="text-white/30" />
        </div>
      </div>

      {/* Сообщение о синхронизации */}
      {syncMsg && isActive && (
        <div className="px-4 pb-2">
          <p className="text-neon-cyan text-xs flex items-center gap-1">
            <Icon name="CheckCircle" size={11} />{syncMsg}
          </p>
        </div>
      )}

      {/* Диалог замены данных проекта */}
      {eventDiff && isActive && Object.keys(eventDiff).length > 0 && (
        <div className="mx-4 mb-3 rounded-xl border border-neon-yellow/30 bg-neon-yellow/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="AlertTriangle" size={15} className="text-neon-yellow shrink-0" />
            <span className="text-neon-yellow text-sm font-semibold">Данные события отличаются от проекта</span>
          </div>
          <div className="space-y-2 mb-4">
            {Object.entries(eventDiff).map(([field, diff]) => (
              <div key={field} className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 text-xs">
                <span className="text-white/40 shrink-0">{fieldLabels[field] || field}:</span>
                <span className="text-white/40 line-through truncate">{diff.current || "—"}</span>
                <Icon name="ArrowRight" size={11} className="text-white/30 shrink-0" />
                <span className="text-neon-yellow truncate">{diff.new || "—"}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onApplyDiff}
              disabled={applying}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-yellow/15 border border-neon-yellow/30 text-neon-yellow rounded-lg text-xs hover:bg-neon-yellow/25 transition-colors disabled:opacity-50"
            >
              <Icon name={applying ? "Loader2" : "Check"} size={12} className={applying ? "animate-spin" : ""} />
              Обновить в проекте
            </button>
            <button
              onClick={onClearDiff}
              className="flex items-center gap-1.5 px-3 py-1.5 glass border border-white/10 text-white/40 rounded-lg text-xs hover:text-white/70 transition-colors"
            >
              <Icon name="X" size={12} />
              Оставить как есть
            </button>
          </div>
        </div>
      )}

      {/* Статистика и продажи */}
      {isActive && (
        <div className="border-t border-white/8 p-4 space-y-4">
          {salesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="Loader2" size={22} className="animate-spin text-neon-purple/50" />
            </div>
          ) : stats ? (
            <>
              {/* Сводные метрики */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Продано билетов", value: stats.ticketsSold, icon: "Ticket", color: "neon-purple" },
                  { label: "Выручка", value: `${fmt(stats.revenuePaid)} ₽`, icon: "TrendingUp", color: "neon-green" },
                  { label: "Возвраты", value: `${fmt(stats.revenueRefunded)} ₽`, icon: "RotateCcw", color: "neon-pink" },
                  { label: "Бронь", value: stats.ticketsReserved, icon: "Clock", color: "neon-cyan" },
                ].map((m, i) => (
                  <div key={i} className="glass rounded-xl p-3 border border-white/8">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name={m.icon as never} size={13} className={`text-${m.color}`} />
                      <span className="text-white/40 text-xs">{m.label}</span>
                    </div>
                    <p className={`font-oswald font-bold text-lg text-${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* По типам билетов */}
              {stats.byType.length > 0 && (
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">По типам билетов</p>
                  <div className="space-y-2">
                    {stats.byType.map((bt, i) => (
                      <div key={i} className="flex items-center justify-between glass rounded-lg px-3 py-2 border border-white/5">
                        <span className="text-white/70 text-sm">{bt.ticketType}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-white/40">{bt.qty} шт.</span>
                          <span className="text-neon-green font-medium">{fmt(bt.amount)} ₽</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Последние продажи */}
              {sales.length > 0 && (
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Последние заказы</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-white/30 border-b border-white/8">
                          <th className="text-left py-2 pr-3">Дата</th>
                          <th className="text-left py-2 pr-3">Тип</th>
                          <th className="text-left py-2 pr-3">Покупатель</th>
                          <th className="text-right py-2 pr-3">Кол-во</th>
                          <th className="text-right py-2 pr-3">Сумма</th>
                          <th className="text-right py-2">Статус</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.slice(0, 20).map(s => (
                          <tr key={s.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                            <td className="py-2 pr-3 text-white/50">{fmtDt(s.soldAt)}</td>
                            <td className="py-2 pr-3 text-white/70">{s.ticketType}</td>
                            <td className="py-2 pr-3 text-white/60 max-w-[140px] truncate">
                              {s.buyerName || s.buyerEmail || "—"}
                            </td>
                            <td className="py-2 pr-3 text-white/70 text-right">{s.quantity}</td>
                            <td className="py-2 pr-3 text-neon-green font-medium text-right">{fmt(s.totalAmount)} ₽</td>
                            <td className="py-2 text-right">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COLORS[s.status] || "text-white/40 border-white/10"}`}>
                                {STATUS_LABELS[s.status] || s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {sales.length === 0 && (
                <div className="text-center py-6">
                  <Icon name="TicketX" size={24} className="text-white/15 mx-auto mb-2" />
                  <p className="text-white/30 text-sm">Продаж ещё нет</p>
                  <p className="text-white/20 text-xs mt-1">Нажмите «Синхр.» чтобы загрузить историю заказов</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-white/30 text-sm">Не удалось загрузить данные</p>
            </div>
          )}

          {/* Инструкция по вебхуку */}
          <WebhookInstructions integrationId={int.id} provider={int.provider} />
        </div>
      )}
    </div>
  );
}

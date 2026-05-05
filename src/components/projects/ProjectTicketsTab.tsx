import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/hooks/useProjects";

const TICKETS_URL = "https://functions.poehali.dev/e8e3c7c9-b452-4e77-8db2-ca0266399006";

const PROVIDERS: Record<string, { label: string; logo: string; color: string; docsUrl: string }> = {
  ticketscloud: {
    label: "TicketsCloud",
    logo: "🎫",
    color: "neon-purple",
    docsUrl: "https://ticketscloud.com/developers",
  },
};

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

interface Props {
  projectId: string;
}

export default function ProjectTicketsTab({ projectId }: Props) {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [activeIntId, setActiveIntId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  // Форма добавления
  const [form, setForm] = useState({ provider: "ticketscloud", name: "", apiKey: "", eventId: "" });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [created, setCreated] = useState<{ webhookUrl: string; webhookSecret: string } | null>(null);

  const loadIntegrations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${TICKETS_URL}?action=list&user_id=${user.id}`);
      const data = await res.json();
      const all: Integration[] = data.integrations || [];
      setIntegrations(all.filter(i => i.projectId === projectId || !i.projectId));
    } catch { setIntegrations([]); }
    finally { setLoading(false); }
  }, [user, projectId]);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  const loadStats = useCallback(async (intId: string) => {
    setSalesLoading(true);
    try {
      const [sRes, slRes] = await Promise.all([
        fetch(`${TICKETS_URL}?action=stats&integration_id=${intId}`),
        fetch(`${TICKETS_URL}?action=sales&integration_id=${intId}&limit=50`),
      ]);
      const [sData, slData] = await Promise.all([sRes.json(), slRes.json()]);
      setStats(sData);
      setSales(slData.sales || []);
    } catch { setStats(null); setSales([]); }
    finally { setSalesLoading(false); }
  }, []);

  useEffect(() => {
    if (activeIntId) loadStats(activeIntId);
    else { setStats(null); setSales([]); }
  }, [activeIntId, loadStats]);

  const handleAdd = async () => {
    if (!user) return;
    if (!form.apiKey.trim() || !form.eventId.trim()) {
      setAddError("Введите API-ключ и ID события"); return;
    }
    setAdding(true); setAddError("");
    try {
      const res = await fetch(`${TICKETS_URL}?action=create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          projectId,
          provider: form.provider,
          name: form.name.trim() || undefined,
          apiKey: form.apiKey.trim(),
          eventId: form.eventId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || "Ошибка"); return; }
      const webhookUrl = `${TICKETS_URL}?action=webhook&provider=${form.provider}&integration_id=${data.id}`;
      setCreated({ webhookUrl, webhookSecret: data.webhookSecret });
      loadIntegrations();
    } catch { setAddError("Ошибка соединения"); }
    finally { setAdding(false); }
  };

  const handleSync = async (intId: string) => {
    setSyncing(true); setSyncMsg("");
    try {
      const res = await fetch(`${TICKETS_URL}?action=sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: intId }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log("[TC:sync] eventSets from API:", JSON.stringify(data.eventSets));
        const parts = [`Загружено ${data.ordersProcessed} заказов`];
        if (data.incomeLinesUpdated > 0)
          parts.push(`обновлено ${data.incomeLinesUpdated} категорий в доходах проекта`);
        if (data.eventSets?.length > 0)
          parts.push(`тираж: ${data.eventSets.map((s: {name:string;total:number}) => `${s.name}=${s.total}`).join(", ")}`);
        else
          parts.push(`⚠️ тираж не получен из API TicketsCloud`);
        setSyncMsg(parts.join(" · "));
        loadStats(intId);
      } else {
        setSyncMsg(data.error || "Ошибка синхронизации");
      }
    } catch { setSyncMsg("Ошибка соединения"); }
    finally { setSyncing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Icon name="Loader2" size={28} className="animate-spin text-neon-purple/50" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-oswald font-bold text-xl text-white">Билетные интеграции</h3>
          <p className="text-white/40 text-sm mt-0.5">Автоматически подгружаем продажи из билетных систем</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setCreated(null); setAddError(""); setForm({ provider: "ticketscloud", name: "", apiKey: "", eventId: "" }); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          <Icon name="Plus" size={16} />
          Подключить
        </button>
      </div>

      {/* Поддерживаемые провайдеры */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(PROVIDERS).map(([id, p]) => (
          <div key={id} className="flex items-center gap-2 glass border border-white/10 rounded-xl px-3 py-2 text-xs">
            <span className="text-base">{p.logo}</span>
            <span className="text-white/70 font-medium">{p.label}</span>
            <span className="text-neon-green/70 text-[10px]">✓ поддерживается</span>
          </div>
        ))}
        <div className="flex items-center gap-2 glass border border-white/5 rounded-xl px-3 py-2 text-xs text-white/25">
          <Icon name="Clock" size={12} />
          Kassir.ru, QTickets — скоро
        </div>
      </div>

      {/* Форма добавления */}
      {showAdd && !created && (
        <div className="glass rounded-2xl border border-neon-purple/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-oswald font-bold text-white">Новая интеграция</h4>
            <button onClick={() => setShowAdd(false)} className="text-white/30 hover:text-white transition-colors">
              <Icon name="X" size={16} />
            </button>
          </div>

          {/* Провайдер */}
          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Билетная система</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(PROVIDERS).map(([id, p]) => (
                <button
                  key={id}
                  onClick={() => setForm(f => ({ ...f, provider: id }))}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    form.provider === id
                      ? "bg-neon-purple/20 border-neon-purple/50 text-white"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  <span>{p.logo}</span>{p.label}
                </button>
              ))}
            </div>
          </div>

          {form.provider === "ticketscloud" && (
            <div className="bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="BookOpen" size={14} className="text-neon-cyan" />
                <span className="text-neon-cyan text-xs font-semibold">Как подключить TicketsCloud</span>
              </div>
              <ol className="space-y-1.5 text-xs text-white/65">
                <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-neon-purple/20 text-neon-purple text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">1</span>Зайдите в личный кабинет <b className="text-white/80">ticketscloud.ru</b></li>
                <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-neon-purple/20 text-neon-purple text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">2</span>Профиль → <b className="text-white/80">API-ключи</b> → Создать новый ключ. Скопируйте токен</li>
                <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-neon-purple/20 text-neon-purple text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">3</span>ID события — откройте нужное событие, скопируйте ID из URL или из карточки события (формат: <code className="text-neon-cyan/80 bg-neon-cyan/10 px-1 rounded">5f3c8d2a1e4b7c9d0f123456</code>)</li>
                <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-neon-pink/20 text-neon-pink text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">4</span><span className="text-neon-pink/80">После создания — скопируйте URL вебхука и добавьте его в настройках события: TicketsCloud → Событие → Настройки → Вебхуки</span></li>
                <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-neon-green/20 text-neon-green text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">5</span><span className="text-neon-green/80">Нажмите «Синхр.» для ручной загрузки уже существующих заказов</span></li>
              </ol>
              <a href="https://ticketscloud.readthedocs.io/ru/old/v1/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-neon-cyan text-xs hover:underline">
                <Icon name="ExternalLink" size={11} />Документация TicketsCloud API v1
              </a>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Название (необязательно)</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Например: Концерт Ivanov Live"
                className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm"
              />
            </div>
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">ID события *</label>
              <input
                value={form.eventId}
                onChange={e => setForm(f => ({ ...f, eventId: e.target.value }))}
                placeholder="12345"
                className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">API-ключ (токен) *</label>
            <input
              type="password"
              value={form.apiKey}
              onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
              placeholder="Bearer токен или API-ключ провайдера"
              className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm font-mono"
            />
            <p className="text-white/25 text-xs mt-1 flex items-center gap-1">
              <Icon name="Shield" size={10} />Ключ хранится в зашифрованном виде
            </p>
          </div>

          {addError && (
            <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2">
              <Icon name="AlertCircle" size={14} />{addError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-white/50 hover:text-white text-sm transition-colors">
              Отмена
            </button>
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 text-sm"
            >
              {adding ? <><Icon name="Loader2" size={14} className="animate-spin" />Создаю...</> : <><Icon name="Zap" size={14} />Подключить</>}
            </button>
          </div>
        </div>
      )}

      {/* После создания — показываем URL вебхука */}
      {created && (
        <div className="glass rounded-2xl border border-neon-green/30 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-green/15 flex items-center justify-center">
              <Icon name="CheckCircle2" size={20} className="text-neon-green" />
            </div>
            <div>
              <h4 className="font-oswald font-bold text-white">Интеграция создана!</h4>
              <p className="text-white/45 text-xs">Настройте вебхук в TicketsCloud для получения данных в реальном времени</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">URL вебхука — вставьте в настройки события</label>
              <div className="flex items-center gap-2 glass border border-white/10 rounded-xl px-3 py-2">
                <code className="flex-1 text-neon-cyan text-xs break-all">{created.webhookUrl}</code>
                <button onClick={() => navigator.clipboard.writeText(created.webhookUrl)}
                  className="shrink-0 text-white/30 hover:text-neon-cyan transition-colors" title="Скопировать">
                  <Icon name="Copy" size={14} />
                </button>
              </div>
            </div>
            {created.webhookSecret && (
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Секрет вебхука (опционально, для верификации)</label>
                <div className="flex items-center gap-2 glass border border-white/10 rounded-xl px-3 py-2">
                  <code className="flex-1 text-white/60 text-xs break-all font-mono">{created.webhookSecret}</code>
                  <button onClick={() => navigator.clipboard.writeText(created.webhookSecret)}
                    className="shrink-0 text-white/30 hover:text-neon-cyan transition-colors" title="Скопировать">
                    <Icon name="Copy" size={14} />
                  </button>
                </div>
              </div>
            )}
            <p className="text-white/35 text-xs flex items-start gap-1.5">
              <Icon name="Info" size={11} className="shrink-0 mt-0.5" />
              Кроме вебхука можно нажать «Синхронизировать» — мы сразу загрузим всю историю заказов
            </p>
          </div>
          <button onClick={() => { setShowAdd(false); setCreated(null); }}
            className="px-4 py-2 glass border border-white/10 rounded-xl text-white/60 hover:text-white text-sm transition-colors">
            Закрыть
          </button>
        </div>
      )}

      {/* Список интеграций */}
      {integrations.length === 0 && !showAdd ? (
        <div className="text-center py-16 glass rounded-2xl border border-white/5">
          <div className="w-14 h-14 rounded-2xl bg-neon-purple/10 flex items-center justify-center mx-auto mb-4">
            <Icon name="Ticket" size={24} className="text-neon-purple/50" />
          </div>
          <p className="text-white/50 font-oswald text-lg mb-1">Нет подключённых билетных систем</p>
          <p className="text-white/25 text-sm">Подключите TicketsCloud — продажи будут появляться автоматически</p>
        </div>
      ) : (
        <div className="space-y-3">
          {integrations.map(int => {
            const p = PROVIDERS[int.provider];
            const isActive = activeIntId === int.id;
            return (
              <div key={int.id} className="glass rounded-2xl border border-white/8 overflow-hidden">
                {/* Шапка интеграции */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/3 transition-colors"
                  onClick={() => setActiveIntId(isActive ? null : int.id)}
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
                      onClick={e => { e.stopPropagation(); handleSync(int.id); }}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
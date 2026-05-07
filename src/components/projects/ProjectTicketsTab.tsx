import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import TicketsAddForm from "./tickets/TicketsAddForm";
import TicketsIntegrationPanel from "./tickets/TicketsIntegrationPanel";

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

  // Диалог замены данных проекта
  type DiffField = { current: string; new: string; raw?: string };
  const [eventDiff, setEventDiff] = useState<Record<string, DiffField> | null>(null);
  const [pendingIntId, setPendingIntId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const FIELD_LABELS: Record<string, string> = {
    city: "Город",
    date_start: "Дата начала",
    date_end: "Дата окончания",
  };

  // Форма добавления
  const [form, setForm] = useState({ provider: "ticketscloud", name: "", apiKey: "", eventId: "" });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [created, setCreated] = useState<{ webhookUrl: string; webhookSecret: string } | null>(null);

  const loadIntegrations = useCallback(async (autoSync = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${TICKETS_URL}?action=list&user_id=${user.id}`);
      const data = await res.json();
      const all: Integration[] = data.integrations || [];
      const filtered = all.filter(i => i.projectId === projectId || !i.projectId);
      setIntegrations(filtered);

      // Автосинхронизация: если прошло >30 мин с последней синхронизации
      // Запускаем последовательно (не параллельно) чтобы не перегружать TC API
      if (autoSync && filtered.length > 0) {
        const now = Date.now();
        const toSync = filtered.filter(int => {
          if (!int.isActive) return false;
          const lastSync = int.lastSyncAt ? new Date(int.lastSyncAt).getTime() : 0;
          return (now - lastSync) / 1000 / 60 > 30;
        });
        if (toSync.length > 0) {
          (async () => {
            for (const int of toSync) {
              try {
                const r = await fetch(`${TICKETS_URL}?action=sync`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ integrationId: int.id }),
                });
                const d = await r.json();
                if (d.eventDiff && Object.keys(d.eventDiff).length > 0) {
                  setEventDiff(d.eventDiff);
                  setPendingIntId(int.id);
                }
              } catch { /* тихая ошибка */ }
            }
          })();
        }
      }
    } catch { setIntegrations([]); }
    finally { setLoading(false); }
  }, [user, projectId]);

  useEffect(() => { loadIntegrations(true); }, [loadIntegrations]);

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

  const applyEventDiff = async () => {
    if (!pendingIntId || !eventDiff) return;
    setApplying(true);
    const fields: Record<string, string> = {};
    Object.entries(eventDiff).forEach(([k, v]) => {
      fields[k] = v.raw ?? v.new;
    });
    try {
      const res = await fetch(`${TICKETS_URL}?action=apply_event_info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: pendingIntId, fields }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSyncMsg(`Ошибка обновления данных: ${d.error || res.status}`);
      } else {
        setSyncMsg("Данные проекта обновлены из TicketsCloud");
      }
    } catch {
      setSyncMsg("Ошибка соединения при обновлении данных");
    } finally {
      setApplying(false);
      setEventDiff(null);
      setPendingIntId(null);
    }
  };

  const handleSync = async (intId: string) => {
    setSyncing(true); setSyncMsg("Синхронизация запущена…"); setEventDiff(null);
    try {
      // Шаг 1: запускаем фоновую задачу — бэкенд отвечает мгновенно
      const res = await fetch(`${TICKETS_URL}?action=sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: intId }),
      });
      const data = await res.json();
      if (!res.ok) { setSyncMsg(data.error || "Ошибка синхронизации"); setSyncing(false); return; }

      const jobId = data.jobId;
      if (!jobId) { setSyncMsg("Ошибка запуска задачи"); setSyncing(false); return; }

      // Шаг 2: polling — опрашиваем статус каждые 2 сек, максимум 60 сек
      let attempts = 0;
      const poll = async (): Promise<void> => {
        attempts++;
        if (attempts > 30) { setSyncMsg("Синхронизация занимает слишком долго, попробуйте позже"); setSyncing(false); return; }
        try {
          const sr = await fetch(`${TICKETS_URL}?action=sync_status&job_id=${jobId}`);
          const sd = await sr.json();
          if (sd.status === "running") {
            setTimeout(poll, 2000);
          } else if (sd.status === "error") {
            setSyncMsg(`Ошибка: ${sd.error || "неизвестная ошибка"}`);
            setSyncing(false);
          } else {
            // done
            const parts = [`Загружено ${sd.ordersProcessed ?? 0} заказов`];
            if (sd.incomeLinesUpdated > 0) parts.push(`обновлено ${sd.incomeLinesUpdated} категорий`);
            if (sd.eventSets?.length > 0)
              parts.push(`тираж: ${sd.eventSets.map((s: {name:string;total:number}) => `${s.name} ${s.total} шт.`).join(", ")}`);
            setSyncMsg(parts.join(" · "));
            loadStats(intId);
            if (sd.eventDiff && Object.keys(sd.eventDiff).length > 0) {
              setEventDiff(sd.eventDiff);
              setPendingIntId(intId);
            }
            setSyncing(false);
          }
        } catch { setTimeout(poll, 2000); }
      };
      setTimeout(poll, 2000);
    } catch { setSyncMsg("Ошибка соединения"); setSyncing(false); }
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
      {showAdd && (
        <TicketsAddForm
          form={form}
          adding={adding}
          addError={addError}
          created={created}
          onFormChange={patch => setForm(f => ({ ...f, ...patch }))}
          onAdd={handleAdd}
          onCancel={() => setShowAdd(false)}
          onDone={() => { setShowAdd(false); setCreated(null); loadIntegrations(); }}
        />
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
            const isActive = activeIntId === int.id;
            return (
              <TicketsIntegrationPanel
                key={int.id}
                int={int}
                isActive={isActive}
                syncing={syncing}
                syncMsg={syncMsg}
                salesLoading={salesLoading}
                stats={isActive ? stats : null}
                sales={isActive ? sales : []}
                eventDiff={isActive ? eventDiff : null}
                applying={applying}
                fieldLabels={FIELD_LABELS}
                onToggleActive={() => setActiveIntId(isActive ? null : int.id)}
                onSync={() => handleSync(int.id)}
                onApplyDiff={applyEventDiff}
                onClearDiff={() => { setEventDiff(null); setPendingIntId(null); }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
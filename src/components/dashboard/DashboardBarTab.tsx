import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import TabHeader from "@/components/dashboard/TabHeader";
import BarIntegrationForm from "./bar/BarIntegrationForm";
import BarReportPanel from "./bar/BarReportPanel";

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

const TYPE_LABELS = { iiko: "iiko Cloud", rkeeper: "R-Keeper" };
const TYPE_COLORS = { iiko: "neon-cyan", rkeeper: "neon-purple" };

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
        <BarIntegrationForm
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
        <BarReportPanel integration={activeInt} events={events} onUpdated={loadIntegrations} />
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

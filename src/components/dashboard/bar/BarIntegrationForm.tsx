import { useState } from "react";
import Icon from "@/components/ui/icon";

const BAR_URL = "https://functions.poehali.dev/506e1ffe-4de6-4c2c-acd7-e558c2b91ce1";

const TYPE_LABELS = { iiko: "iiko Cloud", rkeeper: "R-Keeper" };

interface Props {
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function BarIntegrationForm({ userId, onSaved, onCancel }: Props) {
  const [type, setType]             = useState<"iiko" | "rkeeper">("iiko");
  const [displayName, setDisplayName] = useState("Бар");
  const [iikoApiLogin, setIikoApiLogin] = useState("");
  const [iikoOrgId, setIikoOrgId]   = useState("");
  const [rkUrl, setRkUrl]           = useState("");
  const [rkCashId, setRkCashId]     = useState("");
  const [rkLicense, setRkLicense]   = useState("");
  const [testing, setTesting]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; organizations?: { id: string; name: string }[] } | null>(null);
  const [error, setError]           = useState("");

  const testConnection = async () => {
    setTesting(true); setTestResult(null); setError("");
    try {
      const res = await fetch(`${BAR_URL}?action=test_connection`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, iikoApiLogin, rkServerUrl: rkUrl, rkCashId, rkLicenseCode: rkLicense }),
      });
      const data = await res.json();
      setTestResult(data);
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

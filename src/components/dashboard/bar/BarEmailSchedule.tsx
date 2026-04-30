import { useState } from "react";
import Icon from "@/components/ui/icon";

const BAR_URL = "https://functions.poehali.dev/506e1ffe-4de6-4c2c-acd7-e558c2b91ce1";

interface Integration {
  id: string;
  type: "iiko" | "rkeeper";
  displayName: string;
  emailReportEnabled: boolean;
  emailReportTo: string;
  emailReportTime: string;
  emailReportTypes: string[];
  emailReportLastSent: string | null;
}

interface Props {
  integration: Integration;
  onUpdated: () => void;
}

export default function BarEmailSchedule({ integration, onUpdated }: Props) {
  const [enabled,  setEnabled]  = useState(integration.emailReportEnabled);
  const [emailTo,  setEmailTo]  = useState(integration.emailReportTo || "");
  const [time,     setTime]     = useState(integration.emailReportTime || "08:00");
  const [types,    setTypes]    = useState<string[]>(integration.emailReportTypes || []);
  const [saving,   setSaving]   = useState(false);
  const [sending,  setSending]  = useState(false);
  const [msg,      setMsg]      = useState<{ ok: boolean; text: string } | null>(null);

  const TYPES = [
    { id: "sales",  label: "Продажи",  icon: "TrendingUp" },
    { id: "stock",  label: "Остатки",  icon: "Package"    },
    { id: "shifts", label: "Смены",    icon: "Clock"      },
  ];

  const toggleType = (id: string) =>
    setTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const save = async () => {
    setMsg(null); setSaving(true);
    try {
      const res = await fetch(`${BAR_URL}?action=update_email_schedule`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: integration.id, enabled, emailTo, reportTime: time, reportTypes: types }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: data.error || "Ошибка" }); return; }
      setMsg({ ok: true, text: enabled ? "Расписание сохранено" : "Рассылка отключена" });
      onUpdated();
    } catch { setMsg({ ok: false, text: "Ошибка соединения" }); }
    finally { setSaving(false); }
  };

  const sendNow = async () => {
    setMsg(null); setSending(true);
    try {
      const res = await fetch(`${BAR_URL}?action=send_report_email`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: integration.id, emailTo, reportTypes: types }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: data.error || "Ошибка отправки" }); return; }
      setMsg({ ok: true, text: `Отчёт отправлен на ${emailTo}` });
    } catch { setMsg({ ok: false, text: "Ошибка соединения" }); }
    finally { setSending(false); }
  };

  const inp = "w-full glass rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm bg-transparent";

  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
      {/* Заголовок с главным тогглом */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-white/3 transition-colors"
        onClick={() => setEnabled(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${enabled ? "bg-neon-purple/15" : "bg-white/5"}`}>
            <Icon name="Mail" size={16} className={enabled ? "text-neon-purple" : "text-white/35"} />
          </div>
          <div>
            <p className="text-white/85 text-sm font-semibold">Отправка на email</p>
            <p className="text-white/40 text-xs">
              {enabled
                ? `Ежедневно в ${time} → ${emailTo || "не указан"}`
                : "По умолчанию выключено"}
            </p>
          </div>
        </div>
        <div className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${enabled ? "bg-neon-purple" : "bg-white/15"}`}
          onClick={e => { e.stopPropagation(); setEnabled(v => !v); }}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${enabled ? "left-5" : "left-0.5"}`} />
        </div>
      </div>

      {/* Настройки (показываем только когда включено) */}
      {enabled && (
        <div className="border-t border-white/8 px-4 py-4 space-y-4">

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Получатель</label>
            <input
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              placeholder="your@email.com"
              type="email"
              className={inp}
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Время отправки (UTC+3)</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className={`${inp} w-32`}
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-2 block">Что включить в письмо</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => {
                const active = types.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleType(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      active
                        ? "bg-neon-purple/20 border-neon-purple/40 text-white"
                        : "border-white/10 text-white/45 hover:text-white hover:border-white/25"
                    }`}
                  >
                    <Icon name={t.icon as never} size={12} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {msg && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
              msg.ok ? "bg-neon-green/10 border-neon-green/25 text-neon-green" : "bg-neon-pink/10 border-neon-pink/25 text-neon-pink"
            }`}>
              <Icon name={msg.ok ? "CheckCircle" : "AlertCircle"} size={13} className="shrink-0" />
              {msg.text}
            </div>
          )}

          {integration.emailReportLastSent && (
            <p className="text-white/25 text-[10px]">
              Последняя отправка: {new Date(integration.emailReportLastSent).toLocaleString("ru")}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={sendNow}
              disabled={sending || !emailTo || types.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border border-white/15 text-white/65 hover:text-white hover:border-white/30 disabled:opacity-40 transition-all"
            >
              {sending ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Send" size={12} />}
              Отправить сейчас
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs bg-neon-purple text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Check" size={12} />}
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Если выключено — кнопка сохранить */}
      {!enabled && integration.emailReportEnabled && (
        <div className="border-t border-white/8 px-4 py-3">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs bg-neon-pink/15 text-neon-pink border border-neon-pink/25 hover:bg-neon-pink/25 disabled:opacity-50 transition-all">
            {saving ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="BellOff" size={12} />}
            Отключить рассылку
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { ADMIN_URL } from "./types";

const SETTINGS_KEY = "gl_admin_settings";

interface Settings {
  pollingEnabled: boolean;
  pollingInterval: number; // секунд
  devMode: boolean;
  aiEnabled: boolean;
}

const DEFAULTS: Settings = {
  pollingEnabled: false,
  pollingInterval: 10,
  devMode: true,
  aiEnabled: true,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function Toggle({ value, onChange, label, description, color = "neon-purple" }: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/5 last:border-0">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-white/40 text-xs mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${value ? `bg-${color}/70 border border-${color}/50` : "bg-white/10 border border-white/10"}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-all duration-300 ${value ? `left-5 bg-${color}` : "left-0.5 bg-white/30"}`} />
      </button>
    </div>
  );
}

interface Props {
  token?: string;
}

export default function AdminSettingsTab({ token = "" }: Props) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [saved, setSaved] = useState(false);

  // Тестовое письмо
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const sendTestEmail = async () => {
    if (!testEmail.includes("@")) {
      setTestResult({ ok: false, message: "Введите корректный email" });
      return;
    }
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch(`${ADMIN_URL}?action=test_email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: JSON.stringify({ email: testEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, message: data.message || "Письмо отправлено" });
      } else {
        setTestResult({ ok: false, message: data.error || "Ошибка отправки" });
      }
    } catch {
      setTestResult({ ok: false, message: "Сеть недоступна" });
    } finally {
      setTestSending(false);
    }
  };

  const update = (patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Применяем настройки: пишем в window для доступа из других компонентов
  useEffect(() => {
    const gl = window as never as Record<string, unknown>;
    gl.__GL_POLLING_ENABLED__ = settings.pollingEnabled;
    gl.__GL_POLLING_INTERVAL__ = settings.pollingInterval * 1000;
    gl.__GL_DEV_MODE__ = settings.devMode;
    gl.__GL_AI_ENABLED__ = settings.aiEnabled;
  }, [settings]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-oswald font-bold text-xl text-white mb-1">Настройки платформы</h2>
        <p className="text-white/40 text-sm">Управляй режимами работы без деплоя</p>
      </div>

      {/* Статус */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${saved ? "bg-neon-green/10 border-neon-green/30" : "bg-white/3 border-white/8"}`}>
        <Icon name={saved ? "CheckCircle2" : "Info"} size={16} className={saved ? "text-neon-green" : "text-white/30"} />
        <p className={`text-sm ${saved ? "text-neon-green" : "text-white/30"}`}>
          {saved ? "Настройки сохранены и применены" : "Изменения применяются мгновенно без перезагрузки"}
        </p>
      </div>

      {/* Секция: Режим разработки */}
      <div className="glass rounded-2xl border border-white/8 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="Code2" size={16} className="text-neon-cyan" />
          <h3 className="font-oswald font-bold text-neon-cyan text-sm uppercase tracking-wider">Режим разработки</h3>
        </div>
        <Toggle
          value={settings.devMode}
          onChange={v => update({ devMode: v })}
          label="Dev Mode"
          description="Отключает лишние запросы, включает отладочные инструменты"
          color="neon-cyan"
        />
      </div>

      {/* Секция: Поллинг */}
      <div className="glass rounded-2xl border border-white/8 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="RefreshCw" size={16} className="text-neon-purple" />
          <h3 className="font-oswald font-bold text-neon-purple text-sm uppercase tracking-wider">Автообновление (поллинг)</h3>
        </div>
        <p className="text-white/30 text-xs mb-4">Контролирует частоту запросов к серверу из чата и уведомлений</p>

        <Toggle
          value={settings.pollingEnabled}
          onChange={v => update({ pollingEnabled: v })}
          label="Включить автообновление"
          description={settings.pollingEnabled
            ? `Данные обновляются каждые ${settings.pollingInterval} сек — активные запросы к серверу`
            : "Данные загружаются только при открытии страницы — 0 фоновых запросов"}
          color="neon-purple"
        />

        {settings.pollingEnabled && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-white/50 text-xs mb-3">Интервал обновления</p>
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 15, 30, 60].map(sec => (
                <button
                  key={sec}
                  onClick={() => update({ pollingInterval: sec })}
                  className={`px-4 py-2 rounded-xl text-sm font-oswald transition-all ${settings.pollingInterval === sec
                    ? "bg-neon-purple text-white"
                    : "glass border border-white/10 text-white/40 hover:text-white"}`}
                >
                  {sec < 60 ? `${sec} сек` : "1 мин"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Секция: ИИ-ассистент */}
      <div className="glass rounded-2xl border border-white/8 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="Sparkles" size={16} className="text-neon-pink" />
          <h3 className="font-oswald font-bold text-neon-pink text-sm uppercase tracking-wider">ИИ-ассистент</h3>
        </div>
        <p className="text-white/30 text-xs mb-4">Управляет доступностью ИИ-помощника в разделе «Помочь» для всех пользователей</p>
        <Toggle
          value={settings.aiEnabled}
          onChange={v => update({ aiEnabled: v })}
          label="Включить ИИ-ассистента"
          description={settings.aiEnabled
            ? "ИИ-ассистент доступен всем пользователям платформы"
            : "Пользователям показывается сообщение об отключении — запросы не расходуются"}
          color="neon-pink"
        />
      </div>

      {/* Секция: Тест отправки писем */}
      <div className="glass rounded-2xl border border-white/8 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="Mail" size={16} className="text-neon-cyan" />
          <h3 className="font-oswald font-bold text-neon-cyan text-sm uppercase tracking-wider">Тест отправки писем</h3>
        </div>
        <p className="text-white/30 text-xs mb-4">
          Проверь, доходят ли письма с продакшна. Если основной домен не верифицирован в Resend — письмо уйдёт через onboarding@resend.dev и ты увидишь это в ответе.
        </p>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !testSending && sendTestEmail()}
            placeholder="email@example.com"
            disabled={testSending}
            className="flex-1 min-w-0 glass rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm disabled:opacity-50"
          />
          <button
            onClick={sendTestEmail}
            disabled={testSending || !testEmail}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neon-cyan text-black font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap text-sm"
          >
            {testSending ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Send" size={14} />}
            Отправить
          </button>
        </div>
        {testResult && (
          <div className={`mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl border text-sm ${
            testResult.ok
              ? "bg-neon-green/10 border-neon-green/25 text-neon-green"
              : "bg-neon-pink/10 border-neon-pink/25 text-neon-pink"
          }`}>
            <Icon name={testResult.ok ? "CheckCircle2" : "AlertCircle"} size={14} className="shrink-0 mt-0.5" />
            <span className="text-xs leading-relaxed break-words">{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Секция: Состояние */}
      <div className="glass rounded-2xl border border-white/8 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="Activity" size={16} className="text-neon-green" />
          <h3 className="font-oswald font-bold text-neon-green text-sm uppercase tracking-wider">Текущее состояние</h3>
        </div>
        <div className="space-y-2">
          {[
            { label: "Dev Mode",                    value: settings.devMode,       icon: "Code2",         color: "neon-cyan"   },
            { label: "ИИ-ассистент",                value: settings.aiEnabled,     icon: "Sparkles",      color: "neon-pink"   },
            { label: "Автообновление чата",          value: settings.pollingEnabled, icon: "MessageCircle", color: "neon-purple" },
            { label: "Автообновление уведомлений",   value: settings.pollingEnabled, icon: "Bell",          color: "neon-purple" },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Icon name={row.icon as never} size={14} className={`text-${row.color}/60`} />
                <span className="text-white/60 text-sm">{row.label}</span>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${row.value
                ? "bg-neon-green/15 text-neon-green border border-neon-green/25"
                : "bg-white/5 text-white/30 border border-white/10"}`}>
                {row.value ? "Включено" : "Выключено"}
              </span>
            </div>
          ))}
          {settings.pollingEnabled && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Icon name="Clock" size={14} className="text-neon-purple/60" />
                <span className="text-white/60 text-sm">Интервал</span>
              </div>
              <span className="text-white/50 text-xs">{settings.pollingInterval} сек</span>
            </div>
          )}
        </div>
      </div>

      {/* Сброс */}
      <button
        onClick={() => { saveSettings(DEFAULTS); setSettings(DEFAULTS); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
        className="flex items-center gap-2 text-sm text-white/30 hover:text-neon-pink transition-colors"
      >
        <Icon name="RotateCcw" size={14} />
        Сбросить к значениям по умолчанию
      </button>
    </div>
  );
}
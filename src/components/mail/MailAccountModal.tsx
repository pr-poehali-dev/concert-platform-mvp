import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { MAIL_URL, MAIL_PRESETS, detectPreset } from "./mailTypes";

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

export default function MailAccountModal({ onClose, onAdded }: Props) {
  const { user } = useAuth();
  const [presetId, setPresetId] = useState("yandex");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [imapHost, setImapHost] = useState("imap.yandex.ru");
  const [imapPort, setImapPort] = useState(993);
  const [smtpHost, setSmtpHost] = useState("smtp.yandex.ru");
  const [smtpPort, setSmtpPort] = useState(465);
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const preset = MAIL_PRESETS.find(p => p.id === presetId) || MAIL_PRESETS[0];

  useEffect(() => {
    setImapHost(preset.imapHost);
    setImapPort(preset.imapPort);
    setSmtpHost(preset.smtpHost);
    setSmtpPort(preset.smtpPort);
  }, [presetId]);

  // Автодетект пресета по email
  useEffect(() => {
    if (!email.includes("@")) return;
    const p = detectPreset(email);
    if (p && p.id !== "custom") setPresetId(p.id);
  }, [email]);

  const submit = async () => {
    if (!user) return;
    setError("");
    if (!email.trim() || !password || !imapHost || !smtpHost) {
      setError("Заполните все обязательные поля");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${MAIL_URL}?action=add_account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: email.trim().toLowerCase(),
          displayName: displayName.trim(),
          imapHost,
          imapPort,
          imapSsl: true,
          smtpHost,
          smtpPort,
          smtpSsl: smtpPort === 465,
          username: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось подключиться");
        return;
      }
      onAdded();
      onClose();
    } catch {
      setError("Сбой подключения. Попробуйте ещё раз");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl border border-white/15 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center">
              <Icon name="Mail" size={18} className="text-neon-purple" />
            </div>
            <div>
              <h3 className="font-oswald font-bold text-xl text-white leading-none">Подключить почту</h3>
              <p className="text-white/45 text-xs mt-1">IMAP + SMTP, пароль шифруется</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Провайдер */}
          <div>
            <label className="text-white/65 text-xs font-semibold uppercase tracking-wide">Провайдер</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {MAIL_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPresetId(p.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    presetId === p.id
                      ? "bg-neon-purple/20 border-neon-purple/40 text-white"
                      : "bg-white/5 border-white/10 text-white/65 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset.hint && (
              <p className="text-neon-cyan/80 text-xs mt-2 flex gap-1.5 items-start">
                <Icon name="Info" size={12} className="mt-0.5 shrink-0" />
                <span>{preset.hint}</span>
              </p>
            )}
          </div>

          <div>
            <label className="text-white/65 text-xs font-semibold uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@yandex.ru"
              className="gl-input mt-1.5"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-white/65 text-xs font-semibold uppercase tracking-wide">Отображаемое имя</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Иван Иванов"
              className="gl-input mt-1.5"
            />
          </div>

          <div>
            <label className="text-white/65 text-xs font-semibold uppercase tracking-wide">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Пароль приложения"
              className="gl-input mt-1.5"
              autoComplete="new-password"
            />
            <p className="text-white/35 text-[11px] mt-1">
              Хранится в зашифрованном виде. Используйте «пароль приложения», а не основной пароль аккаунта.
            </p>
          </div>

          <button
            onClick={() => setAdvanced(v => !v)}
            className="text-white/55 hover:text-white text-xs flex items-center gap-1 transition-colors"
          >
            <Icon name={advanced ? "ChevronDown" : "ChevronRight"} size={12} />
            Расширенные настройки серверов
          </button>

          {advanced && (
            <div className="space-y-3 border-l-2 border-white/10 pl-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-white/55 text-[11px]">IMAP host</label>
                  <input value={imapHost} onChange={e => setImapHost(e.target.value)} className="gl-input mt-1" />
                </div>
                <div>
                  <label className="text-white/55 text-[11px]">Порт</label>
                  <input type="number" value={imapPort} onChange={e => setImapPort(Number(e.target.value))} className="gl-input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-white/55 text-[11px]">SMTP host</label>
                  <input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="gl-input mt-1" />
                </div>
                <div>
                  <label className="text-white/55 text-[11px]">Порт</label>
                  <input type="number" value={smtpPort} onChange={e => setSmtpPort(Number(e.target.value))} className="gl-input mt-1" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-neon-pink/10 border border-neon-pink/30 rounded-lg px-3 py-2 text-neon-pink text-xs flex items-start gap-2">
              <Icon name="AlertCircle" size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/10 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-white/65 hover:text-white text-sm">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-5 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {loading && <Icon name="Loader2" size={14} className="animate-spin" />}
            {loading ? "Подключаю..." : "Подключить"}
          </button>
        </div>
      </div>
    </div>
  );
}

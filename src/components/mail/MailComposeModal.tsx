import { useState } from "react";
import Icon from "@/components/ui/icon";
import { MAIL_URL, type MailAccount } from "./mailTypes";

interface Props {
  account: MailAccount;
  initial?: { to?: string; subject?: string; text?: string };
  onClose: () => void;
  onSent: () => void;
}

export default function MailComposeModal({ account, initial, onClose, onSent }: Props) {
  const [to, setTo] = useState(initial?.to || "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(initial?.subject || "");
  const [text, setText] = useState(initial?.text || "");
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setError("");
    if (!to.trim()) { setError("Укажите получателя"); return; }
    setSending(true);
    try {
      const res = await fetch(`${MAIL_URL}?action=send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          to: to.trim(),
          cc: cc.trim(),
          subject: subject.trim(),
          text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка отправки");
        return;
      }
      onSent();
      onClose();
    } catch {
      setError("Сбой отправки");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl border border-white/15 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neon-cyan/15 border border-neon-cyan/25 flex items-center justify-center">
              <Icon name="Send" size={16} className="text-neon-cyan" />
            </div>
            <div>
              <h3 className="font-oswald font-bold text-lg text-white leading-none">Новое письмо</h3>
              <p className="text-white/45 text-xs mt-0.5">от {account.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex items-center gap-2 border-b border-white/8 pb-2">
            <span className="text-white/55 text-xs w-16 font-semibold">Кому</span>
            <input
              type="text"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"
            />
            {!showCc && (
              <button onClick={() => setShowCc(true)} className="text-white/55 hover:text-white text-xs">
                + Копия
              </button>
            )}
          </div>

          {showCc && (
            <div className="flex items-center gap-2 border-b border-white/8 pb-2">
              <span className="text-white/55 text-xs w-16 font-semibold">Копия</span>
              <input
                type="text"
                value={cc}
                onChange={e => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"
              />
            </div>
          )}

          <div className="flex items-center gap-2 border-b border-white/8 pb-2">
            <span className="text-white/55 text-xs w-16 font-semibold">Тема</span>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Тема письма"
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"
            />
          </div>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Текст письма..."
            className="flex-1 min-h-[200px] bg-transparent text-white text-sm outline-none placeholder:text-white/25 resize-none"
          />

          {error && (
            <div className="bg-neon-pink/10 border border-neon-pink/30 rounded-lg px-3 py-2 text-neon-pink text-xs flex items-start gap-2">
              <Icon name="AlertCircle" size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-white/65 hover:text-white text-sm">
            Отмена
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="px-5 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {sending ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Send" size={14} />}
            {sending ? "Отправка..." : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}

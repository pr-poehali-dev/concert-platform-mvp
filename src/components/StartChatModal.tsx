import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const CHAT_URL = "https://functions.poehali.dev/85035195-bd7b-44ce-b77c-db1255f711b5";

interface StartChatModalProps {
  open: boolean;
  venueName: string;
  venueId: string;
  venueUserId: string;
  onClose: () => void;
  onStarted: (conversationId: string) => void;
}

export default function StartChatModal({ open, venueName, venueId, venueUserId, onClose, onStarted }: StartChatModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSend = async () => {
    if (!user) return;
    const text = message.trim();
    if (!text) { setError("Введите сообщение"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${CHAT_URL}?action=start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizerId: user.id,
          venueId,
          venueUserId,
          venueName,
          message: text,
          organizerName: user.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      onStarted(data.conversationId);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при отправке");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl overflow-hidden animate-scale-in">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />

        <div className="flex items-center justify-between p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neon-cyan/15 flex items-center justify-center">
              <Icon name="MessageCircle" size={18} className="text-neon-cyan" />
            </div>
            <div>
              <h2 className="font-oswald font-bold text-lg text-white">Написать площадке</h2>
              <p className="text-white/40 text-xs">{venueName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Ваше сообщение</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Здравствуйте, ${venueName}! Хотим узнать о доступности площадки...`}
              rows={4}
              autoFocus
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/20 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-4 py-2.5 border border-neon-pink/20">
              <Icon name="AlertCircle" size={14} />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 glass text-white/50 hover:text-white rounded-xl border border-white/10 text-sm transition-colors">
              Отмена
            </button>
            <button onClick={handleSend} disabled={loading || !message.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
              {loading
                ? <><Icon name="Loader2" size={15} className="animate-spin" />Отправка...</>
                : <><Icon name="Send" size={15} />Отправить</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

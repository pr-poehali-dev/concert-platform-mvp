import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const ADMIN_URL = "https://functions.poehali.dev/19ba5519-e548-4443-845c-9cb446cfc909";

interface SupportMessage {
  id: string;
  sender: "user" | "admin";
  text: string;
  isReadByAdmin: boolean;
  createdAt: string;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

export default function SupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userId = user?.id ?? "";

  const loadMessages = useCallback(async (silent = false) => {
    if (!userId) return;
    try {
      const res = await fetch(`${ADMIN_URL}?action=support_history&user_id=${userId}`);
      const data = await res.json();
      const next: SupportMessage[] = data.messages || [];
      // Diff — обновляем только при реальных изменениях
      setMessages(prev => {
        if (next.length === prev.length && next[next.length - 1]?.id === prev[prev.length - 1]?.id) return prev;
        return next;
      });
      if (!silent) setUnread(0);
    } catch { /* silent */ }
  }, [userId]);

  const loadUnread = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${ADMIN_URL}?action=support_unread_count&user_id=${userId}`);
      const data = await res.json();
      setUnread(prev => prev === (data.count || 0) ? prev : (data.count || 0));
    } catch { /* silent */ }
  }, [userId]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      loadMessages().finally(() => setLoading(false));
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(() => loadMessages(true), 3000);
    } else {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    }
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [open, loadMessages]);

  useEffect(() => {
    if (open) return;
    loadUnread();
    const t = setInterval(loadUnread, 5000);
    return () => clearInterval(t);
  }, [open, loadUnread]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (!user) return null;

  const send = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText("");
    const optimistic: SupportMessage = {
      id: `opt-${Date.now()}`, sender: "user", text,
      isReadByAdmin: false, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      await fetch(`${ADMIN_URL}?action=support_send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, text, sender: "user" }),
      });
    } catch { /* silent */ }
    setSending(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-3">
      {open && (
        <div
          className="w-80 sm:w-96 glass-strong rounded-2xl border border-neon-purple/30 flex flex-col overflow-hidden shadow-2xl animate-scale-in"
          style={{ height: "480px" }}
        >
          {/* Шапка */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/10 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center shrink-0">
              <Icon name="Headphones" size={15} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-oswald font-bold text-white text-sm">Поддержка GLOBAL LINK</p>
              <p className="text-white/40 text-xs">Ответим в течение дня</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors">
              <Icon name="X" size={16} />
            </button>
          </div>

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Icon name="Loader2" size={20} className="text-white/30 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <Icon name="MessageCircle" size={32} className="text-white/15 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Здравствуйте, {user.name}!</p>
                <p className="text-white/25 text-xs mt-1">Напишите нам — мы поможем с любым вопросом.</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.sender === "admin" && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center shrink-0 mr-2 mt-0.5">
                      <Icon name="Headphones" size={12} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3 py-2 ${msg.sender === "user"
                    ? "bg-neon-purple/30 border border-neon-purple/30 rounded-2xl rounded-br-sm"
                    : "bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm"}`}>
                    <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-white/25 text-[10px]">{formatTime(msg.createdAt)}</span>
                      {msg.sender === "user" && (
                        <Icon name={msg.isReadByAdmin ? "CheckCheck" : "Check"} size={11}
                          className={msg.isReadByAdmin ? "text-neon-cyan" : "text-white/25"} />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ввод */}
          <div className="flex items-end gap-2 p-3 border-t border-white/10 shrink-0">
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ваш вопрос..."
              rows={1}
              className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none border border-white/10 focus:border-neon-purple/40 resize-none"
              style={{ maxHeight: "80px" }}
            />
            <button
              onClick={send}
              disabled={!inputText.trim() || sending}
              className="w-9 h-9 flex items-center justify-center bg-neon-purple rounded-xl hover:bg-neon-purple/80 disabled:opacity-40 transition-all shrink-0"
            >
              {sending
                ? <Icon name="Loader2" size={15} className="animate-spin text-white" />
                : <Icon name="Send" size={15} className="text-white" />}
            </button>
          </div>
        </div>
      )}

      {/* Кнопка */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <Icon name={open ? "X" : "Headphones"} size={22} className="text-white" />
        {!open && unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neon-pink rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
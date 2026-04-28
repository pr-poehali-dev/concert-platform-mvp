import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { ADMIN_URL } from "./types";

interface SupportDialog {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  lastAt: string;
  unread: number;
  lastMessage: string;
}

interface SupportMessage {
  id: string;
  sender: "user" | "admin";
  text: string;
  isReadByAdmin: boolean;
  isReadByUser: boolean;
  createdAt: string;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

function roleLabel(role: string) {
  if (role === "organizer") return "Организатор";
  if (role === "venue") return "Площадка";
  return role;
}

export default function AdminSupportTab({ token }: { token: string }) {
  const [dialogs, setDialogs] = useState<SupportDialog[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingDialogs, setLoadingDialogs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const headers = { "X-Admin-Token": token, "Content-Type": "application/json" };

  const loadDialogs = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${ADMIN_URL}?action=support_dialogs`, { headers });
      const data = await res.json();
      const next = data.dialogs || [];
      // Diff — обновляем список диалогов только при изменениях
      setDialogs(prev => {
        const sig = (arr: typeof next) => arr.map((d: { userId: string; unread: number; lastMessage?: string }) => `${d.userId}:${d.unread}:${d.lastMessage || ""}`).join("|");
        return sig(prev) === sig(next) ? prev : next;
      });
    } catch { /* silent */ } finally { if (!silent) setLoadingDialogs(false); }
  }, [token]);

  const loadMessages = useCallback(async (uid: string, silent = false) => {
    if (!uid) return;
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await fetch(`${ADMIN_URL}?action=support_dialog&user_id=${uid}`, { headers });
      const data = await res.json();
      const next = data.messages || [];
      // Diff — не перерисовываем если нет новых сообщений
      setMessages(prev => {
        if (next.length === prev.length && next[next.length - 1]?.id === prev[prev.length - 1]?.id) return prev;
        return next;
      });
      setDialogs(prev => prev.map(d => d.userId === uid ? { ...d, unread: 0 } : d));
    } catch { /* silent */ } finally { if (!silent) setLoadingMsgs(false); }
  }, [token]);

  useEffect(() => {
    loadDialogs();
    const t = setInterval(() => loadDialogs(true), 3000);
    return () => clearInterval(t);
  }, [loadDialogs]);

  useEffect(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (!activeUserId) return;
    loadMessages(activeUserId);
    const uid = activeUserId;
    pollingRef.current = setInterval(() => loadMessages(uid, true), 3000);
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [activeUserId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = inputText.trim();
    if (!text || sending || !activeUserId) return;
    setSending(true);
    setInputText("");
    const optimistic: SupportMessage = {
      id: `opt-${Date.now()}`, sender: "admin", text,
      isReadByAdmin: true, isReadByUser: false, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      await fetch(`${ADMIN_URL}?action=support_send`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: activeUserId, text, sender: "admin" }),
      });
      setDialogs(prev => prev.map(d =>
        d.userId === activeUserId ? { ...d, lastMessage: text, lastAt: new Date().toISOString() } : d
      ));
    } catch { /* silent */ }
    setSending(false);
  };

  const totalUnread = dialogs.reduce((s, d) => s + (d.unread || 0), 0);
  const filtered = dialogs.filter(d =>
    !search ||
    d.userName.toLowerCase().includes(search.toLowerCase()) ||
    d.userEmail.toLowerCase().includes(search.toLowerCase())
  );
  const activeDialog = dialogs.find(d => d.userId === activeUserId);

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Список диалогов */}
      <div className="w-72 shrink-0 flex flex-col glass rounded-2xl overflow-hidden border border-white/10">
        <div className="p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-oswald font-bold text-white flex items-center gap-2">
              <Icon name="Headphones" size={16} className="text-neon-purple" />
              Поддержка
              {totalUnread > 0 && (
                <span className="w-5 h-5 bg-neon-pink rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
            <Icon name="Search" size={13} className="text-white/30 shrink-0" />
            <input type="text" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingDialogs ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 glass rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
              <Icon name="MessageCircleOff" size={28} className="text-white/20" />
              <p className="text-white/30 text-sm">Нет обращений</p>
            </div>
          ) : (
            filtered.map(d => (
              <button key={d.userId} onClick={() => setActiveUserId(d.userId)}
                className={`w-full flex items-start gap-3 p-4 text-left transition-all hover:bg-white/5 border-b border-white/5
                  ${activeUserId === d.userId ? "bg-neon-purple/10 border-l-2 border-l-neon-purple" : ""}`}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shrink-0 text-white font-bold text-sm">
                  {d.userName.trim()[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-white text-sm font-medium truncate">{d.userName}</span>
                    <span className="text-white/30 text-[10px] shrink-0 ml-1">{formatTime(d.lastAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-xs truncate">{d.lastMessage || "Нет сообщений"}</span>
                    {d.unread > 0 && (
                      <span className="w-4 h-4 bg-neon-pink rounded-full text-white text-[9px] font-bold flex items-center justify-center ml-1 shrink-0">
                        {d.unread}
                      </span>
                    )}
                  </div>
                  <span className="text-white/20 text-[10px]">{roleLabel(d.userRole)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Окно диалога */}
      <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden border border-white/10">
        {!activeUserId ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Icon name="MessageCircle" size={36} className="text-white/15" />
            <p className="text-white/40 font-oswald">Выберите диалог</p>
          </div>
        ) : (
          <>
            {/* Заголовок */}
            <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0">
              <button onClick={() => setActiveUserId(null)}
                className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/60">
                <Icon name="ArrowLeft" size={16} />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold">
                {activeDialog?.userName.trim()[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-oswald font-semibold text-white">{activeDialog?.userName}</p>
                <p className="text-white/40 text-xs">{activeDialog?.userEmail} · {roleLabel(activeDialog?.userRole || "")}</p>
              </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <Icon name="Loader2" size={20} className="text-white/30 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Icon name="MessageCircle" size={28} className="text-white/15" />
                  <p className="text-white/30 text-sm">Нет сообщений</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    {msg.sender === "user" && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shrink-0 mr-2 mt-0.5 text-white text-[10px] font-bold">
                        {activeDialog?.userName.trim()[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className={`max-w-[75%] px-3 py-2 ${msg.sender === "admin"
                      ? "bg-neon-purple/30 border border-neon-purple/30 rounded-2xl rounded-br-sm"
                      : "bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm"}`}>
                      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-white/25 text-[10px]">{formatTime(msg.createdAt)}</span>
                        {msg.sender === "admin" && (
                          <Icon name={msg.isReadByUser ? "CheckCheck" : "Check"} size={11}
                            className={msg.isReadByUser ? "text-neon-cyan" : "text-white/25"} />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Ввод */}
            <div className="flex items-end gap-2 p-4 border-t border-white/10 shrink-0">
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ответ пользователю..."
                rows={1}
                className="flex-1 bg-white/5 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-neon-purple/40 text-sm resize-none"
                style={{ maxHeight: "100px" }}
              />
              <button onClick={send} disabled={!inputText.trim() || sending}
                className="w-10 h-10 flex items-center justify-center bg-neon-purple rounded-xl hover:bg-neon-purple/80 disabled:opacity-40 transition-all shrink-0">
                {sending
                  ? <Icon name="Loader2" size={16} className="animate-spin text-white" />
                  : <Icon name="Send" size={16} className="text-white" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
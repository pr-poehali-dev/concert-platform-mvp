import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

const CHAT_URL = "https://functions.poehali.dev/85035195-bd7b-44ce-b77c-db1255f711b5";

const AVATAR_COLORS = [
  "from-neon-purple to-neon-pink",
  "from-neon-cyan to-neon-green",
  "from-neon-pink to-neon-purple",
  "from-neon-green to-neon-cyan",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitial(name: string) {
  return name.trim()[0]?.toUpperCase() || "?";
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

interface Conversation {
  id: string;
  organizerId: string;
  venueId: string;
  venueUserId: string;
  venueName: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  isOrganizer: boolean;
  organizerName: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export default function ChatPage({ initialConversationId }: { initialConversationId?: string | null }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeConv = conversations.find(c => c.id === activeConvId) || null;

  // Загрузка диалогов
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${CHAT_URL}?action=conversations&user_id=${user.id}`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch { /* silent */ }
    finally { setLoadingConvs(false); }
  }, [user]);

  // Загрузка сообщений диалога
  // silent=true — фоновый polling, без показа лоадера (предотвращает мерцание)
  const loadMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await fetch(`${CHAT_URL}?action=messages&conversation_id=${convId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { /* silent */ }
    finally { if (!silent) setLoadingMsgs(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // При смене активного диалога — грузим сообщения и отмечаем прочитанными
  useEffect(() => {
    if (!activeConvId || !user) return;
    loadMessages(activeConvId);

    // Сбрасываем unread
    fetch(`${CHAT_URL}?action=read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeConvId, userId: user.id }),
    });
    setConversations(prev => prev.map(c =>
      c.id === activeConvId ? { ...c, unread: 0 } : c
    ));

    // Polling сообщений каждые 5 сек — тихо, без лоадера
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => loadMessages(activeConvId, true), 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [activeConvId, user, loadMessages]);

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !activeConvId || !user || sending) return;
    setSending(true);
    setInputText("");

    // Оптимистичное добавление
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversationId: activeConvId,
      senderId: user.id,
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await fetch(`${CHAT_URL}?action=send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId,
          senderId: user.id,
          text,
          senderName: user.name,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Заменяем оптимистичное на реальное
        setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
        setConversations(prev => prev.map(c =>
          c.id === activeConvId ? { ...c, lastMessage: text, lastMessageAt: data.createdAt } : c
        ));
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  const filteredConvs = conversations.filter(c =>
    !search || c.venueName.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  // Группировка сообщений по дате
  let lastDate = "";

  return (
    <div className="min-h-screen pt-16 pb-0">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 sm:py-8 h-[calc(100vh-4rem)]">
        <div className="flex gap-4 h-full">

          {/* ── Sidebar ── */}
          <aside className={`shrink-0 flex flex-col glass sm:rounded-2xl overflow-hidden w-full sm:w-72 ${activeConvId ? "hidden sm:flex" : "flex"}`}>
            <div className="p-4 border-b border-white/10 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-oswald font-bold text-xl text-white">Сообщения</h2>
                {totalUnread > 0 && (
                  <Badge className="bg-neon-purple text-white text-xs">{totalUnread}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                <Icon name="Search" size={14} className="text-white/30 shrink-0" />
                <input type="text" placeholder="Поиск диалогов..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {loadingConvs ? (
                <div className="p-4 space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/5 rounded animate-pulse w-2/3" />
                        <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 gap-3 px-4 text-center">
                  <Icon name="MessageCircleOff" size={32} className="text-white/20" />
                  <p className="text-white/30 text-sm">Нет диалогов</p>
                  {user?.role === "organizer" && (
                    <p className="text-white/20 text-xs">Нажмите «Написать» на карточке площадки</p>
                  )}
                </div>
              ) : (
                filteredConvs.map(conv => {
                  const name = conv.isOrganizer ? conv.venueName : (conv.organizerName || "Организатор");
                  const color = getAvatarColor(name);
                  const initial = getInitial(name);
                  const isActive = conv.id === activeConvId;
                  return (
                    <div key={conv.id} onClick={() => setActiveConvId(conv.id)}
                      className={`flex items-center gap-3 p-4 cursor-pointer transition-all hover:bg-white/5 border-b border-white/5 ${isActive ? "bg-neon-purple/10 border-l-2 border-l-neon-purple" : ""}`}>
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-oswald font-bold text-white text-sm shrink-0`}>
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium text-white text-sm truncate">{name}</span>
                          <span className="text-white/30 text-xs shrink-0 ml-2">{formatTime(conv.lastMessageAt)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/40 text-xs truncate">{conv.lastMessage}</span>
                          {conv.unread > 0 && (
                            <Badge className="bg-neon-purple text-white text-xs px-1.5 py-0 h-4 min-w-4 ml-2 shrink-0">{conv.unread}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── Chat window ── */}
          <div className={`flex-1 flex flex-col glass sm:rounded-2xl overflow-hidden ${activeConvId ? "flex" : "hidden sm:flex"}`}>
            {!activeConv ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-16 h-16 rounded-2xl bg-neon-purple/10 flex items-center justify-center">
                  <Icon name="MessageCircle" size={28} className="text-neon-purple/60" />
                </div>
                <div className="text-center">
                  <p className="text-white/50 font-oswald text-lg">Выберите диалог</p>
                  {user?.role === "organizer" && (
                    <p className="text-white/25 text-sm mt-1">или найдите площадку и нажмите «Написать»</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0">
                  <button onClick={() => setActiveConvId(null)}
                    className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white shrink-0">
                    <Icon name="ArrowLeft" size={16} />
                  </button>
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(activeConv.isOrganizer ? activeConv.venueName : (activeConv.organizerName || "Организатор"))} flex items-center justify-center font-oswald font-bold text-white text-sm shrink-0`}>
                    {getInitial(activeConv.isOrganizer ? activeConv.venueName : (activeConv.organizerName || "Организатор"))}
                  </div>
                  <div>
                    <h3 className="font-oswald font-semibold text-white">
                      {activeConv.isOrganizer ? activeConv.venueName : (activeConv.organizerName || "Организатор")}
                    </h3>
                    <p className="text-xs text-white/40">
                      {activeConv.isOrganizer ? "Концертная площадка" : "Организатор тура"}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => loadMessages(activeConvId!)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white">
                      <Icon name="RefreshCw" size={14} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
                  {loadingMsgs ? (
                    <div className="flex justify-center pt-8">
                      <Icon name="Loader2" size={24} className="text-white/30 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <Icon name="MessageCircle" size={28} className="text-white/20" />
                      <p className="text-white/30 text-sm">Нет сообщений. Напишите первым!</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.senderId === user!.id;
                      const msgDate = new Date(msg.createdAt).toDateString();
                      const showDate = msgDate !== lastDate;
                      if (showDate) lastDate = msgDate;
                      const dateLabel = new Date(msg.createdAt).toLocaleDateString("ru", { day: "numeric", month: "long" });
                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex justify-center my-3">
                              <span className="text-xs text-white/20 bg-white/5 px-3 py-1 rounded-full">{dateLabel}</span>
                            </div>
                          )}
                          <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-xs sm:max-w-md px-4 py-3 rounded-2xl text-sm ${
                              isMe
                                ? "bg-gradient-to-br from-neon-purple/40 to-neon-cyan/20 text-white rounded-br-sm border border-neon-purple/30"
                                : "glass text-white/90 rounded-bl-sm border border-white/10"
                            } ${msg.id.startsWith("opt-") ? "opacity-60" : ""}`}>
                              <p className="leading-relaxed break-words">{msg.text}</p>
                              <p className={`text-xs mt-1 ${isMe ? "text-white/40 text-right" : "text-white/30"}`}>
                                {formatTime(msg.createdAt)}
                                {msg.id.startsWith("opt-") && " · отправка..."}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10 shrink-0">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 flex items-center glass-strong rounded-xl px-4 py-3 border border-white/10 focus-within:border-neon-purple/40 transition-colors">
                      <input type="text"
                        placeholder="Написать сообщение..."
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                        className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm" />
                    </div>
                    <button onClick={handleSend} disabled={!inputText.trim() || sending}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-all ${
                        inputText.trim() && !sending
                          ? "bg-gradient-to-br from-neon-purple to-neon-cyan text-white hover:opacity-90 shadow-lg shadow-neon-purple/20"
                          : "bg-white/5 text-white/30 cursor-not-allowed"
                      }`}>
                      {sending
                        ? <Icon name="Loader2" size={16} className="animate-spin" />
                        : <Icon name="Send" size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
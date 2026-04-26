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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

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
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMime?: string;
  attachmentSizeHuman?: string;
}

interface PendingAttachment {
  url: string;
  name: string;
  size: number;
  mime: string;
  sizeHuman: string;
  uploading?: boolean;
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
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId) || null;

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${CHAT_URL}?action=conversations&user_id=${user.id}`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch { /* silent */ }
    finally { setLoadingConvs(false); }
  }, [user]);

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

  useEffect(() => {
    if (!activeConvId || !user) return;
    loadMessages(activeConvId);
    fetch(`${CHAT_URL}?action=read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeConvId, userId: user.id }),
    });
    setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, unread: 0 } : c));
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => loadMessages(activeConvId, true), 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [activeConvId, user, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Upload file to S3 via chat backend ──────────────────────────────────
  const uploadFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) { alert("Файл больше 20 МБ"); return; }
    setPendingAttachment({ url: "", name: file.name, size: file.size, mime: file.type, sizeHuman: formatSize(file.size), uploading: true });
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${CHAT_URL}?action=upload_attachment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData: base64, fileName: file.name, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
      setPendingAttachment({ url: data.url, name: data.name, size: data.size, mime: data.mime, sizeHuman: data.sizeHuman, uploading: false });
    } catch {
      setPendingAttachment(null);
    }
  };

  // ── Attach from documents (called externally via window event) ───────────
  useEffect(() => {
    const handler = (e: CustomEvent<{ url: string; name: string; size: number; mime: string }>) => {
      const { url, name, size, mime } = e.detail;
      setPendingAttachment({ url, name, size, mime, sizeHuman: formatSize(size) });
    };
    window.addEventListener("chat:attach-file", handler as EventListener);
    return () => window.removeEventListener("chat:attach-file", handler as EventListener);
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if ((!text && !pendingAttachment?.url) || !activeConvId || !user || sending) return;
    if (pendingAttachment?.uploading) return;
    setSending(true);
    setInputText("");
    const att = pendingAttachment;
    setPendingAttachment(null);

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversationId: activeConvId,
      senderId: user.id,
      text,
      createdAt: new Date().toISOString(),
      attachmentUrl:  att?.url || "",
      attachmentName: att?.name || "",
      attachmentSize: att?.size || 0,
      attachmentMime: att?.mime || "",
      attachmentSizeHuman: att?.sizeHuman || "",
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await fetch(`${CHAT_URL}?action=send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId:  activeConvId,
          senderId:        user.id,
          text,
          senderName:      user.name,
          attachmentUrl:   att?.url  || "",
          attachmentName:  att?.name || "",
          attachmentSize:  att?.size || 0,
          attachmentMime:  att?.mime || "",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
        const preview = text || `📎 ${att?.name}`;
        setConversations(prev => prev.map(c =>
          c.id === activeConvId ? { ...c, lastMessage: preview, lastMessageAt: data.createdAt } : c
        ));
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && activeConvId) uploadFile(file);
  };

  const filteredConvs = conversations.filter(c =>
    !search || c.venueName.toLowerCase().includes(search.toLowerCase()) ||
    (c.organizerName || "").toLowerCase().includes(search.toLowerCase())
  );
  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);
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
                {totalUnread > 0 && <Badge className="bg-neon-purple text-white text-xs">{totalUnread}</Badge>}
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
          <div
            className={`flex-1 flex flex-col glass sm:rounded-2xl overflow-hidden ${activeConvId ? "flex" : "hidden sm:flex"} ${dragOver ? "ring-2 ring-neon-cyan/50" : ""}`}
            onDragOver={e => { e.preventDefault(); if (activeConvId) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
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
                <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-1">
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
                      const isOptimistic = msg.id.startsWith("opt-");
                      const hasAttachment = !!msg.attachmentUrl;
                      const isImage = hasAttachment && IMAGE_MIMES.includes(msg.attachmentMime || "");

                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex justify-center my-3">
                              <span className="text-xs text-white/20 bg-white/5 px-3 py-1 rounded-full">{dateLabel}</span>
                            </div>
                          )}
                          <div className={`flex mb-1 ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-xs sm:max-w-md rounded-2xl text-sm ${isOptimistic ? "opacity-60" : ""} ${
                              isMe
                                ? "bg-gradient-to-br from-neon-purple to-neon-cyan text-white rounded-br-sm"
                                : "glass border border-white/10 text-white rounded-bl-sm"
                            }`}>
                              {/* Image attachment */}
                              {hasAttachment && isImage && (
                                <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="block">
                                  <img
                                    src={msg.attachmentUrl}
                                    alt={msg.attachmentName}
                                    className="rounded-t-2xl w-full max-w-xs object-cover"
                                    style={{ maxHeight: 240 }}
                                  />
                                </a>
                              )}

                              {/* File attachment */}
                              {hasAttachment && !isImage && (
                                <a
                                  href={msg.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`flex items-center gap-3 px-4 pt-3 pb-2 hover:opacity-80 transition-opacity ${msg.text ? "" : "pb-3"}`}
                                >
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isMe ? "bg-white/20" : "bg-neon-purple/20"}`}>
                                    <Icon name="FileText" size={16} className={isMe ? "text-white" : "text-neon-purple"} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium truncate ${isMe ? "text-white" : "text-white"}`}>
                                      {msg.attachmentName}
                                    </p>
                                    <p className={`text-xs ${isMe ? "text-white/60" : "text-white/40"}`}>
                                      {msg.attachmentSizeHuman || (msg.attachmentSize ? formatSize(msg.attachmentSize) : "")}
                                    </p>
                                  </div>
                                  <Icon name="Download" size={14} className={isMe ? "text-white/60" : "text-white/30"} />
                                </a>
                              )}

                              {/* Text */}
                              {msg.text && (
                                <p className={`px-4 py-2.5 ${hasAttachment ? "pt-1.5" : ""} whitespace-pre-wrap break-words leading-relaxed`}>
                                  {msg.text}
                                </p>
                              )}

                              {/* Time */}
                              <div className={`flex items-center gap-1 px-4 pb-2 ${msg.text || hasAttachment ? "pt-0" : "pt-2"} ${isMe ? "justify-end" : "justify-end"}`}>
                                <span className={`text-[10px] ${isMe ? "text-white/50" : "text-white/30"}`}>
                                  {formatTime(msg.createdAt)}
                                </span>
                                {isOptimistic && <Icon name="Clock" size={10} className="text-white/40" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Drag overlay */}
                {dragOver && (
                  <div className="absolute inset-0 bg-neon-cyan/10 border-2 border-dashed border-neon-cyan/50 rounded-2xl flex items-center justify-center pointer-events-none z-10">
                    <div className="text-center">
                      <Icon name="Upload" size={32} className="text-neon-cyan mx-auto mb-2" />
                      <p className="text-neon-cyan font-oswald font-semibold">Отпустите файл для отправки</p>
                    </div>
                  </div>
                )}

                {/* Pending attachment preview */}
                {pendingAttachment && (
                  <div className="px-4 pt-2 shrink-0">
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                      {pendingAttachment.uploading ? (
                        <Icon name="Loader2" size={16} className="text-neon-cyan animate-spin flex-shrink-0" />
                      ) : IMAGE_MIMES.includes(pendingAttachment.mime) ? (
                        <Icon name="Image" size={16} className="text-neon-cyan flex-shrink-0" />
                      ) : (
                        <Icon name="Paperclip" size={16} className="text-neon-purple flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{pendingAttachment.name}</p>
                        <p className="text-white/30 text-xs">
                          {pendingAttachment.uploading ? "Загружаю..." : pendingAttachment.sizeHuman}
                        </p>
                      </div>
                      <button
                        onClick={() => setPendingAttachment(null)}
                        className="text-white/30 hover:text-neon-pink transition-colors flex-shrink-0"
                      >
                        <Icon name="X" size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Input area */}
                <div className="p-4 border-t border-white/10 shrink-0">
                  <div className="flex gap-2 items-end">
                    {/* Attach button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!!pendingAttachment}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-neon-purple disabled:opacity-30 flex-shrink-0"
                      title="Прикрепить файл"
                    >
                      <Icon name="Paperclip" size={18} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
                    />

                    <textarea
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                      placeholder="Напишите сообщение... (Enter — отправить, Shift+Enter — перенос)"
                      rows={1}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 outline-none focus:border-neon-purple/40 transition-colors text-sm resize-none scrollbar-thin"
                      style={{ minHeight: 40, maxHeight: 120 }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={(!inputText.trim() && !pendingAttachment?.url) || sending || pendingAttachment?.uploading}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan text-white hover:opacity-90 transition-opacity disabled:opacity-30 flex-shrink-0"
                    >
                      {sending
                        ? <Icon name="Loader2" size={16} className="animate-spin" />
                        : <Icon name="Send" size={16} />
                      }
                    </button>
                  </div>
                  <p className="text-white/15 text-xs mt-1.5 ml-12">
                    Поддерживаются файлы до 20 МБ — PDF, Word, Excel, изображения
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

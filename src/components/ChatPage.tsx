import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import {
  CHAT_URL,
  formatSize,
  getAvatarColor,
  getInitial,
  type Conversation,
  type Message,
  type PendingAttachment,
} from "@/components/chat/chatTypes";

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

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  return (
    <div className="min-h-screen pt-16 pb-0">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 sm:py-8 h-[calc(100vh-4rem)]">
        <div className="flex gap-4 h-full">

          {/* ── Sidebar ── */}
          <ChatSidebar
            conversations={conversations}
            activeConvId={activeConvId}
            loadingConvs={loadingConvs}
            search={search}
            userRole={user?.role}
            currentUserId={user?.id}
            sessionId={localStorage.getItem("tourlink_session") || ""}
            onSearchChange={setSearch}
            onSelectConv={setActiveConvId}
            onConversationCreated={(convId) => {
              loadConversations();
              setActiveConvId(convId);
            }}
          />

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
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white shrink-0"
                  >
                    <Icon name="ArrowLeft" size={16} />
                  </button>
                  {(() => {
                    const companyName = activeConv.sidebarName
                      || (activeConv.isOrganizer
                        ? activeConv.venueCompany || activeConv.venueName
                        : activeConv.organizerCompany || activeConv.organizerName || "Организатор");
                    return (
                      <>
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(companyName)} flex items-center justify-center font-oswald font-bold text-white text-sm shrink-0`}>
                          {getInitial(companyName)}
                        </div>
                        <div>
                          <h3 className="font-oswald font-semibold text-white">{companyName}</h3>
                          <p className="text-xs text-white/40">
                            {activeConv.isOrganizer ? "Концертная площадка" : "Организатор тура"}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => loadMessages(activeConvId!)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                    >
                      <Icon name="RefreshCw" size={14} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <ChatMessages
                  messages={messages}
                  loadingMsgs={loadingMsgs}
                  userId={user!.id}
                  dragOver={dragOver}
                />

                {/* Input */}
                <ChatInput
                  inputText={inputText}
                  sending={sending}
                  pendingAttachment={pendingAttachment}
                  onInputChange={setInputText}
                  onSend={handleSend}
                  onFileSelect={uploadFile}
                  onClearAttachment={() => setPendingAttachment(null)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
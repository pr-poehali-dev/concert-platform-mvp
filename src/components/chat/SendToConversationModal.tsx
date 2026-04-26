import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const CHAT_URL = "https://functions.poehali.dev/85035195-bd7b-44ce-b77c-db1255f711b5";

interface Conversation {
  id: string;
  venueName: string;
  organizerName: string;
  isOrganizer: boolean;
  lastMessage: string;
  lastMessageAt: string;
}

interface FileInfo {
  url: string;
  name: string;
  size: number;
  mime: string;
}

interface Props {
  file: FileInfo;
  onClose: () => void;
  onSent?: () => void;
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
  } catch { return ""; }
}

export default function SendToConversationModal({ file, onClose, onSent }: Props) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`${CHAT_URL}?action=conversations&user_id=${user.id}`)
      .then(r => r.json())
      .then(d => setConversations(d.conversations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = conversations.filter(c => {
    const name = c.isOrganizer ? c.venueName : (c.organizerName || "Организатор");
    return !search || name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSend = async () => {
    if (!selectedId || !user) return;
    setSending(true);
    try {
      const res = await fetch(`${CHAT_URL}?action=send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId:  selectedId,
          senderId:        user.id,
          senderName:      user.name,
          text:            message.trim(),
          attachmentUrl:   file.url,
          attachmentName:  file.name,
          attachmentSize:  file.size,
          attachmentMime:  file.mime,
        }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => { onSent?.(); onClose(); }, 1200);
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
            <Icon name="Send" size={16} className="text-neon-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-oswald font-bold text-white text-base">Отправить в чат</h3>
            <p className="text-white/30 text-xs truncate">{file.name}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>

        {sent ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <Icon name="CheckCircle2" size={28} className="text-green-400" />
            </div>
            <p className="text-white font-oswald font-semibold text-lg">Отправлено!</p>
            <p className="text-white/30 text-sm mt-1">Файл успешно отправлен в диалог</p>
          </div>
        ) : (
          <>
            {/* File preview */}
            <div className="mx-5 mt-4 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
              <Icon name="Paperclip" size={15} className="text-neon-purple flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{file.name}</p>
                <p className="text-white/30 text-xs">
                  {file.size < 1024 * 1024 ? `${Math.round(file.size / 1024)} КБ` : `${(file.size / 1024 / 1024).toFixed(1)} МБ`}
                </p>
              </div>
            </div>

            {/* Search convs */}
            <div className="px-5 mt-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <Icon name="Search" size={13} className="text-white/30 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Найти диалог..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder:text-white/20 outline-none text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Conversations list */}
            <div className="px-5 mt-2 max-h-52 overflow-y-auto scrollbar-thin space-y-1 pb-1">
              {loading ? (
                <div className="flex justify-center py-6">
                  <Icon name="Loader2" size={20} className="animate-spin text-neon-purple" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-white/30 text-sm">
                    {conversations.length === 0 ? "Нет активных диалогов" : "Ничего не найдено"}
                  </p>
                </div>
              ) : (
                filtered.map(conv => {
                  const name = conv.isOrganizer ? conv.venueName : (conv.organizerName || "Организатор");
                  const isSelected = conv.id === selectedId;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedId(isSelected ? null : conv.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                        isSelected
                          ? "border-neon-cyan/50 bg-neon-cyan/10"
                          : "border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/15"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center font-oswald font-bold text-white text-xs flex-shrink-0">
                        {name[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{name}</p>
                        <p className="text-white/30 text-xs truncate">{conv.lastMessage || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-white/20 text-xs">{formatTime(conv.lastMessageAt)}</span>
                        {isSelected && <Icon name="CheckCircle2" size={15} className="text-neon-cyan" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Optional message */}
            {selectedId && (
              <div className="px-5 mt-3">
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="Добавить сообщение (необязательно)..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/20 outline-none focus:border-neon-cyan/40 transition-colors"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 p-5 pt-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all"
              >
                Отмена
              </button>
              <button
                onClick={handleSend}
                disabled={!selectedId || sending}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-oswald font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                {sending
                  ? <><Icon name="Loader2" size={14} className="animate-spin" />Отправляю...</>
                  : <><Icon name="Send" size={14} />Отправить</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

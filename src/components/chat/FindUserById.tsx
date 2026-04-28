import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { AUTH_URL } from "@/context/AuthContext";
import { CHAT_URL } from "./chatTypes";

interface FoundUser {
  id: string;
  displayId: string;
  name: string;
  role: string;
  city: string;
  avatar: string;
  avatarColor: string;
  verified: boolean;
  legalName: string;
}

interface Props {
  currentUserId: string;
  sessionId: string;
  onConversationCreated: (convId: string) => void;
}

export default function FindUserById({ currentUserId, sessionId, onConversationCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundUser | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    const q = query.replace(/\D/g, "").trim();
    if (!q) return;
    setSearching(true);
    setFound(null);
    setNotFound(false);
    setError("");
    try {
      const res = await fetch(`${AUTH_URL}?action=search_by_id&display_id=${q}`);
      const data = await res.json();
      if (!res.ok || !data.id) {
        setNotFound(true);
      } else if (data.id === currentUserId) {
        setError("Это ваш собственный аккаунт");
      } else {
        setFound(data as FoundUser);
      }
    } catch {
      setError("Ошибка поиска");
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = async () => {
    if (!found) return;
    setStarting(true);
    try {
      const res = await fetch(`${CHAT_URL}?action=create_conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({ participant_id: found.id }),
      });
      const data = await res.json();
      if (data.conversation_id || data.id) {
        onConversationCreated(data.conversation_id || data.id);
        setOpen(false);
        setQuery("");
        setFound(null);
      } else {
        setError(data.error || "Не удалось начать диалог");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setStarting(false);
    }
  };

  const roleLabel = (role: string) => role === "organizer" ? "Организатор" : "Площадка";
  const roleColor = (role: string) => role === "organizer" ? "text-neon-purple" : "text-neon-cyan";

  return (
    <>
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl border border-white/10 hover:border-neon-cyan/30 text-white/40 hover:text-neon-cyan text-xs transition-all"
        title="Найти пользователя по ID"
      >
        <Icon name="Hash" size={13} />
        Найти по ID
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative glass-strong rounded-2xl border border-white/10 p-6 w-full max-w-sm shadow-2xl animate-scale-in">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-oswald font-bold text-white text-lg">Найти пользователя</h3>
                <p className="text-white/30 text-xs mt-0.5">Введите цифровой ID участника платформы</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all">
                <Icon name="X" size={16} />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Icon name="Hash" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value.replace(/\D/g, ""));
                    setFound(null);
                    setNotFound(false);
                    setError("");
                  }}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Например: 10001"
                  className="w-full glass border border-white/10 focus:border-neon-cyan/40 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm outline-none font-mono tracking-wider"
                  maxLength={12}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!query || searching}
                className="px-4 py-2.5 bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan rounded-xl text-sm hover:bg-neon-cyan/30 disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                {searching
                  ? <Icon name="Loader2" size={14} className="animate-spin" />
                  : <Icon name="Search" size={14} />}
                Найти
              </button>
            </div>

            {notFound && (
              <div className="flex items-center gap-2 text-white/40 text-sm py-3 px-4 glass rounded-xl border border-white/5">
                <Icon name="UserX" size={15} className="text-white/20" />
                Пользователь с ID <span className="font-mono text-white/60 mx-1">{query}</span> не найден
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-neon-pink text-sm py-3 px-4 bg-neon-pink/5 rounded-xl border border-neon-pink/20">
                <Icon name="AlertCircle" size={15} />
                {error}
              </div>
            )}

            {found && (
              <div className="glass rounded-xl border border-white/10 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${found.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-lg flex-shrink-0`}>
                    {found.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium truncate">{found.name}</p>
                      {found.verified && <Icon name="BadgeCheck" size={14} className="text-neon-cyan flex-shrink-0" />}
                    </div>
                    {found.legalName && <p className="text-white/40 text-xs truncate">{found.legalName}</p>}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs ${roleColor(found.role)}`}>{roleLabel(found.role)}</span>
                      <span className="text-white/20 text-xs">·</span>
                      <span className="text-white/30 text-xs">{found.city}</span>
                      <span className="text-white/20 text-xs">·</span>
                      <span className="font-mono text-[11px] text-neon-cyan/60 bg-neon-cyan/10 px-1.5 py-0.5 rounded">ID {found.displayId}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartChat}
                  disabled={starting}
                  className="w-full py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {starting
                    ? <><Icon name="Loader2" size={15} className="animate-spin" />Открываем диалог...</>
                    : <><Icon name="MessageCircle" size={15} />Написать сообщение</>}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

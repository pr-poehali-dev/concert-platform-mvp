import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { EMPLOYEES_URL, type Employee, ROLE_LABELS } from "@/components/dashboard/profile/types";
import { startPolling, stopPolling } from "@/lib/polling";

interface CompanyMessage {
  id: string;
  senderId: string;
  senderType: "user" | "employee";
  senderName: string;
  senderAvatar: string;
  senderColor: string;
  text: string;
  createdAt: string;
}

type ChatMode = "group" | string; // "group" или employeeId для личного чата

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

export default function DashboardCompanyTab() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [messages, setMessages] = useState<CompanyMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [chatMode, setChatMode] = useState<ChatMode>("group");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const companyId = user?.id ?? "";

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const scrollToBottom = useCallback((force = false) => {
    if (force || isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const loadMessages = useCallback(async (silent = false) => {
    if (!companyId) return;
    if (!silent) setLoadingMsgs(true);
    try {
      let url = "";
      if (chatMode === "group") {
        url = `${EMPLOYEES_URL}?action=company_messages&company_user_id=${companyId}`;
      } else {
        url = `${EMPLOYEES_URL}?action=dm_messages&company_user_id=${companyId}&employee_id=${chatMode}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setMessages(prev => {
        const next = data.messages || [];
        const changed = next.length !== prev.length || (next[next.length - 1]?.id !== prev[prev.length - 1]?.id);
        if (changed) setTimeout(() => scrollToBottom(), 50);
        return next;
      });
    } catch { /* silent */ }
    finally { if (!silent) setLoadingMsgs(false); }
  }, [companyId, chatMode, scrollToBottom]);

  const loadEmployees = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`${EMPLOYEES_URL}?action=list&company_user_id=${companyId}`);
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch { /* silent */ }
    finally { setLoadingEmps(false); }
  }, [companyId]);

  // При смене чата — сбрасываем и грузим
  useEffect(() => {
    if (!companyId) return;
    setMessages([]);
    setLoadingMsgs(true);
    isAtBottomRef.current = true;
    loadMessages();
    stopPolling(pollingRef.current);
    pollingRef.current = startPolling(() => loadMessages(true), 3000);
    return () => stopPolling(pollingRef.current);
  }, [companyId, chatMode, loadMessages]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  if (!user) return null;

  const send = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText("");

    const optimistic: CompanyMessage = {
      id: `opt-${Date.now()}`,
      senderId: user.id, senderType: "user",
      senderName: user.name, senderAvatar: user.avatar || "",
      senderColor: user.avatarColor || "from-neon-purple to-neon-cyan",
      text, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    isAtBottomRef.current = true;
    setTimeout(() => scrollToBottom(true), 50);

    try {
      if (chatMode === "group") {
        await fetch(`${EMPLOYEES_URL}?action=company_send`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyUserId: companyId, senderId: user.id, senderType: "user", text }),
        });
      } else {
        await fetch(`${EMPLOYEES_URL}?action=dm_send`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyUserId: companyId, senderId: user.id,
            senderType: "user", recipientId: chatMode, text,
          }),
        });
      }
      await loadMessages(true);
    } catch { /* silent */ }
    setSending(false);
  };

  const activeEmps = employees.filter(e => e.isActive);
  const selectedEmp = activeEmps.find(e => e.id === chatMode);

  const chatTitle = chatMode === "group"
    ? "Общий чат компании"
    : selectedEmp?.name ?? "Личный чат";
  const chatSubtitle = chatMode === "group"
    ? `${activeEmps.length + 1} участников`
    : (selectedEmp ? ROLE_LABELS[selectedEmp.roleInCompany] || selectedEmp.roleInCompany : "");

  return (
    <div className="flex gap-4 h-[calc(100vh-16rem)] min-h-[400px] animate-fade-in">

      {/* Левая панель — список чатов */}
      <div className="w-60 shrink-0 flex flex-col glass rounded-2xl overflow-hidden border border-white/10">
        <div className="px-4 py-3 border-b border-white/10 shrink-0">
          <h3 className="font-oswald font-bold text-white text-sm flex items-center gap-2">
            <Icon name="MessageSquare" size={15} className="text-neon-purple" />
            Чаты
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Общий чат */}
          <button
            onClick={() => setChatMode("group")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left ${chatMode === "group" ? "bg-neon-purple/20 border border-neon-purple/30" : "hover:bg-white/5"}`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center shrink-0">
              <Icon name="Users" size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">Общий чат</p>
              <p className="text-white/60 text-[10px]">{activeEmps.length + 1} участников</p>
            </div>
          </button>

          {/* Разделитель */}
          {activeEmps.length > 0 && (
            <p className="text-white/20 text-[10px] uppercase tracking-wider px-3 pt-2 pb-1">Личные чаты</p>
          )}

          {/* Сотрудники */}
          {loadingEmps ? (
            <div className="space-y-1 px-1">
              {[1, 2].map(i => <div key={i} className="h-10 glass rounded-xl animate-pulse" />)}
            </div>
          ) : activeEmps.length === 0 ? (
            <p className="text-white/25 text-xs text-center py-4 px-3">Нет сотрудников</p>
          ) : (
            activeEmps.map(emp => (
              <button
                key={emp.id}
                onClick={() => setChatMode(emp.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left ${chatMode === emp.id ? "bg-neon-purple/20 border border-neon-purple/30" : "hover:bg-white/5"}`}
              >
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${emp.avatarColor} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                  {emp.avatar || emp.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{emp.name}</p>
                  <p className="text-white/60 text-[10px]">{ROLE_LABELS[emp.roleInCompany] || emp.roleInCompany}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Правая часть — чат */}
      <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden border border-white/10">
        {/* Заголовок */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${chatMode === "group" ? "bg-gradient-to-br from-neon-purple to-neon-cyan" : `bg-gradient-to-br ${selectedEmp?.avatarColor || "from-neon-purple to-neon-cyan"}`}`}>
            {chatMode === "group"
              ? <Icon name="Users" size={15} className="text-white" />
              : <span className="text-white font-bold text-xs">{selectedEmp?.avatar || selectedEmp?.name?.[0]?.toUpperCase() || "?"}</span>
            }
          </div>
          <div>
            <p className="font-oswald font-bold text-white text-base">{chatTitle}</p>
            <p className="text-white/65 text-xs">{chatSubtitle}</p>
          </div>
        </div>

        {/* Сообщения */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {loadingMsgs ? (
            <div className="flex items-center justify-center h-full">
              <Icon name="Loader2" size={20} className="text-white/55 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <Icon name="MessageCircle" size={36} className="text-white/15" />
              <p className="text-white/65 text-sm">
                {chatMode === "group" ? "Начните общение с командой" : `Напишите ${selectedEmp?.name ?? "сотруднику"}`}
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === user.id && msg.senderType === "user";
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showName = !prevMsg || prevMsg.senderId !== msg.senderId;

              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  {!isMe && (
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${msg.senderColor} flex items-center justify-center text-white text-xs font-bold shrink-0 mb-0.5 ${showName ? "" : "opacity-0"}`}>
                      {msg.senderAvatar || msg.senderName?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                    {showName && !isMe && (
                      <span className="text-white/65 text-[10px] mb-0.5 px-1">{msg.senderName}</span>
                    )}
                    <div className={`px-3.5 py-2.5 rounded-2xl ${isMe
                      ? "bg-neon-purple/30 border border-neon-purple/30 text-white"
                      : "glass border border-white/10 text-white"
                    } ${msg.id.startsWith("opt-") ? "opacity-60" : ""}`}>
                      <p className="text-xs leading-relaxed break-words">{msg.text}</p>
                    </div>
                    {showName && (
                      <span className="text-[10px] text-white/55 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Поле ввода */}
        <div className="px-4 py-3 border-t border-white/10 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") send(); }}
              placeholder={chatMode === "group" ? "Написать всей команде..." : `Написать ${selectedEmp?.name ?? "сотруднику"}...`}
              disabled={sending}
              className="flex-1 glass rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 transition-colors disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={!inputText.trim() || sending}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan text-white hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0"
            >
              {sending
                ? <Icon name="Loader2" size={16} className="animate-spin" />
                : <Icon name="Send" size={16} />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
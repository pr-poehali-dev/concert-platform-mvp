import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { EMPLOYEES_URL, type Employee, ROLE_LABELS } from "@/components/dashboard/profile/types";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const companyId = user?.id ?? "";

  const loadMessages = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`${EMPLOYEES_URL}?action=company_messages&company_user_id=${companyId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { /* silent */ } finally { setLoadingMsgs(false); }
  }, [companyId]);

  const loadEmployees = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`${EMPLOYEES_URL}?action=list&company_user_id=${companyId}`);
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch { /* silent */ } finally { setLoadingEmps(false); }
  }, [companyId]);

  useEffect(() => {
    loadEmployees();
    loadMessages();
    pollingRef.current = setInterval(loadMessages, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [loadEmployees, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    try {
      await fetch(`${EMPLOYEES_URL}?action=company_send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyUserId: companyId, senderId: user.id,
          senderType: "user", text,
        }),
      });
    } catch { /* silent */ }
    setSending(false);
  };

  const activeEmps = employees.filter(e => e.isActive);

  return (
    <div className="flex gap-4 h-[calc(100vh-16rem)] min-h-[400px] animate-fade-in">
      {/* Список участников */}
      <div className="w-60 shrink-0 flex flex-col glass rounded-2xl overflow-hidden border border-white/10">
        <div className="px-4 py-3 border-b border-white/10 shrink-0">
          <h3 className="font-oswald font-bold text-white text-sm flex items-center gap-2">
            <Icon name="Users" size={15} className="text-neon-purple" />
            Участники
            <span className="ml-auto text-white/30 text-xs font-normal">{activeEmps.length + 1}</span>
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Владелец */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${user.avatarColor || "from-neon-purple to-neon-cyan"} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
              {user.avatar || user.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.name}</p>
              <p className="text-neon-purple text-[10px]">Владелец</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-neon-green shrink-0" />
          </div>

          {loadingEmps ? (
            <div className="space-y-1 px-2">
              {[1, 2].map(i => <div key={i} className="h-10 glass rounded-xl animate-pulse" />)}
            </div>
          ) : activeEmps.length === 0 ? (
            <p className="text-white/25 text-xs text-center py-4 px-3">Нет активных сотрудников</p>
          ) : (
            activeEmps.map(emp => (
              <div key={emp.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${emp.avatarColor} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                  {emp.avatar || emp.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{emp.name}</p>
                  <p className="text-white/35 text-[10px]">{ROLE_LABELS[emp.roleInCompany] || emp.roleInCompany}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Чат */}
      <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden border border-white/10">
        {/* Заголовок */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
            <Icon name="MessageSquare" size={15} className="text-white" />
          </div>
          <div>
            <p className="font-oswald font-semibold text-white text-sm">Чат компании</p>
            <p className="text-white/40 text-xs">Только для сотрудников</p>
          </div>
        </div>

        {/* Сообщения */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingMsgs ? (
            <div className="flex items-center justify-center h-full">
              <Icon name="Loader2" size={20} className="text-white/30 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <Icon name="MessageCircle" size={36} className="text-white/15" />
              <p className="text-white/40 text-sm">Начните общение с командой</p>
              <p className="text-white/20 text-xs">Сообщения видны только участникам компании</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === user.id && msg.senderType === "user";
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showName = !prevMsg || prevMsg.senderId !== msg.senderId;

              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  {/* Аватар */}
                  {(!isMe) && (
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${msg.senderColor} flex items-center justify-center text-white text-xs font-bold shrink-0 mb-0.5 ${showName ? "" : "opacity-0"}`}>
                      {msg.senderAvatar || msg.senderName?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                    {showName && !isMe && (
                      <span className="text-white/40 text-[10px] mb-0.5 px-1">{msg.senderName}</span>
                    )}
                    <div className={`px-3.5 py-2.5 rounded-2xl ${isMe
                      ? "bg-neon-purple/30 border border-neon-purple/30 rounded-br-sm"
                      : "bg-white/8 border border-white/10 rounded-bl-sm"}`}>
                      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    <span className="text-white/20 text-[10px] mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Ввод */}
        <div className="flex items-end gap-3 p-4 border-t border-white/10 shrink-0">
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Сообщение команде..."
            rows={1}
            className="flex-1 bg-white/5 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-neon-purple/40 text-sm resize-none"
            style={{ maxHeight: "100px" }}
          />
          <button
            onClick={send}
            disabled={!inputText.trim() || sending}
            className="w-10 h-10 flex items-center justify-center bg-neon-purple rounded-xl hover:bg-neon-purple/80 disabled:opacity-40 transition-all shrink-0"
          >
            {sending
              ? <Icon name="Loader2" size={16} className="animate-spin text-white" />
              : <Icon name="Send" size={16} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

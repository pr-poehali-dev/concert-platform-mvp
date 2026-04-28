import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const AI_URL = "https://functions.poehali.dev/8841fd93-d5cc-414b-a912-d185ca8cab48";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  requestId?: number;
  rated?: "up" | "down";
  loading?: boolean;
}

const SUGGESTIONS = [
  "Как добавить новую площадку?",
  "Как создать тур?",
  "Как подписать договор онлайн?",
  "Как добавить сотрудника в команду?",
  "Как работает P&L отчёт?",
  "Как пройти верификацию?",
];

const MAINTENANCE = true; // убрать когда ИИ заработает

export default function DashboardAITab() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: `Привет${user?.name ? `, ${user.name.split(" ")[0]}` : ""}! Я ИИ-ассистент платформы GLOBAL LINK. Знаю всё о платформе и готов помочь разобраться.\n\nЗадайте любой вопрос или выберите один из частых:`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionId = localStorage.getItem("tourlink_session") || "";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: question };
    const loadingMsg: Message = { id: `loading-${Date.now()}`, role: "assistant", text: "", loading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = "44px";

    try {
      const res = await fetch(`${AI_URL}?action=ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
        },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      const answer = res.ok ? data.answer : "Не удалось получить ответ. Попробуйте позже.";

      setMessages(prev =>
        prev.map(m =>
          m.loading
            ? { ...m, loading: false, text: answer, requestId: data.requestId }
            : m
        )
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.loading
            ? { ...m, loading: false, text: "Ошибка соединения. Проверьте интернет и попробуйте снова." }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const rate = async (msgId: string, requestId: number, helpful: boolean) => {
    setMessages(prev =>
      prev.map(m => m.id === msgId ? { ...m, rated: helpful ? "up" : "down" } : m)
    );
    try {
      await fetch(`${AI_URL}?action=rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({ requestId, helpful }),
      });
    } catch { /* ignore */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "44px";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ height: "calc(100vh - 80px)" }}>
      {MAINTENANCE && (
        <div className="mx-4 mt-4 flex items-start gap-3 bg-neon-purple/10 border border-neon-purple/30 rounded-2xl px-4 py-3">
          <Icon name="Clock" size={18} className="text-neon-purple shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-semibold">ИИ-ассистент скоро заработает</p>
            <p className="text-white/50 text-xs mt-0.5">Мы подключаем интеллектуального помощника, который знает всю платформу. Он уже готов — осталось дождаться сброса лимитов. Попробуйте завтра.</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center shrink-0">
          <Icon name="Sparkles" size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">ИИ-ассистент</p>
          <p className="text-white/40 text-xs">Знает всё о платформе GLOBAL LINK</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="text-neon-green text-xs">Онлайн</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold ${
              msg.role === "assistant"
                ? "bg-gradient-to-br from-neon-purple to-neon-cyan"
                : "bg-white/10"
            }`}>
              {msg.role === "assistant"
                ? <Icon name="Sparkles" size={14} className="text-white" />
                : <span className="text-white">{user?.avatar || "?"}</span>
              }
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-neon-purple/30 text-white rounded-tr-sm"
                  : "bg-white/6 text-white/90 rounded-tl-sm border border-white/6"
              }`}>
                {msg.loading ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}
              </div>

              {/* Rating */}
              {msg.role === "assistant" && !msg.loading && msg.requestId && (
                <div className="flex items-center gap-1 ml-1">
                  <span className="text-white/30 text-xs mr-1">Помогло?</span>
                  <button
                    onClick={() => !msg.rated && rate(msg.id, msg.requestId!, true)}
                    className={`p-1 rounded-lg transition-colors ${
                      msg.rated === "up"
                        ? "text-neon-green"
                        : "text-white/30 hover:text-neon-green"
                    }`}
                  >
                    <Icon name="ThumbsUp" size={13} />
                  </button>
                  <button
                    onClick={() => !msg.rated && rate(msg.id, msg.requestId!, false)}
                    className={`p-1 rounded-lg transition-colors ${
                      msg.rated === "down"
                        ? "text-neon-pink"
                        : "text-white/30 hover:text-neon-pink"
                    }`}
                  >
                    <Icon name="ThumbsDown" size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Suggestions after welcome */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 ml-11">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-xl border border-neon-purple/30 text-neon-purple/80 hover:bg-neon-purple/10 hover:text-neon-purple transition-colors text-left"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 shrink-0 border-t border-white/6">
        <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-neon-purple/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Задайте вопрос о платформе..."
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-white placeholder-white/30 text-sm resize-none outline-none leading-relaxed py-1 min-h-[44px] max-h-[140px] disabled:opacity-50"
            style={{ height: "44px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl bg-neon-purple flex items-center justify-center shrink-0 mb-0.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neon-purple/80 transition-colors"
          >
            <Icon name="ArrowUp" size={15} className="text-white" />
          </button>
        </div>
        <p className="text-white/20 text-xs text-center mt-2">Enter — отправить · Shift+Enter — новая строка</p>
      </div>
    </div>
  );
}
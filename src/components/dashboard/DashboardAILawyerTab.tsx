import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const LAWYER_URL = "https://functions.poehali.dev/e35d1d2a-0369-4290-beac-eaafa663b6be";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  loading?: boolean;
  isContract?: boolean;
  contractName?: string;
}

const SUGGESTIONS = [
  "Какие риски в договоре аренды площадки?",
  "Как защититься от отмены концерта артистом?",
  "Что такое форс-мажор в договоре?",
  "Как правильно оформить предоплату?",
  "Какая ответственность организатора перед зрителями?",
  "Нужна ли лицензия на проведение концерта?",
];

const TEMPLATES = [
  { id: "venue_rent", name: "Аренда площадки",     icon: "Building2" },
  { id: "artist",     name: "Договор с артистом",  icon: "Mic2" },
  { id: "nda",        name: "NDA",                  icon: "ShieldCheck" },
  { id: "act",        name: "Акт выполненных работ", icon: "FileCheck2" },
];

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardAILawyerTab() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: `Привет${user?.name ? `, ${user.name.split(" ")[0]}` : ""}! Я ваш ИИ-юрист.\n\nМогу помочь:\n• Проанализировать и объяснить любой договор\n• Составить договор по шаблону\n• Ответить на юридические вопросы в сфере event-бизнеса\n• Выявить риски в документах\n\nЗагрузите документ или задайте вопрос:`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"chat" | "generate">("chat");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateDetails, setTemplateDetails] = useState("");
  const [uploadedDoc, setUploadedDoc] = useState<{ name: string; text: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionId = localStorage.getItem("tourlink_session") || "";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);



  const sendMessage = async (text: string, docText?: string) => {
    const question = text.trim();
    if ((!question && !docText) || loading) return;

    const userText = docText
      ? `📄 Документ: ${uploadedDoc?.name}\n${question ? `\n${question}` : ""}`
      : question;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: userText };
    const loadingMsg: Message = { id: `loading-${Date.now()}`, role: "assistant", text: "", loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "44px";

    try {
      const res = await fetch(`${LAWYER_URL}?action=ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({ question, docText }),
      });
      const data = await res.json();
      const answer = res.ok ? data.answer : "Не удалось получить ответ. Попробуйте позже.";
      setMessages(prev => prev.map(m => m.loading ? { ...m, loading: false, text: answer } : m));
    } catch {
      setMessages(prev => prev.map(m =>
        m.loading ? { ...m, loading: false, text: "Ошибка соединения. Проверьте интернет и попробуйте снова." } : m
      ));
    } finally {
      setLoading(false);
      if (docText) setUploadedDoc(null);
    }
  };

  const generateContract = async () => {
    if (!selectedTemplate || generating) return;
    setGenerating(true);

    const tplName = TEMPLATES.find(t => t.id === selectedTemplate)?.name || "Договор";
    const loadingMsg: Message = {
      id: `loading-${Date.now()}`, role: "assistant", text: "", loading: true
    };
    setMessages(prev => [...prev,
      { id: Date.now().toString(), role: "user", text: `📝 Составить: ${tplName}\n${templateDetails ? `\nДетали: ${templateDetails}` : ""}` },
      loadingMsg
    ]);

    try {
      const res = await fetch(`${LAWYER_URL}?action=generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({ templateId: selectedTemplate, details: templateDetails }),
      });
      const data = await res.json();
      if (res.ok && data.contract) {
        setMessages(prev => prev.map(m => m.loading
          ? { ...m, loading: false, text: data.contract, isContract: true, contractName: data.templateName }
          : m
        ));
      } else {
        setMessages(prev => prev.map(m =>
          m.loading ? { ...m, loading: false, text: "Не удалось составить договор. Попробуйте позже." } : m
        ));
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.loading ? { ...m, loading: false, text: "Ошибка соединения." } : m
      ));
    } finally {
      setGenerating(false);
      setMode("chat");
      setSelectedTemplate("");
      setTemplateDetails("");
    }
  };

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой. Максимум 5 МБ.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setUploadedDoc({ name: file.name, text });
    };
    reader.readAsText(file, "utf-8");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (uploadedDoc) sendMessage(input, uploadedDoc.text);
      else sendMessage(input);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "44px";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ height: "calc(100vh - 80px)" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
          <Icon name="Scale" size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">ИИ-юрист</p>
          <p className="text-white/40 text-xs">Договоры, анализ документов, юридические вопросы</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400 text-xs">Онлайн</span>
        </div>
      </div>

      {/* Переключатель режимов */}
      <div className="px-4 pt-3 pb-2 shrink-0 flex gap-2">
        <button
          onClick={() => setMode("chat")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            mode === "chat"
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          <Icon name="MessageCircle" size={13} />
          Консультация
        </button>
        <button
          onClick={() => setMode("generate")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            mode === "generate"
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          <Icon name="FilePlus2" size={13} />
          Составить договор
        </button>
      </div>

      {/* Панель составления договора */}
      {mode === "generate" && (
        <div className="mx-4 mb-3 p-4 rounded-2xl bg-white/4 border border-white/8 shrink-0">
          <p className="text-white/60 text-xs mb-3">Выберите шаблон:</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all ${
                  selectedTemplate === tpl.id
                    ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                    : "bg-white/5 border border-white/8 text-white/60 hover:text-white hover:bg-white/8"
                }`}
              >
                <Icon name={tpl.icon as never} size={14} />
                <span className="text-xs leading-tight">{tpl.name}</span>
              </button>
            ))}
          </div>
          {selectedTemplate && (
            <textarea
              value={templateDetails}
              onChange={e => setTemplateDetails(e.target.value)}
              placeholder="Укажите детали: стороны, даты, суммы, особые условия... (необязательно)"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 resize-none outline-none focus:border-amber-500/50 mb-3"
            />
          )}
          <button
            onClick={generateContract}
            disabled={!selectedTemplate || generating}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Составляю...
              </>
            ) : (
              <>
                <Icon name="Sparkles" size={15} />
                Составить
              </>
            )}
          </button>
        </div>
      )}

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold ${
              msg.role === "assistant"
                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                : "bg-white/10"
            }`}>
              {msg.role === "assistant"
                ? <Icon name="Scale" size={14} className="text-white" />
                : <span className="text-white">{user?.avatar || "?"}</span>
              }
            </div>

            <div className={`max-w-[82%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-amber-500/25 text-white rounded-tr-sm"
                  : "bg-white/6 text-white/90 rounded-tl-sm border border-white/6"
              }`}>
                {msg.loading ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}
              </div>

              {/* Кнопка скачать договор */}
              {msg.isContract && !msg.loading && (
                <button
                  onClick={() => downloadText(msg.text, `${msg.contractName || "Договор"}.txt`)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs hover:bg-amber-500/25 transition-all"
                >
                  <Icon name="Download" size={13} />
                  Скачать {msg.contractName}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Подсказки */}
        {messages.length === 1 && mode === "chat" && (
          <div className="flex flex-wrap gap-2 pb-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-white/50 hover:text-white hover:bg-white/10 hover:border-amber-500/30 transition-all text-left"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Загруженный документ */}
      {uploadedDoc && (
        <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Icon name="FileText" size={14} className="text-amber-400 shrink-0" />
          <span className="text-amber-300 text-xs flex-1 truncate">{uploadedDoc.name}</span>
          <button onClick={() => setUploadedDoc(null)} className="text-white/30 hover:text-white/60">
            <Icon name="X" size={13} />
          </button>
        </div>
      )}

      {/* Инпут */}
      {mode === "chat" && (
        <div className="px-4 pb-4 pt-2 shrink-0 border-t border-white/8">
          <div className="flex gap-2 items-end">
            {/* Загрузить документ */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Загрузить документ (.txt, .doc, .rtf)"
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-amber-400 hover:border-amber-500/30 transition-all shrink-0 mb-0.5"
            >
              <Icon name="Paperclip" size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.rtf,.md,.doc,.docx"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />

            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={uploadedDoc ? "Задайте вопрос по документу..." : "Задайте юридический вопрос..."}
                rows={1}
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder-white/30 resize-none outline-none focus:border-amber-500/40 transition-all disabled:opacity-50"
                style={{ height: 44, maxHeight: 140 }}
              />
              <button
                onClick={() => uploadedDoc ? sendMessage(input, uploadedDoc.text) : sendMessage(input)}
                disabled={(!input.trim() && !uploadedDoc) || loading}
                className="absolute right-2 bottom-2 w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
              >
                <Icon name="Send" size={14} className="text-white" />
              </button>
            </div>
          </div>
          <p className="text-white/20 text-[10px] mt-2 text-center">
            Консультация носит информационный характер. Для важных сделок обращайтесь к практикующему юристу.
          </p>
        </div>
      )}
    </div>
  );
}
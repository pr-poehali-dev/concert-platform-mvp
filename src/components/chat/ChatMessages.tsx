import { useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { type Message, IMAGE_MIMES, formatTime, formatSize } from "./chatTypes";

interface Props {
  messages: Message[];
  loadingMsgs: boolean;
  userId: string;
  dragOver: boolean;
}

export default function ChatMessages({ messages, loadingMsgs, userId, dragOver }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Следим — находится ли пользователь внизу
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 80;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  // Скроллим вниз только если пользователь уже был внизу
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  let lastDate = "";

  return (
    <>
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-1">
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
            const isMe = msg.senderId === userId;
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
                          <p className="text-xs font-medium truncate text-white">
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
                    <div className={`flex items-center gap-1 px-4 pb-2 justify-end ${msg.text || hasAttachment ? "pt-0" : "pt-2"}`}>
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
    </>
  );
}
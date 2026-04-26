import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { type PendingAttachment, IMAGE_MIMES } from "./chatTypes";

interface Props {
  inputText: string;
  sending: boolean;
  pendingAttachment: PendingAttachment | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onFileSelect: (file: File) => void;
  onClearAttachment: () => void;
}

export default function ChatInput({
  inputText,
  sending,
  pendingAttachment,
  onInputChange,
  onSend,
  onFileSelect,
  onClearAttachment,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-4 border-t border-white/10 shrink-0">
      {/* Pending attachment preview */}
      {pendingAttachment && (
        <div className="mb-2">
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
              onClick={onClearAttachment}
              className="text-white/30 hover:text-neon-pink transition-colors flex-shrink-0"
            >
              <Icon name="X" size={15} />
            </button>
          </div>
        </div>
      )}

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
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onFileSelect(f);
            e.target.value = "";
          }}
        />

        <textarea
          value={inputText}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
          }}
          placeholder="Напишите сообщение... (Enter — отправить, Shift+Enter — перенос)"
          rows={1}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 outline-none focus:border-neon-purple/40 transition-colors text-sm resize-none scrollbar-thin"
          style={{ minHeight: 40, maxHeight: 120 }}
        />

        <button
          onClick={onSend}
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
  );
}

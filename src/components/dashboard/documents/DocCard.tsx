import { useState } from "react";
import Icon from "@/components/ui/icon";
import { type Doc, type Category, mimeIcon, formatDate } from "./docTypes";
import SignatureModal from "./SignatureModal";

interface Props {
  doc: Doc;
  catMeta: (cat: string) => Category;
  editNoteId: string | null;
  editNoteText: string;
  savingNote: boolean;
  onEditNote: (id: string, text: string) => void;
  onCancelNote: () => void;
  onNoteTextChange: (text: string) => void;
  onSaveNote: () => void;
  onSendToChat: (file: { url: string; name: string; size: number; mime: string }) => void;
  onDelete: (id: string) => void;
}

export default function DocCard({
  doc,
  catMeta,
  editNoteId,
  editNoteText,
  savingNote,
  onEditNote,
  onCancelNote,
  onNoteTextChange,
  onSaveNote,
  onSendToChat,
  onDelete,
}: Props) {
  const [showSign, setShowSign] = useState(false);
  const cat = catMeta(doc.category);

  return (
    <>
    <div className="glass rounded-2xl border border-white/10 p-4 hover:border-white/20 transition-all group">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          <Icon name={mimeIcon(doc.mimeType) as never} size={22} className={cat.color} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-white font-medium text-sm truncate max-w-[300px]">
              {doc.name}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${cat.color} flex-shrink-0`}>
              {doc.categoryLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-white/30 text-xs">
            <span>{doc.fileSizeHuman}</span>
            <span>•</span>
            <span>{formatDate(doc.createdAt)}</span>
          </div>

          {/* Note */}
          {editNoteId === doc.id ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={editNoteText}
                onChange={e => onNoteTextChange(e.target.value)}
                placeholder="Добавить заметку..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/70 text-xs outline-none focus:border-neon-cyan/40 transition-colors"
                onKeyDown={e => { if (e.key === "Enter") onSaveNote(); if (e.key === "Escape") onCancelNote(); }}
                autoFocus
              />
              <button
                onClick={onSaveNote}
                disabled={savingNote}
                className="text-neon-cyan text-xs px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg hover:bg-neon-cyan/20 disabled:opacity-50"
              >
                {savingNote ? <Icon name="Loader2" size={12} className="animate-spin" /> : "Сохранить"}
              </button>
              <button
                onClick={onCancelNote}
                className="text-white/30 hover:text-white/60 text-xs px-2 py-1.5"
              >
                Отмена
              </button>
            </div>
          ) : doc.note ? (
            <div
              className="mt-1.5 flex items-center gap-1.5 text-white/40 text-xs cursor-pointer hover:text-white/60 transition-colors w-fit"
              onClick={() => onEditNote(doc.id, doc.note)}
            >
              <Icon name="MessageSquare" size={11} />
              <span className="italic">{doc.note}</span>
              <Icon name="Pencil" size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ) : (
            <button
              onClick={() => onEditNote(doc.id, "")}
              className="mt-1.5 flex items-center gap-1 text-white/20 hover:text-white/40 text-xs transition-colors opacity-0 group-hover:opacity-100"
            >
              <Icon name="Plus" size={11} />добавить заметку
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowSign(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-neon-purple hover:bg-neon-purple/10 transition-all"
            title="Подписать / ЭДО"
          >
            <Icon name="PenLine" size={16} />
          </button>
          <button
            onClick={() => onSendToChat({ url: doc.fileUrl, name: doc.name, size: doc.fileSize, mime: doc.mimeType })}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-all"
            title="Отправить в чат"
          >
            <Icon name="Send" size={16} />
          </button>
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-neon-purple hover:bg-neon-purple/10 transition-all"
            title="Открыть"
          >
            <Icon name="ExternalLink" size={16} />
          </a>
          <a
            href={doc.fileUrl}
            download={doc.name}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-neon-purple hover:bg-neon-purple/10 transition-all"
            title="Скачать"
          >
            <Icon name="Download" size={16} />
          </a>
          <button
            onClick={() => onDelete(doc.id)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/20 hover:text-neon-pink hover:bg-neon-pink/10 transition-all"
            title="Удалить"
          >
            <Icon name="Trash2" size={16} />
          </button>
        </div>
      </div>
    </div>

    {showSign && <SignatureModal doc={doc} onClose={() => setShowSign(false)} />}
    </>
  );
}
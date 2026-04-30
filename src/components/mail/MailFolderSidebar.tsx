import Icon from "@/components/ui/icon";
import { MAIL_URL } from "./mailTypes";

const FOLDER_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  INBOX:  { label: "Входящие",     icon: "Inbox",       color: "text-neon-purple" },
  Sent:   { label: "Отправленные", icon: "Send",        color: "text-neon-cyan"   },
  Drafts: { label: "Черновики",    icon: "FileEdit",    color: "text-white/65"    },
  Spam:   { label: "Спам",         icon: "ShieldAlert", color: "text-neon-pink"   },
  Trash:  { label: "Корзина",      icon: "Trash2",      color: "text-white/55"    },
};

export function folderInfo(name: string) {
  const upper = name.toUpperCase();
  if (upper === "INBOX")                                       return FOLDER_LABELS.INBOX;
  if (upper.includes("SENT"))                                  return FOLDER_LABELS.Sent;
  if (upper.includes("DRAFT"))                                 return FOLDER_LABELS.Drafts;
  if (upper.includes("SPAM") || upper.includes("JUNK"))        return FOLDER_LABELS.Spam;
  if (upper.includes("TRASH") || upper.includes("DELETE"))     return FOLDER_LABELS.Trash;
  return { label: name, icon: "Folder", color: "text-white/65" };
}

interface Props {
  folders: string[];
  activeFolder: string;
  dragUids: string[];
  dragOverFolder: string | null;
  activeAccountId: string | null;
  onSelectFolder: (f: string) => void;
  onDragOverFolder: (f: string | null) => void;
  onDropFolder: (f: string, uids: string[]) => void;
  onDragEnd: () => void;
}

export default function MailFolderSidebar({
  folders, activeFolder, dragUids, dragOverFolder,
  activeAccountId, onSelectFolder, onDragOverFolder, onDropFolder, onDragEnd,
}: Props) {
  return (
    <aside className="col-span-12 sm:col-span-3 lg:col-span-2 glass rounded-xl border border-white/10 p-2 overflow-y-auto scrollbar-thin">
      <p className="text-white/45 text-[10px] uppercase tracking-wider px-2 py-1 font-bold">Папки</p>
      {folders.map(f => {
        const info = folderInfo(f);
        const active = activeFolder === f;
        const isOver = dragOverFolder === f && f !== activeFolder;
        return (
          <button
            key={f}
            onClick={() => onSelectFolder(f)}
            onDragOver={(e) => {
              if (dragUids.length === 0 || f === activeFolder) return;
              e.preventDefault();
              onDragOverFolder(f);
            }}
            onDragLeave={() => onDragOverFolder(null)}
            onDrop={async (e) => {
              e.preventDefault();
              onDragOverFolder(null);
              if (dragUids.length === 0 || f === activeFolder || !activeAccountId) return;
              onDropFolder(f, dragUids);
            }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all border ${
              isOver
                ? "bg-neon-cyan/20 text-white border-neon-cyan/50 scale-[1.02]"
                : active
                  ? "bg-neon-purple/20 text-white border-neon-purple/30"
                  : "text-white/65 hover:text-white hover:bg-white/5 border-transparent"
            }`}
          >
            <Icon name={info.icon as never} size={14} className={isOver ? "text-neon-cyan" : active ? "text-neon-purple" : info.color} />
            <span className="flex-1 text-left truncate">{info.label}</span>
            {isOver && (
              <span className="text-[10px] text-neon-cyan font-bold shrink-0">
                {dragUids.length}
              </span>
            )}
          </button>
        );
      })}
      {dragUids.length > 0 && (
        <p className="text-white/35 text-[10px] text-center mt-2 px-1">
          Перетащи {dragUids.length > 1 ? `${dragUids.length} письма` : "письмо"} в папку
        </p>
      )}
    </aside>
  );
}

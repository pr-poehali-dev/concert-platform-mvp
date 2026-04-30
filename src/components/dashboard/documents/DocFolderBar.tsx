import Icon from "@/components/ui/icon";
import { Doc } from "./docTypes";

interface Props {
  docs: Doc[];
  allFolders: string[];
  filterFolder: string;
  renamingFolder: string | null;
  renameValue: string;
  showNewFolder: boolean;
  newFolder: string;
  onFilterFolder: (v: string) => void;
  onStartRename: (f: string) => void;
  onRenameValueChange: (v: string) => void;
  onRenameConfirm: (f: string, v: string) => void;
  onRenameCancel: () => void;
  onDeleteFolder: (f: string) => void;
  onShowNewFolder: () => void;
  onNewFolderChange: (v: string) => void;
  onNewFolderConfirm: () => void;
  onNewFolderCancel: () => void;
}

export default function DocFolderBar({
  docs,
  allFolders,
  filterFolder,
  renamingFolder,
  renameValue,
  showNewFolder,
  newFolder,
  onFilterFolder,
  onStartRename,
  onRenameValueChange,
  onRenameConfirm,
  onRenameCancel,
  onDeleteFolder,
  onShowNewFolder,
  onNewFolderChange,
  onNewFolderConfirm,
  onNewFolderCancel,
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Icon name="Folder" size={14} className="text-white/55" />
      <button
        onClick={() => onFilterFolder("all")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterFolder === "all" ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "glass text-white/65 border border-white/10 hover:text-white"}`}
      >
        Все папки
      </button>
      <button
        onClick={() => onFilterFolder("__none__")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterFolder === "__none__" ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "glass text-white/65 border border-white/10 hover:text-white"}`}
      >
        Без папки
      </button>

      {allFolders.map(f => (
        renamingFolder === f ? (
          <div key={f} className="flex items-center gap-1">
            <input
              value={renameValue}
              onChange={e => onRenameValueChange(e.target.value)}
              className="glass border border-neon-cyan/40 rounded-lg px-2 py-1 text-white text-xs outline-none w-32"
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter") onRenameConfirm(f, renameValue);
                if (e.key === "Escape") onRenameCancel();
              }}
            />
            <button
              onClick={() => onRenameConfirm(f, renameValue)}
              className="text-neon-cyan text-xs px-2 py-1 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg hover:bg-neon-cyan/20"
            >
              ОК
            </button>
            <button
              onClick={onRenameCancel}
              className="text-white/55 text-xs px-1.5 py-1 hover:text-white/60 rounded-lg"
            >
              <Icon name="X" size={12} />
            </button>
          </div>
        ) : (
          <div key={f} className={`group flex items-center gap-1 rounded-lg border transition-all ${filterFolder === f ? "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30" : "glass text-white/65 border-white/10 hover:text-white"}`}>
            <button
              onClick={() => onFilterFolder(f)}
              className="flex items-center gap-1.5 pl-3 pr-1 py-1.5 text-xs font-medium"
            >
              <Icon name="FolderOpen" size={11} />
              {f}
              <span className="text-[10px] opacity-60">({docs.filter(d => d.folder === f).length})</span>
            </button>
            <div className="flex items-center gap-0.5 pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={e => { e.stopPropagation(); onStartRename(f); }}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-white/55 hover:text-neon-cyan transition-all"
                title="Переименовать"
              >
                <Icon name="Pencil" size={10} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDeleteFolder(f); }}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-neon-pink/10 text-white/55 hover:text-neon-pink transition-all"
                title="Удалить папку"
              >
                <Icon name="Trash2" size={10} />
              </button>
            </div>
          </div>
        )
      ))}

      {showNewFolder ? (
        <div className="flex items-center gap-1.5">
          <input
            value={newFolder}
            onChange={e => onNewFolderChange(e.target.value)}
            placeholder="Название папки"
            className="glass border border-neon-cyan/30 rounded-lg px-3 py-1.5 text-white text-xs outline-none w-36"
            onKeyDown={e => {
              if (e.key === "Enter" && newFolder.trim()) onNewFolderConfirm();
              if (e.key === "Escape") onNewFolderCancel();
            }}
            autoFocus
          />
          <button
            onClick={() => { if (newFolder.trim()) onNewFolderConfirm(); else onNewFolderCancel(); }}
            className="text-neon-cyan text-xs px-2 py-1.5 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg hover:bg-neon-cyan/20"
          >
            ОК
          </button>
        </div>
      ) : (
        <button
          onClick={onShowNewFolder}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white/25 border border-dashed border-white/10 hover:text-white/70 hover:border-white/20 transition-all"
        >
          <Icon name="Plus" size={11} />Новая папка
        </button>
      )}
    </div>
  );
}
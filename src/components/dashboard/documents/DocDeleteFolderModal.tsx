import Icon from "@/components/ui/icon";

interface Props {
  folderName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export default function DocDeleteFolderModal({ folderName, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative glass-strong rounded-2xl border border-white/10 p-6 w-full max-w-sm animate-scale-in">
        <div className="w-12 h-12 rounded-xl bg-neon-pink/10 border border-neon-pink/20 flex items-center justify-center mx-auto mb-4">
          <Icon name="FolderX" size={22} className="text-neon-pink" />
        </div>
        <h3 className="font-oswald font-bold text-lg text-white text-center mb-1">Удалить папку?</h3>
        <p className="text-white/70 text-sm text-center mb-1">
          Папка <span className="text-white font-medium">«{folderName}»</span> будет удалена.
        </p>
        <p className="text-white/55 text-xs text-center mb-6">
          Документы останутся, но будут перемещены в «Без папки»
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 text-sm hover:text-white hover:border-white/30 transition-all"
          >
            Отмена
          </button>
          <button
            onClick={() => onConfirm(folderName)}
            className="flex-1 py-2.5 rounded-xl bg-neon-pink/20 border border-neon-pink/30 text-neon-pink text-sm font-medium hover:bg-neon-pink/30 transition-all"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
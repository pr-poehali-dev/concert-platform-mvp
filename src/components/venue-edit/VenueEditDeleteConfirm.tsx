import Icon from "@/components/ui/icon";

interface Props {
  venueName: string;
  error: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function VenueEditDeleteConfirm({ venueName, error, deleting, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !deleting && onCancel()} />
      <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl overflow-hidden animate-scale-in">
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-neon-pink/15 flex items-center justify-center shrink-0">
              <Icon name="AlertTriangle" size={20} className="text-neon-pink" />
            </div>
            <div>
              <h3 className="font-oswald font-bold text-lg text-white">Удалить площадку?</h3>
              <p className="text-white/50 text-sm mt-1">
                Площадка «{venueName}» и все её данные (фото, занятые даты, райдер, схема) будут удалены навсегда. Это действие нельзя отменить.
              </p>
            </div>
          </div>
          {error && (
            <div className="mb-3 flex items-center gap-2 text-neon-pink text-xs bg-neon-pink/10 rounded-xl px-3 py-2 border border-neon-pink/20">
              <Icon name="AlertCircle" size={13} className="shrink-0" />
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={onCancel}
              disabled={deleting}
              className="px-4 py-2 glass rounded-xl text-white/60 hover:text-white transition-colors text-sm disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex items-center gap-2 px-5 py-2 bg-neon-pink/90 hover:bg-neon-pink text-white font-oswald font-semibold rounded-xl transition-colors text-sm disabled:opacity-50"
            >
              {deleting
                ? <><Icon name="Loader2" size={14} className="animate-spin" />Удаляем...</>
                : <><Icon name="Trash2" size={14} />Удалить</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

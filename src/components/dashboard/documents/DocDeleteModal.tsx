import Icon from "@/components/ui/icon";

interface Props {
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DocDeleteModal({ deleting, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && onCancel()} />
      <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl border border-white/10 p-6 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-neon-pink/10 flex items-center justify-center mx-auto mb-4">
          <Icon name="Trash2" size={24} className="text-neon-pink" />
        </div>
        <h3 className="font-oswald font-bold text-lg text-white mb-2">Удалить документ?</h3>
        <p className="text-white/40 text-sm mb-6">Это действие необратимо</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-neon-pink/20 border border-neon-pink/30 text-neon-pink font-semibold text-sm hover:bg-neon-pink/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {deleting
              ? <><Icon name="Loader2" size={15} className="animate-spin" /> Удаляю...</>
              : <><Icon name="Trash2" size={15} /> Удалить</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

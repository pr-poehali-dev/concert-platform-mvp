import Icon from "@/components/ui/icon";

interface Props {
  contractSubject: string;
  contractTemplate: string;
  transferId: string;
  transferring: boolean;
  transferError: string;
  transferSuccess: boolean;
  onContractSubjectChange: (v: string) => void;
  onContractTemplateChange: (v: string) => void;
  onTransferIdChange: (v: string) => void;
  onTransfer: () => void;
}

export default function VenueEditStepContract({
  contractSubject,
  contractTemplate,
  transferId,
  transferring,
  transferError,
  transferSuccess,
  onContractSubjectChange,
  onContractTemplateChange,
  onTransferIdChange,
  onTransfer,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
      {/* Предмет договора */}
      <div>
        <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Предмет договора</p>
        <input
          value={contractSubject}
          onChange={e => onContractSubjectChange(e.target.value)}
          placeholder="Предоставление в аренду концертной площадки..."
          className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm"
        />
        <p className="text-white/30 text-xs mt-1">Используется в заголовке договора при бронировании.</p>
      </div>

      {/* Шаблон договора */}
      <div>
        <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Шаблон договора</p>
        <p className="text-white/30 text-xs mb-2">Доступны переменные: <code className="text-neon-cyan bg-neon-cyan/10 px-1 rounded">{"{venue_name}"}</code> <code className="text-neon-cyan bg-neon-cyan/10 px-1 rounded">{"{event_date}"}</code> <code className="text-neon-cyan bg-neon-cyan/10 px-1 rounded">{"{rental_amount}"}</code> <code className="text-neon-cyan bg-neon-cyan/10 px-1 rounded">{"{organizer_name}"}</code></p>
        <textarea
          value={contractTemplate}
          onChange={e => onContractTemplateChange(e.target.value)}
          rows={12}
          placeholder={"ДОГОВОР АРЕНДЫ ПЛОЩАДКИ\n\nПредмет договора: Арендодатель предоставляет Арендатору площадку {venue_name} на дату {event_date}.\n\nСтоимость: {rental_amount} рублей.\n\n..."}
          className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm font-mono resize-y"
        />
        <p className="text-white/30 text-xs mt-1">Шаблон применяется ко всем проектам, использующим эту площадку.</p>
      </div>

      {/* Передача площадки */}
      <div className="border-t border-white/10 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-neon-pink/15 flex items-center justify-center shrink-0">
            <Icon name="ArrowRightLeft" size={16} className="text-neon-pink" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Передать площадку</p>
            <p className="text-white/40 text-xs">Безвозвратная передача другому кабинету площадки</p>
          </div>
        </div>
        <div className="bg-neon-pink/5 border border-neon-pink/20 rounded-xl p-3 mb-3">
          <p className="text-neon-pink/80 text-xs">Площадка будет безвозвратно передана другому кабинету. Вы потеряете к ней доступ. Введите ID кабинета получателя (число из профиля).</p>
        </div>
        {transferSuccess ? (
          <div className="flex items-center gap-2 text-neon-green text-sm bg-neon-green/10 border border-neon-green/20 rounded-xl px-3 py-2">
            <Icon name="CheckCircle" size={16} />Передача выполнена! Площадка переходит к новому владельцу.
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={transferId}
              onChange={e => onTransferIdChange(e.target.value)}
              placeholder="ID кабинета получателя (например: 12345)"
              className="flex-1 glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-pink/50 transition-colors text-sm"
            />
            <button
              onClick={onTransfer}
              disabled={transferring || !transferId.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-neon-pink/20 hover:bg-neon-pink/30 border border-neon-pink/40 text-neon-pink font-semibold rounded-xl transition-all text-sm disabled:opacity-50"
            >
              {transferring ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="ArrowRightLeft" size={14} />}
              Передать
            </button>
          </div>
        )}
        {transferError && (
          <p className="text-neon-pink text-xs mt-2 flex items-center gap-1">
            <Icon name="AlertCircle" size={12} />{transferError}
          </p>
        )}
      </div>
    </div>
  );
}

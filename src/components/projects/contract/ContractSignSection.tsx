import Icon from "@/components/ui/icon";

interface Contract {
  organizer_legal_name: string;
  organizer_signed_at: string;
  venue_legal_name: string;
  venue_name: string;
  venue_signed_at: string;
  status: string;
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

interface Props {
  contract: Contract;
  error: string;
  signing: boolean;
  signDone: boolean;
  invoiceId: string | null;
  canSign: boolean;
  iAlreadySigned: boolean;
  myRole: "organizer" | "venue" | null;
  onSign: () => void;
}

export default function ContractSignSection({
  contract,
  error,
  signing,
  signDone,
  invoiceId,
  canSign,
  iAlreadySigned,
  myRole,
  onSign,
}: Props) {
  return (
    <>
      {/* Статус подписей */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Организатор",
            name: contract.organizer_legal_name || "—",
            signed: !!contract.organizer_signed_at,
            date: contract.organizer_signed_at,
          },
          {
            label: "Площадка",
            name: contract.venue_legal_name || contract.venue_name,
            signed: !!contract.venue_signed_at,
            date: contract.venue_signed_at,
          },
        ].map((s, i) => (
          <div key={i} className={`glass rounded-xl p-4 border ${s.signed ? "border-neon-green/20" : "border-white/8"}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Icon name={s.signed ? "CheckCircle2" : "Clock"} size={15}
                className={s.signed ? "text-neon-green" : "text-white/30"} />
              <p className="text-white/50 text-xs">{s.label}</p>
            </div>
            <p className="text-white/80 text-sm font-medium truncate">{s.name}</p>
            {s.signed
              ? <p className="text-neon-green text-xs mt-1">Подписано {fmtDate(s.date)}</p>
              : <p className="text-white/30 text-xs mt-1">Ожидает подписания</p>
            }
          </div>
        ))}
      </div>

      {/* Ошибка */}
      {error && <p className="text-neon-pink text-sm text-center">{error}</p>}

      {/* Успешно подписано */}
      {signDone && (
        <div className="flex items-center gap-3 p-4 glass rounded-xl border border-neon-green/20">
          <Icon name="CheckCircle2" size={20} className="text-neon-green shrink-0" />
          <div>
            <p className="text-neon-green font-semibold text-sm">Вы подписали договор</p>
            {invoiceId && <p className="text-white/45 text-xs mt-0.5">Счёт сформирован после подписания обеими сторонами</p>}
          </div>
        </div>
      )}

      {/* Кнопка подписания */}
      {canSign && !signDone && (
        <div className="glass rounded-xl p-4 border border-neon-purple/20">
          <p className="text-white/60 text-sm mb-4">
            Вы подписываете договор как <b className="text-white/80">{myRole === "organizer" ? "Организатор" : "Площадка"}</b>.
            Нажимая кнопку, вы подтверждаете согласие с условиями договора.
          </p>
          <button onClick={onSign} disabled={signing}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all text-base">
            {signing
              ? <><Icon name="Loader2" size={16} className="animate-spin" />Подписываю...</>
              : <><Icon name="PenTool" size={16} />Подписать договор</>}
          </button>
        </div>
      )}

      {/* Уже подписан */}
      {iAlreadySigned && !signDone && (
        <div className="flex items-center gap-3 p-4 glass rounded-xl border border-neon-green/15">
          <Icon name="CheckCircle2" size={18} className="text-neon-green" />
          <p className="text-white/60 text-sm">Вы уже подписали этот договор</p>
        </div>
      )}
    </>
  );
}

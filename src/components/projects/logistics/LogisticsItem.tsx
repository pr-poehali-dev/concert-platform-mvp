import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { LogItem, LogStatus, TYPE_CONFIG, STATUS_CONFIG, fmt, fmtDate } from "./logistics.types";

interface Props {
  item: LogItem;
  onEdit: (item: LogItem) => void;
  onRemove: (id: string) => void;
  onQuickStatus: (id: string, status: LogStatus) => void;
}

export default function LogisticsItem({ item, onEdit, onRemove, onQuickStatus }: Props) {
  const tc = TYPE_CONFIG[item.type];
  const sc = STATUS_CONFIG[item.status];
  const searchUrl = tc.search(item);

  return (
    <div className="glass rounded-2xl border border-white/5 hover:border-white/10 transition-all p-4">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ${tc.color}`}>
          <Icon name={tc.icon as never} size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-white text-sm">{item.personName}</span>
            <span className="text-white/35 text-xs bg-white/5 px-2 py-0.5 rounded-full">{item.personRole}</span>
            <Badge className={`text-xs border ${sc.cls}`}>{sc.label}</Badge>
          </div>

          <div className="flex items-center gap-3 text-xs text-white/50 flex-wrap">
            {item.routeFrom && item.routeTo && (
              <span className="flex items-center gap-1">
                <Icon name={tc.icon as never} size={11} className={tc.color} />
                {item.routeFrom} → {item.routeTo}
              </span>
            )}
            {item.dateDepart && (
              <span className="flex items-center gap-1">
                <Icon name="Calendar" size={11} />
                {fmtDate(item.dateDepart)}
                {item.dateReturn && ` – ${fmtDate(item.dateReturn)}`}
              </span>
            )}
            {item.bookingRef && (
              <span className="flex items-center gap-1 text-neon-green/70">
                <Icon name="Hash" size={11} />{item.bookingRef}
              </span>
            )}
            {item.price > 0 && (
              <span className="text-neon-cyan font-medium">{fmt(item.price)}</span>
            )}
          </div>

          {item.notes && (
            <p className="text-white/30 text-xs mt-1 italic">{item.notes}</p>
          )}

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {(["needed", "searching", "booked", "confirmed"] as LogStatus[]).map(s => (
              <button key={s} onClick={() => onQuickStatus(item.id, s)}
                className={`px-2 py-0.5 rounded-lg text-[10px] border transition-all ${
                  item.status === s ? STATUS_CONFIG[s].cls : "text-white/20 border-white/5 hover:bg-white/5 hover:text-white/50"
                }`}>
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {item.status !== "confirmed" && (
            <a href={searchUrl} target="_blank" rel="noreferrer"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all ${tc.color} bg-white/5 border-white/10 hover:bg-white/10`}
              title={`Найти ${tc.label.toLowerCase()} на ${item.type === "flight" ? "Авиасейлс" : item.type === "train" ? "РЖД" : "Островке"}`}>
              <Icon name="ExternalLink" size={12} />
              {item.type === "flight" ? "Авиасейлс" : item.type === "train" ? "РЖД" : "Остров"}
            </a>
          )}
          <button onClick={() => onEdit(item)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-all">
            <Icon name="Edit" size={13} />
          </button>
          <button onClick={() => onRemove(item.id)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-neon-pink hover:bg-neon-pink/10 transition-all">
            <Icon name="Trash2" size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

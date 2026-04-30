import Icon from "@/components/ui/icon";

interface Props {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  color: string;
}

export default function BarKpiCard({ label, value, sub, icon, color }: Props) {
  return (
    <div className="glass rounded-2xl border border-white/10 p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center shrink-0`}>
        <Icon name={icon as never} size={18} className={`text-${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-white/45 text-[11px] uppercase tracking-wide">{label}</p>
        <p className="text-white font-oswald font-bold text-2xl leading-tight truncate">{value}</p>
        {sub && <p className="text-white/40 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, fmt, type Project, type ProjectGroup } from "@/hooks/useProjects";

// ── Карточка проекта ──────────────────────────────────────────────────────────
export function ProjectCard({ p, onClick, bookingBadge }: {
  p: Project; onClick: () => void; bookingBadge?: number;
}) {
  const f = p.finance;
  const profitPositive = f.profitPlan >= 0;
  return (
    <div onClick={onClick}
      className={`relative glass rounded-2xl p-5 cursor-pointer hover-lift group transition-all border hover:border-neon-purple/20 ${p.hasOverdueTasks ? "border-neon-pink/40 animate-pulse-border" : "border-white/5"}`}>
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={`text-xs border shrink-0 ${STATUS_CONFIG[p.status]?.color}`}>
              {STATUS_CONFIG[p.status]?.label}
            </Badge>
            <span className="text-white/30 text-xs">{p.projectType === "single" ? "Концерт" : "Тур"}</span>
            {p.isPartner && (
              <span className="flex items-center gap-1 text-neon-cyan text-[10px] border border-neon-cyan/25 bg-neon-cyan/8 px-1.5 py-0.5 rounded">
                <Icon name="Handshake" size={10} />Партнёрский
              </span>
            )}
            {p.hasOverdueTasks && (
              <span className="flex items-center gap-1 text-neon-pink text-xs animate-pulse">
                <Icon name="AlertTriangle" size={11} />просрочено
              </span>
            )}
          </div>
          <h3 className="font-oswald font-bold text-xl text-white group-hover:text-neon-purple transition-colors truncate">{p.title}</h3>
          {p.artist && <p className="text-neon-cyan text-sm">{p.artist}</p>}
          {p.isPartner && p.ownerName && (
            <p className="text-white/30 text-xs flex items-center gap-1 mt-0.5">
              <Icon name="User" size={10} />от {p.ownerName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {!!bookingBadge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neon-pink text-white min-w-[18px] text-center animate-pulse">
              {bookingBadge > 9 ? "9+" : bookingBadge}
            </span>
          )}
          <Icon name="ChevronRight" size={16} className="text-white/20 group-hover:text-neon-purple transition-colors" />
        </div>
      </div>
      <div className="flex items-center gap-3 text-white/35 text-xs mb-4 flex-wrap">
        {p.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{p.city}</span>}
        {p.dateStart && <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{p.dateStart}</span>}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/40">Доход план</span>
          <span className="text-neon-green font-medium">{fmt(p.totalIncomePlan)} ₽</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/40">Расходы план</span>
          <span className="text-neon-pink font-medium">{fmt(p.totalExpensesPlan)} ₽</span>
        </div>
        {f.taxPlan > 0 && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-white/40">{f.taxLabel}</span>
            <span className="text-neon-cyan font-medium">−{fmt(f.taxPlan)} ₽</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-white text-sm font-medium">Чистая прибыль</span>
          <span className={`font-oswald font-bold text-lg ${profitPositive ? "text-neon-green" : "text-neon-pink"}`}>
            {profitPositive ? "+" : ""}{fmt(f.profitPlan)} ₽
          </span>
        </div>
        {p.totalIncomePlan > 0 && (
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${profitPositive ? "bg-gradient-to-r from-neon-purple to-neon-green" : "bg-neon-pink"}`}
              style={{ width: `${Math.min(100, Math.max(0, f.profitPlan / p.totalIncomePlan * 100))}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Карточка группы ───────────────────────────────────────────────────────────
export function GroupCard({ g, onClick, onEdit }: {
  g: ProjectGroup; onClick: () => void; onEdit: (e: React.MouseEvent) => void;
}) {
  const f = g.finance;
  const profitPositive = f.profitPlan >= 0;
  const color = g.color || "neon-purple";
  return (
    <div onClick={onClick}
      className={`relative glass rounded-2xl p-5 cursor-pointer hover-lift group transition-all border border-${color}/25 hover:border-${color}/50`}>
      {/* цветная полоска сверху */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-${color}/60`} />

      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-7 h-7 rounded-lg bg-${color}/15 border border-${color}/25 flex items-center justify-center shrink-0`}>
              <Icon name="FolderOpen" size={14} className={`text-${color}`} />
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded border border-${color}/30 bg-${color}/10 text-${color} font-medium`}>
              {g.projectCount} {g.projectCount === 1 ? "проект" : g.projectCount < 5 ? "проекта" : "проектов"}
            </span>
          </div>
          <h3 className={`font-oswald font-bold text-xl text-white group-hover:text-${color} transition-colors truncate mt-1`}>
            {g.title}
          </h3>
          {g.description && <p className="text-white/35 text-xs mt-0.5 truncate">{g.description}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-1">
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            title="Редактировать"
          >
            <Icon name="Settings" size={13} />
          </button>
          <Icon name="ChevronRight" size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
        </div>
      </div>

      <div className="flex items-center gap-3 text-white/35 text-xs mb-4 flex-wrap">
        {g.dateStart && <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{g.dateStart}</span>}
        {g.dateEnd && g.dateEnd !== g.dateStart && <span className="text-white/20">→ {g.dateEnd}</span>}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/40">Доход план</span>
          <span className="text-neon-green font-medium">{fmt(g.totalIncomePlan)} ₽</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/40">Факт</span>
          <span className="text-neon-green/60 font-medium">{fmt(g.totalIncomeFact)} ₽</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/40">Расходы план</span>
          <span className="text-neon-pink font-medium">{fmt(g.totalExpensesPlan)} ₽</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-white text-sm font-medium">Прибыль (∑)</span>
          <span className={`font-oswald font-bold text-lg ${profitPositive ? "text-neon-green" : "text-neon-pink"}`}>
            {profitPositive ? "+" : ""}{fmt(f.profitPlan)} ₽
          </span>
        </div>
        {g.totalIncomePlan > 0 && (
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-${color}/60 transition-all`}
              style={{ width: `${Math.min(100, Math.max(0, f.profitPlan / g.totalIncomePlan * 100))}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

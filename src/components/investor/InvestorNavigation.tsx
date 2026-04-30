import Icon from "@/components/ui/icon";
import { SLIDES, SLIDE_LABELS } from "./InvestorShared";

interface InvestorNavigationProps {
  current: number;
  total: number;
  goTo: (i: number) => void;
}

export default function InvestorNavigation({ current, total, goTo }: InvestorNavigationProps) {
  return (
    <>
      {/* Прогресс-бар вверху */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {/* Навигационные точки */}
      <nav className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} title={SLIDE_LABELS[i]}
            className={`rounded-full border transition-all duration-300 ${
              i === current
                ? "bg-amber-400 border-amber-400 w-2 h-5"
                : "w-2 h-2 bg-white/10 border-white/20 hover:bg-amber-400/50"
            }`}
          />
        ))}
      </nav>

      {/* Управление стрелками */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2">
        <button onClick={() => goTo(Math.max(current - 1, 0))} disabled={current === 0}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all">
          <Icon name="ChevronLeft" size={16} />
        </button>
        <div className="text-center min-w-[120px]">
          <p className="text-white/70 text-xs font-oswald font-bold">{SLIDE_LABELS[current]}</p>
          <p className="text-white/25 text-[10px] tracking-widest">{current + 1} / {total}</p>
        </div>
        <button onClick={() => goTo(Math.min(current + 1, total - 1))} disabled={current === total - 1}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all">
          <Icon name="ChevronRight" size={16} />
        </button>
      </div>
    </>
  );
}

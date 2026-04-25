import Icon from "@/components/ui/icon";
import { CITIES } from "@/hooks/useProjects";
import type { ProjectForm } from "./types";

interface Props {
  form: ProjectForm;
  titleTouched: boolean;
  onSet: (k: string, v: unknown) => void;
  onTitleTouched: () => void;
}

export default function StepBasic({ form, titleTouched, onSet, onTitleTouched }: Props) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex gap-2">
        {(["single", "tour"] as const).map(t => (
          <button key={t} onClick={() => onSet("projectType", t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-oswald font-medium border transition-all ${form.projectType === t ? "bg-neon-purple text-white border-neon-purple" : "glass text-white/50 border-white/10 hover:border-white/20 hover:text-white"}`}>
            {t === "single" ? "Одиночный концерт" : "Тур"}
          </button>
        ))}
      </div>
      <div>
        <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Название проекта *</label>
        <input value={form.title}
          onChange={e => { onSet("title", e.target.value); onTitleTouched(); }}
          onBlur={onTitleTouched}
          placeholder="Например: Концерт в Москве, Осенний тур 2025"
          className={`w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border text-sm transition-colors ${titleTouched && !form.title.trim() ? "border-neon-pink/60 focus:border-neon-pink" : "border-white/10 focus:border-neon-purple/50"}`} />
        {titleTouched && !form.title.trim() && (
          <p className="text-neon-pink text-xs mt-1.5 flex items-center gap-1"><Icon name="AlertCircle" size={12} />Обязательное поле</p>
        )}
      </div>
      <div>
        <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Артист / группа</label>
        <input value={form.artist} onChange={e => onSet("artist", e.target.value)} placeholder="Имя артиста или группы"
          className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Дата начала</label>
          <input type="date" value={form.dateStart} onChange={e => onSet("dateStart", e.target.value)}
            className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 text-sm [color-scheme:dark]" />
        </div>
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Дата окончания</label>
          <input type="date" value={form.dateEnd} onChange={e => onSet("dateEnd", e.target.value)}
            className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 text-sm [color-scheme:dark]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Город</label>
          <select value={form.city} onChange={e => onSet("city", e.target.value)}
            className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 text-sm appearance-none bg-transparent">
            {CITIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Возрастной ценз</label>
          <select value={form.ageLimit} onChange={e => onSet("ageLimit", e.target.value)}
            className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 text-sm appearance-none bg-transparent">
            {["", "0+", "6+", "12+", "16+", "18+"].map(a => <option key={a} value={a} className="bg-gray-900">{a || "Не указан"}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Время мероприятия</label>
          <input type="time" value={form.eventTime} onChange={e => onSet("eventTime", e.target.value)}
            className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 text-sm [color-scheme:dark]" />
        </div>
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Ожидаемых гостей</label>
          <input type="number" value={form.expectedGuests || ""} onChange={e => onSet("expectedGuests", Number(e.target.value))} placeholder="0"
            className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Описание</label>
        <textarea value={form.description} onChange={e => onSet("description", e.target.value)} rows={2}
          placeholder="Дополнительная информация о проекте..."
          className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm resize-none" />
      </div>
    </div>
  );
}

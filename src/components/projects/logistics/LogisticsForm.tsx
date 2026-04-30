import Icon from "@/components/ui/icon";
import { LogItem, LogType, LogStatus, TYPE_CONFIG, STATUS_CONFIG, ROLES } from "./logistics.types";
import LogisticsAiPanel from "./LogisticsAiPanel";

type FormData = Omit<LogItem, "id" | "projectId" | "createdAt">;

interface Props {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  editId: string | null;
  saving: boolean;
  projectId: string;
  aiLoading: boolean;
  aiAdvice: string | null;
  onAskAI: () => void;
  onClearAI: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function LogisticsForm({
  form, setForm, editId, saving, projectId,
  aiLoading, aiAdvice, onAskAI, onClearAI,
  onSave, onCancel,
}: Props) {
  return (
    <div className="glass-strong rounded-2xl border border-neon-purple/30 p-5 animate-scale-in space-y-4">
      <h4 className="font-oswald font-bold text-white flex items-center gap-2">
        <Icon name={editId ? "Edit" : "Plus"} size={16} className="text-neon-purple" />
        {editId ? "Редактировать" : "Новая позиция"}
      </h4>

      <div className="flex gap-2">
        {(["flight", "train", "hotel"] as LogType[]).map(t => (
          <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all flex-1 justify-center ${
              form.type === t
                ? `${TYPE_CONFIG[t].color} bg-white/10 border-current`
                : "text-white/40 border-white/10 hover:text-white hover:bg-white/5"
            }`}>
            <Icon name={TYPE_CONFIG[t].icon as never} size={15} />
            {TYPE_CONFIG[t].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input value={form.personName} onChange={e => setForm(f => ({ ...f, personName: e.target.value }))}
          placeholder="Имя участника *"
          className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none focus:border-neon-purple/50" />

        <select value={form.personRole} onChange={e => setForm(f => ({ ...f, personRole: e.target.value }))}
          className="glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none appearance-none bg-transparent">
          {ROLES.map(r => <option key={r} value={r} className="bg-gray-900">{r}</option>)}
        </select>

        <input value={form.routeFrom} onChange={e => setForm(f => ({ ...f, routeFrom: e.target.value }))}
          placeholder={form.type === "hotel" ? "Город (для отеля)" : "Откуда (город/аэропорт)"}
          className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none focus:border-neon-purple/50" />

        <input value={form.routeTo} onChange={e => setForm(f => ({ ...f, routeTo: e.target.value }))}
          placeholder={form.type === "hotel" ? "Город отеля" : "Куда (город/аэропорт)"}
          className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none focus:border-neon-purple/50" />

        <div>
          <p className="text-white/30 text-xs mb-1">{form.type === "hotel" ? "Заезд" : "Дата отправления"}</p>
          <input type="date" value={form.dateDepart || ""}
            onChange={e => setForm(f => ({ ...f, dateDepart: e.target.value || null }))}
            className="w-full glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none" />
        </div>

        <div>
          <p className="text-white/30 text-xs mb-1">{form.type === "hotel" ? "Выезд" : "Дата возврата (если есть)"}</p>
          <input type="date" value={form.dateReturn || ""}
            onChange={e => setForm(f => ({ ...f, dateReturn: e.target.value || null }))}
            className="w-full glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none" />
        </div>

        <input value={form.bookingRef} onChange={e => setForm(f => ({ ...f, bookingRef: e.target.value }))}
          placeholder="Номер бронирования / PNR"
          className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none" />

        <input type="number" value={form.price || ""}
          onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) || 0 }))}
          placeholder="Стоимость ₽"
          className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none" />
      </div>

      <div>
        <p className="text-white/30 text-xs mb-2">Статус</p>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(STATUS_CONFIG) as LogStatus[]).filter(s => s !== "cancelled").map(s => (
            <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                form.status === s ? STATUS_CONFIG[s].cls : "text-white/30 border-white/10 hover:bg-white/5"
              }`}>
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      <textarea value={form.notes} onChange={e => { setForm(f => ({ ...f, notes: e.target.value })); onClearAI(); }}
        placeholder="Заметки (предпочтения, требования...)"
        rows={2}
        className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none resize-none" />

      <LogisticsAiPanel
        form={form}
        projectId={projectId}
        aiLoading={aiLoading}
        aiAdvice={aiAdvice}
        onAsk={onAskAI}
        onClear={onClearAI}
      />

      <div className="flex gap-3">
        <button onClick={onSave} disabled={saving || !form.personName.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
          {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Check" size={15} />}
          {editId ? "Сохранить" : "Добавить"}
        </button>
        <button onClick={onCancel}
          className="px-5 py-2.5 glass rounded-xl text-white/50 hover:text-white text-sm border border-white/10 transition-all">
          Отмена
        </button>
      </div>
    </div>
  );
}

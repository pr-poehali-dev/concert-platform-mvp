import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { PROJECTS_URL } from "@/hooks/useProjects";
import { useAuth } from "@/context/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────
type LogType   = "flight" | "train" | "hotel";
type LogStatus = "needed" | "searching" | "booked" | "confirmed" | "cancelled";

interface LogItem {
  id: string;
  projectId: string;
  personName: string;
  personRole: string;
  type: LogType;
  status: LogStatus;
  routeFrom: string;
  routeTo: string;
  dateDepart: string | null;
  dateReturn: string | null;
  bookingRef: string;
  price: number;
  notes: string;
  fileUrl: string;
  fileName: string;
  createdAt: string;
}

// ── Config ────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<LogType, { label: string; icon: string; color: string; search: (r: LogItem) => string }> = {
  flight: {
    label: "Авиабилет", icon: "Plane", color: "text-neon-cyan",
    search: (r) => {
      const from = encodeURIComponent(r.routeFrom || "");
      const to   = encodeURIComponent(r.routeTo   || "");
      const date = r.dateDepart?.replace(/-/g, "") || "";
      return `https://www.aviasales.ru/search/${from}${date}${to}1`;
    },
  },
  train: {
    label: "ЖД билет", icon: "Train", color: "text-neon-green",
    search: (r) => {
      const from = encodeURIComponent(r.routeFrom || "");
      const to   = encodeURIComponent(r.routeTo   || "");
      const date = r.dateDepart
        ? new Date(r.dateDepart).toLocaleDateString("ru", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\./g, ".")
        : "";
      return `https://www.rzd.ru/tickets/direction/ru?from=${from}&to=${to}&date=${date}`;
    },
  },
  hotel: {
    label: "Отель", icon: "Hotel", color: "text-neon-purple",
    search: (r) => {
      const city  = encodeURIComponent(r.routeTo || r.routeFrom || "");
      const cin   = r.dateDepart  || "";
      const cout  = r.dateReturn  || "";
      return `https://ostrovok.ru/hotels/${city}/?arrival=${cin}&departure=${cout}`;
    },
  },
};

const STATUS_CONFIG: Record<LogStatus, { label: string; cls: string }> = {
  needed:    { label: "Нужно купить", cls: "text-neon-pink bg-neon-pink/10 border-neon-pink/20" },
  searching: { label: "Ищем",        cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20" },
  booked:    { label: "Забронировано",cls: "text-neon-purple bg-neon-purple/10 border-neon-purple/20" },
  confirmed: { label: "Подтверждено",cls: "text-neon-green bg-neon-green/10 border-neon-green/20" },
  cancelled: { label: "Отменено",    cls: "text-white/30 bg-white/5 border-white/10" },
};

const ROLES = ["Артист", "Звукорежиссёр", "Световик", "Менеджер тура", "Технический директор", "Охрана", "Фотограф", "Другое"];

const fmt = (n: number) => n > 0 ? n.toLocaleString("ru") + " ₽" : "—";

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru", { day: "numeric", month: "short" });
}

// ── Empty form ────────────────────────────────────────────────────────────
const EMPTY: Omit<LogItem, "id" | "projectId" | "createdAt"> = {
  personName: "", personRole: "Артист", type: "flight", status: "needed",
  routeFrom: "", routeTo: "", dateDepart: null, dateReturn: null,
  bookingRef: "", price: 0, notes: "", fileUrl: "", fileName: "",
};

// ── Main Component ────────────────────────────────────────────────────────
interface Props {
  projectId: string;
  projectCity?: string;
  projectDateStart?: string;
  projectArtist?: string;
}

export default function ProjectLogisticsTab({ projectId, projectCity = "", projectDateStart = "", projectArtist = "" }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<LogType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<LogStatus | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=logistics_list&project_id=${projectId}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm({
      ...EMPTY,
      personName: projectArtist || "",
      routeTo: projectCity || "",
      dateDepart: projectDateStart || null,
    });
    setShowForm(true);
  };

  const openEdit = (item: LogItem) => {
    setEditId(item.id);
    setForm({
      personName: item.personName, personRole: item.personRole,
      type: item.type, status: item.status,
      routeFrom: item.routeFrom, routeTo: item.routeTo,
      dateDepart: item.dateDepart, dateReturn: item.dateReturn,
      bookingRef: item.bookingRef, price: item.price,
      notes: item.notes, fileUrl: item.fileUrl, fileName: item.fileName,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.personName.trim()) return;
    setSaving(true);
    if (editId) {
      await fetch(`${PROJECTS_URL}?action=logistics_update`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, ...form }),
      });
    } else {
      await fetch(`${PROJECTS_URL}?action=logistics_create`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, createdBy: user?.id, ...form }),
      });
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await fetch(`${PROJECTS_URL}?action=logistics_delete`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const quickStatus = async (id: string, status: LogStatus) => {
    await fetch(`${PROJECTS_URL}?action=logistics_update`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const filtered = items.filter(i => {
    if (filterType !== "all" && i.type !== filterType) return false;
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    return true;
  });

  // Сводка
  const totalPrice = items.reduce((s, i) => s + i.price, 0);
  const byStatus = (s: LogStatus) => items.filter(i => i.status === s).length;

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-20 animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Шапка */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-oswald font-bold text-white text-xl">Логистика</h3>
          <p className="text-white/40 text-xs mt-0.5">Билеты и отели для участников тура</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 transition-opacity"
        >
          <Icon name="Plus" size={15} />Добавить
        </button>
      </div>

      {/* Сводка */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: "Users",       label: "Позиций",     value: items.length,              color: "text-white/60" },
            { icon: "AlertCircle", label: "Нужно купить",value: byStatus("needed"),         color: "text-neon-pink" },
            { icon: "CheckCircle", label: "Подтверждено",value: byStatus("confirmed"),      color: "text-neon-green" },
            { icon: "Wallet",      label: "Итого",        value: fmt(totalPrice),            color: "text-neon-cyan" },
          ].map((s, i) => (
            <div key={i} className="glass rounded-xl p-3 flex items-center gap-3">
              <Icon name={s.icon} size={16} className={s.color} />
              <div>
                <p className={`font-oswald font-bold text-lg ${s.color}`}>{s.value}</p>
                <p className="text-white/35 text-xs">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Фильтры */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 glass rounded-xl p-1">
            {(["all", "flight", "train", "hotel"] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === t ? "bg-neon-purple text-white" : "text-white/40 hover:text-white"}`}>
                {t !== "all" && <Icon name={TYPE_CONFIG[t].icon as never} size={12} />}
                {t === "all" ? "Все" : TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as LogStatus | "all")}
            className="glass rounded-xl px-3 py-1.5 text-white text-xs border border-white/10 outline-none appearance-none bg-transparent">
            <option value="all" className="bg-gray-900">Все статусы</option>
            {(Object.keys(STATUS_CONFIG) as LogStatus[]).map(s => (
              <option key={s} value={s} className="bg-gray-900">{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Форма */}
      {showForm && (
        <div className="glass-strong rounded-2xl border border-neon-purple/30 p-5 animate-scale-in space-y-4">
          <h4 className="font-oswald font-bold text-white flex items-center gap-2">
            <Icon name={editId ? "Edit" : "Plus"} size={16} className="text-neon-purple" />
            {editId ? "Редактировать" : "Новая позиция"}
          </h4>

          {/* Тип */}
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
            {/* Имя */}
            <input value={form.personName} onChange={e => setForm(f => ({ ...f, personName: e.target.value }))}
              placeholder="Имя участника *"
              className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none focus:border-neon-purple/50" />

            {/* Роль */}
            <select value={form.personRole} onChange={e => setForm(f => ({ ...f, personRole: e.target.value }))}
              className="glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none appearance-none bg-transparent">
              {ROLES.map(r => <option key={r} value={r} className="bg-gray-900">{r}</option>)}
            </select>

            {/* Откуда */}
            <input value={form.routeFrom} onChange={e => setForm(f => ({ ...f, routeFrom: e.target.value }))}
              placeholder={form.type === "hotel" ? "Город (для отеля)" : "Откуда (город/аэропорт)"}
              className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none focus:border-neon-purple/50" />

            {/* Куда */}
            <input value={form.routeTo} onChange={e => setForm(f => ({ ...f, routeTo: e.target.value }))}
              placeholder={form.type === "hotel" ? "Город отеля" : "Куда (город/аэропорт)"}
              className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none focus:border-neon-purple/50" />

            {/* Дата туда */}
            <div>
              <p className="text-white/30 text-xs mb-1">{form.type === "hotel" ? "Заезд" : "Дата отправления"}</p>
              <input type="date" value={form.dateDepart || ""}
                onChange={e => setForm(f => ({ ...f, dateDepart: e.target.value || null }))}
                className="w-full glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none" />
            </div>

            {/* Дата обратно */}
            <div>
              <p className="text-white/30 text-xs mb-1">{form.type === "hotel" ? "Выезд" : "Дата возврата (если есть)"}</p>
              <input type="date" value={form.dateReturn || ""}
                onChange={e => setForm(f => ({ ...f, dateReturn: e.target.value || null }))}
                className="w-full glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none" />
            </div>

            {/* Номер брони */}
            <input value={form.bookingRef} onChange={e => setForm(f => ({ ...f, bookingRef: e.target.value }))}
              placeholder="Номер бронирования / PNR"
              className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none" />

            {/* Стоимость */}
            <input type="number" value={form.price || ""}
              onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) || 0 }))}
              placeholder="Стоимость ₽"
              className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none" />
          </div>

          {/* Статус */}
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

          {/* Заметки */}
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Заметки (предпочтения, требования...)"
            rows={2}
            className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none resize-none" />

          <div className="flex gap-3">
            <button onClick={save} disabled={saving || !form.personName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
              {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Check" size={15} />}
              {editId ? "Сохранить" : "Добавить"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-5 py-2.5 glass rounded-xl text-white/50 hover:text-white text-sm border border-white/10 transition-all">
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 glass rounded-2xl">
          <Icon name="Briefcase" size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 font-oswald text-lg">Логистика не добавлена</p>
          <p className="text-white/20 text-sm mt-1 mb-5">Добавьте билеты и отели для участников тура</p>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90">
            <Icon name="Plus" size={15} />Добавить первую позицию
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const tc = TYPE_CONFIG[item.type];
            const sc = STATUS_CONFIG[item.status];
            const searchUrl = tc.search(item);
            return (
              <div key={item.id} className="glass rounded-2xl border border-white/5 hover:border-white/10 transition-all p-4">
                <div className="flex items-start gap-4">
                  {/* Иконка типа */}
                  <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ${tc.color}`}>
                    <Icon name={tc.icon as never} size={18} />
                  </div>

                  {/* Инфо */}
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

                    {/* Быстрая смена статуса */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {(["needed", "searching", "booked", "confirmed"] as LogStatus[]).map(s => (
                        <button key={s} onClick={() => quickStatus(item.id, s)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] border transition-all ${
                            item.status === s ? STATUS_CONFIG[s].cls : "text-white/20 border-white/5 hover:bg-white/5 hover:text-white/50"
                          }`}>
                          {STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Найти/купить — deeplink */}
                    {item.status !== "confirmed" && (
                      <a href={searchUrl} target="_blank" rel="noreferrer"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all ${tc.color} bg-white/5 border-white/10 hover:bg-white/10`}
                        title={`Найти ${tc.label.toLowerCase()} на ${item.type === "flight" ? "Авиасейлс" : item.type === "train" ? "РЖД" : "Островке"}`}>
                        <Icon name="ExternalLink" size={12} />
                        {item.type === "flight" ? "Авиасейлс" : item.type === "train" ? "РЖД" : "Остров"}
                      </a>
                    )}
                    <button onClick={() => openEdit(item)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-all">
                      <Icon name="Edit" size={13} />
                    </button>
                    <button onClick={() => remove(item.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-neon-pink hover:bg-neon-pink/10 transition-all">
                      <Icon name="Trash2" size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
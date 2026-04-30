import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL } from "@/hooks/useProjects";
import { useAuth } from "@/context/AuthContext";
import { LogItem, LogType, LogStatus, TYPE_CONFIG, STATUS_CONFIG, EMPTY, fmt } from "./logistics/logistics.types";
import LogisticsForm from "./logistics/LogisticsForm";
import LogisticsItem from "./logistics/LogisticsItem";

const AI_URL = "https://functions.poehali.dev/8841fd93-d5cc-414b-a912-d185ca8cab48";

interface Props {
  projectId: string;
  projectCity?: string;
  projectDateStart?: string;
  projectArtist?: string;
  projectVenue?: string;
  projectDateEnd?: string;
}

export default function ProjectLogisticsTab({
  projectId,
  projectCity = "",
  projectDateStart = "",
  projectArtist = "",
  projectVenue = "",
  projectDateEnd = "",
}: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<LogType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<LogStatus | "all">("all");
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggest, setAiSuggest] = useState<string | null>(null);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (mounted?: { current: boolean }) => {
    if (mounted && !mounted.current) return;
    setLoading(true);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=logistics_list&project_id=${projectId}`);
      const data = await res.json();
      if (!mounted || mounted.current) setItems(data.items || []);
    } catch { if (!mounted || mounted.current) setItems([]); }
    finally { if (!mounted || mounted.current) setLoading(false); }
  }, [projectId]);

  useEffect(() => {
    const mounted = { current: true };
    load(mounted);
    return () => { mounted.current = false; };
  }, [load]);

  const askAI = async () => {
    setAiLoading(true);
    setAiAdvice(null);
    try {
      const sessionId = localStorage.getItem("tourlink_session") || "";
      const res = await fetch(`${AI_URL}?action=logistics`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({
          type: form.type,
          routeFrom: form.routeFrom,
          routeTo: form.routeTo,
          dateDepart: form.dateDepart,
          dateReturn: form.dateReturn,
          personRole: form.personRole,
          personCount: 1,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      setAiAdvice(data.answer || "Не удалось получить совет.");
    } catch {
      setAiAdvice("Ошибка соединения. Попробуйте ещё раз.");
    } finally {
      setAiLoading(false);
    }
  };

  const suggestFromProject = async () => {
    if (!projectCity && !projectDateStart) return;
    setAiSuggestLoading(true);
    setAiSuggest(null);
    try {
      const sessionId = localStorage.getItem("tourlink_session") || "";
      const res = await fetch(`${AI_URL}?action=logistics`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({
          type: "plan",
          routeTo: projectCity,
          dateDepart: projectDateStart,
          dateReturn: projectDateEnd,
          personRole: projectArtist ? `Артист: ${projectArtist}` : "Команда тура",
          venue: projectVenue,
          notes: `Планирование логистики для концерта${projectArtist ? ` ${projectArtist}` : ""}${projectVenue ? ` в ${projectVenue}` : ""} в городе ${projectCity}`,
        }),
      });
      const data = await res.json();
      setAiSuggest(data.answer || "Не удалось получить предложения.");
      setTimeout(() => suggestRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    } catch {
      setAiSuggest("Ошибка соединения. Попробуйте ещё раз.");
    } finally {
      setAiSuggestLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setAiAdvice(null);
    setAiSuggest(null);
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
    setAiAdvice(null);
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
        <div className="flex items-center gap-2">
          {(projectCity || projectDateStart) && (
            <button
              onClick={suggestFromProject}
              disabled={aiSuggestLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-50 transition-all"
            >
              {aiSuggestLoading
                ? <Icon name="Loader2" size={15} className="animate-spin" />
                : <Icon name="Sparkles" size={15} />
              }
              {aiSuggestLoading ? "Анализирую..." : "Спланировать ИИ"}
            </button>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 transition-opacity"
          >
            <Icon name="Plus" size={15} />Добавить
          </button>
        </div>
      </div>

      {/* AI-план логистики всего концерта */}
      {(aiSuggest || aiSuggestLoading) && (
        <div ref={suggestRef} className="rounded-2xl border border-neon-cyan/25 bg-gradient-to-br from-neon-cyan/5 to-neon-purple/5 overflow-hidden animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center shrink-0">
              <Icon name="Sparkles" size={15} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">План логистики от ИИ</p>
              <p className="text-white/40 text-xs">
                {projectArtist && `${projectArtist} · `}{projectCity}{projectDateStart && ` · ${new Date(projectDateStart).toLocaleDateString("ru", { day: "numeric", month: "long" })}`}
              </p>
            </div>
            <button onClick={() => setAiSuggest(null)} className="text-white/20 hover:text-white/50 transition-colors">
              <Icon name="X" size={14} />
            </button>
          </div>
          <div className="px-4 py-4">
            {aiSuggestLoading ? (
              <div className="flex items-center gap-3 text-white/40 text-sm">
                <div className="w-4 h-4 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
                ИИ анализирует маршрут и составляет план...
              </div>
            ) : (
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{aiSuggest}</p>
            )}
          </div>
          {aiSuggest && (
            <div className="px-4 pb-4">
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-neon-purple/20 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/30 transition-all"
              >
                <Icon name="Plus" size={14} />
                Добавить позицию логистики
              </button>
            </div>
          )}
        </div>
      )}

      {/* Сводка */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: "Users",       label: "Позиций",     value: items.length,         color: "text-white/60" },
            { icon: "AlertCircle", label: "Нужно купить",value: byStatus("needed"),    color: "text-neon-pink" },
            { icon: "CheckCircle", label: "Подтверждено",value: byStatus("confirmed"), color: "text-neon-green" },
            { icon: "Wallet",      label: "Итого",        value: fmt(totalPrice),       color: "text-neon-cyan" },
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
        <LogisticsForm
          form={form}
          setForm={setForm}
          editId={editId}
          saving={saving}
          projectId={projectId}
          aiLoading={aiLoading}
          aiAdvice={aiAdvice}
          onAskAI={askAI}
          onClearAI={() => setAiAdvice(null)}
          onSave={save}
          onCancel={() => setShowForm(false)}
        />
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
          {filtered.map(item => (
            <LogisticsItem
              key={item.id}
              item={item}
              onEdit={openEdit}
              onRemove={remove}
              onQuickStatus={quickStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

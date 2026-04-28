import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { PROJECTS_URL, STATUS_CONFIG, fmt, type Project } from "@/hooks/useProjects";
import ProjectDetailPage from "@/components/projects/ProjectDetailPage";
import CreateProjectModal from "@/components/projects/CreateProjectModal";

interface DashboardToursTabProps {
  activeTab: "tours" | "history";
  onNavigate?: (page: string) => void;
}

export default function DashboardToursTab({ activeTab, onNavigate }: DashboardToursTabProps) {
  const { user } = useAuth();
  const [tours, setTours] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTourId, setOpenTourId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=list&user_id=${user.id}`);
      const data = await res.json();
      // Только туры — проекты с типом "tour"
      setTours((data.projects || []).filter((p: Project) => p.projectType === "tour"));
    } catch { setTours([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  if (openTourId) {
    return (
      <ProjectDetailPage
        projectId={openTourId}
        onBack={() => { setOpenTourId(null); load(); }}
        onOpenChat={onNavigate ? (convId) => onNavigate(`chat:${convId}`) : undefined}
      />
    );
  }

  if (activeTab === "history") {
    return (
      <div className="animate-fade-in">
        <h2 className="font-oswald font-bold text-2xl text-white mb-6">История взаимодействий</h2>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-14 animate-pulse" />)}</div>
        ) : tours.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl">
            <Icon name="Clock" size={40} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 font-oswald text-lg">Нет завершённых туров</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {["Тур", "Артист", "Даты", "Статус", "Бюджет"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tours.map((tour, i) => (
                  <tr key={tour.id}
                    className={`border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer ${i === tours.length - 1 ? "border-0" : ""}`}
                    onClick={() => setOpenTourId(tour.id)}>
                    <td className="px-5 py-4"><span className="font-medium text-white text-sm">{tour.title}</span></td>
                    <td className="px-5 py-4 text-neon-cyan text-sm">{tour.artist || "—"}</td>
                    <td className="px-5 py-4 text-white/50 text-sm">
                      {tour.dateStart ? new Date(tour.dateStart).toLocaleDateString("ru", { day: "numeric", month: "short" }) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={`text-xs border ${STATUS_CONFIG[tour.status]?.cls || ""}`}>
                        {STATUS_CONFIG[tour.status]?.label || tour.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-neon-cyan font-medium text-sm">
                      {tour.totalIncomePlan > 0 ? fmt(tour.totalIncomePlan) + " ₽" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Мои туры ──────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-oswald font-bold text-2xl text-white">Мои туры</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm">
            <Icon name="Plus" size={16} />Новый тур
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate("projects")}
              className="flex items-center gap-2 px-4 py-2.5 glass text-white/60 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm">
              <Icon name="FolderOpen" size={16} />Все проекты
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {tours.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2">
          {[
            { icon: "Route",       label: "Всего туров",    value: tours.length,                                          color: "text-neon-purple" },
            { icon: "CheckCircle", label: "Завершено",      value: tours.filter(t => t.status === "completed").length,     color: "text-neon-green" },
            { icon: "TrendingUp",  label: "Доход (план)",   value: fmt(tours.reduce((s,t) => s+t.totalIncomePlan, 0))+" ₽", color: "text-neon-cyan" },
            { icon: "BarChart3",   label: "Прибыль (план)", value: fmt(tours.reduce((s,t) => s+t.finance.profitPlan, 0))+" ₽", color: "text-neon-pink" },
          ].map((s, i) => (
            <div key={i} className="glass rounded-2xl p-4 text-center">
              <Icon name={s.icon} size={18} className={`${s.color} mx-auto mb-1.5`} />
              <div className={`font-oswald font-bold text-xl ${s.color}`}>{s.value}</div>
              <div className="text-white/35 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-24 animate-pulse" />)}</div>
      ) : tours.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl">
          <Icon name="Route" size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-lg font-oswald">Туров пока нет</p>
          <p className="text-white/25 text-sm mt-1 mb-5">Создайте первый тур — это работает как проект с площадками и бюджетом</p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90">
            <Icon name="Plus" size={16} />Создать первый тур
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tours.map(tour => (
            <div key={tour.id}
              className="glass rounded-2xl p-5 hover:border-neon-purple/20 border border-transparent transition-all cursor-pointer hover-lift"
              onClick={() => setOpenTourId(tour.id)}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neon-purple/15 flex items-center justify-center shrink-0">
                    <Icon name="Route" size={20} className="text-neon-purple" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-oswald font-semibold text-white text-lg">{tour.title}</h3>
                      <Badge className={`text-xs border ${STATUS_CONFIG[tour.status]?.cls || ""}`}>
                        {STATUS_CONFIG[tour.status]?.label || tour.status}
                      </Badge>
                    </div>
                    {tour.artist && <p className="text-neon-cyan text-sm">{tour.artist}</p>}
                    <p className="text-white/35 text-xs mt-0.5">
                      {tour.dateStart ? new Date(tour.dateStart).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" }) : "Дата не указана"}
                      {tour.city && ` · ${tour.city}`}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {tour.totalIncomePlan > 0 && (
                    <>
                      <p className="font-oswald font-bold text-xl gradient-text">{fmt(tour.totalIncomePlan)} ₽</p>
                      <p className="text-white/30 text-xs">доход (план)</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
          defaultType="tour"
        />
      )}
    </div>
  );
}
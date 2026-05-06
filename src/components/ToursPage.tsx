import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { PROJECTS_URL, STATUS_CONFIG, fmt, type Project } from "@/hooks/useProjects";
import ProjectDetailPage from "@/components/projects/ProjectDetailPage";
import CreateProjectModal from "@/components/projects/CreateProjectModal";

export default function ToursPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user } = useAuth();
  const [tours, setTours] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTourId, setOpenTourId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=list&user_id=${user.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
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

  // Не авторизован — публичная витрина
  if (!user) {
    return (
      <div className="min-h-screen pt-20">
        <div className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 gradient-bg-purple opacity-30" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40 mb-4">Управление турами</Badge>
            <h1 className="font-oswald font-bold text-5xl sm:text-6xl text-white uppercase mb-4">
              Проекты <span className="gradient-text">туров</span>
            </h1>
            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
              Создавайте туры, бронируйте площадки, управляйте бюджетом — всё в одном месте
            </p>
            <button
              onClick={() => onNavigate?.("login")}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold text-lg rounded-xl hover:opacity-90 transition-opacity"
            >
              <Icon name="LogIn" size={20} />Войти и начать
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center shrink-0">
            <Icon name="Route" size={20} className="text-neon-purple" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-oswald font-bold text-2xl text-white uppercase leading-none">Мои <span className="gradient-text">туры</span></h2>
              <Badge className="bg-neon-purple/15 text-neon-purple border-neon-purple/30 text-[10px] py-0 px-2">{tours.length}</Badge>
            </div>
            <p className="text-white/45 text-xs mt-0.5">Гастроли, площадки и финансы в одном месте</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm">
            <Icon name="Plus" size={16} />Новый тур
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate("projects")}
              className="flex items-center gap-2 px-3 py-2 glass text-white/60 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-all text-sm">
              <Icon name="FolderOpen" size={16} />Все проекты
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {tours.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: "Route",       label: "Всего туров",    value: tours.length,                                             color: "text-neon-purple" },
            { icon: "CheckCircle", label: "Завершено",      value: tours.filter(t => t.status === "completed").length,        color: "text-neon-green" },
            { icon: "TrendingUp",  label: "Доход (план)",   value: fmt(tours.reduce((s, t) => s + t.totalIncomePlan, 0)) + " ₽", color: "text-neon-cyan" },
            { icon: "BarChart3",   label: "Прибыль (план)", value: fmt(tours.reduce((s, t) => s + t.finance.profitPlan, 0)) + " ₽", color: "text-neon-pink" },
          ].map((s, i) => (
            <div key={i} className="glass rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon name={s.icon} size={12} className={s.color} />
                <span className="text-white/45 text-[11px]">{s.label}</span>
              </div>
              <p className={`font-oswald font-bold text-base ${s.color} leading-tight`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl h-24 animate-pulse" />)}</div>
      ) : tours.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl">
          <Icon name="Route" size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-lg font-oswald">Туров пока нет</p>
          <p className="text-white/25 text-sm mt-1 mb-5">Создайте первый тур — площадки, бюджет и задачи в одном месте</p>
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
                      {tour.dateStart
                        ? new Date(tour.dateStart).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" })
                        : "Дата не указана"}
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
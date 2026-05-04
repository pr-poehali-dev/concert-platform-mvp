import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { PROJECTS_URL, STATUS_CONFIG, fmt, type Project } from "@/hooks/useProjects";
import { useNotifications } from "@/context/NotificationsContext";
import CreateProjectModal from "./CreateProjectModal";
import ProjectDetailPage from "./ProjectDetailPage";

export default function ProjectsPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user } = useAuth();
  const { unreadByType } = useNotifications();
  const totalBookingUnread = unreadByType("booking");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [openProjectId, setOpenProjectId] = useState<string|null>(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    if(!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=list&user_id=${user.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProjects(data.projects||[]);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{load();},[user]);

  if(openProjectId) return (
    <ProjectDetailPage
      projectId={openProjectId}
      onBack={()=>{setOpenProjectId(null);load();}}
      onOpenChat={onNavigate ? (convId) => onNavigate(`chat:${convId}`) : undefined}
    />
  );

  const filtered = filter==="all" ? projects : projects.filter(p=>p.status===filter);

  return (
    <div className="min-h-screen pt-2">
      {/* Hero — компактная шапка */}
      <div className="relative py-4 overflow-hidden">
        <div className="absolute inset-0 gradient-bg-purple opacity-25" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center shrink-0">
                <Icon name="FolderOpen" size={20} className="text-neon-purple"/>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-oswald font-bold text-2xl text-white uppercase leading-none">
                    Мои <span className="gradient-text">Проекты</span>
                  </h1>
                  <Badge className="bg-neon-purple/15 text-neon-purple border-neon-purple/30 text-[10px] py-0 px-2">Организатор</Badge>
                </div>
                <p className="text-white/45 text-xs mt-0.5">Управление бюджетами, P&L и финансовая отчётность</p>
              </div>
            </div>
            <button onClick={()=>setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm">
              <Icon name="Plus" size={16}/>Новый проект
            </button>
          </div>

          {/* Сводка */}
          {projects.length>0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              {[
                {icon:"FolderOpen",label:"Всего проектов",val:projects.length,color:"text-neon-purple"},
                {icon:"TrendingUp",label:"Доход (план)",val:fmt(projects.reduce((s,p)=>s+p.totalIncomePlan,0))+" ₽",color:"text-neon-green"},
                {icon:"TrendingDown",label:"Расходы (план)",val:fmt(projects.reduce((s,p)=>s+p.totalExpensesPlan,0))+" ₽",color:"text-neon-pink"},
                {icon:"BarChart3",label:"Прибыль (план)",val:fmt(projects.reduce((s,p)=>s+p.finance.profitPlan,0))+" ₽",color:projects.reduce((s,p)=>s+p.finance.profitPlan,0)>=0?"text-neon-green":"text-neon-pink"},
              ].map((s,i)=>(
                <div key={i} className="glass rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon name={s.icon} size={12} className={s.color}/>
                    <span className="text-white/45 text-[11px]">{s.label}</span>
                  </div>
                  <p className={`font-oswald font-bold text-base ${s.color} leading-tight`}>{s.val}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-24">
        {/* Фильтры */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[["all","Все"],["planning","Планируется"],["active","Активные"],["completed","Завершённые"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)}
              className={`px-4 py-2 rounded-xl text-sm border transition-all ${filter===v?"bg-neon-purple/20 text-neon-purple border-neon-purple/40":"glass text-white/50 border-white/10 hover:border-white/25 hover:text-white"}`}>
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i=><div key={i} className="glass rounded-2xl h-56 animate-pulse"/>)}
          </div>
        ) : filtered.length===0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <Icon name="FolderOpen" size={48} className="text-white/20 mx-auto mb-4"/>
            <p className="text-white/40 text-lg font-oswald">{filter==="all"?"Нет проектов":"Нет проектов с таким статусом"}</p>
            {filter==="all" && (
              <button onClick={()=>setShowCreate(true)}
                className="mt-5 px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity">
                Создать первый проект
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(p=>{
              const f = p.finance;
              const profitPositive = f.profitPlan >= 0;
              const overdue = p.hasOverdueTasks;
              return (
                <div key={p.id} onClick={()=>setOpenProjectId(p.id)}
                  className={`relative glass rounded-2xl p-5 cursor-pointer hover-lift group transition-all border hover:border-neon-purple/20 ${overdue ? "border-neon-pink/40 animate-pulse-border" : "border-white/5"}`}>
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={`text-xs border shrink-0 ${STATUS_CONFIG[p.status]?.color}`}>
                          {STATUS_CONFIG[p.status]?.label}
                        </Badge>
                        <span className="text-white/30 text-xs">{p.projectType==="single"?"Концерт":"Тур"}</span>
                        {p.isPartner && (
                          <span className="flex items-center gap-1 text-neon-cyan text-[10px] font-medium border border-neon-cyan/25 bg-neon-cyan/8 px-1.5 py-0.5 rounded">
                            <Icon name="Handshake" size={10}/>Партнёрский
                          </span>
                        )}
                        {overdue && (
                          <span className="flex items-center gap-1 text-neon-pink text-xs font-medium animate-pulse">
                            <Icon name="AlertTriangle" size={11}/>просрочено
                          </span>
                        )}
                      </div>
                      <h3 className="font-oswald font-bold text-xl text-white group-hover:text-neon-purple transition-colors truncate">{p.title}</h3>
                      {p.artist && <p className="text-neon-cyan text-sm">{p.artist}</p>}
                      {p.isPartner && p.ownerName && (
                        <p className="text-white/30 text-xs flex items-center gap-1 mt-0.5">
                          <Icon name="User" size={10}/>от {p.ownerName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-1">
                      {totalBookingUnread > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neon-pink text-white shadow-md shadow-neon-pink/30 min-w-[18px] text-center animate-pulse">
                          {totalBookingUnread > 9 ? "9+" : totalBookingUnread}
                        </span>
                      )}
                      <Icon name="ChevronRight" size={16} className="text-white/20 group-hover:text-neon-purple transition-colors"/>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-white/35 text-xs mb-4 flex-wrap">
                    {p.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={11}/>{p.city}</span>}
                    {p.dateStart && <span className="flex items-center gap-1"><Icon name="Calendar" size={11}/>{p.dateStart}</span>}
                  </div>

                  {/* Финансовые метрики */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/40">Доход план</span>
                      <span className="text-neon-green font-medium">{fmt(p.totalIncomePlan)} ₽</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/40">Расходы план</span>
                      <span className="text-neon-pink font-medium">{fmt(p.totalExpensesPlan)} ₽</span>
                    </div>
                    {f.taxPlan>0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/40">{f.taxLabel}</span>
                        <span className="text-neon-cyan font-medium">−{fmt(f.taxPlan)} ₽</span>
                      </div>
                    )}
                    <div className={`flex justify-between items-center pt-2 border-t border-white/10`}>
                      <span className="text-white text-sm font-medium">Чистая прибыль</span>
                      <span className={`font-oswald font-bold text-lg ${profitPositive?"text-neon-green":"text-neon-pink"}`}>
                        {profitPositive?"+":""}{fmt(f.profitPlan)} ₽
                      </span>
                    </div>
                    {/* Progress bar */}
                    {p.totalIncomePlan>0 && (
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${profitPositive?"bg-gradient-to-r from-neon-purple to-neon-green":"bg-neon-pink"}`}
                          style={{width:`${Math.min(100,Math.max(0,(f.profitPlan/p.totalIncomePlan*100)))}%`}}/>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateProjectModal
        open={showCreate}
        onClose={()=>setShowCreate(false)}
        onCreated={id=>{setShowCreate(false);setOpenProjectId(id);load();}}
      />
    </div>
  );
}
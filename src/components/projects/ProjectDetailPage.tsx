import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL, type Project, type Expense, type IncomeLine, recalcFinance } from "@/hooks/useProjects";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useEffect } from "react";
import ProjectDetailHeader from "./ProjectDetailHeader";
import ProjectBudgetTab from "./ProjectBudgetTab";
import ProjectIncomeAndSummaryTab from "./ProjectIncomeAndSummaryTab";
import ProjectVenueTab from "@/components/projects/ProjectVenueTab";
import ProjectCrmTab from "@/components/projects/ProjectCrmTab";
import DashboardCompanyTab from "@/components/dashboard/DashboardCompanyTab";
import ProjectDocumentsTab from "@/components/projects/ProjectDocumentsTab";
import ProjectMembersTab from "@/components/projects/ProjectMembersTab";
import ProjectLogisticsTab from "@/components/projects/ProjectLogisticsTab";
import ProjectTicketsTab from "@/components/projects/ProjectTicketsTab";

interface Props { projectId: string; onBack: () => void; onOpenChat?: (conversationId: string) => void; }

export default function ProjectDetailPage({ projectId, onBack, onOpenChat }: Props) {
  const { user } = useAuth();
  const { unreadByPage, markReadByPage } = useNotifications();
  const [project, setProject] = useState<Project|null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"budget"|"income"|"summary"|"venue"|"crm"|"logistics"|"company"|"documents"|"members">("budget");
  const [saving, setSaving] = useState<string|null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=detail&project_id=${projectId}&user_id=${user?.id || ""}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProject(data.project || null);
    } catch {
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, user?.id]);

  useEffect(()=>{load();},[load]);

  const api = async (action:string, body:object) => {
    setSaving(action);
    const res = await fetch(`${PROJECTS_URL}?action=${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId: user?.id, ...body})});
    const data = await res.json();
    setSaving(null);
    return data;
  };

  const updateField = async (key:string, val:unknown) => {
    await api("update",{projectId,projectType:project?.projectType,...{[key]:val}});
    setProject(p=>p?{...p,[key]:val}:p);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`${PROJECTS_URL}?action=delete`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId, userId: user?.id})});
    setDeleting(false);
    onBack();
  };

  // Expenses
  const addExpense = async () => {
    const data = await api("add_expense",{projectId,category:"Прочее",title:"Новая статья",amountPlan:0,amountFact:0});
    if(data.id) load();
  };
  const updateExpense = async (id:string, fields:Partial<Expense>) => {
    await api("update_expense",{id,...fields});
    setProject(p=>{
      if(!p||!p.expenses) return p;
      const expenses = p.expenses.map(e=>e.id===id?{...e,...fields}:e);
      const tp = expenses.reduce((s,e)=>s+e.amountPlan,0);
      const tf = expenses.reduce((s,e)=>s+e.amountFact,0);
      const finance = recalcFinance(p.totalIncomePlan, p.totalIncomeFact, tp, tf, p.taxSystem);
      return {...p,expenses,totalExpensesPlan:tp,totalExpensesFact:tf,finance};
    });
  };
  const deleteExpense = async (id:string) => {
    await api("delete_expense",{id});
    setProject(p=>{
      if(!p||!p.expenses) return p;
      const expenses = p.expenses.filter(e=>e.id!==id);
      return {...p,expenses};
    });
  };

  // Income
  const addIncome = async () => {
    await api("add_income",{projectId,category:"Стандарт",ticketCount:0,ticketPrice:0,soldCount:0});
    load();
  };
  const updateIncome = async (id:string, fields:Partial<IncomeLine>) => {
    await api("update_income",{id,...fields});
    setProject(p=>{
      if(!p||!p.incomeLines) return p;
      const incomeLines = p.incomeLines.map(i=>{
        if(i.id!==id) return i;
        const merged = {...i,...fields};
        return {
          ...merged,
          totalPlan: merged.ticketCount * merged.ticketPrice,
          totalFact: merged.soldCount  * merged.ticketPrice,
        };
      });
      const tp = incomeLines.reduce((s,i)=>s+i.totalPlan,0);
      const tf = incomeLines.reduce((s,i)=>s+i.totalFact,0);
      const finance = recalcFinance(tp, tf, p.totalExpensesPlan, p.totalExpensesFact, p.taxSystem);
      return {...p,incomeLines,totalIncomePlan:tp,totalIncomeFact:tf,finance};
    });
  };
  const deleteIncome = async (id:string) => {
    await api("delete_income",{id});
    setProject(p=>{
      if(!p||!p.incomeLines) return p;
      return {...p,incomeLines:p.incomeLines.filter(i=>i.id!==id)};
    });
  };

  if(loading) return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <Icon name="Loader2" size={32} className="text-white/30 animate-spin" />
    </div>
  );
  if(!project) return (
    <div className="min-h-screen pt-20 flex items-center justify-center text-white/30">Проект не найден</div>
  );

  const f = project.finance;
  const expPlan = project.totalExpensesPlan, expFact = project.totalExpensesFact;
  const incPlan = project.totalIncomePlan, incFact = project.totalIncomeFact;
  const taxPlan = f.taxPlan, taxFact = f.taxFact;
  const profitPlan = f.profitPlan, profitFact = f.profitFact;
  const isOwner = project.userId === user?.id;

  // Права доступа для сотрудников
  const ap = user?.accessPermissions;
  const canViewExpenses = !user?.isEmployee || (ap?.canViewExpenses ?? true);
  const canViewIncome   = !user?.isEmployee || (ap?.canViewIncome   ?? true);
  const canViewSummary  = !user?.isEmployee || (ap?.canViewSummary  ?? true);
  const canEditExpenses = !user?.isEmployee || (ap?.canEditExpenses ?? true);
  const canEditIncome   = !user?.isEmployee || (ap?.canEditIncome   ?? true);

  const ALL_TABS = [
    {id:"budget",    label:"Бюджет расходов", icon:"TrendingDown",  visible: canViewExpenses,   page:""},
    {id:"income",    label:"Доходы",          icon:"TrendingUp",    visible: canViewIncome,     page:""},
    {id:"summary",   label:"Итог / P&L",      icon:"BarChart3",     visible: canViewSummary,    page:""},
    {id:"venue",     label:"Площадка",        icon:"Building2",     visible: true,              page:"booking"},
    {id:"crm",       label:"Задачи",          icon:"ClipboardList", visible: true,              page:"projects"},
    {id:"logistics", label:"Логистика",       icon:"Briefcase",     visible: true,              page:""},
    {id:"documents", label:"Документы",       icon:"FileArchive",   visible: true,              page:""},
    {id:"members",   label:"Участники",       icon:"UserCheck",     visible: true,              page:""},
    {id:"tickets",   label:"Билеты",           icon:"Ticket",        visible: true,              page:""},
    {id:"company",   label:"Компания",         icon:"Building2",     visible: !user?.isEmployee, page:""},
  ] as const;
  const TABS = ALL_TABS.filter(t => t.visible);

  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <ProjectDetailHeader
        project={project}
        exportOpen={exportOpen}
        onBack={onBack}
        onDeleteClick={() => setConfirmDelete(true)}
        onExportToggle={() => setExportOpen(o => !o)}
        onExportClose={() => setExportOpen(false)}
        onStatusChange={v => updateField("status", v)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 glass rounded-xl p-1 w-fit flex-wrap">
          {TABS.map(t=>{
            const badge = t.page ? unreadByPage(t.page) : 0;
            return (
            <button key={t.id} onClick={()=>{ setActiveTab(t.id); if(t.page) markReadByPage(t.page); }}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-oswald font-medium transition-all ${activeTab===t.id?"bg-neon-purple text-white":"text-white/50 hover:text-white"}`}>
              <Icon name={t.icon} size={15}/>{t.label}
              {badge > 0 && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neon-pink text-white shadow-md shadow-neon-pink/30 min-w-[18px] text-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
            );
          })}
        </div>

        {/* ── BUDGET ── */}
        {activeTab==="budget" && canViewExpenses && (
          <ProjectBudgetTab
            project={project}
            expPlan={expPlan}
            expFact={expFact}
            onAddExpense={canEditExpenses ? addExpense : undefined}
            onUpdateExpense={canEditExpenses ? updateExpense : undefined}
            onDeleteExpense={canEditExpenses ? deleteExpense : undefined}
          />
        )}

        {/* ── INCOME ── */}
        {activeTab==="income" && canViewIncome && (
          <ProjectIncomeAndSummaryTab
            activeTab="income"
            project={project}
            expPlan={expPlan} expFact={expFact}
            incPlan={incPlan} incFact={incFact}
            taxPlan={taxPlan} taxFact={taxFact}
            profitPlan={profitPlan} profitFact={profitFact}
            onAddIncome={canEditIncome ? addIncome : undefined}
            onUpdateIncome={canEditIncome ? updateIncome : undefined}
            onDeleteIncome={canEditIncome ? deleteIncome : undefined}
            onUpdateTaxSystem={!user?.isEmployee ? v => updateField("taxSystem", v) : undefined}
          />
        )}

        {/* ── SUMMARY P&L ── */}
        {activeTab==="summary" && canViewSummary && (
          <ProjectIncomeAndSummaryTab
            activeTab="summary"
            project={project}
            expPlan={expPlan} expFact={expFact}
            incPlan={incPlan} incFact={incFact}
            taxPlan={taxPlan} taxFact={taxFact}
            profitPlan={profitPlan} profitFact={profitFact}
            onAddIncome={canEditIncome ? addIncome : undefined}
            onUpdateIncome={canEditIncome ? updateIncome : undefined}
            onDeleteIncome={canEditIncome ? deleteIncome : undefined}
            onUpdateTaxSystem={!user?.isEmployee ? v => updateField("taxSystem", v) : undefined}
          />
        )}

        {/* ── VENUE ── */}
        {activeTab==="venue" && (
          <ProjectVenueTab
            projectId={projectId}
            onOpenChat={onOpenChat}
            projectCity={project.city}
            projectDateStart={project.dateStart || ""}
            projectArtist={project.artist || ""}
          />
        )}

        {/* ── CRM ЗАДАЧИ ── */}
        {activeTab==="crm" && (
          <ProjectCrmTab projectId={projectId} />
        )}

        {/* ── ЛОГИСТИКА ── */}
        {activeTab==="logistics" && (
          <ProjectLogisticsTab
            projectId={projectId}
            projectCity={project.city}
            projectDateStart={project.dateStart || ""}
            projectArtist={project.artist || ""}
            projectVenue={project.venueName || ""}
            projectDateEnd={project.dateEnd || ""}
          />
        )}

        {/* ── ДОКУМЕНТЫ ── */}
        {activeTab==="documents" && (
          <ProjectDocumentsTab projectId={projectId} />
        )}

        {/* ── УЧАСТНИКИ ── */}
        {activeTab==="members" && (
          <ProjectMembersTab projectId={projectId} isOwner={isOwner} />
        )}

        {/* ── БИЛЕТЫ ── */}
        {activeTab==="tickets" && (
          <ProjectTicketsTab projectId={projectId} />
        )}

        {/* ── КОМПАНИЯ ── */}
        {activeTab==="company" && (
          <DashboardCompanyTab />
        )}

        {saving && (
          <div className="fixed bottom-6 right-6 flex items-center gap-2 glass-strong px-4 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm">
            <Icon name="Loader2" size={14} className="animate-spin"/>Сохраняю...
          </div>
        )}
      </div>

      {/* Подтверждение удаления */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setConfirmDelete(false)}/>
          <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl p-6 border border-neon-pink/20 animate-scale-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-neon-pink/20 flex items-center justify-center">
                <Icon name="Trash2" size={18} className="text-neon-pink"/>
              </div>
              <h3 className="font-oswald font-bold text-white text-lg">Удалить проект?</h3>
            </div>
            <p className="text-white/50 text-sm mb-5">«{project.title}» будет удалён без возможности восстановления вместе со всеми расходами и доходами.</p>
            <div className="flex gap-3">
              <button onClick={()=>setConfirmDelete(false)}
                className="flex-1 py-2.5 glass rounded-xl text-white/60 hover:text-white text-sm transition-colors border border-white/10">
                Отмена
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-neon-pink/90 hover:bg-neon-pink text-white font-oswald font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting?<><Icon name="Loader2" size={14} className="animate-spin"/>Удаляю...</>:"Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
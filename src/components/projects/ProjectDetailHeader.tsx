import { useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, fmt, type Project } from "@/hooks/useProjects";
import { exportCSV, exportExcel, exportPDF, companyInfoFromUser } from "@/lib/exportProject";
import { useAuth } from "@/context/AuthContext";

interface Props {
  project: Project;
  exportOpen: boolean;
  onBack: () => void;
  onDeleteClick: () => void;
  onExportToggle: () => void;
  onExportClose: () => void;
  onStatusChange: (status: string) => void;
}

export default function ProjectDetailHeader({
  project, exportOpen, onBack, onDeleteClick, onExportToggle, onExportClose, onStatusChange,
}: Props) {
  const { user } = useAuth();
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        onExportClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen, onExportClose]);

  const expPlan = project.totalExpensesPlan, expFact = project.totalExpensesFact;
  const incPlan = project.totalIncomePlan, incFact = project.totalIncomeFact;
  const f = project.finance;
  const taxPlan = f.taxPlan, taxFact = f.taxFact;
  const profitPlan = f.profitPlan, profitFact = f.profitFact;

  return (
    <div className="relative py-10 overflow-hidden">
      <div className="absolute inset-0 gradient-bg-purple opacity-30" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
            <Icon name="ArrowLeft" size={16}/>Назад к проектам
          </button>

          <div className="flex items-center gap-2">
            {/* Delete button */}
            <button onClick={onDeleteClick}
              className="flex items-center gap-2 px-4 py-2 glass rounded-xl border border-white/10 hover:border-neon-pink/40 text-white/40 hover:text-neon-pink transition-all text-sm">
              <Icon name="Trash2" size={15}/>Удалить
            </button>

            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={onExportToggle}
                className="flex items-center gap-2 px-4 py-2 glass rounded-xl border border-white/15 hover:border-neon-purple/40 text-white/70 hover:text-white transition-all text-sm"
              >
                <Icon name="Download" size={15}/>
                Экспорт
                <Icon name="ChevronDown" size={14} className={`transition-transform ${exportOpen ? "rotate-180" : ""}`}/>
              </button>

              {exportOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 glass-strong rounded-xl border border-white/10 overflow-hidden z-50 animate-scale-in">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-white/40 text-xs uppercase tracking-wider">Скачать отчёт P&L</p>
                  </div>
                  {[
                    { icon: "FileText", label: "PDF (для печати)", color: "text-neon-pink", action: () => { exportPDF(project, user ? companyInfoFromUser(user) : undefined); onExportClose(); } },
                    { icon: "Table2", label: "Excel (.xls)", color: "text-neon-green", action: () => { exportExcel(project, user ? companyInfoFromUser(user) : undefined); onExportClose(); } },
                    { icon: "FileSpreadsheet", label: "CSV (таблица)", color: "text-neon-cyan", action: () => { exportCSV(project, user ? companyInfoFromUser(user) : undefined); onExportClose(); } },
                  ].map((opt, i) => (
                    <button key={i} onClick={opt.action}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                      <Icon name={opt.icon} size={16} className={opt.color}/>
                      <span className="text-white/80 text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="font-oswald font-bold text-3xl text-white">{project.title}</h1>
              <Badge className={`text-xs border ${STATUS_CONFIG[project.status]?.color}`}>
                {STATUS_CONFIG[project.status]?.label}
              </Badge>
              <Badge className="bg-white/10 text-white/50 border-white/10 text-xs">
                {project.projectType==="single"?"Концерт":"Тур"}
              </Badge>
            </div>
            {project.artist && <p className="text-neon-cyan text-sm">{project.artist}</p>}
            <div className="flex items-center gap-3 text-white/40 text-xs mt-1 flex-wrap">
              {project.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={11}/>{project.city}</span>}
              {project.venueName && <span className="flex items-center gap-1"><Icon name="Building2" size={11}/>{project.venueName}</span>}
              {project.dateStart && <span className="flex items-center gap-1"><Icon name="Calendar" size={11}/>{project.dateStart}{project.dateEnd&&project.dateEnd!==project.dateStart?" — "+project.dateEnd:""}</span>}
            </div>
          </div>
          {/* Статус */}
          <select value={project.status} onChange={e=>onStatusChange(e.target.value)}
            className="glass rounded-xl px-4 py-2 text-white outline-none border border-white/10 text-sm appearance-none bg-transparent">
            {Object.entries(STATUS_CONFIG).map(([v,c])=><option key={v} value={v} className="bg-gray-900">{c.label}</option>)}
          </select>
        </div>

        {/* KPI-карточки */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            {label:"Доход план", val:incPlan, fact:incFact, color:"text-neon-green", bg:"bg-neon-green/10"},
            {label:"Расходы план", val:expPlan, fact:expFact, color:"text-neon-pink", bg:"bg-neon-pink/10"},
            {label:"Налог", val:taxPlan, fact:taxFact, color:"text-neon-cyan", bg:"bg-neon-cyan/10"},
            {label:"Чистая прибыль", val:profitPlan, fact:profitFact, color:profitPlan>=0?"text-neon-green":"text-neon-pink", bg:profitPlan>=0?"bg-neon-green/10":"bg-neon-pink/10"},
          ].map((k,i)=>(
            <div key={i} className={`glass rounded-2xl p-4 ${k.bg}`}>
              <p className="text-white/40 text-xs mb-1">{k.label}</p>
              <p className={`font-oswald font-bold text-xl ${k.color}`}>{fmt(k.val)} ₽</p>
              <p className="text-white/30 text-xs mt-0.5">факт: {fmt(k.fact)} ₽</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

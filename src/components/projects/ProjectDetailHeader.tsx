import { useRef, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, fmt, type Project, PROJECTS_URL } from "@/hooks/useProjects";
import { exportCSV, exportExcel, exportPDF, companyInfoFromUser } from "@/lib/exportProject";
import { useAuth } from "@/context/AuthContext";

const PRESENTATION_URL = "https://functions.poehali.dev/3a1c12fb-cacd-4731-961b-2f37badc2c08";

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
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfStep, setPdfStep] = useState<"idle"|"ai"|"pdf">("idle");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfCopied, setPdfCopied] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfPrompt, setPdfPrompt] = useState("");

  const PDF_PRESETS = [
    { label: "Для инвесторов", text: "Акцентируй внимание на доходности и потенциале роста. Тон — деловой, убедительный." },
    { label: "Для партнёров", text: "Подчеркни масштаб проекта, охват аудитории и взаимные выгоды от сотрудничества." },
    { label: "Итоги для команды", text: "Расскажи об итогах проекта честно — что получилось, где отклонились от плана и что улучшить." },
    { label: "Спонсорам", text: "Опиши проект ярко и эмоционально. Покажи масштаб события и ценность для бренда спонсора." },
  ];

  const generatePdf = async () => {
    setPdfLoading(true);
    setPdfStep("ai");
    setPdfError(null);
    setPdfUrl(null);
    try {
      setPdfStep("pdf");
      const res = await fetch(`${PRESENTATION_URL}?action=project_html_pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, userId: user?.id || "", userPrompt: pdfPrompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Ошибка генерации");
      setPdfUrl(data.url);
    } catch (e: unknown) {
      setPdfError(e instanceof Error ? e.message : "Что-то пошло не так");
    } finally {
      setPdfLoading(false);
      setPdfStep("idle");
    }
  };

  const copyPdfLink = () => {
    if (!pdfUrl) return;
    navigator.clipboard.writeText(pdfUrl);
    setPdfCopied(true);
    setTimeout(() => setPdfCopied(false), 2000);
  };

  const closePdf = () => {
    setPdfOpen(false);
    setPdfUrl(null);
    setPdfError(null);
    setPdfCopied(false);
    setPdfPrompt("");
  };

  const createShareLink = async (showFiles: boolean) => {
    setShareLoading(true);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=create_share_link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, showFiles }),
      });
      const data = await res.json();
      if (data.linkId) {
        const url = `${window.location.origin}/?share=${data.linkId}`;
        setShareLink(url);
      }
    } finally {
      setShareLoading(false);
    }
  };

  const copyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const closeShare = () => {
    setShareOpen(false);
    setShareLink(null);
    setShareCopied(false);
  };

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
    <>
    <div className="relative py-10 overflow-hidden">
      <div className="absolute inset-0 gradient-bg-purple opacity-30" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
            <Icon name="ArrowLeft" size={16}/>Назад к проектам
          </button>

          <div className="flex items-center gap-2">
            {/* Share button */}
            <button onClick={() => setShareOpen(true)}
              className="flex items-center gap-2 px-4 py-2 glass rounded-xl border border-white/15 hover:border-neon-cyan/40 text-white/60 hover:text-neon-cyan transition-all text-sm">
              <Icon name="Share2" size={15}/>Поделиться
            </button>

            {/* Presentation PDF button */}
            <button onClick={() => { setPdfOpen(true); setPdfUrl(null); setPdfError(null); }}
              className="flex items-center gap-2 px-4 py-2 glass rounded-xl border border-white/15 hover:border-neon-purple/50 text-white/60 hover:text-neon-purple transition-all text-sm">
              <Icon name="Presentation" size={15}/>Презентация
            </button>

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

    {/* PDF Presentation modal */}
    {pdfOpen && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closePdf}>
        <div className="glass-strong rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-oswald font-bold text-xl text-white">Презентация проекта</h2>
            <button onClick={closePdf} className="text-white/30 hover:text-white transition-colors">
              <Icon name="X" size={20}/>
            </button>
          </div>

          {!pdfUrl && !pdfLoading && !pdfError && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { icon: "BarChart3", label: "Финансовое резюме", color: "text-neon-green" },
                  { icon: "Brain", label: "ИИ-аналитика", color: "text-neon-purple" },
                  { icon: "PieChart", label: "Расходы по статьям", color: "text-neon-pink" },
                  { icon: "Ticket", label: "Продажи билетов", color: "text-neon-cyan" },
                ].map((it, i) => (
                  <div key={i} className="flex items-center gap-2 glass rounded-lg px-3 py-2 border border-white/8">
                    <Icon name={it.icon} size={13} className={it.color}/>
                    <span className="text-white/60 text-xs">{it.label}</span>
                  </div>
                ))}
              </div>

              <div className="mb-3">
                <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Для кого презентация?</p>
                <div className="flex flex-wrap gap-2">
                  {PDF_PRESETS.map((p, i) => (
                    <button key={i}
                      onClick={() => setPdfPrompt(prev => prev === p.text ? "" : p.text)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${pdfPrompt === p.text ? "bg-neon-purple/20 border-neon-purple/50 text-neon-purple" : "glass border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <textarea
                  value={pdfPrompt}
                  onChange={e => setPdfPrompt(e.target.value)}
                  placeholder="Или напиши сам: для кого, какой тон, на что сделать акцент..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/80 text-sm placeholder-white/25 outline-none focus:border-neon-purple/40 resize-none transition-colors"
                />
              </div>

              <button
                onClick={generatePdf}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-purple/80 to-neon-cyan/60 text-white font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Сгенерировать PDF
              </button>
            </>
          )}

          {pdfLoading && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-neon-purple/10 flex items-center justify-center mx-auto">
                <Icon name="Loader2" size={28} className="text-neon-purple animate-spin"/>
              </div>
              <div>
                <p className="text-white font-medium">
                  {pdfStep === "ai" ? "ИИ анализирует проект..." : "Формирую PDF..."}
                </p>
                <p className="text-white/40 text-sm mt-1">
                  {pdfStep === "ai" ? "Готовлю аналитику и рекомендации" : "Генерирую документ и загружаю на сервер"}
                </p>
              </div>
            </div>
          )}

          {pdfError && (
            <div className="py-4 text-center space-y-4">
              <Icon name="AlertCircle" size={32} className="text-neon-pink mx-auto"/>
              <p className="text-neon-pink text-sm">{pdfError}</p>
              <button onClick={generatePdf} className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors">
                Попробовать ещё раз
              </button>
            </div>
          )}

          {pdfUrl && !pdfLoading && (
            <div className="space-y-4">
              <div className="glass rounded-xl p-4 border border-neon-green/20 bg-neon-green/5 flex items-center gap-3">
                <Icon name="CheckCircle2" size={20} className="text-neon-green shrink-0"/>
                <p className="text-white text-sm">Презентация готова!</p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/60 text-xs truncate">
                  {pdfUrl}
                </div>
                <button
                  onClick={copyPdfLink}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium shrink-0 transition-all ${pdfCopied ? "bg-neon-green/20 text-neon-green border border-neon-green/30" : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20"}`}
                >
                  {pdfCopied ? "Скопировано!" : "Копировать"}
                </button>
              </div>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-sm font-medium hover:bg-neon-purple/20 transition-colors">
                <Icon name="ExternalLink" size={15}/>Открыть PDF
              </a>
              <button onClick={() => { setPdfUrl(null); setPdfError(null); }}
                className="w-full text-white/30 hover:text-white/60 text-xs transition-colors">
                ← Сгенерировать заново
              </button>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Share modal */}
    {shareOpen && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeShare}>
        <div className="glass-strong rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-oswald font-bold text-xl text-white">Поделиться проектом</h2>
            <button onClick={closeShare} className="text-white/30 hover:text-white transition-colors">
              <Icon name="X" size={20} />
            </button>
          </div>

          {!shareLink ? (
            <>
              <p className="text-white/50 text-sm mb-5">
                Выберите, что будет видно по ссылке. Получатель не сможет ничего редактировать.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => createShareLink(false)}
                  disabled={shareLoading}
                  className="w-full flex items-center gap-4 p-4 glass rounded-xl border border-white/10 hover:border-neon-cyan/40 transition-all text-left group disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center shrink-0">
                    <Icon name="BarChart3" size={18} className="text-neon-cyan" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm group-hover:text-neon-cyan transition-colors">Без файлов</p>
                    <p className="text-white/40 text-xs">Только данные проекта: бюджет, доходы, P&L</p>
                  </div>
                </button>

                <button
                  onClick={() => createShareLink(true)}
                  disabled={shareLoading}
                  className="w-full flex items-center gap-4 p-4 glass rounded-xl border border-white/10 hover:border-neon-purple/40 transition-all text-left group disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center shrink-0">
                    <Icon name="FileArchive" size={18} className="text-neon-purple" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm group-hover:text-neon-purple transition-colors">С файлами</p>
                    <p className="text-white/40 text-xs">Данные проекта + все прикреплённые документы</p>
                  </div>
                </button>
              </div>

              {shareLoading && (
                <div className="flex items-center justify-center gap-2 mt-4 text-white/40 text-sm">
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  Создаю ссылку...
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-white/50 text-sm mb-4">Ссылка готова. Отправьте её — человек увидит проект без входа в кабинет.</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/70 text-sm truncate">
                  {shareLink}
                </div>
                <button
                  onClick={copyLink}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 ${shareCopied ? "bg-neon-green/20 text-neon-green border border-neon-green/30" : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20"}`}
                >
                  {shareCopied ? "Скопировано!" : "Копировать"}
                </button>
              </div>
              <button
                onClick={() => { setShareLink(null); }}
                className="mt-3 text-white/30 hover:text-white/60 text-xs transition-colors"
              >
                ← Создать другую ссылку
              </button>
            </>
          )}
        </div>
      </div>
    )}
    </>
  );
}
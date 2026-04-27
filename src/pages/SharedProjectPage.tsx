import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL, STATUS_CONFIG, fmt, type Project, type IncomeLine } from "@/hooks/useProjects";

interface Document {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface SharedData {
  project: Project & { documents?: Document[] };
  showFiles: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export default function SharedProjectPage() {
  const { linkId } = useParams<{ linkId: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!linkId) { setNotFound(true); setLoading(false); return; }
    fetch(`${PROJECTS_URL}?action=get_shared_project&link_id=${linkId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); }
        else { setData({ project: d.project, showFiles: d.showFiles }); }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [linkId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Icon name="Loader2" size={40} className="text-neon-purple animate-spin" />
    </div>
  );

  if (notFound || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-neon-pink/10 flex items-center justify-center">
        <Icon name="LinkOff" size={32} className="text-neon-pink/60" />
      </div>
      <h1 className="font-oswald font-bold text-2xl text-white">Ссылка недействительна</h1>
      <p className="text-white/40">Возможно, ссылка устарела или была удалена</p>
    </div>
  );

  const { project, showFiles } = data;
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
  const f = project.finance;

  const expPlan = project.totalExpensesPlan;
  const expFact = project.totalExpensesFact;
  const incPlan = project.totalIncomePlan;
  const incFact = project.totalIncomeFact;

  return (
    <div className="min-h-screen pb-16">
      {/* Top bar */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <span className="font-oswald font-bold text-lg text-white">GLOBAL LINK</span>
          <span className="text-white/30 text-xs">Только для просмотра</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header card */}
        <div className="glass rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="font-oswald font-bold text-2xl sm:text-3xl text-white mb-1">{project.title}</h1>
              <p className="text-neon-purple font-medium text-lg">{project.artist}</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${status.color}`}>
              {status.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            {project.city && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Icon name="MapPin" size={14} className="text-neon-cyan shrink-0" />
                {project.city}
              </div>
            )}
            {project.venueName && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Icon name="Building2" size={14} className="text-neon-purple shrink-0" />
                {project.venueName}
              </div>
            )}
            {project.dateStart && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Icon name="Calendar" size={14} className="text-neon-green shrink-0" />
                {new Date(project.dateStart).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })}
                {project.dateEnd && project.dateEnd !== project.dateStart && (
                  <> — {new Date(project.dateEnd).toLocaleDateString("ru", { day: "numeric", month: "long" })}</>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Icon name="Tag" size={14} className="text-white/30 shrink-0" />
              {project.projectType === "tour" ? "Тур" : "Разовое мероприятие"}
            </div>
          </div>

          {project.description && (
            <p className="mt-4 text-white/50 text-sm leading-relaxed border-t border-white/10 pt-4">
              {project.description}
            </p>
          )}
        </div>

        {/* Finance summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass rounded-xl p-4">
            <p className="text-white/40 text-xs mb-1">Расходы (план)</p>
            <p className="font-oswald font-bold text-white text-lg">{fmt(expPlan)} ₽</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-white/40 text-xs mb-1">Расходы (факт)</p>
            <p className="font-oswald font-bold text-neon-pink text-lg">{fmt(expFact)} ₽</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-white/40 text-xs mb-1">Доходы (план)</p>
            <p className="font-oswald font-bold text-white text-lg">{fmt(incPlan)} ₽</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-white/40 text-xs mb-1">Доходы (факт)</p>
            <p className="font-oswald font-bold text-neon-green text-lg">{fmt(incFact)} ₽</p>
          </div>
        </div>

        {/* P&L */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-oswald font-bold text-lg text-white mb-4 flex items-center gap-2">
            <Icon name="BarChart3" size={18} className="text-neon-purple" />
            Итог / P&L
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-white/40 text-xs mb-1">Прибыль (план)</p>
              <p className={`font-oswald font-bold text-xl ${f.profitPlan >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
                {fmt(f.profitPlan)} ₽
              </p>
            </div>
            <div>
              <p className="text-white/40 text-xs mb-1">Прибыль (факт)</p>
              <p className={`font-oswald font-bold text-xl ${f.profitFact >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
                {fmt(f.profitFact)} ₽
              </p>
            </div>
            {f.taxSystem !== "none" && (
              <div>
                <p className="text-white/40 text-xs mb-1">{f.taxLabel} (факт)</p>
                <p className="font-oswald font-bold text-xl text-white/60">{fmt(f.taxFact)} ₽</p>
              </div>
            )}
          </div>
        </div>

        {/* Expenses */}
        {project.expenses && project.expenses.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h2 className="font-oswald font-bold text-lg text-white mb-4 flex items-center gap-2">
              <Icon name="TrendingDown" size={18} className="text-neon-pink" />
              Расходы
            </h2>
            <div className="space-y-2">
              {project.expenses.map(exp => (
                <div key={exp.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm">{exp.title}</p>
                    <p className="text-white/30 text-xs">{exp.category}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-white text-sm font-medium">{fmt(exp.amountPlan)} ₽</p>
                    {exp.amountFact > 0 && (
                      <p className="text-neon-pink text-xs">{fmt(exp.amountFact)} ₽ факт</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Income lines */}
        {project.incomeLines && project.incomeLines.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h2 className="font-oswald font-bold text-lg text-white mb-4 flex items-center gap-2">
              <Icon name="TrendingUp" size={18} className="text-neon-green" />
              Доходы по билетам
            </h2>
            <div className="space-y-2">
              {project.incomeLines.map((line: IncomeLine) => (
                <div key={line.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm">{line.category}</p>
                    <p className="text-white/30 text-xs">
                      {line.ticketCount} шт × {fmt(line.ticketPrice)} ₽
                      {line.soldCount > 0 && ` · продано ${line.soldCount}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-white text-sm font-medium">{fmt(line.totalPlan)} ₽</p>
                    {line.totalFact > 0 && (
                      <p className="text-neon-green text-xs">{fmt(line.totalFact)} ₽ факт</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {showFiles && project.documents && project.documents.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h2 className="font-oswald font-bold text-lg text-white mb-4 flex items-center gap-2">
              <Icon name="FileArchive" size={18} className="text-neon-cyan" />
              Документы
            </h2>
            <div className="space-y-2">
              {project.documents.map(doc => {
                const isImg = IMAGE_MIMES.includes(doc.mimeType);
                return (
                  <a
                    key={doc.id}
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-neon-purple/10 flex items-center justify-center shrink-0">
                      <Icon name={isImg ? "Image" : "FileText"} size={16} className="text-neon-purple" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{doc.fileName}</p>
                      <p className="text-white/30 text-xs">{formatSize(doc.fileSize)}</p>
                    </div>
                    <Icon name="Download" size={14} className="text-white/30 shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-center text-white/15 text-xs pt-4">
          Документ сформирован в GLOBAL LINK · Только для просмотра
        </p>
      </div>
    </div>
  );
}

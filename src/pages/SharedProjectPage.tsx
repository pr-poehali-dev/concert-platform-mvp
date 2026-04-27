import { useEffect, useState } from "react";

const PROJECTS_URL = "https://functions.poehali.dev/d04caaa7-d9f2-4792-9dd8-ad5ff602223b";

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

function formatSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

const STATUS_LABEL: Record<string, string> = {
  planning: "Планируется",
  active: "Активный",
  completed: "Завершён",
  cancelled: "Отменён",
};

function getLinkIdFromUrl(): string {
  const fromPath = window.location.pathname.match(/\/share\/([a-f0-9]+)/);
  if (fromPath) return fromPath[1];
  const fromHash = window.location.hash.match(/\/share\/([a-f0-9]+)/);
  if (fromHash) return fromHash[1];
  return "";
}

export default function SharedProjectPage({ linkId: propLinkId }: { linkId?: string }) {
  const linkId = propLinkId || getLinkIdFromUrl();

  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);
  const [showFiles, setShowFiles] = useState(false);

  useEffect(() => {
    if (!linkId) {
      setErrorMsg("Не найден идентификатор ссылки");
      setStatus("error");
      return;
    }
    fetch(`${PROJECTS_URL}?action=get_shared_project&link_id=${linkId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setErrorMsg(d.error);
          setStatus("error");
        } else {
          setProject(d.project);
          setShowFiles(d.showFiles);
          setStatus("ok");
        }
      })
      .catch(e => {
        setErrorMsg(String(e));
        setStatus("error");
      });
  }, [linkId]);

  const bg: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0a1e 0%, #1a0e2e 50%, #0a1628 100%)",
    color: "#fff",
    fontFamily: "'Golos Text', sans-serif",
  };

  if (status === "loading") return (
    <div style={{ ...bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #a855f7", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Загрузка проекта...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (status === "error") return (
    <div style={{ ...bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Ссылка недействительна</h1>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>{errorMsg || "Возможно, ссылка устарела или была удалена"}</p>
    </div>
  );

  const f = project.finance || {};
  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  };

  return (
    <div style={bg}>
      {/* Top bar */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>GLOBAL LINK</span>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Только для просмотра</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px 64px" }}>

        {/* Header */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 4px" }}>{project.title}</h1>
              <p style={{ color: "#a855f7", fontSize: 18, margin: 0 }}>{project.artist}</p>
            </div>
            <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)" }}>
              {STATUS_LABEL[project.status] || project.status}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            {project.city && <span>📍 {project.city}</span>}
            {project.venueName && <span>🏛 {project.venueName}</span>}
            {project.dateStart && <span>📅 {project.dateStart}{project.dateEnd && project.dateEnd !== project.dateStart ? ` — ${project.dateEnd}` : ""}</span>}
            <span>{project.projectType === "tour" ? "🎵 Тур" : "🎤 Разовое мероприятие"}</span>
          </div>
          {project.description && (
            <p style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6 }}>
              {project.description}
            </p>
          )}
        </div>

        {/* Finance cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Доходы (план)", value: fmt(project.totalIncomePlan), color: "#fff" },
            { label: "Доходы (факт)", value: fmt(project.totalIncomeFact), color: "#4ade80" },
            { label: "Расходы (план)", value: fmt(project.totalExpensesPlan), color: "#fff" },
            { label: "Расходы (факт)", value: fmt(project.totalExpensesFact), color: "#f472b6" },
          ].map((c, i) => (
            <div key={i} style={{ ...card, padding: 16, marginBottom: 0 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{c.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: c.color, margin: 0 }}>{c.value} ₽</p>
            </div>
          ))}
        </div>

        {/* P&L */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📊 Итог / P&L</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Прибыль (план)</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: (f.profitPlan || 0) >= 0 ? "#4ade80" : "#f472b6", margin: 0 }}>{fmt(f.profitPlan || 0)} ₽</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Прибыль (факт)</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: (f.profitFact || 0) >= 0 ? "#4ade80" : "#f472b6", margin: 0 }}>{fmt(f.profitFact || 0)} ₽</p>
            </div>
            {f.taxSystem && f.taxSystem !== "none" && (
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{f.taxLabel} (факт)</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.5)", margin: 0 }}>{fmt(f.taxFact || 0)} ₽</p>
              </div>
            )}
          </div>
        </div>

        {/* Expenses */}
        {project.expenses && project.expenses.length > 0 && (
          <div style={card}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📉 Расходы</h2>
            {project.expenses.map((exp: { id: string; title: string; category: string; amountPlan: number; amountFact: number }) => (
              <div key={exp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14 }}>{exp.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{exp.category}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{fmt(exp.amountPlan)} ₽</p>
                  {exp.amountFact > 0 && <p style={{ margin: 0, fontSize: 11, color: "#f472b6" }}>{fmt(exp.amountFact)} ₽ факт</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Income */}
        {project.incomeLines && project.incomeLines.length > 0 && (
          <div style={card}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📈 Доходы по билетам</h2>
            {project.incomeLines.map((line: { id: string; category: string; ticketCount: number; ticketPrice: number; soldCount: number; totalPlan: number; totalFact: number }) => (
              <div key={line.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14 }}>{line.category}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{line.ticketCount} шт × {fmt(line.ticketPrice)} ₽{line.soldCount > 0 ? ` · продано ${line.soldCount}` : ""}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{fmt(line.totalPlan)} ₽</p>
                  {line.totalFact > 0 && <p style={{ margin: 0, fontSize: 11, color: "#4ade80" }}>{fmt(line.totalFact)} ₽ факт</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Documents */}
        {showFiles && project.documents && project.documents.length > 0 && (
          <div style={card}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📎 Документы</h2>
            {project.documents.map((doc: { id: string; fileName: string; fileUrl: string; fileSize: number }) => (
              <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", textDecoration: "none", color: "inherit" }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.fileName}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{formatSize(doc.fileSize)}</p>
                </div>
                <span style={{ fontSize: 12, color: "#a855f7" }}>Скачать ↓</span>
              </a>
            ))}
          </div>
        )}

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.15)", fontSize: 11, marginTop: 32 }}>
          Документ сформирован в GLOBAL LINK · Только для просмотра
        </p>
      </div>
    </div>
  );
}
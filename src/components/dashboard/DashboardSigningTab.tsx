import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { SIGN_URL, SESSION_KEY } from "./documents/docTypes";
import SignatureModal from "./documents/SignatureModal";

interface SignRequest {
  id: string;
  documentId: string;
  documentName: string;
  fileUrl: string;
  category: string;
  mimeType: string;
  senderName?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientEmail: string;
  counterpartyName: string;
  counterpartyRole?: string;
  status: "pending" | "signed" | "declined";
  createdAt: string;
  allSigned: boolean;
  signedCount: number;
  message?: string;
}

const session = () => localStorage.getItem(SESSION_KEY) || "";

const fakeDoc = (req: SignRequest) => ({
  id: req.documentId,
  name: req.documentName,
  fileUrl: req.fileUrl,
  category: req.category,
  categoryLabel: req.category,
  fileSize: 0,
  fileSizeHuman: "",
  mimeType: req.mimeType || "application/pdf",
  note: "",
  createdAt: req.createdAt,
});

const formatDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
};

// Группировка по контрагенту
function groupByCounterparty(requests: SignRequest[]): Record<string, SignRequest[]> {
  return requests.reduce((acc, req) => {
    const key = req.counterpartyName || req.recipientEmail || "Неизвестный";
    if (!acc[key]) acc[key] = [];
    acc[key].push(req);
    return acc;
  }, {} as Record<string, SignRequest[]>);
}

// Инициалы для аватара контрагента
function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || "").slice(0, 2).join("") || "?";
}

// Статус-бейдж
function StatusBadge({ req }: { req: SignRequest }) {
  if (req.allSigned)
    return <span className="flex items-center gap-1 text-xs text-neon-green bg-neon-green/10 border border-neon-green/20 px-2.5 py-1 rounded-full font-medium">
      <Icon name="ShieldCheck" size={11} />Все подписали
    </span>;
  if (req.status === "signed")
    return <span className="flex items-center gap-1 text-xs text-neon-green bg-neon-green/10 border border-neon-green/20 px-2.5 py-1 rounded-full">
      <Icon name="Check" size={11} />Подписан
    </span>;
  if (req.status === "declined")
    return <span className="text-xs text-neon-pink bg-neon-pink/10 border border-neon-pink/20 px-2.5 py-1 rounded-full">Отклонён</span>;
  return <span className="text-xs text-neon-purple bg-neon-purple/10 border border-neon-purple/20 px-2.5 py-1 rounded-full">Ожидает</span>;
}

// Кнопка скачать подписанный с двух сторон документ
function DownloadSignedBtn({ documentId, documentName }: { documentId: string; documentName: string }) {
  const [loading, setLoading] = useState(false);
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const r = await fetch(`${SIGN_URL}?action=download_signed&document_id=${documentId}`, {
        headers: { "X-Session-Id": session() },
      });
      const d = await r.json();
      if (d.url) window.open(d.url, "_blank");
    } catch { /* silent */ }
    finally { setLoading(false); }
  };
  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      title="Скачать документ с подписями обеих сторон"
      className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-green/10 border border-neon-green/25 text-neon-green text-xs font-oswald font-semibold rounded-lg hover:bg-neon-green/20 transition-all disabled:opacity-50 shrink-0"
    >
      {loading
        ? <><Icon name="Loader2" size={12} className="animate-spin" />Формирую...</>
        : <><Icon name="Download" size={12} />Скачать PDF</>}
    </button>
  );
}

// Секция контрагента
function CounterpartySection({
  name, requests, isIncoming, onSign, onRefresh,
}: {
  name: string;
  requests: SignRequest[];
  isIncoming: boolean;
  onSign?: (req: SignRequest) => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(true);
  const allDone = requests.every(r => r.allSigned || r.status !== "pending");
  const pendingCount = requests.filter(r => r.status === "pending" && !r.allSigned).length;

  return (
    <div className={`glass rounded-2xl overflow-hidden border transition-all ${allDone ? "border-neon-green/20" : "border-white/10"}`}>
      {/* Заголовок секции — контрагент */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-oswald font-bold text-sm shrink-0 ${
          allDone
            ? "bg-neon-green/15 border border-neon-green/30 text-neon-green"
            : "bg-neon-purple/10 border border-neon-purple/20 text-neon-purple"
        }`}>
          {allDone ? <Icon name="ShieldCheck" size={18} /> : initials(name)}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold text-sm truncate">{name}</p>
            {requests[0]?.counterpartyRole && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                requests[0].counterpartyRole === "venue"
                  ? "text-neon-cyan/70 border-neon-cyan/20 bg-neon-cyan/5"
                  : "text-neon-purple/70 border-neon-purple/20 bg-neon-purple/5"
              }`}>
                {requests[0].counterpartyRole === "venue" ? "Площадка" : "Организатор"}
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 ${allDone ? "text-neon-green/70" : "text-white/65"}`}>
            {allDone
              ? "Все документы подписаны обеими сторонами"
              : `${requests.length} ${requests.length === 1 ? "документ" : requests.length < 5 ? "документа" : "документов"}${pendingCount > 0 ? ` · ${pendingCount} ожидает` : ""}`}
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="w-5 h-5 bg-neon-purple rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            {pendingCount}
          </span>
        )}
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={16} className="text-white/55 shrink-0" />
      </button>

      {/* Список документов */}
      {open && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {requests.map(req => (
            <div key={req.id} className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${req.allSigned ? "bg-neon-green/3" : "hover:bg-white/2"}`}>
              {/* Иконка файла */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                req.allSigned ? "bg-neon-green/10 border border-neon-green/20" : "bg-white/5 border border-white/8"
              }`}>
                <Icon name="FileText" size={16} className={req.allSigned ? "text-neon-green" : "text-white/65"} />
              </div>

              {/* Инфо */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{req.documentName}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-white/55 text-xs">{formatDate(req.createdAt)}</span>
                  {req.signedCount > 0 && (
                    <span className="text-white/25 text-xs">· {req.signedCount} {req.signedCount === 1 ? "подпись" : "подписи"}</span>
                  )}
                </div>
              </div>

              {/* Действия */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <StatusBadge req={req} />
                {req.fileUrl && !req.allSigned && (
                  <a href={req.fileUrl} target="_blank" rel="noreferrer"
                    className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 text-white/65 hover:text-neon-cyan hover:border-neon-cyan/30 rounded-lg transition-all"
                    title="Открыть оригинал">
                    <Icon name="Eye" size={14} />
                  </a>
                )}
                {req.allSigned && (
                  <DownloadSignedBtn documentId={req.documentId} documentName={req.documentName} />
                )}
                {isIncoming && req.status === "pending" && !req.allSigned && onSign && (
                  <button
                    onClick={() => onSign(req)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white text-xs font-oswald font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Icon name="PenLine" size={12} />Подписать
                  </button>
                )}
                {!isIncoming && req.status === "pending" && !req.allSigned && (
                  <span className="text-xs text-white/25 italic">Ждём подпись</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardSigningTab() {
  const [incoming, setIncoming]   = useState<SignRequest[]>([]);
  const [outgoing, setOutgoing]   = useState<SignRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [signDoc, setSignDoc]     = useState<SignRequest | null>(null);
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");

  const load = async () => {
    setLoading(true);
    try {
      const [rIn, rOut] = await Promise.all([
        fetch(`${SIGN_URL}?action=my_requests`, { headers: { "X-Session-Id": session() } }),
        fetch(`${SIGN_URL}?action=my_sent_requests`, { headers: { "X-Session-Id": session() } }),
      ]);
      const [dIn, dOut] = await Promise.all([rIn.json(), rOut.json()]);
      setIncoming(dIn.requests || []);
      setOutgoing(dOut.requests || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const incomingGroups = groupByCounterparty(incoming);
  const outgoingGroups = groupByCounterparty(outgoing);

  const incomingPending = incoming.filter(r => r.status === "pending" && !r.allSigned).length;
  const outgoingPending = outgoing.filter(r => r.status === "pending" && !r.allSigned).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-white/55">
        <Icon name="Loader2" size={22} className="animate-spin mr-3" />Загрузка...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center">
          <Icon name="PenLine" size={18} className="text-neon-purple" />
        </div>
        <div>
          <h2 className="font-oswald font-bold text-xl text-white">Электронное подписание</h2>
          <p className="text-white/65 text-sm">Документы сгруппированы по контрагентам</p>
        </div>
        <button onClick={load} className="ml-auto text-white/55 hover:text-white/60 transition-colors" title="Обновить">
          <Icon name="RefreshCw" size={16} />
        </button>
      </div>

      {/* Табы: входящие / исходящие */}
      <div className="flex gap-1 glass rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("incoming")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-oswald font-medium transition-all ${activeTab === "incoming" ? "bg-neon-purple text-white" : "text-white/70 hover:text-white"}`}
        >
          <Icon name="Download" size={14} />Входящие
          {incomingPending > 0 && (
            <span className="w-4 h-4 bg-neon-pink rounded-full text-white text-[10px] font-bold flex items-center justify-center">
              {incomingPending}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("outgoing")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-oswald font-medium transition-all ${activeTab === "outgoing" ? "bg-neon-purple text-white" : "text-white/70 hover:text-white"}`}
        >
          <Icon name="Upload" size={14} />Исходящие
          {outgoingPending > 0 && (
            <span className="w-4 h-4 bg-neon-pink rounded-full text-white text-[10px] font-bold flex items-center justify-center">
              {outgoingPending}
            </span>
          )}
        </button>
      </div>

      {/* Входящие — документы от контрагентов на подпись */}
      {activeTab === "incoming" && (
        <div className="space-y-3">
          {Object.keys(incomingGroups).length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl border border-white/5">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Icon name="Download" size={24} className="text-white/20" />
              </div>
              <p className="text-white/65 font-medium mb-1">Нет входящих запросов</p>
              <p className="text-white/20 text-sm">Когда другая сторона попросит подписать документ — он появится здесь</p>
            </div>
          ) : (
            Object.entries(incomingGroups).map(([name, reqs]) => (
              <CounterpartySection
                key={name}
                name={name}
                requests={reqs}
                isIncoming={true}
                onSign={setSignDoc}
                onRefresh={load}
              />
            ))
          )}
        </div>
      )}

      {/* Исходящие — документы которые я отправил на подпись */}
      {activeTab === "outgoing" && (
        <div className="space-y-3">
          {Object.keys(outgoingGroups).length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl border border-white/5">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Icon name="Upload" size={24} className="text-white/20" />
              </div>
              <p className="text-white/65 font-medium mb-1">Нет исходящих запросов</p>
              <p className="text-white/20 text-sm">Отправьте документ на подпись через раздел «Документы»</p>
            </div>
          ) : (
            Object.entries(outgoingGroups).map(([name, reqs]) => (
              <CounterpartySection
                key={name}
                name={name}
                requests={reqs}
                isIncoming={false}
                onRefresh={load}
              />
            ))
          )}
        </div>
      )}

      {/* Модал подписания */}
      {signDoc && (
        <SignatureModal
          doc={fakeDoc(signDoc)}
          initialStep="sign_choose"
          onClose={() => { setSignDoc(null); load(); }}
        />
      )}
    </div>
  );
}
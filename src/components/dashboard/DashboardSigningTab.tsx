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
  senderName: string;
  recipientEmail: string;
  status: "pending" | "signed" | "declined";
  createdAt: string;
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
  mimeType: "application/pdf",
  note: "",
  createdAt: req.createdAt,
});

export default function DashboardSigningTab() {
  const [requests, setRequests] = useState<SignRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [signDoc, setSignDoc]   = useState<SignRequest | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${SIGN_URL}?action=my_requests`, {
        headers: { "X-Session-Id": session() },
      });
      const d = await r.json();
      setRequests(d.requests || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const pending  = requests.filter(r => r.status === "pending");
  const finished = requests.filter(r => r.status !== "pending");

  const statusBadge = (status: string) => {
    if (status === "signed")   return <span className="text-xs text-neon-green bg-neon-green/10 border border-neon-green/20 px-2.5 py-1 rounded-full">Подписан</span>;
    if (status === "declined") return <span className="text-xs text-neon-pink bg-neon-pink/10 border border-neon-pink/20 px-2.5 py-1 rounded-full">Отклонён</span>;
    return <span className="text-xs text-neon-purple bg-neon-purple/10 border border-neon-purple/20 px-2.5 py-1 rounded-full">Ожидает подписи</span>;
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return iso; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-white/30">
        <Icon name="Loader2" size={22} className="animate-spin mr-3" />Загрузка...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center">
          <Icon name="PenLine" size={18} className="text-neon-purple" />
        </div>
        <div>
          <h2 className="font-oswald font-bold text-xl text-white">Входящие запросы на подпись</h2>
          <p className="text-white/40 text-sm">Документы, которые вас просят подписать</p>
        </div>
        <button onClick={load} className="ml-auto text-white/30 hover:text-white/60 transition-colors">
          <Icon name="RefreshCw" size={16} />
        </button>
      </div>

      {/* Ожидают подписи */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white/50 text-xs uppercase tracking-wider">Требуют подписи</span>
            <span className="w-5 h-5 bg-neon-purple rounded-full text-white text-[10px] font-bold flex items-center justify-center">{pending.length}</span>
          </div>
          <div className="space-y-3">
            {pending.map(req => (
              <div key={req.id} className="glass rounded-2xl border border-neon-purple/20 p-4 hover:border-neon-purple/40 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0">
                    <Icon name="FileText" size={20} className="text-neon-purple" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{req.documentName}</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      От <span className="text-white/60">{req.senderName}</span> · {formatDate(req.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(req.status)}
                    <button
                      onClick={() => setSignDoc(req)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white text-xs font-oswald font-semibold rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <Icon name="PenLine" size={12} />Подписать
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Пусто */}
      {pending.length === 0 && (
        <div className="text-center py-16 glass rounded-2xl border border-white/5">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Icon name="PenLine" size={24} className="text-white/20" />
          </div>
          <p className="text-white/40 font-medium mb-1">Нет входящих запросов</p>
          <p className="text-white/20 text-sm">Когда другая сторона попросит вас подписать документ — он появится здесь</p>
        </div>
      )}

      {/* История */}
      {finished.length > 0 && (
        <div>
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">История</p>
          <div className="space-y-2">
            {finished.map(req => (
              <div key={req.id} className="flex items-center gap-4 glass rounded-xl border border-white/5 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <Icon name={req.status === "signed" ? "ShieldCheck" : "XCircle"} size={16}
                    className={req.status === "signed" ? "text-neon-green" : "text-neon-pink"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-sm truncate">{req.documentName}</p>
                  <p className="text-white/30 text-xs">От {req.senderName} · {formatDate(req.createdAt)}</p>
                </div>
                {statusBadge(req.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Модал подписания */}
      {signDoc && (
        <SignatureModal
          doc={fakeDoc(signDoc)}
          onClose={() => { setSignDoc(null); load(); }}
        />
      )}
    </div>
  );
}

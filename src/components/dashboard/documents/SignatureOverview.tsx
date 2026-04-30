import Icon from "@/components/ui/icon";
import { type Doc } from "./docTypes";

export interface Signature {
  id: string;
  signerName: string;
  signerEmail: string;
  signType: string;
  status: "pending" | "signed" | "declined";
  signedAt: string | null;
  hash: string;
  isMe: boolean;
}

export interface SignRequest {
  id: string;
  recipientEmail: string;
  recipientName: string;
  status: string;
}

interface Props {
  doc: Doc;
  signatures: Signature[];
  requests: SignRequest[];
  loading: boolean;
  dlLoading: boolean;
  mySignature: Signature | undefined;
  onDownloadSigned: () => void;
  onGoSign: () => void;
  onGoSendRequest: () => void;
  onGoSendInternal: () => void;
}

function statusBadge(status: string) {
  if (status === "signed")   return <span className="text-xs text-neon-green bg-neon-green/10 border border-neon-green/20 px-2 py-0.5 rounded-full">Подписан</span>;
  if (status === "declined") return <span className="text-xs text-neon-pink bg-neon-pink/10 border border-neon-pink/20 px-2 py-0.5 rounded-full">Отклонён</span>;
  return <span className="text-xs text-white/55 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">Ожидает</span>;
}

export default function SignatureOverview({
  doc, signatures, requests, loading, dlLoading,
  mySignature, onDownloadSigned, onGoSign, onGoSendRequest, onGoSendInternal,
}: Props) {
  const signedCount = signatures.filter(s => s.status === "signed").length;

  return (
    <div className="space-y-4">

      {/* Баннер "подписано с двух сторон" */}
      {signedCount >= 2 && (
        <div className="rounded-2xl border border-neon-green/30 bg-neon-green/8 px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neon-green/20 border border-neon-green/30 flex items-center justify-center shrink-0">
              <Icon name="ShieldCheck" size={20} className="text-neon-green" />
            </div>
            <div>
              <p className="text-neon-green font-oswald font-bold text-base">Документ подписан с обеих сторон</p>
              <p className="text-neon-green/60 text-xs">Юридически значимый документ готов к скачиванию</p>
            </div>
          </div>
          <button onClick={onDownloadSigned} disabled={dlLoading}
            className="w-full py-3 bg-neon-green text-white font-oswald font-bold rounded-xl hover:bg-neon-green/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-sm">
            {dlLoading
              ? <><Icon name="Loader2" size={15} className="animate-spin" />Формирую PDF с подписями...</>
              : <><Icon name="Download" size={15} />Скачать PDF с подписями обеих сторон</>}
          </button>
        </div>
      )}

      {/* Блок документа — открыть оригинал */}
      <div className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center shrink-0">
          <Icon name="FileText" size={16} className="text-neon-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{doc.name}</p>
          <p className="text-white/55 text-xs">{doc.fileSizeHuman || "Документ"}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <a href={doc.fileUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-xs rounded-lg hover:bg-neon-cyan/20 transition-colors">
            <Icon name="Eye" size={13} />Открыть
          </a>
        </div>
      </div>

      {/* Подписи */}
      <div>
        <p className="text-white/65 text-xs uppercase tracking-wider mb-2">Подписи</p>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-white/55">
            <Icon name="Loader2" size={18} className="animate-spin mr-2" />Загрузка...
          </div>
        ) : signatures.length === 0 ? (
          <div className="py-4 text-center text-white/25 text-sm bg-white/3 rounded-xl border border-white/5">
            Документ ещё не подписан
          </div>
        ) : (
          <div className="space-y-2">
            {signatures.map(sig => (
              <div key={sig.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
                sig.status === "signed"
                  ? "bg-neon-green/5 border-neon-green/15"
                  : "bg-white/3 border-white/5"
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  sig.status === "signed" ? "bg-neon-green/15 border border-neon-green/25" : "bg-white/8"
                }`}>
                  <Icon name={sig.status === "signed" ? "ShieldCheck" : "Shield"} size={15}
                    className={sig.status === "signed" ? "text-neon-green" : "text-white/20"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {sig.signerName} {sig.isMe && <span className="text-white/55 text-xs">(вы)</span>}
                  </p>
                  <p className="text-white/55 text-xs">{sig.signerEmail} · ПЭП</p>
                  {sig.signedAt && <p className="text-white/20 text-xs mt-0.5">Подписан: {new Date(sig.signedAt).toLocaleString("ru")}</p>}
                  {sig.hash && <p className="text-white/15 text-[10px] font-mono mt-0.5 truncate">#{sig.hash.slice(0, 32)}…</p>}
                </div>
                {statusBadge(sig.status)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Запросы на подпись */}
      {requests.length > 0 && (
        <div>
          <p className="text-white/65 text-xs uppercase tracking-wider mb-2">Запросы на подпись</p>
          <div className="space-y-2">
            {requests.map(req => (
              <div key={req.id} className="flex items-center gap-3 bg-white/3 rounded-xl px-3 py-2 border border-white/5">
                <Icon name="Mail" size={14} className="text-white/55 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white/60 text-sm truncate">{req.recipientName || req.recipientEmail}</p>
                  <p className="text-white/25 text-xs">{req.recipientEmail}</p>
                </div>
                {statusBadge(req.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Действия */}
      <div className="space-y-2 pt-1">
        {(!mySignature || mySignature.status !== "signed") && (
          <button onClick={onGoSign}
            className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <Icon name="PenLine" size={16} />Подписать документ
          </button>
        )}
        {signatures.some(s => s.status === "signed") && signedCount < 2 && (
          <button onClick={onDownloadSigned} disabled={dlLoading}
            className="w-full py-2.5 border border-white/10 text-white/70 hover:text-white rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {dlLoading
              ? <><Icon name="Loader2" size={14} className="animate-spin" />Формирую...</>
              : <><Icon name="Download" size={14} />Скачать с текущей подписью</>}
          </button>
        )}
        <button onClick={onGoSendRequest}
          className="w-full py-2.5 border border-white/10 text-white/60 hover:text-white rounded-xl text-sm transition-all flex items-center justify-center gap-2">
          <Icon name="FilePen" size={15} />Запросить подпись у другой стороны
        </button>
        <button onClick={onGoSendInternal}
          className="w-full py-2.5 border border-white/10 text-white/60 hover:text-white rounded-xl text-sm transition-all flex items-center justify-center gap-2">
          <Icon name="Send" size={15} />Отправить документ контрагенту
        </button>
      </div>
    </div>
  );
}
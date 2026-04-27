import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { SIGN_URL, SESSION_KEY, type Doc } from "./docTypes";

interface Signature {
  id: string;
  signerName: string;
  signerEmail: string;
  signType: string;
  status: "pending" | "signed" | "declined";
  signedAt: string | null;
  hash: string;
  isMe: boolean;
}

interface SignRequest {
  id: string;
  recipientEmail: string;
  recipientName: string;
  status: string;
}

type Step = "overview" | "sign_choose" | "sign_code" | "send_request" | "send_internal";

interface Props {
  doc: Doc;
  onClose: () => void;
  initialStep?: Step;
}

const session = () => localStorage.getItem(SESSION_KEY) || "";

export default function SignatureModal({ doc, onClose, initialStep = "overview" }: Props) {
  const [step, setStep]               = useState<Step>(initialStep);
  const [signatures, setSignatures]   = useState<Signature[]>([]);
  const [requests, setRequests]       = useState<SignRequest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  // Подписание своим ключом
  const [sigId, setSigId]             = useState("");
  const [codeInput, setCodeInput]     = useState(["", "", "", "", "", ""]);
  const [codeSent, setCodeSent]       = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Запрос на подпись
  const [reqEmail, setReqEmail]       = useState("");
  const [reqName, setReqName]         = useState("");
  const [reqMsg, setReqMsg]           = useState("");
  const [reqLoading, setReqLoading]   = useState(false);
  const [reqSent, setReqSent]         = useState(false);

  // Скачать с подписью
  const [dlLoading, setDlLoading]     = useState(false);

  // Отправка документа контрагенту
  const [sendEmail, setSendEmail]     = useState("");
  const [sendName, setSendName]       = useState("");
  const [sendMsg, setSendMsg]         = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSent, setSendSent]       = useState<{name: string; registered: boolean} | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${SIGN_URL}?action=status&document_id=${doc.id}`, {
        headers: { "X-Session-Id": session() },
      });
      const d = await r.json();
      setSignatures(d.signatures || []);
      setRequests(d.requests || []);
    } catch { setError("Ошибка загрузки"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadStatus(); }, []);

  const mySignature = signatures.find(s => s.isMe);

  // ── Запросить код ────────────────────────────────────────────────────
  const handleRequestCode = async () => {
    setCodeLoading(true); setError("");
    try {
      const r = await fetch(`${SIGN_URL}?action=request_code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": session() },
        body: JSON.stringify({ documentId: doc.id }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Ошибка"); return; }
      setSigId(d.signatureId);
      setCodeSent(true);
      setCodeInput(["", "", "", "", "", ""]);
    } catch { setError("Ошибка соединения"); }
    finally { setCodeLoading(false); }
  };

  const handleCodeDigit = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...codeInput];
    next[i] = digit;
    setCodeInput(next);
    if (digit && i < 5) {
      const el = document.getElementById(`sig-code-${i + 1}`);
      el?.focus();
    }
    if (next.every(d => d)) handleConfirm(next.join(""));
  };

  const handleCodeKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeInput[i] && i > 0) {
      document.getElementById(`sig-code-${i - 1}`)?.focus();
    }
  };

  // ── Подтвердить код ──────────────────────────────────────────────────
  const handleConfirm = async (code?: string) => {
    const finalCode = code ?? codeInput.join("");
    if (finalCode.length < 6) return;
    setConfirmLoading(true); setError("");
    try {
      const r = await fetch(`${SIGN_URL}?action=confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": session() },
        body: JSON.stringify({ signatureId: sigId, code: finalCode }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Неверный код"); setCodeInput(["", "", "", "", "", ""]); return; }
      await loadStatus();
      setStep("overview");
      setCodeSent(false);
    } catch { setError("Ошибка соединения"); }
    finally { setConfirmLoading(false); }
  };

  // ── Отправить запрос ─────────────────────────────────────────────────
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEmail.includes("@")) { setError("Введите корректный email"); return; }
    setReqLoading(true); setError("");
    try {
      const r = await fetch(`${SIGN_URL}?action=send_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": session() },
        body: JSON.stringify({ documentId: doc.id, recipientEmail: reqEmail, recipientName: reqName, message: reqMsg }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Ошибка"); return; }
      setReqSent(true);
      await loadStatus();
    } catch { setError("Ошибка соединения"); }
    finally { setReqLoading(false); }
  };

  // ── Скачать с подписью ───────────────────────────────────────────────
  const handleDownloadSigned = async () => {
    setDlLoading(true); setError("");
    try {
      const r = await fetch(`${SIGN_URL}?action=download_signed&document_id=${doc.id}`, {
        headers: { "X-Session-Id": session() },
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Ошибка"); return; }
      window.open(d.url, "_blank");
    } catch { setError("Ошибка соединения"); }
    finally { setDlLoading(false); }
  };

  // ── Отправить документ контрагенту ───────────────────────────────────
  const handleSendInternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendEmail.includes("@")) { setError("Введите корректный email"); return; }
    setSendLoading(true); setError("");
    try {
      const r = await fetch(`${SIGN_URL}?action=send_internal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": session() },
        body: JSON.stringify({ documentId: doc.id, recipientEmail: sendEmail, recipientName: sendName, message: sendMsg }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Ошибка"); return; }
      setSendSent({ name: d.recipientName, registered: d.isRegistered });
    } catch { setError("Ошибка соединения"); }
    finally { setSendLoading(false); }
  };

  const statusBadge = (status: string) => {
    if (status === "signed")   return <span className="text-xs text-neon-green bg-neon-green/10 border border-neon-green/20 px-2 py-0.5 rounded-full">Подписан</span>;
    if (status === "declined") return <span className="text-xs text-neon-pink bg-neon-pink/10 border border-neon-pink/20 px-2 py-0.5 rounded-full">Отклонён</span>;
    return <span className="text-xs text-white/30 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">Ожидает</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "#15152a" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center">
            <Icon name="PenLine" size={17} className="text-neon-purple" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">Электронная подпись</p>
            <p className="text-white/30 text-xs truncate">{doc.name}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2 mb-4">
              <Icon name="AlertCircle" size={14} />{error}
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {step === "overview" && (
            <div className="space-y-4">

              {/* Блок документа — скачать/открыть перед подписью */}
              <div className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center shrink-0">
                  <Icon name="FileText" size={16} className="text-neon-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-white/30 text-xs">{doc.fileSizeHuman || "Документ"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-xs rounded-lg hover:bg-neon-cyan/20 transition-colors">
                    <Icon name="Eye" size={13} />Открыть
                  </a>
                  <a href={doc.fileUrl} download={doc.name}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white/50 text-xs rounded-lg hover:bg-white/10 hover:text-white transition-all">
                    <Icon name="Download" size={13} />
                  </a>
                </div>
              </div>

              {/* Текущие подписи */}
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Подписи</p>
                {loading ? (
                  <div className="flex items-center justify-center py-6 text-white/30">
                    <Icon name="Loader2" size={18} className="animate-spin mr-2" />Загрузка...
                  </div>
                ) : signatures.length === 0 ? (
                  <div className="py-4 text-center text-white/25 text-sm bg-white/3 rounded-xl border border-white/5">
                    Документ ещё не подписан
                  </div>
                ) : (
                  <div className="space-y-2">
                    {signatures.map(sig => (
                      <div key={sig.id} className="flex items-center gap-3 bg-white/3 rounded-xl px-3 py-2.5 border border-white/5">
                        <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center shrink-0">
                          <Icon name={sig.status === "signed" ? "ShieldCheck" : "Shield"} size={15} className={sig.status === "signed" ? "text-neon-green" : "text-white/20"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{sig.signerName} {sig.isMe && <span className="text-white/30 text-xs">(вы)</span>}</p>
                          <p className="text-white/30 text-xs">{sig.signerEmail} · ПЭП</p>
                          {sig.signedAt && <p className="text-white/20 text-xs mt-0.5">Подписан: {new Date(sig.signedAt).toLocaleString("ru")}</p>}
                          {sig.hash && <p className="text-white/15 text-xs font-mono mt-0.5 truncate">#{sig.hash}</p>}
                        </div>
                        {statusBadge(sig.status)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Запросы */}
              {requests.length > 0 && (
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Запросы на подпись</p>
                  <div className="space-y-2">
                    {requests.map(req => (
                      <div key={req.id} className="flex items-center gap-3 bg-white/3 rounded-xl px-3 py-2 border border-white/5">
                        <Icon name="Mail" size={14} className="text-white/30 shrink-0" />
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
              <div className="space-y-2 pt-2">
                {(!mySignature || mySignature.status !== "signed") && (
                  <button onClick={() => { setStep("sign_choose"); setError(""); }}
                    className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <Icon name="PenLine" size={16} />Подписать документ
                  </button>
                )}
                {signatures.some(s => s.status === "signed") && (
                  <button onClick={handleDownloadSigned} disabled={dlLoading}
                    className="w-full py-2.5 border border-neon-green/30 bg-neon-green/5 text-neon-green hover:bg-neon-green/10 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {dlLoading
                      ? <><Icon name="Loader2" size={14} className="animate-spin" />Формирую страницу...</>
                      : <><Icon name="Download" size={14} />Скачать документ с подписью</>}
                  </button>
                )}
                <button onClick={() => { setStep("send_request"); setError(""); setReqSent(false); }}
                  className="w-full py-2.5 border border-white/10 text-white/60 hover:text-white rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                  <Icon name="FilePen" size={15} />Запросить подпись у другой стороны
                </button>
                <button onClick={() => { setStep("send_internal"); setError(""); setSendSent(null); }}
                  className="w-full py-2.5 border border-white/10 text-white/60 hover:text-white rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                  <Icon name="Send" size={15} />Отправить документ контрагенту
                </button>
              </div>
            </div>
          )}

          {/* ── ВЫБОР ТИПА ПОДПИСИ ── */}
          {step === "sign_choose" && !codeSent && (
            <div className="space-y-3">
              {/* Документ для ознакомления */}
              <div className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3 mb-1">
                <Icon name="FileText" size={15} className="text-neon-cyan shrink-0" />
                <p className="text-white/60 text-sm truncate flex-1">{doc.name}</p>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-xs rounded-lg hover:bg-neon-cyan/20 transition-colors shrink-0">
                  <Icon name="Eye" size={12} />Открыть
                </a>
              </div>
              <p className="text-white/50 text-sm">Выберите способ подписания:</p>

              {/* ПЭП */}
              <button onClick={handleRequestCode} disabled={codeLoading}
                className="w-full text-left p-4 rounded-xl border border-neon-purple/30 bg-neon-purple/5 hover:bg-neon-purple/10 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-neon-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                    {codeLoading ? <Icon name="Loader2" size={16} className="text-neon-purple animate-spin" /> : <Icon name="Mail" size={16} className="text-neon-purple" />}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Простая ЭП (ПЭП)</p>
                    <p className="text-white/40 text-xs mt-0.5">Подтверждение кодом из email. Юридически значима при наличии соглашения сторон.</p>
                  </div>
                </div>
              </button>

              {/* КЭП — заглушка */}
              <div className="w-full text-left p-4 rounded-xl border border-white/5 bg-white/2 opacity-50 cursor-not-allowed">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="ShieldCheck" size={16} className="text-white/20" />
                  </div>
                  <div>
                    <p className="text-white/50 font-semibold text-sm">Квалифицированная ЭП (КЭП)</p>
                    <p className="text-white/25 text-xs mt-0.5">Скоро · Требует КЭП-сертификата (Контур, СБИС и др.)</p>
                  </div>
                </div>
              </div>

              <button onClick={() => setStep("overview")}
                className="w-full py-2.5 text-white/30 hover:text-white/60 text-sm transition-colors flex items-center justify-center gap-2">
                <Icon name="ArrowLeft" size={14} />Назад
              </button>
            </div>
          )}

          {/* ── ВВОД КОДА ── */}
          {step === "sign_choose" && codeSent && (
            <div className="text-center space-y-5">
              <div className="w-12 h-12 rounded-xl bg-neon-purple/20 border border-neon-purple/20 flex items-center justify-center mx-auto">
                <Icon name="Mail" size={22} className="text-neon-purple" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Введите код из письма</p>
                <p className="text-white/40 text-sm">Код отправлен на вашу почту</p>
              </div>

              <div className="flex gap-2 justify-center">
                {codeInput.map((digit, i) => (
                  <input
                    key={i}
                    id={`sig-code-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeDigit(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    onPaste={i === 0 ? (e) => {
                      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                      if (pasted.length === 6) {
                        const arr = pasted.split("");
                        setCodeInput(arr);
                        handleConfirm(pasted);
                      }
                    } : undefined}
                    className="w-10 h-12 rounded-xl border text-center text-lg font-bold text-white outline-none transition-all"
                    style={{
                      background: digit ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)",
                      borderColor: digit ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
              </div>

              <button onClick={() => handleConfirm()} disabled={confirmLoading || codeInput.some(d => !d)}
                className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                {confirmLoading ? <><Icon name="Loader2" size={15} className="animate-spin" />Проверяю...</> : <><Icon name="ShieldCheck" size={15} />Подписать</>}
              </button>

              <button onClick={handleRequestCode} disabled={codeLoading}
                className="text-white/30 hover:text-white/60 text-sm transition-colors">
                {codeLoading ? "Отправка..." : "Отправить код повторно"}
              </button>
            </div>
          )}

          {/* ── ОТПРАВИТЬ ДОКУМЕНТ КОНТРАГЕНТУ ── */}
          {step === "send_internal" && (
            <div>
              {sendSent ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-neon-green/20 border border-neon-green/20 flex items-center justify-center mx-auto">
                    <Icon name="CheckCircle2" size={22} className="text-neon-green" />
                  </div>
                  <p className="text-white font-semibold">Документ отправлен</p>
                  <p className="text-white/40 text-sm">
                    {sendSent.registered
                      ? <>Документ добавлен в раздел «Документы» пользователя <span className="text-white/70">{sendSent.name}</span></>
                      : <>Письмо со ссылкой отправлено на <span className="text-white/70">{sendEmail}</span></>}
                  </p>
                  <button onClick={() => { setStep("overview"); setSendSent(null); setSendEmail(""); setSendName(""); setSendMsg(""); }}
                    className="mt-2 text-neon-cyan text-sm hover:opacity-80 transition-opacity">
                    Вернуться
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendInternal} className="space-y-3">
                  <p className="text-white/50 text-sm mb-3">Отправить документ контрагенту:</p>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Icon name="Mail" size={10} />Email получателя
                    </label>
                    <input type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)}
                      placeholder="partner@example.com" className="gl-input" required />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Icon name="User" size={10} />Имя получателя (необязательно)
                    </label>
                    <input type="text" value={sendName} onChange={e => setSendName(e.target.value)}
                      placeholder="Иван Иванов" className="gl-input" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Icon name="MessageSquare" size={10} />Сообщение (необязательно)
                    </label>
                    <textarea value={sendMsg} onChange={e => setSendMsg(e.target.value)}
                      placeholder="Направляю вам договор для ознакомления..." rows={2}
                      className="gl-input resize-none" />
                  </div>
                  <div className="bg-neon-cyan/5 border border-neon-cyan/15 rounded-xl px-3.5 py-2.5 flex gap-2">
                    <Icon name="Info" size={13} className="text-neon-cyan/50 mt-0.5 shrink-0" />
                    <p className="text-xs text-white/35 leading-relaxed">
                      Если получатель зарегистрирован в GLOBAL LINK — документ автоматически появится в его разделе «Документы». Иначе — придёт письмо со ссылкой.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setStep("overview")}
                      className="px-4 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all flex items-center">
                      <Icon name="ArrowLeft" size={14} />
                    </button>
                    <button type="submit" disabled={sendLoading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                      {sendLoading ? <><Icon name="Loader2" size={14} className="animate-spin" />Отправка...</> : <><Icon name="Send" size={14} />Отправить</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── ЗАПРОС ПОДПИСИ ── */}
          {step === "send_request" && (
            <div>
              {reqSent ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-neon-green/20 border border-neon-green/20 flex items-center justify-center mx-auto">
                    <Icon name="CheckCircle2" size={22} className="text-neon-green" />
                  </div>
                  <p className="text-white font-semibold">Запрос отправлен</p>
                  <p className="text-white/40 text-sm">Получатель получит письмо со ссылкой на документ</p>
                  <button onClick={() => { setStep("overview"); setReqSent(false); }}
                    className="mt-2 text-neon-cyan text-sm hover:opacity-80 transition-opacity">
                    Вернуться к документу
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendRequest} className="space-y-3">
                  <p className="text-white/50 text-sm mb-3">Запросить подпись у другой стороны:</p>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Icon name="Mail" size={10} />Email получателя
                    </label>
                    <input type="email" value={reqEmail} onChange={e => setReqEmail(e.target.value)}
                      placeholder="partner@example.com" className="gl-input" required />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Icon name="User" size={10} />Имя получателя (необязательно)
                    </label>
                    <input type="text" value={reqName} onChange={e => setReqName(e.target.value)}
                      placeholder="Иван Иванов" className="gl-input" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Icon name="MessageSquare" size={10} />Сообщение (необязательно)
                    </label>
                    <textarea value={reqMsg} onChange={e => setReqMsg(e.target.value)}
                      placeholder="Прошу ознакомиться и подписать договор..." rows={2}
                      className="gl-input resize-none" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setStep("overview")}
                      className="px-4 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all flex items-center gap-1.5">
                      <Icon name="ArrowLeft" size={14} />
                    </button>
                    <button type="submit" disabled={reqLoading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                      {reqLoading ? <><Icon name="Loader2" size={14} className="animate-spin" />Отправка...</> : <><Icon name="Send" size={14} />Отправить запрос</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
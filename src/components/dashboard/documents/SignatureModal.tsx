import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { SIGN_URL, SESSION_KEY, type Doc } from "./docTypes";
import SignatureOverview, { type Signature, type SignRequest } from "./SignatureOverview";
import SignatureSignStep from "./SignatureSignStep";
import { SendInternalStep, SendRequestStep } from "./SignatureSendSteps";

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
  const [sendSent, setSendSent]       = useState<{ name: string; registered: boolean } | null>(null);

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

  const handlePasteCode = (pasted: string) => {
    const arr = pasted.split("");
    setCodeInput(arr);
    handleConfirm(pasted);
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

  // ── Отправить запрос на подпись ──────────────────────────────────────
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
            <p className="text-white/55 text-xs truncate">{doc.name}</p>
          </div>
          <button onClick={onClose} className="text-white/55 hover:text-white transition-colors">
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
            <SignatureOverview
              doc={doc}
              signatures={signatures}
              requests={requests}
              loading={loading}
              dlLoading={dlLoading}
              mySignature={mySignature}
              onDownloadSigned={handleDownloadSigned}
              onGoSign={() => { setStep("sign_choose"); setError(""); }}
              onGoSendRequest={() => { setStep("send_request"); setError(""); setReqSent(false); }}
              onGoSendInternal={() => { setStep("send_internal"); setError(""); setSendSent(null); }}
            />
          )}

          {/* ── ВЫБОР ТИПА ПОДПИСИ / ВВОД КОДА ── */}
          {step === "sign_choose" && (
            <SignatureSignStep
              doc={doc}
              codeSent={codeSent}
              codeInput={codeInput}
              codeLoading={codeLoading}
              confirmLoading={confirmLoading}
              onRequestCode={handleRequestCode}
              onCodeDigit={handleCodeDigit}
              onCodeKeyDown={handleCodeKeyDown}
              onConfirm={handleConfirm}
              onPasteCode={handlePasteCode}
              onBack={() => setStep("overview")}
            />
          )}

          {/* ── ОТПРАВИТЬ ДОКУМЕНТ КОНТРАГЕНТУ ── */}
          {step === "send_internal" && (
            <SendInternalStep
              sendEmail={sendEmail}
              sendName={sendName}
              sendMsg={sendMsg}
              sendLoading={sendLoading}
              sendSent={sendSent}
              onEmailChange={setSendEmail}
              onNameChange={setSendName}
              onMsgChange={setSendMsg}
              onSubmit={handleSendInternal}
              onBack={() => setStep("overview")}
              onReset={() => { setStep("overview"); setSendSent(null); setSendEmail(""); setSendName(""); setSendMsg(""); }}
            />
          )}

          {/* ── ЗАПРОС ПОДПИСИ ── */}
          {step === "send_request" && (
            <SendRequestStep
              reqEmail={reqEmail}
              reqName={reqName}
              reqMsg={reqMsg}
              reqLoading={reqLoading}
              reqSent={reqSent}
              onEmailChange={setReqEmail}
              onNameChange={setReqName}
              onMsgChange={setReqMsg}
              onSubmit={handleSendRequest}
              onBack={() => setStep("overview")}
              onReset={() => { setStep("overview"); setReqSent(false); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
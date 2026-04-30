import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { EMPLOYEES_URL } from "@/components/dashboard/profile/types";

interface EmpDoc {
  id: string;
  docType: "passport" | "inn" | "snils" | "contract" | "other";
  fileName: string;
  url: string;
  fileSize: number | null;
  uploadedAt: string;
}

const DOC_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  passport: { label: "Паспорт",   icon: "IdCard",      color: "text-neon-purple" },
  inn:      { label: "ИНН",       icon: "Hash",         color: "text-neon-cyan"   },
  snils:    { label: "СНИЛС",     icon: "CreditCard",   color: "text-neon-green"  },
  contract: { label: "Договор",   icon: "FileSignature",color: "text-neon-pink"   },
  other:    { label: "Прочее",    icon: "File",         color: "text-white/55"    },
};

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function fmtDate(str: string) {
  return new Date(str).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  companyId: string;
}

export default function EmployeeDocuments({ employeeId, employeeName, employeeEmail, companyId }: Props) {
  const [docs,        setDocs]        = useState<EmpDoc[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [docType,     setDocType]     = useState<EmpDoc["docType"]>("passport");
  const [msg,         setMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const [deleting,    setDeleting]    = useState<string | null>(null);
  const [sendingPayslip, setSendingPayslip] = useState(false);
  const [payslipPeriod,  setPayslipPeriod]  = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });
  const [payslipEmail, setPayslipEmail] = useState(employeeEmail);
  const [showPayslip,  setShowPayslip]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${EMPLOYEES_URL}?action=documents&employee_id=${employeeId}&company_user_id=${companyId}`);
      const data = await res.json();
      setDocs(data.documents || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [employeeId]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setMsg({ ok: false, text: "Файл не должен превышать 10 МБ" }); return; }
    setUploading(true); setMsg(null);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${EMPLOYEES_URL}?action=upload_document`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyUserId: companyId, employeeId,
          docType, fileName: file.name, fileData: b64,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: data.error || "Ошибка загрузки" }); return; }
      setMsg({ ok: true, text: `Файл «${file.name}» загружен` });
      load();
    } catch { setMsg({ ok: false, text: "Ошибка соединения" }); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Удалить документ?")) return;
    setDeleting(id);
    try {
      await fetch(`${EMPLOYEES_URL}?action=delete_document`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      load();
    } finally { setDeleting(null); }
  };

  const sendPayslip = async () => {
    setSendingPayslip(true); setMsg(null);
    try {
      const res = await fetch(`${EMPLOYEES_URL}?action=send_payslip`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyUserId: companyId, employeeId,
          period: payslipPeriod, emailTo: payslipEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: data.error || "Ошибка отправки" }); return; }
      setMsg({ ok: true, text: `Расчётный листок отправлен на ${payslipEmail}` });
      setShowPayslip(false);
    } catch { setMsg({ ok: false, text: "Ошибка соединения" }); }
    finally { setSendingPayslip(false); }
  };

  const grouped = Object.entries(DOC_LABELS).map(([type, meta]) => ({
    type, ...meta,
    files: docs.filter(d => d.docType === type),
  })).filter(g => g.files.length > 0 || g.type !== "other");

  const inp = "glass rounded-xl px-3 py-2 text-white text-xs outline-none border border-white/10 focus:border-neon-purple/50 bg-transparent";

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-white font-semibold text-sm">Документы</p>
          <p className="text-white/40 text-xs">{employeeName}</p>
        </div>
        <button
          onClick={() => setShowPayslip(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
            showPayslip ? "bg-neon-purple/20 border-neon-purple/40 text-neon-purple" : "border-white/15 text-white/60 hover:text-white hover:border-white/30"
          }`}
        >
          <Icon name="Receipt" size={12} />
          Расчётный листок
        </button>
      </div>

      {/* Форма расчётного листка */}
      {showPayslip && (
        <div className="glass rounded-xl border border-neon-purple/20 p-4 space-y-3 animate-fade-in">
          <p className="text-white/55 text-[11px] uppercase tracking-wider">Отправить расчётный листок</p>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Период</label>
              <input type="month" value={payslipPeriod}
                onChange={e => setPayslipPeriod(e.target.value)}
                className={inp} />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-[10px] text-white/40 block mb-1">Email получателя</label>
              <input type="email" value={payslipEmail}
                onChange={e => setPayslipEmail(e.target.value)}
                placeholder="email@company.ru"
                className={`${inp} w-full`} />
            </div>
            <button onClick={sendPayslip} disabled={sendingPayslip || !payslipEmail}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-neon-purple text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
              {sendingPayslip ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Send" size={12} />}
              Отправить
            </button>
          </div>
        </div>
      )}

      {/* Уведомление */}
      {msg && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
          msg.ok ? "bg-neon-green/10 border-neon-green/25 text-neon-green" : "bg-neon-pink/10 border-neon-pink/25 text-neon-pink"
        }`}>
          <Icon name={msg.ok ? "CheckCircle" : "AlertCircle"} size={12} className="shrink-0" />
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto opacity-60 hover:opacity-100"><Icon name="X" size={11} /></button>
        </div>
      )}

      {/* Загрузка нового файла */}
      <div className="glass rounded-xl border border-white/10 p-3 space-y-3">
        <p className="text-white/40 text-[11px] uppercase tracking-wider">Добавить документ</p>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Тип */}
          <select value={docType} onChange={e => setDocType(e.target.value as EmpDoc["docType"])}
            className={`${inp} appearance-none`}>
            {Object.entries(DOC_LABELS).map(([k, v]) => (
              <option key={k} value={k} className="bg-gray-900">{v.label}</option>
            ))}
          </select>
          {/* Кнопка выбора файла */}
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden" onChange={handleFile} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-dashed border-white/25 text-white/55 hover:text-white hover:border-white/45 disabled:opacity-50 transition-all">
            {uploading ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Upload" size={12} />}
            {uploading ? "Загрузка..." : "Выбрать файл"}
          </button>
          <p className="text-white/25 text-[10px]">PDF, JPG, PNG, DOC · до 10 МБ</p>
        </div>
      </div>

      {/* Список документов */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Icon name="Loader2" size={18} className="animate-spin text-white/25" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 text-white/25 text-xs">
          <Icon name="FolderOpen" size={24} className="mx-auto mb-2 opacity-50" />
          Нет загруженных документов
        </div>
      ) : (
        <div className="space-y-1">
          {grouped.map(g => g.files.map(doc => {
            const meta = DOC_LABELS[doc.docType] || DOC_LABELS.other;
            return (
              <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 glass rounded-xl border border-white/8 hover:border-white/15 transition-colors group">
                <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0`}>
                  <Icon name={meta.icon as never} size={14} className={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/85 text-xs font-medium truncate">{doc.fileName}</p>
                  <p className="text-white/35 text-[10px]">
                    {meta.label} · {fmtDate(doc.uploadedAt)}
                    {doc.fileSize ? ` · ${fmtSize(doc.fileSize)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors">
                    <Icon name="Download" size={13} />
                  </a>
                  <button onClick={() => deleteDoc(doc.id)} disabled={deleting === doc.id}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-neon-pink hover:bg-neon-pink/10 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100">
                    {deleting === doc.id ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Trash2" size={12} />}
                  </button>
                </div>
              </div>
            );
          }))}
        </div>
      )}
    </div>
  );
}

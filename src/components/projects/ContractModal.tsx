import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL } from "@/hooks/useProjects";
import { useAuth } from "@/context/AuthContext";
import ContractPrintBlock from "./contract/ContractPrintBlock";
import ContractBody from "./contract/ContractBody";
import ContractSignSection from "./contract/ContractSignSection";

interface Contract {
  id: string;
  booking_id: string;
  status: string; // draft | sent | signed_venue | signed_organizer | signed | paid | rejected
  contract_number: string;
  organizer_legal_name: string;
  organizer_inn: string;
  organizer_kpp: string;
  organizer_ogrn: string;
  organizer_address: string;
  organizer_bank_name: string;
  organizer_bank_account: string;
  organizer_bank_bik: string;
  organizer_phone: string;
  venue_legal_name: string;
  venue_inn: string;
  venue_kpp: string;
  venue_ogrn: string;
  venue_address: string;
  venue_bank_name: string;
  venue_bank_account: string;
  venue_bank_bik: string;
  venue_phone: string;
  venue_name: string;
  event_date: string;
  event_time: string;
  artist: string;
  rental_amount: string;
  venue_conditions: string;
  organizer_signed_at: string;
  venue_signed_at: string;
  organizer_id: string;
  venue_user_id: string;
  created_at: string;
  contract_template: string;
  contract_subject: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:             { label: "Черновик",              color: "text-white/50" },
  sent:              { label: "Отправлен",             color: "text-neon-cyan" },
  signed_organizer:  { label: "Подписан организатором",color: "text-neon-purple" },
  signed_venue:      { label: "Подписан площадкой",    color: "text-neon-purple" },
  signed:            { label: "Подписан обеими сторонами", color: "text-neon-green" },
  paid:              { label: "Оплачен",               color: "text-neon-green" },
  rejected:          { label: "Отклонён",              color: "text-neon-pink" },
};

function fmt(n: string | number) {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (!num) return "—";
  return num.toLocaleString("ru") + " ₽";
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

interface Props {
  bookingId: string;
  venueName?: string;
  eventDate?: string;
  rentalAmount?: number | null;
  organizerId?: string;
  venueUserId?: string;
  onClose: () => void;
  onContractSigned?: (invoiceId?: string) => void;
}

export default function ContractModal({
  bookingId, venueName = "", eventDate = "", rentalAmount,
  organizerId, venueUserId, onClose, onContractSigned,
}: Props) {
  const { user } = useAuth();
  const [contract, setContract]     = useState<Contract | null>(null);
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);
  const [signing, setSigning]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]           = useState("");
  const [signDone, setSignDone]     = useState(false);
  const [invoiceId, setInvoiceId]   = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (mounted: { current: boolean }) => {
    if (!mounted.current) return;
    setLoading(true);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=contract_detail&booking_id=${bookingId}`);
      if (!mounted.current) return;
      if (res.ok) {
        const data = await res.json();
        if (mounted.current) setContract(data.contract || null);
      } else {
        if (mounted.current) setContract(null);
      }
    } catch { if (mounted.current) setContract(null); }
    finally { if (mounted.current) setLoading(false); }
  }, [bookingId]);

  useEffect(() => {
    const mounted = { current: true };
    load(mounted);
    return () => { mounted.current = false; };
  }, [load]);

  const generate = async () => {
    setGenerating(true); setError("");
    try {
      const res = await fetch(`${PROJECTS_URL}?action=generate_contract`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка генерации"); return; }
      const m = { current: true };
      await load(m);
    } catch { setError("Ошибка соединения"); }
    finally { setGenerating(false); }
  };

  const sign = async () => {
    if (!contract || !user) return;
    setSigning(true); setError("");
    const side = user.id === contract.organizer_id ? "organizer" : "venue";
    try {
      const res = await fetch(`${PROJECTS_URL}?action=sign_contract`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: contract.id, side, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка подписания"); return; }
      setSignDone(true);
      if (data.invoiceId) { setInvoiceId(data.invoiceId); }
      const m = { current: true };
      await load(m);
      onContractSigned?.(data.invoiceId);
    } catch { setError("Ошибка соединения"); }
    finally { setSigning(false); }
  };

  // Определяем роль текущего пользователя
  const myRole = !contract ? null
    : user?.id === contract.organizer_id ? "organizer"
    : user?.id === contract.venue_user_id ? "venue"
    : null;

  const iAlreadySigned = !contract ? false
    : myRole === "organizer" ? !!contract.organizer_signed_at
    : myRole === "venue"     ? !!contract.venue_signed_at
    : false;

  const canSign = !!myRole && !iAlreadySigned && contract?.status !== "signed" && contract?.status !== "paid";

  const downloadPdf = async () => {
    if (!printRef.current || !contract) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(printRef.current, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      const pageH = pdf.internal.pageSize.getHeight();
      let y = 0;
      while (y < pdfH) {
        pdf.addImage(imgData, "PNG", 0, -y, pdfW, pdfH);
        y += pageH;
        if (y < pdfH) pdf.addPage();
      }
      pdf.save(`Договор_${contract.contract_number}.pdf`);
    } catch { /* PDF generation failed */ }
    finally { setDownloading(false); }
  };

  const modal = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-strong rounded-2xl border border-neon-purple/20 animate-scale-in">

        {/* Шапка */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-white/8 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center">
              <Icon name="FileText" size={18} className="text-neon-purple" />
            </div>
            <div>
              <h2 className="font-oswald font-bold text-white text-lg">
                {contract ? `Договор №${contract.contract_number}` : "Договор аренды площадки"}
              </h2>
              {contract && (
                <p className={`text-xs mt-0.5 ${STATUS_LABEL[contract.status]?.color || "text-white/40"}`}>
                  {STATUS_LABEL[contract.status]?.label || contract.status}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {contract && (
              <button onClick={downloadPdf} disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/20 text-neon-purple rounded-lg text-xs hover:bg-neon-purple/20 disabled:opacity-50 transition-all">
                {downloading
                  ? <Icon name="Loader2" size={13} className="animate-spin" />
                  : <Icon name="Download" size={13} />}
                {downloading ? "Генерирую..." : "Скачать PDF"}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all">
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Загрузка */}
          {loading && (
            <div className="text-center py-12">
              <Icon name="Loader2" size={32} className="text-neon-purple/50 animate-spin mx-auto mb-3" />
              <p className="text-white/40 text-sm">Загрузка...</p>
            </div>
          )}

          {/* Нет договора — кнопка создания */}
          {!loading && !contract && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center mx-auto mb-5">
                <Icon name="FilePlus" size={28} className="text-neon-purple" />
              </div>
              <h3 className="font-oswald font-bold text-white text-xl mb-2">Договор не создан</h3>
              <p className="text-white/45 text-sm mb-2 max-w-sm mx-auto">
                Реквизиты обеих сторон будут автоматически подставлены из профилей.
              </p>
              <p className="text-white/30 text-xs mb-6 max-w-xs mx-auto">
                Площадка: <b className="text-white/50">{venueName}</b> · Дата: <b className="text-white/50">{fmtDate(eventDate)}</b>
                {rentalAmount ? ` · Аренда: ${fmt(rentalAmount)}` : ""}
              </p>
              {error && <p className="text-neon-pink text-sm mb-4">{error}</p>}
              <button onClick={generate} disabled={generating}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all text-base">
                {generating
                  ? <><Icon name="Loader2" size={16} className="animate-spin" />Создаю договор...</>
                  : <><Icon name="FilePlus" size={16} />Создать договор</>}
              </button>
            </div>
          )}

          {/* Договор создан — показываем */}
          {!loading && contract && (
            <>
              <ContractSignSection
                contract={contract}
                error={error}
                signing={signing}
                signDone={signDone}
                invoiceId={invoiceId}
                canSign={canSign}
                iAlreadySigned={iAlreadySigned}
                myRole={myRole}
                onSign={sign}
              />

              {/* Тело договора — шаблон площадки */}
              {contract.contract_template ? (
                <div className="glass rounded-xl border border-white/8 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="FileText" size={14} className="text-neon-cyan" />
                    <p className="text-white/50 text-xs uppercase tracking-wider">
                      {contract.contract_subject || "Текст договора"}
                    </p>
                  </div>
                  <pre className="text-white/75 text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto scrollbar-thin">
                    {contract.contract_template}
                  </pre>
                </div>
              ) : (
                <div className="glass rounded-xl border border-white/8 p-4">
                  <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Предмет договора</p>
                  <p className="text-white/65 text-sm">
                    Арендодатель предоставляет площадку «{contract.venue_name}» для проведения мероприятия.
                    {contract.artist ? ` Артист: ${contract.artist}.` : ""}
                    {" "}Дата: {fmtDate(contract.event_date)}{contract.event_time ? ` в ${contract.event_time}` : ""}.
                    {" "}Стоимость: {fmt(contract.rental_amount)}.
                    {contract.venue_conditions ? ` Условия: ${contract.venue_conditions}.` : ""}
                  </p>
                  <p className="text-white/30 text-xs mt-2">
                    Площадка не настроила шаблон договора. Добавьте его в редактировании площадки → шаг «Договор».
                  </p>
                </div>
              )}

              {/* Скрытый печатный блок для PDF */}
              <ContractPrintBlock ref={printRef} contract={contract} />

              {/* Тело договора — реквизиты + шаблон */}
              <ContractBody contract={contract} />
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL } from "@/hooks/useProjects";
import { useAuth } from "@/context/AuthContext";

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
    } catch (e) { console.error(e); }
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
              {/* Статус подписей */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Организатор",
                    name: contract.organizer_legal_name || "—",
                    signed: !!contract.organizer_signed_at,
                    date: contract.organizer_signed_at,
                  },
                  {
                    label: "Площадка",
                    name: contract.venue_legal_name || contract.venue_name,
                    signed: !!contract.venue_signed_at,
                    date: contract.venue_signed_at,
                  },
                ].map((s, i) => (
                  <div key={i} className={`glass rounded-xl p-4 border ${s.signed ? "border-neon-green/20" : "border-white/8"}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon name={s.signed ? "CheckCircle2" : "Clock"} size={15}
                        className={s.signed ? "text-neon-green" : "text-white/30"} />
                      <p className="text-white/50 text-xs">{s.label}</p>
                    </div>
                    <p className="text-white/80 text-sm font-medium truncate">{s.name}</p>
                    {s.signed
                      ? <p className="text-neon-green text-xs mt-1">Подписано {fmtDate(s.date)}</p>
                      : <p className="text-white/30 text-xs mt-1">Ожидает подписания</p>
                    }
                  </div>
                ))}
              </div>

              {/* Скрытый печатный блок для PDF */}
              <div ref={printRef} style={{ position: "absolute", left: "-9999px", top: 0, width: "794px", background: "#fff", color: "#111", padding: "48px", fontFamily: "serif", fontSize: "13px", lineHeight: "1.7" }}>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{ fontSize: "18px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>Договор аренды концертной площадки</div>
                  <div style={{ fontSize: "12px", color: "#555" }}>№{contract.contract_number} от {fmtDate(contract.created_at)}</div>
                </div>
                <div style={{ borderTop: "1px solid #ddd", paddingTop: "16px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#666" }}>Стороны договора</div>
                  <div><b>Арендатор:</b> {contract.organizer_legal_name || "—"}</div>
                  <div>ИНН: {contract.organizer_inn || "—"}{contract.organizer_kpp ? ` / КПП: ${contract.organizer_kpp}` : ""}</div>
                  {contract.organizer_ogrn    && <div>ОГРН: {contract.organizer_ogrn}</div>}
                  {contract.organizer_address && <div>Адрес: {contract.organizer_address}</div>}
                  {contract.organizer_phone   && <div>Тел.: {contract.organizer_phone}</div>}
                </div>
                <div style={{ borderTop: "1px solid #ddd", paddingTop: "16px", marginBottom: "16px" }}>
                  <div><b>Арендодатель:</b> {contract.venue_legal_name || contract.venue_name}</div>
                  <div>ИНН: {contract.venue_inn || "—"}{contract.venue_kpp ? ` / КПП: ${contract.venue_kpp}` : ""}</div>
                  {contract.venue_ogrn    && <div>ОГРН: {contract.venue_ogrn}</div>}
                  {contract.venue_address && <div>Адрес: {contract.venue_address}</div>}
                  {contract.venue_phone   && <div>Тел.: {contract.venue_phone}</div>}
                </div>
                <div style={{ borderTop: "1px solid #ddd", paddingTop: "16px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#666" }}>Предмет договора</div>
                  <div>Арендодатель предоставляет площадку «{contract.venue_name}» для проведения мероприятия.</div>
                  {contract.artist && <div><b>Артист:</b> {contract.artist}</div>}
                  <div><b>Дата мероприятия:</b> {fmtDate(contract.event_date)}{contract.event_time ? ` в ${contract.event_time}` : ""}</div>
                  <div><b>Стоимость аренды:</b> {fmt(contract.rental_amount)}</div>
                  {contract.venue_conditions && <div><b>Условия:</b> {contract.venue_conditions}</div>}
                </div>
                <div style={{ borderTop: "1px solid #ddd", paddingTop: "16px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#666" }}>Реквизиты Арендатора</div>
                  {contract.organizer_bank_name    && <div>Банк: {contract.organizer_bank_name}</div>}
                  {contract.organizer_bank_account && <div>Расчётный счёт: {contract.organizer_bank_account}</div>}
                  {contract.organizer_bank_bik     && <div>БИК: {contract.organizer_bank_bik}</div>}
                </div>
                <div style={{ borderTop: "1px solid #ddd", paddingTop: "16px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#666" }}>Реквизиты Арендодателя</div>
                  {contract.venue_bank_name    && <div>Банк: {contract.venue_bank_name}</div>}
                  {contract.venue_bank_account && <div>Расчётный счёт: {contract.venue_bank_account}</div>}
                  {contract.venue_bank_bik     && <div>БИК: {contract.venue_bank_bik}</div>}
                </div>
                <div style={{ borderTop: "1px solid #ddd", paddingTop: "16px", marginBottom: "32px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#666" }}>Подписи сторон</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
                    <div>
                      <div style={{ fontWeight: "bold" }}>Арендатор</div>
                      <div style={{ fontSize: "12px", color: "#555" }}>{contract.organizer_legal_name || "—"}</div>
                      <div style={{ marginTop: "8px", color: contract.organizer_signed_at ? "#16a34a" : "#999", fontSize: "12px" }}>
                        {contract.organizer_signed_at ? `✓ Подписано ${fmtDate(contract.organizer_signed_at)}` : "Ожидает подписи"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "bold" }}>Арендодатель</div>
                      <div style={{ fontSize: "12px", color: "#555" }}>{contract.venue_legal_name || contract.venue_name}</div>
                      <div style={{ marginTop: "8px", color: contract.venue_signed_at ? "#16a34a" : "#999", fontSize: "12px" }}>
                        {contract.venue_signed_at ? `✓ Подписано ${fmtDate(contract.venue_signed_at)}` : "Ожидает подписи"}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #eee", paddingTop: "12px", fontSize: "10px", color: "#aaa" }}>
                  Договор составлен в электронной форме. Юридическая сила в соответствии с ФЗ №149-ФЗ и ГК РФ. Сгенерирован платформой Global Link.
                </div>
              </div>

              {/* Тело договора */}
              <div className="glass rounded-2xl p-5 border border-white/5 text-sm text-white/70 leading-relaxed space-y-4 font-mono text-xs">
                <div className="text-center space-y-1">
                  <p className="font-oswald font-bold text-white text-base uppercase">Договор аренды концертной площадки</p>
                  <p className="text-white/40">№{contract.contract_number} от {fmtDate(contract.created_at)}</p>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-1">
                  <p className="text-white/50 uppercase text-[10px] tracking-wider mb-2">Стороны договора</p>
                  <p><span className="text-white/40">Арендатор: </span><span className="text-white/80">{contract.organizer_legal_name || "—"}</span></p>
                  <p><span className="text-white/40">ИНН: </span>{contract.organizer_inn || "—"}{contract.organizer_kpp ? ` / КПП: ${contract.organizer_kpp}` : ""}</p>
                  {contract.organizer_address && <p><span className="text-white/40">Адрес: </span>{contract.organizer_address}</p>}
                  {contract.organizer_phone   && <p><span className="text-white/40">Тел.: </span>{contract.organizer_phone}</p>}
                </div>

                <div className="border-t border-white/5 pt-4 space-y-1">
                  <p><span className="text-white/40">Арендодатель: </span><span className="text-white/80">{contract.venue_legal_name || contract.venue_name}</span></p>
                  <p><span className="text-white/40">ИНН: </span>{contract.venue_inn || "—"}{contract.venue_kpp ? ` / КПП: ${contract.venue_kpp}` : ""}</p>
                  {contract.venue_address && <p><span className="text-white/40">Адрес: </span>{contract.venue_address}</p>}
                  {contract.venue_phone   && <p><span className="text-white/40">Тел.: </span>{contract.venue_phone}</p>}
                </div>

                <div className="border-t border-white/5 pt-4 space-y-1">
                  <p className="text-white/50 uppercase text-[10px] tracking-wider mb-2">Предмет договора</p>
                  <p>Арендодатель обязуется предоставить концертную площадку <span className="text-white/90">«{contract.venue_name}»</span> во временное пользование для проведения мероприятия.</p>
                  {contract.artist     && <p><span className="text-white/40">Артист: </span>{contract.artist}</p>}
                  <p><span className="text-white/40">Дата мероприятия: </span><span className="text-white/90">{fmtDate(contract.event_date)}</span>{contract.event_time ? ` в ${contract.event_time}` : ""}</p>
                  <p><span className="text-white/40">Стоимость аренды: </span><span className="text-neon-green font-bold text-sm">{fmt(contract.rental_amount)}</span></p>
                  {contract.venue_conditions && (
                    <p><span className="text-white/40">Условия: </span>{contract.venue_conditions}</p>
                  )}
                </div>

                <div className="border-t border-white/5 pt-4 space-y-1">
                  <p className="text-white/50 uppercase text-[10px] tracking-wider mb-2">Банковские реквизиты Арендатора</p>
                  {contract.organizer_bank_name    && <p><span className="text-white/40">Банк: </span>{contract.organizer_bank_name}</p>}
                  {contract.organizer_bank_account && <p><span className="text-white/40">Счёт: </span>{contract.organizer_bank_account}</p>}
                  {contract.organizer_bank_bik     && <p><span className="text-white/40">БИК: </span>{contract.organizer_bank_bik}</p>}
                </div>

                <div className="border-t border-white/5 pt-4 space-y-1">
                  <p className="text-white/50 uppercase text-[10px] tracking-wider mb-2">Банковские реквизиты Арендодателя</p>
                  {contract.venue_bank_name    && <p><span className="text-white/40">Банк: </span>{contract.venue_bank_name}</p>}
                  {contract.venue_bank_account && <p><span className="text-white/40">Счёт: </span>{contract.venue_bank_account}</p>}
                  {contract.venue_bank_bik     && <p><span className="text-white/40">БИК: </span>{contract.venue_bank_bik}</p>}
                </div>

                <div className="border-t border-white/5 pt-4 text-white/30 text-[10px] leading-relaxed">
                  <p>Настоящий договор составлен в электронной форме и имеет юридическую силу в соответствии с ФЗ №149-ФЗ «Об информации» и ГК РФ. Электронная подпись сторон равнозначна собственноручной.</p>
                </div>
              </div>

              {/* Подписать */}
              {error && <p className="text-neon-pink text-sm text-center">{error}</p>}

              {signDone && (
                <div className="flex items-center gap-3 p-4 glass rounded-xl border border-neon-green/20">
                  <Icon name="CheckCircle2" size={20} className="text-neon-green shrink-0" />
                  <div>
                    <p className="text-neon-green font-semibold text-sm">Вы подписали договор</p>
                    {invoiceId && <p className="text-white/45 text-xs mt-0.5">Счёт сформирован после подписания обеими сторонами</p>}
                  </div>
                </div>
              )}

              {canSign && !signDone && (
                <div className="glass rounded-xl p-4 border border-neon-purple/20">
                  <p className="text-white/60 text-sm mb-4">
                    Вы подписываете договор как <b className="text-white/80">{myRole === "organizer" ? "Организатор" : "Площадка"}</b>.
                    Нажимая кнопку, вы подтверждаете согласие с условиями договора.
                  </p>
                  <button onClick={sign} disabled={signing}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all text-base">
                    {signing
                      ? <><Icon name="Loader2" size={16} className="animate-spin" />Подписываю...</>
                      : <><Icon name="PenTool" size={16} />Подписать договор</>}
                  </button>
                </div>
              )}

              {iAlreadySigned && !signDone && (
                <div className="flex items-center gap-3 p-4 glass rounded-xl border border-neon-green/15">
                  <Icon name="CheckCircle2" size={18} className="text-neon-green" />
                  <p className="text-white/60 text-sm">Вы уже подписали этот договор</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
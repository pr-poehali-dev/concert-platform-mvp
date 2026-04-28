import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL } from "@/hooks/useProjects";

interface Invoice {
  id: string;
  contract_id: string;
  booking_id: string;
  invoice_number: string;
  payer_legal_name: string;
  payer_inn: string;
  payee_legal_name: string;
  payee_inn: string;
  payee_bank_name: string;
  payee_bank_account: string;
  payee_bank_bik: string;
  amount: string;
  description: string;
  due_date: string;
  status: string; // issued | paid | cancelled
  paid_at: string;
  created_at: string;
}

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
  contractId?: string;
  onClose: () => void;
}

export default function InvoiceModal({ bookingId, contractId, onClose }: Props) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading]      = useState(true);
  const [marking, setMarking]      = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]          = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (mounted: { current: boolean }) => {
    if (!mounted.current) return;
    setLoading(true);
    try {
      const param = contractId
        ? `contract_id=${contractId}`
        : `booking_id=${bookingId}`;
      const res  = await fetch(`${PROJECTS_URL}?action=invoice_detail&${param}`);
      if (!mounted.current) return;
      if (res.ok) {
        const data = await res.json();
        if (mounted.current) setInvoice(data.invoice || null);
      } else {
        if (mounted.current) setInvoice(null);
      }
    } catch { if (mounted.current) setInvoice(null); }
    finally { if (mounted.current) setLoading(false); }
  }, [bookingId, contractId]);

  useEffect(() => {
    const mounted = { current: true };
    load(mounted);
    return () => { mounted.current = false; };
  }, [load]);

  const markPaid = async () => {
    if (!invoice) return;
    setMarking(true); setError("");
    try {
      const res = await fetch(`${PROJECTS_URL}?action=mark_invoice_paid`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      if (!res.ok) { setError("Ошибка"); return; }
      await load({ current: true });
    } catch { setError("Ошибка соединения"); }
    finally { setMarking(false); }
  };

  const downloadPdf = async () => {
    if (!printRef.current || !invoice) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(printRef.current, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`Счёт_${invoice.invoice_number}.pdf`);
    } catch { /* PDF generation failed */ }
    finally { setDownloading(false); }
  };

  const modal = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-strong rounded-2xl border border-neon-green/20 animate-scale-in">

        {/* Шапка */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-white/8 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
              <Icon name="Receipt" size={18} className="text-neon-green" />
            </div>
            <div>
              <h2 className="font-oswald font-bold text-white text-lg">
                {invoice ? `Счёт №${invoice.invoice_number}` : "Счёт на оплату"}
              </h2>
              {invoice && (
                <p className={`text-xs mt-0.5 ${invoice.status === "paid" ? "text-neon-green" : invoice.status === "cancelled" ? "text-neon-pink" : "text-neon-cyan"}`}>
                  {invoice.status === "paid" ? "Оплачен" : invoice.status === "cancelled" ? "Отменён" : "Выставлен"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {invoice && (
              <button onClick={downloadPdf} disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-green/10 border border-neon-green/20 text-neon-green rounded-lg text-xs hover:bg-neon-green/20 disabled:opacity-50 transition-all">
                {downloading ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Download" size={13} />}
                {downloading ? "Генерирую..." : "Скачать PDF"}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all">
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {loading && (
            <div className="text-center py-12">
              <Icon name="Loader2" size={32} className="text-neon-green/50 animate-spin mx-auto mb-3" />
              <p className="text-white/40 text-sm">Загрузка счёта...</p>
            </div>
          )}

          {!loading && !invoice && (
            <div className="text-center py-12">
              <Icon name="FileX" size={40} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 font-oswald text-lg">Счёт ещё не сформирован</p>
              <p className="text-white/25 text-sm mt-1 max-w-xs mx-auto">
                Счёт генерируется автоматически после подписания договора обеими сторонами
              </p>
            </div>
          )}

          {!loading && invoice && (
            <>
              {/* Скрытый печатный блок для PDF */}
              <div ref={printRef} style={{ position: "absolute", left: "-9999px", top: 0, width: "794px", background: "#fff", color: "#111", padding: "48px", fontFamily: "sans-serif", fontSize: "13px", lineHeight: "1.7" }}>
                <div style={{ textAlign: "center", marginBottom: "24px", borderBottom: "2px solid #111", paddingBottom: "16px" }}>
                  <div style={{ fontSize: "20px", fontWeight: "bold", textTransform: "uppercase" }}>Счёт на оплату</div>
                  <div style={{ fontSize: "14px", color: "#555", marginTop: "4px" }}>№{invoice.invoice_number} от {fmtDate(invoice.created_at)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", gap: "32px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: "11px", textTransform: "uppercase", color: "#888", marginBottom: "6px" }}>Плательщик</div>
                    <div style={{ fontWeight: "bold" }}>{invoice.payer_legal_name || "—"}</div>
                    {invoice.payer_inn && <div style={{ color: "#555" }}>ИНН: {invoice.payer_inn}</div>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: "11px", textTransform: "uppercase", color: "#888", marginBottom: "6px" }}>Получатель</div>
                    <div style={{ fontWeight: "bold" }}>{invoice.payee_legal_name || "—"}</div>
                    {invoice.payee_inn && <div style={{ color: "#555" }}>ИНН: {invoice.payee_inn}</div>}
                    {invoice.payee_bank_name    && <div style={{ color: "#555" }}>Банк: {invoice.payee_bank_name}</div>}
                    {invoice.payee_bank_account && <div style={{ color: "#555" }}>Р/счёт: {invoice.payee_bank_account}</div>}
                    {invoice.payee_bank_bik     && <div style={{ color: "#555" }}>БИК: {invoice.payee_bank_bik}</div>}
                  </div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      <th style={{ border: "1px solid #ddd", padding: "8px 12px", textAlign: "left", fontSize: "12px" }}>Наименование</th>
                      <th style={{ border: "1px solid #ddd", padding: "8px 12px", textAlign: "right", fontSize: "12px" }}>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #ddd", padding: "10px 12px", fontSize: "13px" }}>{invoice.description}</td>
                      <td style={{ border: "1px solid #ddd", padding: "10px 12px", textAlign: "right", fontWeight: "bold", fontSize: "13px" }}>{fmt(invoice.amount)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f9f9f9" }}>
                      <td style={{ border: "1px solid #ddd", padding: "10px 12px", fontWeight: "bold" }}>Итого к оплате:</td>
                      <td style={{ border: "1px solid #ddd", padding: "10px 12px", fontWeight: "bold", textAlign: "right", fontSize: "15px" }}>{fmt(invoice.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
                {invoice.due_date && <div style={{ color: "#555", marginBottom: "24px" }}>Срок оплаты: {fmtDate(invoice.due_date)}</div>}
                <div style={{ borderTop: "1px solid #eee", paddingTop: "12px", fontSize: "10px", color: "#aaa" }}>
                  {invoice.status === "paid"
                    ? `✓ Оплачен ${invoice.paid_at ? fmtDate(invoice.paid_at) : ""}`
                    : "Статус: Ожидает оплаты"
                  } · Сгенерировано платформой Global Link
                </div>
              </div>

              {/* Итоговая сумма */}
              <div className="glass rounded-2xl p-5 border border-neon-green/20 text-center">
                <p className="text-white/40 text-sm mb-1">Сумма к оплате</p>
                <p className="font-oswald font-bold text-neon-green text-5xl">{fmt(invoice.amount)}</p>
                <p className="text-white/35 text-xs mt-2">{invoice.description}</p>
                {invoice.due_date && (
                  <p className="text-white/30 text-xs mt-1">Срок оплаты: {fmtDate(invoice.due_date)}</p>
                )}
              </div>

              {/* Тело счёта */}
              <div className="glass rounded-2xl p-5 border border-white/5 text-xs font-mono space-y-4">
                <div className="text-center">
                  <p className="font-oswald font-bold text-white text-sm uppercase">Счёт на оплату №{invoice.invoice_number}</p>
                  <p className="text-white/40 text-xs mt-0.5">от {fmtDate(invoice.created_at)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                  <div className="space-y-1">
                    <p className="text-white/30 uppercase text-[10px] tracking-wider mb-1.5">Плательщик</p>
                    <p className="text-white/80">{invoice.payer_legal_name || "—"}</p>
                    {invoice.payer_inn && <p className="text-white/45">ИНН: {invoice.payer_inn}</p>}
                  </div>
                  <div className="space-y-1">
                    <p className="text-white/30 uppercase text-[10px] tracking-wider mb-1.5">Получатель</p>
                    <p className="text-white/80">{invoice.payee_legal_name || "—"}</p>
                    {invoice.payee_inn && <p className="text-white/45">ИНН: {invoice.payee_inn}</p>}
                  </div>
                </div>

                {(invoice.payee_bank_name || invoice.payee_bank_account || invoice.payee_bank_bik) && (
                  <div className="border-t border-white/5 pt-4 space-y-1">
                    <p className="text-white/30 uppercase text-[10px] tracking-wider mb-1.5">Банковские реквизиты получателя</p>
                    {invoice.payee_bank_name    && <p><span className="text-white/40">Банк: </span><span className="text-white/70">{invoice.payee_bank_name}</span></p>}
                    {invoice.payee_bank_account && <p><span className="text-white/40">Расчётный счёт: </span><span className="text-white/70">{invoice.payee_bank_account}</span></p>}
                    {invoice.payee_bank_bik     && <p><span className="text-white/40">БИК: </span><span className="text-white/70">{invoice.payee_bank_bik}</span></p>}
                  </div>
                )}

                <div className="border-t border-white/5 pt-4">
                  <p className="text-white/30 uppercase text-[10px] tracking-wider mb-1.5">Назначение платежа</p>
                  <p className="text-white/70">{invoice.description}</p>
                </div>

                <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                  <p className="text-white/50">Итого к оплате:</p>
                  <p className="font-bold text-neon-green text-base">{fmt(invoice.amount)}</p>
                </div>
              </div>

              {/* Статус оплаты */}
              {invoice.status === "paid" ? (
                <div className="flex items-center gap-3 p-4 glass rounded-xl border border-neon-green/20">
                  <Icon name="CheckCircle2" size={20} className="text-neon-green shrink-0" />
                  <div>
                    <p className="text-neon-green font-semibold text-sm">Счёт оплачен</p>
                    {invoice.paid_at && <p className="text-white/40 text-xs mt-0.5">{fmtDate(invoice.paid_at)}</p>}
                  </div>
                </div>
              ) : invoice.status === "issued" && (
                <div className="space-y-3">
                  {error && <p className="text-neon-pink text-sm text-center">{error}</p>}
                  <div className="glass rounded-xl p-4 border border-neon-cyan/15">
                    <p className="text-white/50 text-sm mb-3">
                      После поступления оплаты отметьте счёт как оплаченный — это зафиксируется в истории проекта.
                    </p>
                    <button onClick={markPaid} disabled={marking}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-neon-green/90 hover:bg-neon-green text-black font-oswald font-bold rounded-xl disabled:opacity-50 transition-all text-sm">
                      {marking
                        ? <><Icon name="Loader2" size={15} className="animate-spin" />Отмечаю...</>
                        : <><Icon name="CheckCircle2" size={15} />Отметить как оплаченный</>}
                    </button>
                  </div>
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
import { forwardRef } from "react";

interface Contract {
  contract_number: string;
  contract_subject: string;
  contract_template: string;
  created_at: string;
  organizer_legal_name: string;
  organizer_inn: string;
  organizer_kpp: string;
  organizer_ogrn: string;
  organizer_address: string;
  organizer_phone: string;
  organizer_bank_name: string;
  organizer_bank_account: string;
  organizer_bank_bik: string;
  organizer_signed_at: string;
  venue_legal_name: string;
  venue_name: string;
  venue_inn: string;
  venue_kpp: string;
  venue_ogrn: string;
  venue_address: string;
  venue_phone: string;
  venue_bank_name: string;
  venue_bank_account: string;
  venue_bank_bik: string;
  venue_signed_at: string;
  artist: string;
  event_date: string;
  event_time: string;
  rental_amount: string;
  venue_conditions: string;
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
  contract: Contract;
}

const ContractPrintBlock = forwardRef<HTMLDivElement, Props>(({ contract }, ref) => {
  return (
    <div ref={ref} style={{ position: "absolute", left: "-9999px", top: 0, width: "794px", background: "#fff", color: "#111", padding: "48px", fontFamily: "serif", fontSize: "13px", lineHeight: "1.7" }}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ fontSize: "18px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>
          {contract.contract_subject || "Договор аренды концертной площадки"}
        </div>
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
      {contract.contract_template ? (
        <div style={{ borderTop: "1px solid #ddd", paddingTop: "16px", marginBottom: "16px", whiteSpace: "pre-wrap" }}>
          {contract.contract_template}
        </div>
      ) : (
        <div style={{ borderTop: "1px solid #ddd", paddingTop: "16px", marginBottom: "16px" }}>
          <div style={{ fontWeight: "bold", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", color: "#666" }}>Предмет договора</div>
          <div>Арендодатель предоставляет площадку «{contract.venue_name}» для проведения мероприятия.</div>
          {contract.artist && <div><b>Артист:</b> {contract.artist}</div>}
          <div><b>Дата мероприятия:</b> {fmtDate(contract.event_date)}{contract.event_time ? ` в ${contract.event_time}` : ""}</div>
          <div><b>Стоимость аренды:</b> {fmt(contract.rental_amount)}</div>
          {contract.venue_conditions && <div><b>Условия:</b> {contract.venue_conditions}</div>}
        </div>
      )}
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
  );
});

ContractPrintBlock.displayName = "ContractPrintBlock";
export default ContractPrintBlock;

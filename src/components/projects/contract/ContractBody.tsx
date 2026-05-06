interface Contract {
  contract_number: string;
  contract_subject: string;
  contract_template: string;
  created_at: string;
  organizer_legal_name: string;
  organizer_inn: string;
  organizer_kpp: string;
  organizer_address: string;
  organizer_phone: string;
  organizer_bank_name: string;
  organizer_bank_account: string;
  organizer_bank_bik: string;
  venue_legal_name: string;
  venue_name: string;
  venue_inn: string;
  venue_kpp: string;
  venue_address: string;
  venue_phone: string;
  venue_bank_name: string;
  venue_bank_account: string;
  venue_bank_bik: string;
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

export default function ContractBody({ contract }: Props) {
  return (
    <div className="glass rounded-2xl p-5 border border-white/5 text-sm text-white/70 leading-relaxed space-y-4 font-mono text-xs">
      <div className="text-center space-y-1">
        <p className="font-oswald font-bold text-white text-base uppercase">
          {contract.contract_subject || "Договор аренды концертной площадки"}
        </p>
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

      {contract.contract_template ? (
        <div className="border-t border-white/5 pt-4">
          <p className="text-white/50 uppercase text-[10px] tracking-wider mb-2">Текст договора</p>
          <pre className="whitespace-pre-wrap text-white/75 leading-relaxed">{contract.contract_template}</pre>
        </div>
      ) : (
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
      )}

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
  );
}

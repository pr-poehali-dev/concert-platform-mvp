import Icon from "@/components/ui/icon";
import type { CompanyType, User } from "@/context/AuthContext";
import { COMPANY_LABELS } from "./types";

interface ReqForm {
  companyType: string;
  legalName: string;
  inn: string;
  kpp: string;
  ogrn: string;
  legalAddress: string;
  actualAddress: string;
  bankName: string;
  bankAccount: string;
  bankBik: string;
  phone: string;
}

interface Props {
  user: User;
  reqForm: ReqForm;
  reqSaving: boolean;
  reqSaved: boolean;
  onReqFormChange: (form: ReqForm) => void;
  onSave: () => void;
}

export default function RequisitesSection({ reqForm, reqSaving, reqSaved, onReqFormChange, onSave }: Props) {
  const set = (field: Partial<ReqForm>) => onReqFormChange({ ...reqForm, ...field });

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-oswald font-semibold text-white text-lg">Юридические реквизиты</h3>
        <button onClick={onSave} disabled={reqSaving}
          className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
          {reqSaving ? <Icon name="Loader2" size={14} className="animate-spin" /> : reqSaved ? <Icon name="Check" size={14} /> : <Icon name="Save" size={14} />}
          {reqSaved ? "Сохранено!" : "Сохранить"}
        </button>
      </div>

      <div>
        <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Организационная форма</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(COMPANY_LABELS) as [CompanyType, string][]).map(([val, label]) => (
            <button key={val} type="button" onClick={() => set({ companyType: val })}
              className={`py-2.5 px-3 rounded-xl border text-sm transition-all text-left ${reqForm.companyType === val ? "bg-neon-cyan/15 border-neon-cyan/50 text-neon-cyan" : "glass border-white/10 text-white/50 hover:border-white/25 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {reqForm.companyType !== "individual" && (
        <>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Полное наименование</label>
            <input value={reqForm.legalName} onChange={e => set({ legalName: e.target.value })}
              placeholder={reqForm.companyType === "ip" ? "ИП Иванов Иван Иванович" : 'ООО "Название"'}
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">ИНН</label>
              <input value={reqForm.inn} onChange={e => set({ inn: e.target.value.replace(/\D/g, "") })}
                placeholder="10 или 12 цифр" maxLength={12}
                className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">КПП</label>
              <input value={reqForm.kpp} onChange={e => set({ kpp: e.target.value.replace(/\D/g, "") })}
                placeholder="9 цифр (для ООО)" maxLength={9}
                className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">ОГРН / ОГРНИП</label>
            <input value={reqForm.ogrn} onChange={e => set({ ogrn: e.target.value.replace(/\D/g, "") })}
              placeholder="13–15 цифр" maxLength={15}
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Юридический адрес</label>
            <input value={reqForm.legalAddress} onChange={e => set({ legalAddress: e.target.value })}
              placeholder="г. Москва, ул. Ленина, д. 1"
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Фактический адрес</label>
            <input value={reqForm.actualAddress} onChange={e => set({ actualAddress: e.target.value })}
              placeholder="Если отличается от юридического"
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
          </div>
          <div className="h-px bg-white/10" />
          <p className="text-xs text-white/40 uppercase tracking-wider">Банковские реквизиты</p>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Банк</label>
            <input value={reqForm.bankName} onChange={e => set({ bankName: e.target.value })}
              placeholder="ПАО Сбербанк"
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Расчётный счёт</label>
              <input value={reqForm.bankAccount} onChange={e => set({ bankAccount: e.target.value.replace(/\D/g, "") })}
                placeholder="20 цифр" maxLength={20}
                className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">БИК</label>
              <input value={reqForm.bankBik} onChange={e => set({ bankBik: e.target.value.replace(/\D/g, "") })}
                placeholder="9 цифр" maxLength={9}
                className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Телефон</label>
        <input value={reqForm.phone} onChange={e => set({ phone: e.target.value })}
          placeholder="+7 999 000 00 00"
          className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
      </div>
    </div>
  );
}

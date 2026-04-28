import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import type { RegisterData, UserRole } from "@/context/AuthContext";
import { CITIES, COMPANY_TYPES, ROLE_META, Bg, BackBtn, Field, ErrorBox } from "./loginShared";

interface DadataCompany {
  value: string;
  data: {
    inn: string;
    kpp: string;
    ogrn: string;
    address?: { value: string };
    name?: { full_with_opf?: string; short_with_opf?: string };
    opf?: { short: string };
  };
}

async function searchByInn(inn: string): Promise<DadataCompany | null> {
  try {
    const res = await fetch(
      `https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Token 3b46ee0e8c9f2a69c06c1cbcc26fffcb00b81451",
          "Accept": "application/json",
        },
        body: JSON.stringify({ query: inn, count: 1 }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.suggestions?.[0] ?? null;
  } catch {
    return null;
  }
}

interface Props {
  role: UserRole;
  regStep: 1 | 2;
  regData: RegisterData;
  showRegPassword: boolean;
  isLoading: boolean;
  error: string;
  needsCompany: boolean;
  onSetReg: (k: keyof RegisterData, v: string) => void;
  onTogglePassword: () => void;
  onStep1: (e: React.FormEvent) => void;
  onStep2: (e: React.FormEvent) => void;
  onBackStep: () => void;
  onSwitchRole: () => void;
  onGoLogin: () => void;
}

export default function RegisterScreen({
  role, regStep, regData, showRegPassword, isLoading, error, needsCompany,
  onSetReg, onTogglePassword, onStep1, onStep2, onBackStep, onSwitchRole, onGoLogin,
}: Props) {
  const [agreed, setAgreed] = useState(false);
  const meta = ROLE_META[role];

  // ── ИНН автопоиск ─────────────────────────────────────────────────────
  const [innSearching, setInnSearching] = useState(false);
  const [innFound, setInnFound] = useState<DadataCompany | null>(null);
  const [innError, setInnError] = useState("");
  const innTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const inn = regData.inn.replace(/\D/g, "");
    if (inn.length !== 10 && inn.length !== 12) {
      setInnFound(null);
      setInnError("");
      return;
    }
    if (innTimerRef.current) clearTimeout(innTimerRef.current);
    innTimerRef.current = setTimeout(async () => {
      setInnSearching(true);
      setInnError("");
      const result = await searchByInn(inn);
      setInnSearching(false);
      if (!result) {
        setInnFound(null);
        setInnError("Компания с таким ИНН не найдена — проверьте номер");
        return;
      }
      setInnFound(result);
      // Автозаполняем поля
      const d = result.data;
      onSetReg("legalName", d.name?.full_with_opf || result.value || "");
      if (d.kpp) onSetReg("kpp", d.kpp);
      if (d.ogrn) onSetReg("ogrn", d.ogrn);
      if (d.address?.value) onSetReg("legalAddress", d.address.value);
    }, 600);
    return () => { if (innTimerRef.current) clearTimeout(innTimerRef.current); };
  }, [regData.inn]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <Bg />
      <BackBtn />
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "#15152a" }}>
          <div className={`h-px bg-gradient-to-r from-transparent via-${role === "organizer" ? "neon-cyan" : "neon-pink"}/60 to-transparent`} />
          <div className="p-7">

            {/* Header with role switcher */}
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${role === "organizer" ? "from-neon-cyan/20 to-neon-purple/20" : "from-neon-pink/20 to-neon-cyan/20"} flex items-center justify-center`}>
                <Icon name={meta.icon as never} size={18} className={meta.color} />
              </div>
              <div className="flex-1">
                <h1 className="font-oswald font-bold text-lg text-white">Регистрация</h1>
                <p className="text-white/30 text-xs">GLOBAL LINK · {meta.label}</p>
              </div>
              <button onClick={onSwitchRole}
                className="text-xs text-white/30 hover:text-white/60 border border-white/10 rounded-lg px-2.5 py-1.5 transition-all hover:border-white/20">
                → {role === "organizer" ? "Площадка" : "Организатор"}
              </button>
            </div>

            {/* Steps */}
            <div className="flex items-center gap-2 mb-5">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${regStep === s ? "bg-gradient-to-br from-neon-cyan to-neon-purple text-white" : regStep > s ? "bg-neon-cyan/20 text-neon-cyan" : "bg-white/5 text-white/30"}`}>
                    {regStep > s ? <Icon name="Check" size={11} /> : s}
                  </div>
                  <span className={`text-xs ${regStep === s ? "text-white/70" : "text-white/30"}`}>
                    {s === 1 ? "Основное" : <span>Реквизиты <span className="text-white/20">(необязательно)</span></span>}
                  </span>
                  {s < 2 && <div className={`h-px w-6 ${regStep > s ? "bg-neon-cyan/40" : "bg-white/10"}`} />}
                </div>
              ))}
            </div>

            {error && <ErrorBox error={error} />}

            {/* Step 1 */}
            {regStep === 1 && (
              <form onSubmit={onStep1} className="space-y-3">
                <Field label="Имя / Название" icon="User">
                  <input type="text" value={regData.name} onChange={e => onSetReg("name", e.target.value)} placeholder="Иван Петров" className="gl-input" />
                </Field>
                <Field label="Email" icon="Mail">
                  <input type="email" value={regData.email} onChange={e => onSetReg("email", e.target.value)} placeholder="ivan@example.com" className="gl-input" />
                </Field>
                <Field label="Пароль" icon="Lock">
                  <div className="relative">
                    <input type={showRegPassword ? "text" : "password"} value={regData.password} onChange={e => onSetReg("password", e.target.value)} placeholder="Минимум 6 символов" className="gl-input pr-10" />
                    <button type="button" onClick={onTogglePassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      <Icon name={showRegPassword ? "EyeOff" : "Eye"} size={15} />
                    </button>
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Телефон (необязательно)" icon="Phone">
                    <input type="tel" value={regData.phone} onChange={e => onSetReg("phone", e.target.value)} placeholder="+7 (999) 000-00-00" className="gl-input" />
                  </Field>
                  <Field label="Город" icon="MapPin">
                    <select value={regData.city} onChange={e => onSetReg("city", e.target.value)} className="gl-input">
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Тип организации" icon="Building2">
                  <select value={regData.companyType} onChange={e => onSetReg("companyType", e.target.value)} className="gl-input">
                    {(role === "venue" ? COMPANY_TYPES.filter(t => t.value !== "individual") : COMPANY_TYPES).map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>

                {/* Согласие на обработку ПДн */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    onClick={() => setAgreed(v => !v)}
                    className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${agreed ? "bg-neon-cyan border-neon-cyan" : "border-white/20 bg-white/5 group-hover:border-white/40"}`}>
                    {agreed && <Icon name="Check" size={11} className="text-background" />}
                  </div>
                  <span className="text-xs text-white/40 leading-relaxed">
                    Я даю согласие на обработку персональных данных в соответствии с{" "}
                    <Link to="/privacy" target="_blank" className="text-neon-cyan/80 hover:text-neon-cyan underline underline-offset-2 transition-colors">
                      Политикой конфиденциальности
                    </Link>
                    {" "}платформы GLOBAL LINK (152-ФЗ)
                  </span>
                </label>

                <button type="submit" disabled={!agreed} className={`w-full py-3 bg-gradient-to-r ${meta.gradient} text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-30 transition-opacity flex items-center justify-center gap-2`}>
                  Далее <Icon name="ArrowRight" size={16} />
                </button>
              </form>
            )}

            {/* Step 2 — реквизиты (необязательно) */}
            {regStep === 2 && (
              <form onSubmit={onStep2} className="space-y-3">

                {/* Подсказка */}
                <div className="flex gap-2.5 bg-neon-cyan/5 border border-neon-cyan/15 rounded-xl px-3.5 py-3">
                  <Icon name="Info" size={15} className="text-neon-cyan/60 mt-0.5 shrink-0" />
                  <p className="text-xs text-white/40 leading-relaxed">
                    Реквизиты нужны для оформления договоров и счетов. Вы можете заполнить их сейчас или позже — в разделе <span className="text-white/60">«Профиль»</span>.
                  </p>
                </div>

                {needsCompany ? (
                  <>
                    {/* ИНН — главное поле, всё остальное заполняется автоматически */}
                    <Field label="ИНН" icon="Hash">
                      <div className="relative">
                        <input
                          type="text"
                          value={regData.inn}
                          onChange={e => onSetReg("inn", e.target.value.replace(/\D/g, ""))}
                          placeholder="Введите ИНН — поля заполнятся автоматически"
                          className="gl-input pr-8"
                          maxLength={12}
                        />
                        {innSearching && (
                          <Icon name="Loader2" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neon-cyan animate-spin" />
                        )}
                        {innFound && !innSearching && (
                          <Icon name="CheckCircle2" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neon-green" />
                        )}
                      </div>
                      {innError && (
                        <p className="text-neon-pink text-xs mt-1 flex items-center gap-1">
                          <Icon name="AlertCircle" size={11} />{innError}
                        </p>
                      )}
                    </Field>

                    {/* Карточка найденной компании */}
                    {innFound && (
                      <div className="flex items-start gap-2.5 bg-neon-green/5 border border-neon-green/20 rounded-xl px-3.5 py-3">
                        <Icon name="Building2" size={15} className="text-neon-green mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-neon-green text-xs font-medium truncate">{innFound.value}</p>
                          <p className="text-white/30 text-[11px] mt-0.5">Данные заполнены автоматически из ЕГРЮЛ/ЕГРИП</p>
                        </div>
                      </div>
                    )}

                    <Field label="Юридическое название" icon="Building">
                      <input type="text" value={regData.legalName} onChange={e => onSetReg("legalName", e.target.value)} placeholder='ООО «Концерт Груп»' className="gl-input" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="КПП" icon="Hash">
                        <input type="text" value={regData.kpp} onChange={e => onSetReg("kpp", e.target.value)} placeholder="123456789" className="gl-input" maxLength={9} />
                      </Field>
                      <Field label="ОГРН/ОГРНИП" icon="FileText">
                        <input type="text" value={regData.ogrn} onChange={e => onSetReg("ogrn", e.target.value)} placeholder="1234567890123" className="gl-input" maxLength={15} />
                      </Field>
                    </div>
                    <Field label="Юридический адрес" icon="MapPin">
                      <input type="text" value={regData.legalAddress} onChange={e => onSetReg("legalAddress", e.target.value)} placeholder="г. Москва, ул. Примерная, д. 1" className="gl-input" />
                    </Field>
                  </>
                ) : (
                  <div className="py-3 text-center text-white/40 text-sm bg-white/5 rounded-xl border border-white/5">
                    <Icon name="Info" size={16} className="mx-auto mb-1.5 text-neon-cyan/50" />
                    Для физических лиц реквизиты не требуются
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={onBackStep}
                    className="py-2.5 px-4 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm transition-all flex items-center justify-center gap-2">
                    <Icon name="ArrowLeft" size={15} />
                  </button>
                  <button type="submit" disabled={isLoading}
                    className="flex-1 py-2.5 border border-white/10 text-white/50 hover:text-white/80 text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                    {isLoading
                      ? <><Icon name="Loader2" size={15} className="animate-spin" />Регистрация...</>
                      : <>Пропустить <Icon name="ArrowRight" size={15} /></>}
                  </button>
                  {needsCompany && (
                    <button type="submit" disabled={isLoading}
                      className={`flex-1 py-2.5 bg-gradient-to-r ${meta.gradient} text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2`}>
                      {isLoading
                        ? <><Icon name="Loader2" size={15} className="animate-spin" />Сохранение...</>
                        : <><Icon name="UserPlus" size={15} />Сохранить</>}
                    </button>
                  )}
                </div>
              </form>
            )}

            <p className="mt-4 text-center text-white/30 text-sm">
              Уже есть аккаунт?{" "}
              <button onClick={onGoLogin} className={`${meta.color} hover:opacity-80 transition-colors font-medium`}>Войти</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
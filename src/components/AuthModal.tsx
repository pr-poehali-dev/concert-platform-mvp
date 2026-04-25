import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth, UserRole, CompanyType, type RegisterData, AUTH_URL } from "@/context/AuthContext";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

const CITIES = ["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Казань", "Ростов-на-Дону", "Краснодар", "Воронеж"];

const COMPANY_TYPE_OPTIONS: { value: CompanyType; label: string; hint: string }[] = [
  { value: "individual", label: "Физическое лицо", hint: "Только для организаторов" },
  { value: "ip",         label: "ИП",              hint: "Индивидуальный предприниматель" },
  { value: "ooo",        label: "ООО",             hint: "Общество с ограниченной ответственностью" },
  { value: "other",      label: "Другое",           hint: "АО, НКО и другие формы" },
];

const EMPTY_REG: RegisterData = {
  name: "", email: "", password: "", role: "organizer" as UserRole, city: "Москва",
  companyType: "ip", legalName: "", inn: "", kpp: "", ogrn: "",
  legalAddress: "", actualAddress: "", phone: "",
};

type RegStep = "main" | "company" | "requisites";

export default function AuthModal({ open, onClose, defaultTab = "login" }: AuthModalProps) {
  const { login, register, isLoading } = useAuth();
  const [tab, setTab]         = useState<"login" | "register">(defaultTab);
  const [regStep, setRegStep] = useState<RegStep>("main");
  const [error, setError]     = useState("");
  const [registered, setRegistered]           = useState(false);
  const [registeredName, setRegisteredName]   = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendLoading, setResendLoading]     = useState(false);
  const [resendSent, setResendSent]           = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [regData, setRegData]     = useState<RegisterData>(EMPTY_REG);

  if (!open) return null;

  const setReg = (k: keyof RegisterData, v: string) => setRegData(d => ({ ...d, [k]: v }));

  const needsCompanyInfo = regData.companyType !== "individual";
  // Физлицо доступно только организаторам
  const availableTypes = regData.role === "venue"
    ? COMPANY_TYPE_OPTIONS.filter(o => o.value !== "individual")
    : COMPANY_TYPE_OPTIONS;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const msg = await login(loginData.email, loginData.password);
    if (!msg) onClose(); else setError(msg);
  };

  const handleRegNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!regData.name.trim()) return setError("Введите имя");
    if (!regData.email.includes("@")) return setError("Введите корректный email");
    if (regData.password.length < 6) return setError("Пароль минимум 6 символов");
    if (!regData.phone.trim()) return setError("Введите телефон");
    setRegStep(needsCompanyInfo ? "company" : "requisites");
  };

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (needsCompanyInfo && !regData.legalName.trim()) return setError("Введите юридическое название");
    if (needsCompanyInfo && regData.inn.length < 10) return setError("Введите корректный ИНН (10–12 цифр)");
    const msg = await register(regData);
    if (!msg) {
      setRegisteredName(regData.name.trim().split(" ")[0]);
      setRegisteredEmail(regData.email.trim().toLowerCase());
      setRegistered(true);
    } else {
      setError(msg);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail || resendLoading) return;
    setResendLoading(true);
    await fetch(`${AUTH_URL}?action=resend_verification`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: registeredEmail }),
    });
    setResendLoading(false);
    setResendSent(true);
    setTimeout(() => setResendSent(false), 5000);
  };

  // ── Экран «Подтвердите почту» ─────────────────────────────────────────
  if (registered) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl overflow-hidden animate-scale-in text-center p-8">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center mx-auto mb-6 animate-glow-pulse">
            <Icon name="Mail" size={36} className="text-white" />
          </div>
          <h2 className="font-oswald font-bold text-2xl text-white mb-2">Проверьте почту!</h2>
          <p className="text-white/60 mb-2">
            {registeredName}, мы отправили письмо на
          </p>
          <p className="text-neon-cyan font-medium mb-6 break-all">{registeredEmail}</p>

          <div className="glass rounded-xl p-4 mb-6 text-left space-y-3">
            {[
              { icon: "Send",           color: "text-neon-cyan",   bg: "bg-neon-cyan/15",   title: "Письмо отправлено",  desc: "Найдите письмо от GLOBAL LINK" },
              { icon: "MousePointer",   color: "text-neon-purple", bg: "bg-neon-purple/15", title: "Нажмите ссылку",      desc: "Кликните «Подтвердить email» в письме" },
              { icon: "ClipboardCheck", color: "text-neon-green",  bg: "bg-neon-green/15",  title: "Заявка на проверке",  desc: "Администратор рассмотрит вашу заявку" },
            ].map(({ icon, color, bg, title, desc }, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <Icon name={icon} size={15} className={color} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-xs text-white/40">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-white/30 text-xs mb-4">Не пришло? Проверьте папку «Спам».</p>

          {resendSent ? (
            <div className="flex items-center justify-center gap-2 text-neon-green text-sm mb-3">
              <Icon name="CheckCircle2" size={16} />Письмо отправлено повторно
            </div>
          ) : (
            <button onClick={handleResend} disabled={resendLoading}
              className="w-full py-2.5 glass text-white/50 hover:text-white rounded-xl border border-white/10 text-sm mb-3 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {resendLoading ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="RefreshCw" size={14} />}
              Отправить повторно
            </button>
          )}

          <button onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity">
            Понятно, жду письмо
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl overflow-hidden animate-scale-in max-h-[92vh] flex flex-col">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
              <span className="text-white font-oswald font-bold text-xs">GL</span>
            </div>
            <span className="font-oswald font-bold text-white">GLOBAL <span className="neon-text-cyan">LINK</span></span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white">
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-6 mt-5 bg-white/5 rounded-xl p-1 shrink-0">
          {(["login", "register"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setRegStep("main"); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-oswald font-medium transition-all ${tab === t ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}>
              {t === "login" ? "Войти" : "Регистрация"}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto scrollbar-thin flex-1">
          {/* ── LOGIN ── */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Email</label>
                <div className="flex items-center gap-3 glass rounded-xl px-4 py-3 border border-white/10 focus-within:border-neon-purple/50 transition-colors">
                  <Icon name="Mail" size={16} className="text-white/30" />
                  <input type="email" placeholder="you@example.ru" value={loginData.email}
                    onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                    className="flex-1 bg-transparent text-white placeholder:text-white/25 outline-none text-sm" required />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Пароль</label>
                <div className="flex items-center gap-3 glass rounded-xl px-4 py-3 border border-white/10 focus-within:border-neon-purple/50 transition-colors">
                  <Icon name="Lock" size={16} className="text-white/30" />
                  <input type="password" placeholder="••••••••" value={loginData.password}
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                    className="flex-1 bg-transparent text-white placeholder:text-white/25 outline-none text-sm" required />
                </div>
              </div>
              {error && <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-4 py-3 border border-neon-pink/20"><Icon name="AlertCircle" size={14} />{error}</div>}
              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <><Icon name="Loader2" size={18} className="animate-spin" />Входим...</> : "Войти"}
              </button>
              <p className="text-center text-white/30 text-xs">
                Нет аккаунта? <button type="button" onClick={() => setTab("register")} className="text-neon-cyan hover:underline">Зарегистрироваться</button>
              </p>
            </form>
          )}

          {/* ── REGISTER STEP 1: Основное ── */}
          {tab === "register" && regStep === "main" && (
            <form onSubmit={handleRegNext} className="space-y-4">
              {/* Роль */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Я регистрируюсь как</label>
                <div className="flex gap-2">
                  {([["organizer","Организатор","Route"],["venue","Площадка","Building2"]] as const).map(([val, label, icon]) => (
                    <button key={val} type="button" onClick={() => {
                      setReg("role", val);
                      if (val === "venue" && regData.companyType === "individual") setReg("companyType", "ip");
                    }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-oswald font-medium transition-all ${regData.role === val ? "bg-neon-purple/20 border-neon-purple/50 text-neon-purple" : "glass border-white/10 text-white/50 hover:border-white/25 hover:text-white"}`}>
                      <Icon name={icon} size={16} />{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Тип компании */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Организационная форма</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableTypes.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setReg("companyType", opt.value)}
                      className={`flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all ${regData.companyType === opt.value ? "bg-neon-cyan/15 border-neon-cyan/50" : "glass border-white/10 hover:border-white/25"}`}>
                      <span className={`text-sm font-medium ${regData.companyType === opt.value ? "text-neon-cyan" : "text-white/70"}`}>{opt.label}</span>
                      <span className="text-xs text-white/30 mt-0.5">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  {regData.companyType === "individual" ? "Имя и фамилия" : regData.companyType === "ip" ? "ФИО предпринимателя" : "Контактное лицо"} *
                </label>
                <input value={regData.name} onChange={e => setReg("name", e.target.value)} placeholder="Иванов Иван Иванович"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Email *</label>
                  <input type="email" value={regData.email} onChange={e => setReg("email", e.target.value)} placeholder="you@example.ru"
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Телефон *</label>
                  <input type="tel" value={regData.phone} onChange={e => setReg("phone", e.target.value)} placeholder="+7 999 000 00 00"
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Пароль *</label>
                  <input type="password" value={regData.password} onChange={e => setReg("password", e.target.value)} placeholder="Минимум 6 символов"
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Город</label>
                  <select value={regData.city} onChange={e => setReg("city", e.target.value)}
                    className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 text-sm appearance-none bg-transparent">
                    {CITIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                  </select>
                </div>
              </div>

              {error && <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-4 py-3 border border-neon-pink/20"><Icon name="AlertCircle" size={14} />{error}</div>}

              <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                Далее <Icon name="ChevronRight" size={16} />
              </button>
            </form>
          )}

          {/* ── REGISTER STEP 2: Реквизиты компании ── */}
          {tab === "register" && (regStep === "company" || regStep === "requisites") && (
            <form onSubmit={handleRegSubmit} className="space-y-4">
              <button type="button" onClick={() => setRegStep("main")}
                className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors mb-2">
                <Icon name="ArrowLeft" size={14} />Назад
              </button>

              <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 mb-2">
                <Icon name="Building2" size={14} className="text-neon-cyan shrink-0" />
                <span className="text-white/60 text-xs">
                  {availableTypes.find(o => o.value === regData.companyType)?.label} · {regData.role === "organizer" ? "Организатор" : "Площадка"}
                </span>
              </div>

              {needsCompanyInfo && (
                <>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                      {regData.companyType === "ip" ? "Полное наименование ИП" : "Полное наименование ООО"} *
                    </label>
                    <input value={regData.legalName} onChange={e => setReg("legalName", e.target.value)}
                      placeholder={regData.companyType === "ip" ? "ИП Иванов Иван Иванович" : 'ООО "Ромашка"'}
                      className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">ИНН *</label>
                      <input value={regData.inn} onChange={e => setReg("inn", e.target.value.replace(/\D/g,""))}
                        placeholder={regData.companyType === "ip" ? "12 цифр" : "10 цифр"} maxLength={12}
                        className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
                    </div>
                    {regData.companyType === "ooo" && (
                      <div>
                        <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">КПП</label>
                        <input value={regData.kpp} onChange={e => setReg("kpp", e.target.value.replace(/\D/g,""))}
                          placeholder="9 цифр" maxLength={9}
                          className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
                      </div>
                    )}
                    {regData.companyType === "ip" && (
                      <div>
                        <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">ОГРНИП</label>
                        <input value={regData.ogrn} onChange={e => setReg("ogrn", e.target.value.replace(/\D/g,""))}
                          placeholder="15 цифр" maxLength={15}
                          className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
                      </div>
                    )}
                  </div>

                  {regData.companyType === "ooo" && (
                    <div>
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">ОГРН</label>
                      <input value={regData.ogrn} onChange={e => setReg("ogrn", e.target.value.replace(/\D/g,""))}
                        placeholder="13 цифр" maxLength={13}
                        className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Юридический адрес</label>
                    <input value={regData.legalAddress} onChange={e => setReg("legalAddress", e.target.value)}
                      placeholder="г. Москва, ул. Ленина, д. 1"
                      className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
                  </div>

                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Фактический адрес</label>
                    <input value={regData.actualAddress} onChange={e => setReg("actualAddress", e.target.value)}
                      placeholder="Совпадает с юридическим или другой"
                      className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
                  </div>
                </>
              )}

              {regData.companyType === "individual" && (
                <div className="glass rounded-xl p-4 text-center">
                  <Icon name="User" size={24} className="text-neon-purple mx-auto mb-2" />
                  <p className="text-white/60 text-sm">Регистрация как физическое лицо</p>
                  <p className="text-white/30 text-xs mt-1">Реквизиты компании не требуются.<br />Вы сможете добавить их позже в личном кабинете.</p>
                </div>
              )}

              {error && <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-4 py-3 border border-neon-pink/20"><Icon name="AlertCircle" size={14} />{error}</div>}

              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
                {isLoading ? <><Icon name="Loader2" size={18} className="animate-spin" />Отправляем...</> : <><Icon name="Send" size={16} />Отправить заявку</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
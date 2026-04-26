import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth, type RegisterData, type CompanyType, type UserRole, AUTH_URL } from "@/context/AuthContext";

const CITIES = [
  "Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск",
  "Казань", "Ростов-на-Дону", "Краснодар", "Воронеж",
];

const COMPANY_TYPES: { value: CompanyType; label: string }[] = [
  { value: "individual", label: "Физическое лицо" },
  { value: "ip",         label: "ИП" },
  { value: "ooo",        label: "ООО" },
  { value: "other",      label: "Другое" },
];

const ROLE_META = {
  organizer: {
    label:    "Организатор",
    icon:     "Mic2",
    color:    "text-neon-cyan",
    gradient: "from-neon-cyan to-neon-purple",
    border:   "border-neon-cyan/40",
    bg:       "bg-neon-cyan/10",
  },
  venue: {
    label:    "Площадка",
    icon:     "Building2",
    color:    "text-neon-pink",
    gradient: "from-neon-pink to-neon-cyan",
    border:   "border-neon-pink/40",
    bg:       "bg-neon-pink/10",
  },
};

type Screen = "login" | "register" | "verify" | "twofa";

interface Props {
  initialRole?: UserRole;
}

export default function OrganizerLoginPage({ initialRole = "organizer" }: Props) {
  const navigate  = useNavigate();
  const { login, register, isLoading } = useAuth();

  const [role, setRole]     = useState<UserRole>(initialRole);
  const [screen, setScreen] = useState<Screen>("login");
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [error, setError]   = useState("");

  // Login
  const [loginEmail, setLoginEmail]       = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword]   = useState(false);

  // Register
  const emptyReg = (): RegisterData => ({
    name: "", email: "", password: "", role, city: "Москва",
    companyType: role === "venue" ? "ip" : "individual",
    legalName: "", inn: "", kpp: "", ogrn: "",
    legalAddress: "", actualAddress: "", phone: "",
  });
  const [regData, setRegData]         = useState<RegisterData>(emptyReg);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Sync role into regData when role changes
  useEffect(() => {
    setRegData(d => ({
      ...d,
      role,
      companyType: role === "venue" ? "ip" : d.companyType,
    }));
    setError("");
  }, [role]);

  // Verify
  const [verifyName, setVerifyName]   = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent]   = useState(false);

  // 2FA
  const [tfaSessionId, setTfaSessionId] = useState(""); // temp session id before code confirm
  const [tfaEmail, setTfaEmail]         = useState("");
  const [tfaCode, setTfaCode]           = useState(["", "", "", "", "", ""]);
  const [tfaLoading, setTfaLoading]     = useState(false);
  const [tfaResendLoading, setTfaResendLoading] = useState(false);
  const [tfaResendSent, setTfaResendSent]       = useState(false);
  const tfaRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const meta = ROLE_META[role];
  const setReg = (k: keyof RegisterData, v: string) => setRegData(d => ({ ...d, [k]: v }));
  const needsCompany = regData.companyType !== "individual";

  // ── Login ─────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch(`${AUTH_URL}?action=login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Неверный email или пароль"); return; }

    // Если бэкенд требует 2FA
    if (data.requires2fa) {
      setTfaSessionId(data.tempSessionId || "");
      setTfaEmail(loginEmail);
      setTfaCode(["", "", "", "", "", ""]);
      setScreen("twofa");
      setTimeout(() => tfaRefs[0].current?.focus(), 100);
      return;
    }

    // Обычный вход через AuthContext
    const msg = await login(loginEmail, loginPassword);
    if (!msg) navigate("/");
    else setError(msg);
  };

  // ── 2FA verify ────────────────────────────────────────────────────────
  const handleTfaInput = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...tfaCode];
    next[idx] = digit;
    setTfaCode(next);
    if (digit && idx < 5) tfaRefs[idx + 1].current?.focus();
    if (next.every(d => d) ) handleTfaSubmit(next.join(""));
  };

  const handleTfaKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !tfaCode[idx] && idx > 0) {
      tfaRefs[idx - 1].current?.focus();
    }
  };

  const handleTfaSubmit = async (code?: string) => {
    const finalCode = code ?? tfaCode.join("");
    if (finalCode.length < 6) return;
    setTfaLoading(true);
    setError("");
    try {
      const res = await fetch(`${AUTH_URL}?action=verify_2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempSessionId: tfaSessionId, code: finalCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Неверный код");
        setTfaCode(["", "", "", "", "", ""]);
        tfaRefs[0].current?.focus();
        return;
      }
      // Сохраняем реальную сессию
      localStorage.setItem("tourlink_session", data.sessionId);
      localStorage.setItem("tourlink_user_cache", JSON.stringify(data.user));
      navigate("/");
    } catch { setError("Ошибка соединения"); }
    finally { setTfaLoading(false); }
  };

  const handleTfaResend = async () => {
    setTfaResendLoading(true);
    try {
      await fetch(`${AUTH_URL}?action=resend_2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempSessionId: tfaSessionId }),
      });
      setTfaResendSent(true);
      setTimeout(() => setTfaResendSent(false), 5000);
    } catch { /* silent */ }
    finally { setTfaResendLoading(false); }
  };

  // ── Register step 1 ───────────────────────────────────────────────────
  const handleRegStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!regData.name.trim())         return setError("Введите имя");
    if (!regData.email.includes("@")) return setError("Введите корректный email");
    if (regData.password.length < 6)  return setError("Пароль минимум 6 символов");
    if (!regData.phone.trim())        return setError("Введите телефон");
    setRegStep(2);
  };

  // ── Register submit ───────────────────────────────────────────────────
  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (needsCompany && !regData.legalName.trim()) return setError("Введите юридическое название");
    if (needsCompany && regData.inn.length < 10)   return setError("Введите корректный ИНН");
    const msg = await register({ ...regData, role });
    if (!msg) {
      setVerifyName(regData.name.trim().split(" ")[0]);
      setVerifyEmail(regData.email.trim().toLowerCase());
      setScreen("verify");
    } else setError(msg);
  };

  const handleResend = async () => {
    if (!verifyEmail || resendLoading) return;
    setResendLoading(true);
    await fetch(`${AUTH_URL}?action=resend_verification`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: verifyEmail }),
    });
    setResendLoading(false);
    setResendSent(true);
    setTimeout(() => setResendSent(false), 5000);
  };

  // ── Shared UI ─────────────────────────────────────────────────────────
  const Bg = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-neon-cyan/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-neon-purple/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1.2s" }} />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
    </div>
  );

  const BackBtn = () => (
    <button onClick={() => navigate("/login")}
      className="absolute top-6 left-6 flex items-center gap-2 text-white/30 hover:text-white/70 text-sm transition-colors z-10">
      <Icon name="ArrowLeft" size={16} />Назад
    </button>
  );

  // ── 2FA screen ────────────────────────────────────────────────────────
  if (screen === "twofa") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <Bg />
        <BackBtn />
        <div className="relative z-10 w-full max-w-sm">
          <div className="rounded-2xl border border-white/15 shadow-2xl overflow-hidden" style={{ background: "#15152a" }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/60 to-transparent" />
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-neon-purple/20 border border-neon-purple/20 flex items-center justify-center mx-auto mb-5">
                <Icon name="ShieldCheck" size={26} className="text-neon-purple" />
              </div>
              <h2 className="font-oswald font-bold text-xl text-white mb-1">Подтверждение входа</h2>
              <p className="text-white/40 text-sm mb-1">Код отправлен на почту</p>
              <p className="text-neon-cyan text-sm font-medium mb-7">{tfaEmail}</p>

              {/* Code input */}
              <div className="flex gap-2 justify-center mb-5">
                {tfaCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={tfaRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleTfaInput(i, e.target.value)}
                    onKeyDown={e => handleTfaKeyDown(i, e)}
                    onPaste={i === 0 ? (e) => {
                      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                      if (pasted.length === 6) {
                        const arr = pasted.split("");
                        setTfaCode(arr);
                        handleTfaSubmit(pasted);
                      }
                    } : undefined}
                    className="w-10 h-12 rounded-xl border text-center text-lg font-bold text-white outline-none transition-all"
                    style={{
                      background: digit ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)",
                      borderColor: digit ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 text-neon-pink text-sm bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2 mb-4">
                  <Icon name="AlertCircle" size={14} />{error}
                </div>
              )}

              <button onClick={() => handleTfaSubmit()} disabled={tfaLoading || tfaCode.some(d => !d)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 mb-4">
                {tfaLoading ? <><Icon name="Loader2" size={15} className="animate-spin" />Проверяю...</> : <><Icon name="ShieldCheck" size={15} />Подтвердить</>}
              </button>

              <button onClick={handleTfaResend} disabled={tfaResendLoading || tfaResendSent}
                className="text-white/30 hover:text-white/60 text-sm transition-colors disabled:opacity-40">
                {tfaResendSent
                  ? <span className="text-neon-cyan flex items-center justify-center gap-1.5"><Icon name="CheckCircle2" size={14} />Отправлено!</span>
                  : tfaResendLoading ? "Отправка..." : "Отправить код повторно"}
              </button>

              <p className="text-white/20 text-xs mt-3">Код действует 10 минут</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Verify email screen ───────────────────────────────────────────────
  if (screen === "verify") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <Bg />
        <BackBtn />
        <div className="relative z-10 w-full max-w-md">
          <div className="rounded-3xl border border-white/10 p-8 shadow-2xl text-center" style={{ background: "#15152a" }}>
            <div className="w-16 h-16 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center mx-auto mb-5">
              <Icon name="Mail" size={28} className="text-neon-cyan" />
            </div>
            <h2 className="font-oswald font-bold text-2xl text-white mb-2">Подтвердите почту</h2>
            <p className="text-white/50 text-sm mb-1">{verifyName ? `${verifyName}, мы` : "Мы"} отправили письмо на</p>
            <p className="text-neon-cyan font-medium mb-6">{verifyEmail}</p>
            <p className="text-white/30 text-xs mb-6">Перейдите по ссылке в письме. Не забудьте проверить «Спам».</p>
            <button onClick={handleResend} disabled={resendLoading || resendSent}
              className="w-full py-3 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm transition-all disabled:opacity-50 mb-3">
              {resendSent
                ? <span className="flex items-center justify-center gap-2 text-neon-cyan"><Icon name="CheckCircle2" size={15} />Отправлено!</span>
                : resendLoading ? <span className="flex items-center justify-center gap-2"><Icon name="Loader2" size={15} className="animate-spin" />Отправка...</span>
                : "Отправить повторно"}
            </button>
            <button onClick={() => { setScreen("login"); setRegData(emptyReg()); setRegStep(1); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-oswald font-semibold text-sm hover:opacity-90 transition-opacity">
              Войти в аккаунт
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Register screen ───────────────────────────────────────────────────
  if (screen === "register") {
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
                {/* Role switch */}
                <button onClick={() => { setRole(role === "organizer" ? "venue" : "organizer"); setRegStep(1); setError(""); }}
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
                    <span className={`text-xs ${regStep === s ? "text-white/70" : "text-white/30"}`}>{s === 1 ? "Основное" : "Реквизиты"}</span>
                    {s < 2 && <div className={`h-px w-6 ${regStep > s ? "bg-neon-cyan/40" : "bg-white/10"}`} />}
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-3 py-2 border border-neon-pink/20 mb-4">
                  <Icon name="AlertCircle" size={14} />{error}
                </div>
              )}

              {regStep === 1 && (
                <form onSubmit={handleRegStep1} className="space-y-3">
                  <Field label="Имя / Название" icon="User">
                    <input type="text" value={regData.name} onChange={e => setReg("name", e.target.value)} placeholder="Иван Петров" className="gl-input" />
                  </Field>
                  <Field label="Email" icon="Mail">
                    <input type="email" value={regData.email} onChange={e => setReg("email", e.target.value)} placeholder="ivan@example.com" className="gl-input" />
                  </Field>
                  <Field label="Пароль" icon="Lock">
                    <div className="relative">
                      <input type={showRegPassword ? "text" : "password"} value={regData.password} onChange={e => setReg("password", e.target.value)} placeholder="Минимум 6 символов" className="gl-input pr-10" />
                      <button type="button" onClick={() => setShowRegPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                        <Icon name={showRegPassword ? "EyeOff" : "Eye"} size={15} />
                      </button>
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Телефон" icon="Phone">
                      <input type="tel" value={regData.phone} onChange={e => setReg("phone", e.target.value)} placeholder="+7 (999) 000-00-00" className="gl-input" />
                    </Field>
                    <Field label="Город" icon="MapPin">
                      <select value={regData.city} onChange={e => setReg("city", e.target.value)} className="gl-input">
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Тип организации" icon="Building2">
                    <select value={regData.companyType} onChange={e => setReg("companyType", e.target.value)} className="gl-input">
                      {(role === "venue" ? COMPANY_TYPES.filter(t => t.value !== "individual") : COMPANY_TYPES).map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </Field>
                  <button type="submit" className={`w-full py-3 bg-gradient-to-r ${meta.gradient} text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}>
                    Далее <Icon name="ArrowRight" size={16} />
                  </button>
                </form>
              )}

              {regStep === 2 && (
                <form onSubmit={handleRegSubmit} className="space-y-3">
                  {needsCompany ? (
                    <>
                      <Field label="Юридическое название" icon="Building">
                        <input type="text" value={regData.legalName} onChange={e => setReg("legalName", e.target.value)} placeholder='ООО «Концерт Груп»' className="gl-input" />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="ИНН" icon="Hash">
                          <input type="text" value={regData.inn} onChange={e => setReg("inn", e.target.value)} placeholder="1234567890" className="gl-input" maxLength={12} />
                        </Field>
                        <Field label="КПП" icon="Hash">
                          <input type="text" value={regData.kpp} onChange={e => setReg("kpp", e.target.value)} placeholder="123456789" className="gl-input" maxLength={9} />
                        </Field>
                      </div>
                      <Field label="ОГРН/ОГРНИП" icon="FileText">
                        <input type="text" value={regData.ogrn} onChange={e => setReg("ogrn", e.target.value)} placeholder="1234567890123" className="gl-input" maxLength={15} />
                      </Field>
                      <Field label="Юридический адрес" icon="MapPin">
                        <input type="text" value={regData.legalAddress} onChange={e => setReg("legalAddress", e.target.value)} placeholder="г. Москва, ул. Примерная, д. 1" className="gl-input" />
                      </Field>
                    </>
                  ) : (
                    <div className="py-3 text-center text-white/40 text-sm bg-white/5 rounded-xl border border-white/5">
                      <Icon name="Info" size={16} className="mx-auto mb-1.5 text-neon-cyan/50" />
                      Для физических лиц реквизиты не требуются
                    </div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => { setRegStep(1); setError(""); }}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm transition-all flex items-center justify-center gap-2">
                      <Icon name="ArrowLeft" size={15} />Назад
                    </button>
                    <button type="submit" disabled={isLoading}
                      className={`flex-1 py-2.5 bg-gradient-to-r ${meta.gradient} text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2`}>
                      {isLoading ? <><Icon name="Loader2" size={15} className="animate-spin" />Регистрация...</> : <><Icon name="UserPlus" size={15} />Зарегистрироваться</>}
                    </button>
                  </div>
                </form>
              )}

              <p className="mt-4 text-center text-white/30 text-sm">
                Уже есть аккаунт?{" "}
                <button onClick={() => { setScreen("login"); setError(""); setRegStep(1); }}
                  className={`${meta.color} hover:opacity-80 transition-colors font-medium`}>Войти</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Login screen ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <Bg />
      <BackBtn />
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "#15152a" }}>
          <div className={`h-px bg-gradient-to-r from-transparent via-${role === "organizer" ? "neon-cyan" : "neon-pink"}/60 to-transparent`} />

          <div className="p-7">
            {/* Header + role switcher */}
            <div className="flex items-center gap-3 mb-7">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role === "organizer" ? "from-neon-cyan/20 to-neon-purple/20" : "from-neon-pink/20 to-neon-cyan/20"} flex items-center justify-center`}>
                <Icon name={meta.icon as never} size={22} className={meta.color} />
              </div>
              <div className="flex-1">
                <h1 className="font-oswald font-bold text-xl text-white">{meta.label}</h1>
                <p className="text-white/30 text-xs">GLOBAL LINK</p>
              </div>
              {/* Switch role button */}
              <button
                onClick={() => { setRole(role === "organizer" ? "venue" : "organizer"); setError(""); }}
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 border border-white/10 rounded-lg px-3 py-1.5 transition-all hover:border-white/20"
              >
                <Icon name={role === "organizer" ? "Building2" : "Mic2"} size={12} />
                {role === "organizer" ? "Площадка" : "Организатор"}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-3 py-2 border border-neon-pink/20 mb-4">
                <Icon name="AlertCircle" size={14} />{error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email" icon="Mail">
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  placeholder="your@email.com" className="gl-input" autoComplete="email" />
              </Field>
              <Field label="Пароль" icon="Lock">
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Введите пароль" className="gl-input pr-10" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    <Icon name={showPassword ? "EyeOff" : "Eye"} size={15} />
                  </button>
                </div>
              </Field>

              <button type="submit" disabled={isLoading || !loginEmail || !loginPassword}
                className={`w-full py-3 bg-gradient-to-r ${meta.gradient} text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2`}>
                {isLoading ? <><Icon name="Loader2" size={16} className="animate-spin" />Вход...</> : <><Icon name="LogIn" size={16} />Войти</>}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-white/20 text-xs">или</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <p className="text-center text-white/30 text-sm">
              Нет аккаунта?{" "}
              <button onClick={() => { setScreen("register"); setError(""); }}
                className={`${meta.color} hover:opacity-80 transition-colors font-medium`}>
                Зарегистрироваться
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-wider mb-1.5">
        <Icon name={icon as never} size={11} />{label}
      </label>
      {children}
    </div>
  );
}

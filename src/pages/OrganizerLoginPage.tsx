import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth, type RegisterData, type CompanyType, AUTH_URL } from "@/context/AuthContext";

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

const EMPTY_REG: RegisterData = {
  name: "", email: "", password: "", role: "organizer", city: "Москва",
  companyType: "ip", legalName: "", inn: "", kpp: "", ogrn: "",
  legalAddress: "", actualAddress: "", phone: "",
};

type Screen = "login" | "register" | "verify";

export default function OrganizerLoginPage() {
  const navigate = useNavigate();
  const { login, register, isLoading } = useAuth();

  const [screen, setScreen] = useState<Screen>("login");
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register
  const [regData, setRegData] = useState<RegisterData>(EMPTY_REG);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Verify
  const [verifyName, setVerifyName] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const setReg = (k: keyof RegisterData, v: string) =>
    setRegData(d => ({ ...d, [k]: v }));

  const needsCompany = regData.companyType !== "individual";

  // ── Login ────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const msg = await login(loginEmail, loginPassword);
    if (!msg) navigate("/");
    else setError(msg);
  };

  // ── Register step 1 ──────────────────────────────────────────────────
  const handleRegStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!regData.name.trim())                return setError("Введите имя");
    if (!regData.email.includes("@"))        return setError("Введите корректный email");
    if (regData.password.length < 6)         return setError("Пароль минимум 6 символов");
    if (!regData.phone.trim())               return setError("Введите телефон");
    setRegStep(2);
  };

  // ── Register step 2 ──────────────────────────────────────────────────
  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (needsCompany && !regData.legalName.trim()) return setError("Введите юридическое название");
    if (needsCompany && regData.inn.length < 10)   return setError("Введите корректный ИНН");
    const msg = await register(regData);
    if (!msg) {
      setVerifyName(regData.name.trim().split(" ")[0]);
      setVerifyEmail(regData.email.trim().toLowerCase());
      setScreen("verify");
    } else {
      setError(msg);
    }
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

  // ── Backgrounds / decorations ────────────────────────────────────────
  const Bg = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-neon-cyan/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-neon-purple/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1.2s" }} />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );

  const BackBtn = () => (
    <button
      onClick={() => navigate("/login")}
      className="absolute top-6 left-6 flex items-center gap-2 text-white/30 hover:text-white/70 text-sm transition-colors"
    >
      <Icon name="ArrowLeft" size={16} />
      Назад
    </button>
  );

  // ── Email verify screen ───────────────────────────────────────────────
  if (screen === "verify") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <Bg />
        <BackBtn />
        <div className="relative z-10 w-full max-w-md">
          <div className="glass-strong rounded-3xl p-8 border border-white/10 text-center shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/60 to-transparent rounded-t-3xl" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20 flex items-center justify-center mx-auto mb-5">
              <Icon name="Mail" size={28} className="text-neon-cyan" />
            </div>
            <h2 className="font-oswald font-bold text-2xl text-white mb-2">
              Подтвердите почту
            </h2>
            <p className="text-white/50 text-sm mb-1">
              {verifyName ? `${verifyName}, мы` : "Мы"} отправили письмо на
            </p>
            <p className="text-neon-cyan font-medium mb-6">{verifyEmail}</p>
            <p className="text-white/30 text-xs mb-6">
              Перейдите по ссылке в письме для активации аккаунта. Не забудьте проверить папку «Спам».
            </p>
            <button
              onClick={handleResend}
              disabled={resendLoading || resendSent}
              className="w-full py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-all disabled:opacity-50"
            >
              {resendSent ? (
                <span className="flex items-center justify-center gap-2 text-neon-cyan">
                  <Icon name="CheckCircle2" size={15} /> Отправлено!
                </span>
              ) : resendLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="Loader2" size={15} className="animate-spin" /> Отправка...
                </span>
              ) : (
                "Отправить повторно"
              )}
            </button>
            <button
              onClick={() => { setScreen("login"); setRegData(EMPTY_REG); setRegStep(1); }}
              className="mt-3 w-full py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-oswald font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Войти в аккаунт
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Register ──────────────────────────────────────────────────────────
  if (screen === "register") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <Bg />
        <BackBtn />
        <div className="relative z-10 w-full max-w-md">
          <div className="glass-strong rounded-3xl p-8 border border-white/10 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/60 to-transparent rounded-t-3xl" />

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20 flex items-center justify-center">
                <Icon name="Mic2" size={18} className="text-neon-cyan" />
              </div>
              <div>
                <h1 className="font-oswald font-bold text-xl text-white">Регистрация организатора</h1>
                <p className="text-white/30 text-xs">GLOBAL LINK</p>
              </div>
            </div>

            {/* Steps */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    regStep === s
                      ? "bg-gradient-to-br from-neon-cyan to-neon-purple text-white shadow-lg shadow-neon-cyan/20"
                      : regStep > s
                      ? "bg-neon-cyan/20 text-neon-cyan"
                      : "bg-white/5 text-white/30"
                  }`}>
                    {regStep > s ? <Icon name="Check" size={12} /> : s}
                  </div>
                  <span className={`text-xs ${regStep === s ? "text-white/70" : "text-white/30"}`}>
                    {s === 1 ? "Основное" : "Реквизиты"}
                  </span>
                  {s < 2 && <div className={`flex-1 h-px w-8 ${regStep > s ? "bg-neon-cyan/40" : "bg-white/10"}`} />}
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-3 py-2 border border-neon-pink/20 mb-4">
                <Icon name="AlertCircle" size={14} />
                {error}
              </div>
            )}

            {/* Step 1 */}
            {regStep === 1 && (
              <form onSubmit={handleRegStep1} className="space-y-4">
                <Field label="Имя / Название" icon="User">
                  <input
                    type="text"
                    value={regData.name}
                    onChange={e => setReg("name", e.target.value)}
                    placeholder="Иван Петров"
                    className="gl-input"
                  />
                </Field>
                <Field label="Email" icon="Mail">
                  <input
                    type="email"
                    value={regData.email}
                    onChange={e => setReg("email", e.target.value)}
                    placeholder="ivan@example.com"
                    className="gl-input"
                  />
                </Field>
                <Field label="Пароль" icon="Lock">
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={regData.password}
                      onChange={e => setReg("password", e.target.value)}
                      placeholder="Минимум 6 символов"
                      className="gl-input pr-10"
                    />
                    <button type="button" onClick={() => setShowRegPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      <Icon name={showRegPassword ? "EyeOff" : "Eye"} size={15} />
                    </button>
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Телефон" icon="Phone">
                    <input
                      type="tel"
                      value={regData.phone}
                      onChange={e => setReg("phone", e.target.value)}
                      placeholder="+7 (999) 000-00-00"
                      className="gl-input"
                    />
                  </Field>
                  <Field label="Город" icon="MapPin">
                    <select
                      value={regData.city}
                      onChange={e => setReg("city", e.target.value)}
                      className="gl-input"
                    >
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Тип организации" icon="Building2">
                  <select
                    value={regData.companyType}
                    onChange={e => setReg("companyType", e.target.value)}
                    className="gl-input"
                  >
                    {COMPANY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>
                <button type="submit"
                  className="w-full py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  Далее <Icon name="ArrowRight" size={16} />
                </button>
              </form>
            )}

            {/* Step 2 */}
            {regStep === 2 && (
              <form onSubmit={handleRegSubmit} className="space-y-4">
                {needsCompany && (
                  <>
                    <Field label="Юридическое название" icon="Building">
                      <input
                        type="text"
                        value={regData.legalName}
                        onChange={e => setReg("legalName", e.target.value)}
                        placeholder="ООО «Концерт Груп»"
                        className="gl-input"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="ИНН" icon="Hash">
                        <input
                          type="text"
                          value={regData.inn}
                          onChange={e => setReg("inn", e.target.value)}
                          placeholder="1234567890"
                          className="gl-input"
                          maxLength={12}
                        />
                      </Field>
                      <Field label="КПП" icon="Hash">
                        <input
                          type="text"
                          value={regData.kpp}
                          onChange={e => setReg("kpp", e.target.value)}
                          placeholder="123456789"
                          className="gl-input"
                          maxLength={9}
                        />
                      </Field>
                    </div>
                    <Field label="ОГРН/ОГРНИП" icon="FileText">
                      <input
                        type="text"
                        value={regData.ogrn}
                        onChange={e => setReg("ogrn", e.target.value)}
                        placeholder="1234567890123"
                        className="gl-input"
                        maxLength={15}
                      />
                    </Field>
                    <Field label="Юридический адрес" icon="MapPin">
                      <input
                        type="text"
                        value={regData.legalAddress}
                        onChange={e => setReg("legalAddress", e.target.value)}
                        placeholder="г. Москва, ул. Примерная, д. 1"
                        className="gl-input"
                      />
                    </Field>
                    <Field label="Фактический адрес" icon="MapPin">
                      <input
                        type="text"
                        value={regData.actualAddress}
                        onChange={e => setReg("actualAddress", e.target.value)}
                        placeholder="Совпадает с юридическим"
                        className="gl-input"
                      />
                    </Field>
                  </>
                )}
                {!needsCompany && (
                  <div className="py-4 text-center text-white/40 text-sm bg-white/5 rounded-xl border border-white/5">
                    <Icon name="Info" size={18} className="mx-auto mb-2 text-neon-cyan/50" />
                    Для физических лиц реквизиты не требуются
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => { setRegStep(1); setError(""); }}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-all flex items-center justify-center gap-2">
                    <Icon name="ArrowLeft" size={15} /> Назад
                  </button>
                  <button type="submit" disabled={isLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading
                      ? <><Icon name="Loader2" size={15} className="animate-spin" /> Регистрация...</>
                      : <><Icon name="UserPlus" size={15} /> Зарегистрироваться</>}
                  </button>
                </div>
              </form>
            )}

            {/* Switch to login */}
            <p className="mt-5 text-center text-white/30 text-sm">
              Уже есть аккаунт?{" "}
              <button onClick={() => { setScreen("login"); setError(""); setRegStep(1); }}
                className="text-neon-cyan hover:text-neon-cyan/80 transition-colors font-medium">
                Войти
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Login screen ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <Bg />
      <BackBtn />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-strong rounded-3xl p-8 border border-white/10 shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/60 to-transparent rounded-t-3xl" />

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20 flex items-center justify-center">
              <Icon name="Mic2" size={22} className="text-neon-cyan" />
            </div>
            <div>
              <h1 className="font-oswald font-bold text-2xl text-white">Вход для организатора</h1>
              <p className="text-white/30 text-xs">GLOBAL LINK</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-3 py-2 border border-neon-pink/20 mb-4">
              <Icon name="AlertCircle" size={14} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Email" icon="Mail">
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="your@email.com"
                className="gl-input"
                autoComplete="email"
              />
            </Field>
            <Field label="Пароль" icon="Lock">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Введите пароль"
                  className="gl-input pr-10"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  <Icon name={showPassword ? "EyeOff" : "Eye"} size={15} />
                </button>
              </div>
            </Field>

            <button type="submit" disabled={isLoading || !loginEmail || !loginPassword}
              className="w-full py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading
                ? <><Icon name="Loader2" size={16} className="animate-spin" /> Вход...</>
                : <><Icon name="LogIn" size={16} /> Войти</>}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-white/20 text-xs">или</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Register */}
          <p className="text-center text-white/30 text-sm">
            Нет аккаунта?{" "}
            <button onClick={() => { setScreen("register"); setError(""); }}
              className="text-neon-cyan hover:text-neon-cyan/80 transition-colors font-medium">
              Зарегистрироваться
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────────
function Field({
  label, icon, children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-wider mb-1.5">
        <Icon name={icon as never} size={11} />
        {label}
      </label>
      {children}
    </div>
  );
}

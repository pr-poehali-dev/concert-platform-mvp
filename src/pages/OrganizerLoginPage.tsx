import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth, type RegisterData, type UserRole, type User, AUTH_URL } from "@/context/AuthContext";
import { ROLE_META, Bg, BackBtn, Field, ErrorBox, type Screen } from "./login/loginShared";
import TfaScreen from "./login/TfaScreen";
import VerifyScreen from "./login/VerifyScreen";
import RegisterScreen from "./login/RegisterScreen";

interface Props {
  initialRole?: UserRole;
}

export default function OrganizerLoginPage({ initialRole = "organizer" }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithSession, register, isLoading } = useAuth();

  const [role, setRole]       = useState<UserRole>(initialRole);
  const [screen, setScreen]   = useState<Screen>(searchParams.get("tab") === "register" ? "register" : "login");
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [error, setError]     = useState("");

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
  const [regData, setRegData]               = useState<RegisterData>(emptyReg);
  const [showRegPassword, setShowRegPassword] = useState(false);

  useEffect(() => {
    setRegData(d => ({
      ...d,
      role,
      companyType: role === "venue" ? "ip" : d.companyType,
    }));
    setError("");
  }, [role]);

  // Verify
  const [verifyName, setVerifyName]         = useState("");
  const [verifyEmail, setVerifyEmail]       = useState("");
  const [resendLoading, setResendLoading]   = useState(false);
  const [resendSent, setResendSent]         = useState(false);

  // 2FA
  const [tfaSessionId, setTfaSessionId]         = useState("");
  const [tfaEmail, setTfaEmail]                 = useState("");
  const [tfaCode, setTfaCode]                   = useState(["", "", "", "", "", ""]);
  const [tfaLoading, setTfaLoading]             = useState(false);
  const [tfaResendLoading, setTfaResendLoading] = useState(false);
  const [tfaResendSent, setTfaResendSent]       = useState(false);

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

    if (data.requires2fa) {
      setTfaSessionId(data.tempSessionId || "");
      setTfaEmail(loginEmail);
      setTfaCode(["", "", "", "", "", ""]);
      setScreen("twofa");
      return;
    }

    const msg = await login(loginEmail, loginPassword);
    if (!msg) navigate("/");
    else setError(msg);
  };

  // ── 2FA ───────────────────────────────────────────────────────────────
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
        return;
      }
      loginWithSession(data.sessionId, data.user as User);
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
    setRegStep(2);
  };

  // ── Register submit ───────────────────────────────────────────────────
  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Реквизиты необязательны при регистрации — можно заполнить в профиле
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

  // ── 2FA screen ────────────────────────────────────────────────────────
  if (screen === "twofa") {
    return (
      <TfaScreen
        tfaEmail={tfaEmail}
        tfaCode={tfaCode}
        tfaLoading={tfaLoading}
        tfaResendLoading={tfaResendLoading}
        tfaResendSent={tfaResendSent}
        error={error}
        setTfaCode={setTfaCode}
        onSubmit={handleTfaSubmit}
        onResend={handleTfaResend}
      />
    );
  }

  // ── Verify screen ─────────────────────────────────────────────────────
  if (screen === "verify") {
    return (
      <VerifyScreen
        verifyName={verifyName}
        verifyEmail={verifyEmail}
        resendLoading={resendLoading}
        resendSent={resendSent}
        onResend={handleResend}
        onGoLogin={() => { setScreen("login"); setRegData(emptyReg()); setRegStep(1); }}
      />
    );
  }

  // ── Register screen ───────────────────────────────────────────────────
  if (screen === "register") {
    return (
      <RegisterScreen
        role={role}
        regStep={regStep}
        regData={regData}
        showRegPassword={showRegPassword}
        isLoading={isLoading}
        error={error}
        needsCompany={needsCompany}
        onSetReg={setReg}
        onTogglePassword={() => setShowRegPassword(p => !p)}
        onStep1={handleRegStep1}
        onStep2={handleRegSubmit}
        onBackStep={() => { setRegStep(1); setError(""); }}
        onSwitchRole={() => { setRole(role === "organizer" ? "venue" : "organizer"); setRegStep(1); setError(""); }}
        onGoLogin={() => { setScreen("login"); setError(""); setRegStep(1); }}
      />
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
              <button
                onClick={() => { setRole(role === "organizer" ? "venue" : "organizer"); setError(""); }}
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 border border-white/10 rounded-lg px-3 py-1.5 transition-all hover:border-white/20"
              >
                <Icon name={role === "organizer" ? "Building2" : "Mic2"} size={12} />
                {role === "organizer" ? "Площадка" : "Организатор"}
              </button>
            </div>

            {error && <ErrorBox error={error} />}

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
                {isLoading
                  ? <><Icon name="Loader2" size={16} className="animate-spin" />Вход...</>
                  : <><Icon name="LogIn" size={16} />Войти</>}
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
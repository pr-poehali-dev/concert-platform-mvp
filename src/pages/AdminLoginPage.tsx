import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { ADMIN_URL } from "@/components/admin/types";
import AdminPage from "@/components/AdminPage";

const STORAGE_KEY = "gl_admin_token";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  // Validate saved token on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    fetch(`${ADMIN_URL}?action=stats`, {
      headers: { "X-Admin-Token": saved },
    })
      .then(r => { if (!r.ok) { localStorage.removeItem(STORAGE_KEY); setToken(null); } })
      .catch(() => { localStorage.removeItem(STORAGE_KEY); setToken(null); });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_URL}?action=login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Неверный пароль");
        return;
      }
      localStorage.setItem(STORAGE_KEY, data.token);
      setToken(data.token);
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setPassword("");
    setError("");
  };

  // If authenticated — render full admin panel
  if (token) {
    return <AdminPage externalToken={token} onExternalLogout={handleLogout} />;
  }

  // ── Login screen ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-15%] w-[600px] h-[600px] bg-neon-purple/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-neon-pink/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-[35%] right-[20%] w-[250px] h-[250px] bg-neon-cyan/5 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: "0.8s" }} />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(168,85,247,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.5) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
        {/* Scanline */}
        <div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-purple/20 to-transparent"
          style={{ animation: "scanline 8s linear infinite", top: 0 }}
        />
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate("/login")}
        className="absolute top-6 left-6 flex items-center gap-2 text-white/30 hover:text-white/70 text-sm transition-colors z-10"
      >
        <Icon name="ArrowLeft" size={16} />
        Назад
      </button>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="relative glass-strong rounded-3xl p-8 border border-white/10 shadow-2xl shadow-neon-purple/10">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/70 to-transparent rounded-t-3xl" />
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-neon-purple/5 to-transparent pointer-events-none" />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shadow-lg shadow-neon-purple/40">
                <Icon name="ShieldCheck" size={30} className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-neon-pink border-2 border-background flex items-center justify-center">
                <Icon name="Lock" size={10} className="text-white" />
              </div>
            </div>
            <h1 className="font-oswald font-bold text-2xl text-white tracking-wide">
              Admin Panel
            </h1>
            <p className="text-white/30 text-xs tracking-widest uppercase mt-0.5">
              GLOBAL LINK
            </p>
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-2 bg-neon-purple/10 border border-neon-purple/20 rounded-xl px-3 py-2.5 mb-6">
            <Icon name="ShieldAlert" size={14} className="text-neon-purple mt-0.5 flex-shrink-0" />
            <p className="text-white/40 text-xs leading-relaxed">
              Доступ только для авторизованных сотрудников. Все действия логируются.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-wider mb-1.5">
                <Icon name="KeyRound" size={11} />
                Пароль администратора
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyUp={e => setCapsLock(e.getModifierState("CapsLock"))}
                  placeholder="Введите секретный пароль"
                  className="gl-input pr-10 focus:border-neon-purple/40"
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <Icon name={showPassword ? "EyeOff" : "Eye"} size={15} />
                </button>
              </div>
              {capsLock && (
                <p className="text-yellow-400/70 text-xs mt-1 flex items-center gap-1">
                  <Icon name="AlertTriangle" size={11} />
                  Включён CapsLock
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-3 py-2 border border-neon-pink/20">
                <Icon name="XCircle" size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-neon-purple/20"
            >
              {loading ? (
                <><Icon name="Loader2" size={16} className="animate-spin" /> Проверка...</>
              ) : (
                <><Icon name="LogIn" size={16} /> Войти в панель</>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
            <span className="text-white/15 text-xs">
              © 2025 GLOBAL LINK
            </span>
            <div className="flex items-center gap-1 text-white/15 text-xs">
              <Icon name="Shield" size={11} />
              Защищённое соединение
            </div>
          </div>
        </div>

        {/* Attempt counter hint */}
        <p className="text-center text-white/15 text-xs mt-4">
          При ошибке входа обратитесь к системному администратору
        </p>
      </div>
    </div>
  );
}

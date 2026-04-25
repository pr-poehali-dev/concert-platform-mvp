import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth, UserRole } from "@/context/AuthContext";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

const cities = ["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Казань", "Ростов-на-Дону", "Краснодар", "Воронеж"];

export default function AuthModal({ open, onClose, defaultTab = "login" }: AuthModalProps) {
  const { login, register, isLoading } = useAuth();
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [error, setError] = useState("");

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [regData, setRegData] = useState({
    name: "",
    email: "",
    password: "",
    role: "organizer" as UserRole,
    city: "Москва",
  });

  if (!open) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const ok = await login(loginData.email, loginData.password);
    if (ok) {
      onClose();
    } else {
      setError("Неверный email или пароль");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!regData.name.trim()) return setError("Введите имя");
    if (!regData.email.includes("@")) return setError("Введите корректный email");
    if (regData.password.length < 6) return setError("Пароль минимум 6 символов");
    const ok = await register(regData);
    if (ok) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl overflow-hidden animate-scale-in">
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
              <span className="text-white font-oswald font-bold text-xs">TL</span>
            </div>
            <span className="font-oswald font-bold text-white">TOUR<span className="neon-text-cyan">LINK</span></span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-6 mt-5 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-oswald font-medium transition-all ${
              tab === "login" ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"
            }`}
          >
            Войти
          </button>
          <button
            onClick={() => { setTab("register"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-oswald font-medium transition-all ${
              tab === "register" ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"
            }`}
          >
            Регистрация
          </button>
        </div>

        <div className="p-6">
          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Email</label>
                <div className="flex items-center gap-3 glass rounded-xl px-4 py-3 border border-white/10 focus-within:border-neon-purple/50 transition-colors">
                  <Icon name="Mail" size={16} className="text-white/30" />
                  <input
                    type="email"
                    placeholder="you@example.ru"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="flex-1 bg-transparent text-white placeholder:text-white/25 outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Пароль</label>
                <div className="flex items-center gap-3 glass rounded-xl px-4 py-3 border border-white/10 focus-within:border-neon-purple/50 transition-colors">
                  <Icon name="Lock" size={16} className="text-white/30" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="flex-1 bg-transparent text-white placeholder:text-white/25 outline-none text-sm"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-4 py-3 border border-neon-pink/20">
                  <Icon name="AlertCircle" size={14} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Icon name="Loader2" size={18} className="animate-spin" />
                    Входим...
                  </>
                ) : "Войти"}
              </button>

              <div className="text-center">
                <p className="text-white/30 text-xs mb-3">Тестовые аккаунты:</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginData({ email: "org@example.ru", password: "123456" })}
                    className="flex-1 py-2 text-xs glass rounded-lg text-white/50 hover:text-neon-cyan hover:border-neon-cyan/30 border border-white/10 transition-colors"
                  >
                    Организатор
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginData({ email: "venue@example.ru", password: "123456" })}
                    className="flex-1 py-2 text-xs glass rounded-lg text-white/50 hover:text-neon-cyan hover:border-neon-cyan/30 border border-white/10 transition-colors"
                  >
                    Площадка
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role picker */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Я регистрируюсь как</label>
                <div className="flex gap-2">
                  {([["organizer", "Организатор", "Route"], ["venue", "Площадка", "Building2"]] as const).map(([val, label, icon]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRegData({ ...regData, role: val })}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                        regData.role === val
                          ? "bg-neon-purple/20 border-neon-purple/60 text-neon-purple"
                          : "border-white/10 text-white/50 hover:text-white hover:border-white/20 glass"
                      }`}
                    >
                      <Icon name={icon} size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  {regData.role === "organizer" ? "Ваше имя" : "Название площадки"}
                </label>
                <div className="flex items-center gap-3 glass rounded-xl px-4 py-3 border border-white/10 focus-within:border-neon-purple/50 transition-colors">
                  <Icon name="User" size={16} className="text-white/30" />
                  <input
                    type="text"
                    placeholder={regData.role === "organizer" ? "Иван Иванов" : "Название клуба"}
                    value={regData.name}
                    onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                    className="flex-1 bg-transparent text-white placeholder:text-white/25 outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Email</label>
                <div className="flex items-center gap-3 glass rounded-xl px-4 py-3 border border-white/10 focus-within:border-neon-purple/50 transition-colors">
                  <Icon name="Mail" size={16} className="text-white/30" />
                  <input
                    type="email"
                    placeholder="you@example.ru"
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    className="flex-1 bg-transparent text-white placeholder:text-white/25 outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Пароль</label>
                  <div className="flex items-center gap-3 glass rounded-xl px-4 py-3 border border-white/10 focus-within:border-neon-purple/50 transition-colors">
                    <Icon name="Lock" size={16} className="text-white/30" />
                    <input
                      type="password"
                      placeholder="••••••"
                      value={regData.password}
                      onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                      className="flex-1 bg-transparent text-white placeholder:text-white/25 outline-none text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Город</label>
                  <div className="flex items-center gap-2 glass rounded-xl px-3 py-3 border border-white/10 focus-within:border-neon-purple/50 transition-colors">
                    <Icon name="MapPin" size={16} className="text-white/30 shrink-0" />
                    <select
                      value={regData.city}
                      onChange={(e) => setRegData({ ...regData, city: e.target.value })}
                      className="flex-1 bg-transparent text-white outline-none text-sm appearance-none cursor-pointer"
                    >
                      {cities.map((c) => (
                        <option key={c} value={c} className="bg-gray-900">{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-4 py-3 border border-neon-pink/20">
                  <Icon name="AlertCircle" size={14} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Icon name="Loader2" size={18} className="animate-spin" />
                    Создаём аккаунт...
                  </>
                ) : "Создать аккаунт"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

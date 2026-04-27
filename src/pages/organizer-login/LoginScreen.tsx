import Icon from "@/components/ui/icon";
import type { UserRole } from "@/context/AuthContext";
import { ROLE_META } from "./loginTypes";
import { Bg, BackBtn, Field, ErrorBox } from "./LoginShared";

interface Props {
  role: UserRole;
  loginEmail: string;
  loginPassword: string;
  showPassword: boolean;
  isLoading: boolean;
  error: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchRole: () => void;
  onGoRegister: () => void;
}

export default function LoginScreen({
  role, loginEmail, loginPassword, showPassword,
  isLoading, error,
  onEmailChange, onPasswordChange, onTogglePassword,
  onSubmit, onSwitchRole, onGoRegister,
}: Props) {
  const meta = ROLE_META[role];

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
                onClick={onSwitchRole}
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 border border-white/10 rounded-lg px-3 py-1.5 transition-all hover:border-white/20"
              >
                <Icon name={role === "organizer" ? "Building2" : "Mic2"} size={12} />
                {role === "organizer" ? "Площадка" : "Организатор"}
              </button>
            </div>

            {error && <ErrorBox error={error} />}

            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Email" icon="Mail">
                <input type="email" value={loginEmail} onChange={e => onEmailChange(e.target.value)}
                  placeholder="your@email.com" className="gl-input" autoComplete="email" />
              </Field>
              <Field label="Пароль" icon="Lock">
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={loginPassword}
                    onChange={e => onPasswordChange(e.target.value)}
                    placeholder="Введите пароль" className="gl-input pr-10" autoComplete="current-password" />
                  <button type="button" onClick={onTogglePassword}
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
              <button onClick={onGoRegister} className={`${meta.color} hover:opacity-80 transition-colors font-medium`}>
                Зарегистрироваться
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

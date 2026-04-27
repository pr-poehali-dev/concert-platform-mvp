import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { Bg, BackBtn } from "./LoginShared";

// ── Verify Email Screen ───────────────────────────────────────────────────────

interface VerifyProps {
  verifyName: string;
  verifyEmail: string;
  resendLoading: boolean;
  resendSent: boolean;
  onResend: () => void;
  onGoLogin: () => void;
}

export function VerifyScreen({ verifyName, verifyEmail, resendLoading, resendSent, onResend, onGoLogin }: VerifyProps) {
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
          <button onClick={onResend} disabled={resendLoading || resendSent}
            className="w-full py-3 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm transition-all disabled:opacity-50 mb-3">
            {resendSent
              ? <span className="flex items-center justify-center gap-2 text-neon-cyan"><Icon name="CheckCircle2" size={15} />Отправлено!</span>
              : resendLoading
                ? <span className="flex items-center justify-center gap-2"><Icon name="Loader2" size={15} className="animate-spin" />Отправка...</span>
                : "Отправить повторно"}
          </button>
          <button onClick={onGoLogin}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-oswald font-semibold text-sm hover:opacity-90 transition-opacity">
            Войти в аккаунт
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 2FA Screen ────────────────────────────────────────────────────────────────

interface TfaProps {
  tfaEmail: string;
  tfaCode: string[];
  tfaLoading: boolean;
  tfaResendLoading: boolean;
  tfaResendSent: boolean;
  error: string;
  onCodeChange: (code: string[]) => void;
  onSubmit: (code?: string) => void;
  onResend: () => void;
}

export function TfaScreen({
  tfaEmail, tfaCode, tfaLoading, tfaResendLoading, tfaResendSent,
  error, onCodeChange, onSubmit, onResend,
}: TfaProps) {
  const tfaRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleInput = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...tfaCode];
    next[idx] = digit;
    onCodeChange(next);
    if (digit && idx < 5) tfaRefs[idx + 1].current?.focus();
    if (next.every(d => d)) onSubmit(next.join(""));
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !tfaCode[idx] && idx > 0) {
      tfaRefs[idx - 1].current?.focus();
    }
  };

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
                  onChange={e => handleInput(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={i === 0 ? (e) => {
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    if (pasted.length === 6) {
                      onCodeChange(pasted.split(""));
                      onSubmit(pasted);
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

            <button onClick={() => onSubmit()} disabled={tfaLoading || tfaCode.some(d => !d)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 mb-4">
              {tfaLoading ? <><Icon name="Loader2" size={15} className="animate-spin" />Проверяю...</> : <><Icon name="ShieldCheck" size={15} />Подтвердить</>}
            </button>

            <button onClick={onResend} disabled={tfaResendLoading || tfaResendSent}
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
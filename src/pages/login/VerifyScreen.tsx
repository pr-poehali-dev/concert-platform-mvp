import Icon from "@/components/ui/icon";
import { Bg, BackBtn } from "./loginShared";

interface Props {
  verifyName: string;
  verifyEmail: string;
  resendLoading: boolean;
  resendSent: boolean;
  onResend: () => void;
  onGoLogin: () => void;
}

export default function VerifyScreen({
  verifyName, verifyEmail, resendLoading, resendSent, onResend, onGoLogin,
}: Props) {
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

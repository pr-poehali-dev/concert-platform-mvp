import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { AUTH_URL } from "@/context/AuthContext";

type State = "loading" | "success" | "error" | "expired" | "no_token";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>("loading");
  const [userName, setUserName] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const token = searchParams.get("token") || searchParams.get("verify");
    if (!token) {
      setState("no_token");
      return;
    }

    fetch(`${AUTH_URL}?action=verify_email&token=${encodeURIComponent(token)}`)
      .then(r => { if (!r.ok && r.status >= 500) throw new Error("server"); return r.json(); })
      .then(data => {
        if (data.confirmed) {
          setUserName(data.name || "");
          setState("success");
        } else {
          const msg = data.error || "Ошибка подтверждения";
          setErrorText(msg);
          if (msg.includes("устарела") || msg.includes("истёк") || msg.includes("истек")) {
            setState("expired");
          } else if (msg.includes("использована") || msg.includes("использован")) {
            // Уже подтверждена — тоже успех
            setUserName("");
            setState("success");
          } else {
            setState("error");
          }
        }
      })
      .catch(() => {
        setErrorText("Ошибка соединения с сервером");
        setState("error");
      });
  }, []);

  const Bg = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-neon-purple/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-neon-cyan/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
    </div>
  );

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <Bg />
        <div className="relative z-10 text-center">
          <Icon name="Loader2" size={40} className="text-neon-purple animate-spin mx-auto mb-4" />
          <p className="text-white/50 font-oswald text-lg">Подтверждаем email…</p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <Bg />
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="rounded-3xl border border-white/10 p-10 shadow-2xl" style={{ background: "#15152a" }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/60 to-transparent rounded-t-3xl" />

            <div className="w-20 h-20 rounded-2xl bg-neon-cyan/15 border border-neon-cyan/25 flex items-center justify-center mx-auto mb-6">
              <Icon name="MailCheck" size={36} className="text-neon-cyan" />
            </div>

            <h1 className="font-oswald font-bold text-2xl text-white mb-2">
              {userName ? `${userName}, почта подтверждена!` : "Email подтверждён!"}
            </h1>
            <p className="text-white/40 text-sm mb-8">
              Теперь вы можете пользоваться всеми функциями платформы GLOBAL LINK
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate("/login")}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-oswald font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Icon name="LogIn" size={16} />
                Войти в аккаунт
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full py-3 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all"
              >
                На главную
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <Bg />
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="rounded-3xl border border-white/10 p-10 shadow-2xl" style={{ background: "#15152a" }}>
            <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-6">
              <Icon name="Clock" size={36} className="text-amber-400" />
            </div>
            <h1 className="font-oswald font-bold text-2xl text-white mb-2">Ссылка устарела</h1>
            <p className="text-white/40 text-sm mb-8">
              Ссылка действительна 24 часа. Войдите и запросите новое письмо подтверждения в разделе «Безопасность».
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Icon name="LogIn" size={16} />
              Войти в аккаунт
            </button>
          </div>
        </div>
      </div>
    );
  }

  // error / no_token
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <Bg />
      <div className="relative z-10 w-full max-w-md text-center">
        <div className="rounded-3xl border border-white/10 p-10 shadow-2xl" style={{ background: "#15152a" }}>
          <div className="w-20 h-20 rounded-2xl bg-neon-pink/10 border border-neon-pink/20 flex items-center justify-center mx-auto mb-6">
            <Icon name="XCircle" size={36} className="text-neon-pink" />
          </div>
          <h1 className="font-oswald font-bold text-2xl text-white mb-2">
            {state === "no_token" ? "Ссылка недействительна" : "Ошибка подтверждения"}
          </h1>
          <p className="text-white/40 text-sm mb-8">
            {errorText || "Попробуйте запросить новое письмо подтверждения из личного кабинета."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all"
          >
            На главную
          </button>
        </div>
      </div>
    </div>
  );
}
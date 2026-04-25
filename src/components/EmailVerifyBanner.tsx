import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { AUTH_URL } from "@/context/AuthContext";

type State = "idle" | "loading" | "success" | "error" | "expired";

export default function EmailVerifyBanner() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("verify");
    if (!token) return;

    // Убираем токен из URL сразу, не перезагружая страницу
    const clean = window.location.pathname;
    window.history.replaceState({}, "", clean);

    setState("loading");
    fetch(`${AUTH_URL}?action=verify_email&token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.confirmed) {
          setState("success");
          setMessage(data.name ? `${data.name}, ваш email подтверждён!` : "Email успешно подтверждён!");
        } else {
          if (data.error?.includes("устарела")) {
            setState("expired");
          } else {
            setState("error");
          }
          setMessage(data.error || "Ошибка подтверждения");
        }
      })
      .catch(() => {
        setState("error");
        setMessage("Ошибка соединения, попробуйте ещё раз");
      });
  }, []);

  if (state === "idle") return null;

  const CONFIG = {
    loading: { bg: "bg-neon-purple/10 border-neon-purple/20", icon: "Loader2", iconCls: "animate-spin text-neon-purple", text: "Подтверждаем ваш email…" },
    success: { bg: "bg-neon-green/10 border-neon-green/20",   icon: "CheckCircle2", iconCls: "text-neon-green",  text: message },
    error:   { bg: "bg-neon-pink/10 border-neon-pink/20",     icon: "XCircle",      iconCls: "text-neon-pink",   text: message },
    expired: { bg: "bg-white/5 border-white/10",              icon: "Clock",        iconCls: "text-white/40",    text: message },
  }[state];

  return (
    <div className={`fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pt-3 pointer-events-none`}>
      <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-sm pointer-events-auto max-w-md w-full shadow-xl ${CONFIG.bg} animate-fade-in`}>
        <Icon name={CONFIG.icon} size={20} className={`shrink-0 ${CONFIG.iconCls}`} />
        <p className="text-white text-sm font-medium flex-1">{CONFIG.text}</p>
        {state !== "loading" && (
          <button onClick={() => setState("idle")} className="text-white/30 hover:text-white transition-colors shrink-0">
            <Icon name="X" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

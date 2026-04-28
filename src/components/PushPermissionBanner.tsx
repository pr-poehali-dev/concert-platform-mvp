import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/context/AuthContext";

const DISMISSED_KEY = "gl_push_dismissed";

export default function PushPermissionBanner() {
  const { user } = useAuth();
  const { state, isSupported, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!user || !isSupported) return;
    // Показываем если ещё не спрашивали и не отклонили
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;
    if (state === "default") {
      // Небольшая задержка чтобы не мешать загрузке
      const t = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(t);
    }
  }, [user, state, isSupported]);

  const handleAllow = async () => {
    setSubscribing(true);
    await subscribe();
    setSubscribing(false);
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm animate-scale-in px-4">
      <div className="glass-strong rounded-2xl border border-neon-purple/30 shadow-2xl shadow-neon-purple/20 p-4">
        <div className="flex items-start gap-3">
          {/* Иконка с пульсом */}
          <div className="w-10 h-10 rounded-xl bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center shrink-0 relative">
            <Icon name="Bell" size={18} className="text-neon-purple" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-neon-pink rounded-full animate-pulse border-2 border-background" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Включить уведомления?</p>
            <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
              Получай оповещения о новых задачах, сообщениях и бронированиях прямо на устройство
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleAllow}
                disabled={subscribing}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white text-xs font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {subscribing ? (
                  <><Icon name="Loader2" size={13} className="animate-spin" />Подключаю...</>
                ) : (
                  <><Icon name="BellRing" size={13} />Включить</>
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-white/35 hover:text-white/60 text-xs transition-colors rounded-xl hover:bg-white/5"
              >
                Не сейчас
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-6 h-6 flex items-center justify-center text-white/25 hover:text-white/60 transition-colors shrink-0"
          >
            <Icon name="X" size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

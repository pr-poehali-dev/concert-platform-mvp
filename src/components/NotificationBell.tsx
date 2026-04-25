import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useNotifications } from "@/context/NotificationsContext";
import { useAuth } from "@/context/AuthContext";

interface NotificationBellProps {
  onNavigate: (page: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}

const TYPE_COLORS: Record<string, string> = {
  message: "text-neon-cyan bg-neon-cyan/15 border-neon-cyan/20",
  booking: "text-neon-purple bg-neon-purple/15 border-neon-purple/20",
  review: "text-neon-green bg-neon-green/15 border-neon-green/20",
  system: "text-white/60 bg-white/5 border-white/10",
  tour: "text-neon-pink bg-neon-pink/15 border-neon-pink/20",
  venue: "text-neon-cyan bg-neon-cyan/15 border-neon-cyan/20",
};

export default function NotificationBell({ onNavigate }: NotificationBellProps) {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markRead, markAllRead, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику вне панели
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!user) return null;

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) refresh();
  };

  const handleClick = (n: { id: string; isRead: boolean; linkPage: string }) => {
    if (!n.isRead) markRead(n.id);
    if (n.linkPage) onNavigate(n.linkPage);
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all ${open ? "bg-neon-purple/20 text-neon-purple" : "glass text-white/60 hover:text-white"} border border-white/10 hover:border-neon-purple/30`}
      >
        <Icon name="Bell" size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-neon-pink rounded-full text-white text-[10px] font-bold flex items-center justify-center border border-background animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/15 overflow-hidden animate-scale-in z-50 shadow-2xl shadow-black/80" style={{ background: "#13131f" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10" style={{ background: "#1a1a2e" }}>
            <div className="flex items-center gap-2">
              <span className="font-oswald font-semibold text-white">Уведомления</span>
              {unreadCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 bg-neon-pink/20 text-neon-pink rounded-md font-medium">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-white/40 hover:text-neon-cyan transition-colors"
                >
                  Прочитать все
                </button>
              )}
              <button onClick={() => refresh()} className="text-white/30 hover:text-white transition-colors">
                <Icon name={loading ? "Loader2" : "RefreshCw"} size={13} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Icon name="BellOff" size={22} className="text-white/20" />
                </div>
                <p className="text-white/30 text-sm">Нет уведомлений</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${!n.isRead ? "bg-white/3" : ""}`}
                >
                  {/* Icon badge */}
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-sm shrink-0 mt-0.5 ${TYPE_COLORS[n.type] || TYPE_COLORS.system}`}>
                    {n.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-tight ${!n.isRead ? "text-white font-medium" : "text-white/70"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 bg-neon-purple rounded-full shrink-0 mt-1" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{n.body}</p>
                    )}
                    <p className="text-xs text-white/25 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/10" style={{ background: "#1a1a2e" }}>
              <button
                onClick={() => { onNavigate("dashboard"); setOpen(false); }}
                className="w-full text-center text-xs text-white/40 hover:text-neon-cyan transition-colors"
              >
                Открыть кабинет
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
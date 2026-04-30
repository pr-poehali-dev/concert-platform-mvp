import Icon from "@/components/ui/icon";
import type { Notification } from "@/context/NotificationsContext";

interface DashboardNotificationsTabProps {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  onNavigate?: (page: string) => void;
}

const TYPE_COLOR: Record<string, string> = {
  message: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20",
  booking: "text-neon-purple bg-neon-purple/10 border-neon-purple/20",
  review:  "text-neon-green bg-neon-green/10 border-neon-green/20",
  tour:    "text-neon-pink bg-neon-pink/10 border-neon-pink/20",
  venue:   "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20",
  system:  "text-white/70 bg-white/5 border-white/10",
};

export default function DashboardNotificationsTab({
  notifications,
  unreadCount,
  markRead,
  markAllRead,
  onNavigate,
}: DashboardNotificationsTabProps) {
  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-oswald font-bold text-2xl text-white">Уведомления</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-neon-pink/20 text-neon-pink rounded-lg font-medium border border-neon-pink/20">
              {unreadCount} новых
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 glass text-white/70 hover:text-neon-cyan rounded-xl border border-white/10 text-sm transition-colors">
            <Icon name="CheckCheck" size={14} />Прочитать все
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <Icon name="BellOff" size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/65 text-lg font-oswald">Нет уведомлений</p>
          <p className="text-white/25 text-sm mt-1">Здесь будут появляться сообщения и запросы</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.isRead) markRead(n.id);
                if (n.linkPage && onNavigate) onNavigate(n.linkPage);
              }}
              className={`flex items-start gap-4 glass rounded-2xl p-4 transition-all ${n.linkPage ? "cursor-pointer hover:bg-white/5" : "cursor-default"} ${!n.isRead ? "border border-neon-purple/20" : ""}`}
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${TYPE_COLOR[n.type] || TYPE_COLOR.system}`}>
                {n.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${!n.isRead ? "text-white" : "text-white/70"}`}>{n.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-white/25">
                      {new Date(n.createdAt).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {!n.isRead && <span className="w-2 h-2 bg-neon-purple rounded-full" />}
                    {n.linkPage && <Icon name="ChevronRight" size={14} className="text-white/20" />}
                  </div>
                </div>
                {n.body && <p className="text-xs text-white/65 mt-0.5">{n.body}</p>}
                <p className="text-xs text-white/20 mt-1">
                  {new Date(n.createdAt).toLocaleDateString("ru", { day: "numeric", month: "long" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
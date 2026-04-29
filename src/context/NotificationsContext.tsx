import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { startPolling, stopPolling } from "@/lib/polling";
import { useAuth } from "@/context/AuthContext";

const NOTIF_URL = "https://functions.poehali.dev/68f4b989-d93d-4a45-af4c-d54ad6815826";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  linkPage: string;
  isRead: boolean;
  createdAt: string;
  icon: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  sendNotification: (userId: string, type: string, title: string, body: string, linkPage?: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (silent = false) => {
    if (!user) { setNotifications([]); return; }
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${NOTIF_URL}?action=list&user_id=${user.id}`);
      if (!res.ok) throw new Error("notifications fetch failed");
      const data = await res.json();
      const next: Notification[] = data.notifications || [];
      // Diff — перерисовываем только если изменился список или статус прочтения
      setNotifications(prev => {
        const sig = (arr: Notification[]) => arr.map(n => `${n.id}:${n.isRead}`).join(",");
        return sig(prev) === sig(next) ? prev : next;
      });
    } catch {
      // silent
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refresh();
    const id = startPolling(() => refresh(true), 10000);
    return () => stopPolling(id);
  }, [user, refresh]);

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await fetch(`${NOTIF_URL}?action=read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const markAllRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    await fetch(`${NOTIF_URL}?action=read_all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
  };

  const sendNotification = async (
    userId: string, type: string, title: string, body: string, linkPage = ""
  ) => {
    await fetch(`${NOTIF_URL}?action=create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, type, title, body, linkPage }),
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, loading, refresh, markRead, markAllRead, sendNotification }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
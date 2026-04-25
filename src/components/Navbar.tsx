import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import NotificationBell from "@/components/NotificationBell";

const CHAT_URL = "https://functions.poehali.dev/85035195-bd7b-44ce-b77c-db1255f711b5";

interface NavbarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Navbar({ activePage, onNavigate }: NavbarProps) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: "login" | "register" }>({ open: false, tab: "login" });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  const fetchChatUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${CHAT_URL}?action=conversations&user_id=${user.id}`);
      const data = await res.json();
      const total = (data.conversations || []).reduce((s: number, c: { unread: number }) => s + (c.unread || 0), 0);
      setChatUnread(total);
    } catch { /* silent */ }
  }, [user]);

  // Сброс при переходе в чат
  useEffect(() => {
    if (activePage === "chat") setChatUnread(0);
  }, [activePage]);

  // Загружаем и обновляем каждые 15 сек
  useEffect(() => {
    if (!user) { setChatUnread(0); return; }
    fetchChatUnread();
    const t = setInterval(fetchChatUnread, 15000);
    return () => clearInterval(t);
  }, [user, fetchChatUnread]);

  const navItems = [
    ...(!user ? [{ id: "home", label: "Главная", icon: "Home" }] : []),
    { id: "search", label: "Площадки", icon: "Search" },
    ...(user?.role !== "venue" ? [{ id: "tours", label: "Туры", icon: "Route" }] : []),
    ...(user?.role === "organizer" ? [{ id: "projects", label: "Проекты", icon: "FolderOpen" }] : []),
    ...(user ? [{ id: "chat", label: "Сообщения", icon: "MessageCircle" }] : []),
  ];

  const roleLabel = user?.role === "organizer" ? "Организатор" : "Площадка";
  const roleColor = user?.role === "organizer" ? "text-neon-purple" : "text-neon-cyan";

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => onNavigate("home")}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center animate-glow-pulse">
                <span className="text-white font-oswald font-bold text-sm">GL</span>
              </div>
              <span className="font-oswald font-bold text-lg text-white hidden sm:block">
                GLOBAL <span className="neon-text-cyan">LINK</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activePage === item.id
                      ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/40"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon name={item.icon} size={16} />
                  {item.label}
                  {item.id === "chat" && chatUnread > 0 && (
                    <Badge className="bg-neon-pink text-white text-xs px-1.5 py-0 h-4 min-w-4">{chatUnread > 9 ? "9+" : chatUnread}</Badge>
                  )}
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {user && <NotificationBell onNavigate={onNavigate} />}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2.5 px-3 py-1.5 glass rounded-xl border border-white/10 hover:border-neon-purple/40 transition-colors"
                  >
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-xs`}>
                      {user.avatar}
                    </div>
                    <div className="text-left">
                      <p className="text-white text-xs font-medium leading-none">{user.name}</p>
                      <p className={`text-xs leading-none mt-0.5 ${roleColor}`}>{roleLabel}</p>
                    </div>
                    <Icon name="ChevronDown" size={14} className="text-white/40" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 glass-strong rounded-xl border border-white/10 overflow-hidden animate-scale-in">
                      <button
                        onClick={() => { onNavigate("dashboard"); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Icon name="LayoutDashboard" size={15} />
                        Личный кабинет
                      </button>
                      <div className="h-px bg-white/10 mx-3" />
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neon-pink hover:bg-neon-pink/10 transition-colors"
                      >
                        <Icon name="LogOut" size={15} />
                        Выйти
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setAuthModal({ open: true, tab: "login" })}
                    className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    Войти
                  </button>
                  <button
                    onClick={() => setAuthModal({ open: true, tab: "register" })}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-neon-purple to-neon-cyan rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Регистрация
                  </button>
                </>
              )}
            </div>

            <button
              className="md:hidden text-white/70 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Icon name={mobileOpen ? "X" : "Menu"} size={24} />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden glass border-t border-white/10 animate-fade-in">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activePage === item.id
                      ? "bg-neon-purple/20 text-neon-purple"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                  {item.id === "chat" && chatUnread > 0 && (
                    <Badge className="ml-auto bg-neon-pink text-white text-xs px-1.5 py-0 h-4 min-w-4">{chatUnread > 9 ? "9+" : chatUnread}</Badge>
                  )}
                </button>
              ))}

              {user ? (
                <div className="pt-2 pb-1 space-y-1">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-sm`}>
                      {user.avatar}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{user.name}</p>
                      <p className={`text-xs ${roleColor}`}>{roleLabel}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { onNavigate("dashboard"); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Icon name="LayoutDashboard" size={16} />
                    Личный кабинет
                  </button>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neon-pink hover:bg-neon-pink/10 rounded-lg transition-colors"
                  >
                    <Icon name="LogOut" size={16} />
                    Выйти
                  </button>
                </div>
              ) : (
                <div className="pt-2 pb-1 flex gap-2">
                  <button
                    onClick={() => { setAuthModal({ open: true, tab: "login" }); setMobileOpen(false); }}
                    className="flex-1 py-2 text-sm text-white/70 border border-white/20 rounded-lg hover:border-white/40 transition-colors"
                  >
                    Войти
                  </button>
                  <button
                    onClick={() => { setAuthModal({ open: true, tab: "register" }); setMobileOpen(false); }}
                    className="flex-1 py-2 text-sm font-medium text-white bg-gradient-to-r from-neon-purple to-neon-cyan rounded-lg"
                  >
                    Регистрация
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthModal
        open={authModal.open}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        defaultTab={authModal.tab}
      />
    </>
  );
}
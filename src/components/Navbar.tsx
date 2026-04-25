import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

interface NavbarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Navbar({ activePage, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Главная", icon: "Home" },
    { id: "search", label: "Площадки", icon: "Search" },
    { id: "tours", label: "Туры", icon: "Route" },
    { id: "chat", label: "Сообщения", icon: "MessageCircle" },
    { id: "profile", label: "Профиль", icon: "User" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onNavigate("home")}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center animate-glow-pulse">
              <span className="text-white font-oswald font-bold text-sm">TL</span>
            </div>
            <span className="font-oswald font-bold text-lg text-white hidden sm:block">
              TOUR<span className="neon-text-cyan">LINK</span>
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
                {item.id === "chat" && (
                  <Badge className="bg-neon-pink text-white text-xs px-1.5 py-0 h-4 min-w-4">3</Badge>
                )}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors">
              Войти
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-neon-purple to-neon-cyan rounded-lg hover:opacity-90 transition-opacity">
              Регистрация
            </button>
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
              </button>
            ))}
            <div className="pt-2 pb-1 flex gap-2">
              <button className="flex-1 py-2 text-sm text-white/70 border border-white/20 rounded-lg hover:border-white/40 transition-colors">
                Войти
              </button>
              <button className="flex-1 py-2 text-sm font-medium text-white bg-gradient-to-r from-neon-purple to-neon-cyan rounded-lg">
                Регистрация
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

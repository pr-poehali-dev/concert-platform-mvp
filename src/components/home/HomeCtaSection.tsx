import Icon from "@/components/ui/icon";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

interface Props {
  onNavigate: (page: string) => void;
}

export default function HomeCtaSection({ onNavigate }: Props) {
  const { user } = useAuth();
  const [authModal, setAuthModal] = useState<{ open: boolean; role: "organizer" | "venue" }>({ open: false, role: "organizer" });

  return (
    <>
      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-1 bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-neon-purple/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-neon-cyan/10 rounded-full blur-3xl" />

            <h2 className="font-oswald font-bold text-4xl sm:text-5xl text-white uppercase mb-4 relative z-10">
              Готовы начать?
            </h2>
            <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto relative z-10">
              Присоединяйтесь к сотням организаторов и площадок, которые уже работают через GLOBAL LINK
            </p>
            <div className="flex flex-wrap justify-center gap-4 relative z-10">
              {user ? (
                <button
                  onClick={() => onNavigate("tours")}
                  className="px-8 py-4 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold text-lg rounded-xl hover:opacity-90 transition-opacity hover:shadow-lg hover:shadow-neon-purple/30"
                >
                  Мои туры
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setAuthModal({ open: true, role: "organizer" })}
                    className="px-8 py-4 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold text-lg rounded-xl hover:opacity-90 transition-opacity hover:shadow-lg hover:shadow-neon-purple/30"
                  >
                    Я организатор
                  </button>
                  <button
                    onClick={() => setAuthModal({ open: true, role: "venue" })}
                    className="px-8 py-4 glass-strong text-white font-oswald font-semibold text-lg rounded-xl hover:bg-white/10 transition-all border border-white/20"
                  >
                    Я площадка
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <AuthModal
        open={authModal.open}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        defaultTab="register"
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-oswald font-bold text-white/20 tracking-widest text-sm">GLOBAL LINK</span>
          <div className="flex items-center gap-5 text-xs text-white/25">
            <a href="/privacy" target="_blank" rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors">
              Политика конфиденциальности
            </a>
            <span>·</span>
            <span>© 2025 GLOBAL LINK</span>
          </div>
        </div>
      </footer>
    </>
  );
}

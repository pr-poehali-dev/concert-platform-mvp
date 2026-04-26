import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

export default function LoginSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-neon-purple/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-neon-cyan/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-neon-pink/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-purple via-neon-cyan to-neon-pink flex items-center justify-center mb-4 shadow-lg shadow-neon-purple/30">
            <Icon name="Globe" size={32} className="text-white" />
          </div>
          <h1 className="font-oswald font-bold text-4xl text-white tracking-wider mb-1">
            GLOBAL LINK
          </h1>
          <p className="text-white/40 text-sm tracking-widest uppercase">
            Платформа для концертов
          </p>
        </div>

        {/* Card */}
        <div className="relative glass-strong rounded-3xl p-8 border border-white/10 shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/60 to-transparent rounded-t-3xl" />

          <h2 className="font-oswald font-semibold text-2xl text-white text-center mb-2">
            Выберите тип входа
          </h2>
          <p className="text-white/40 text-sm text-center mb-8">
            Войдите как организатор или перейдите в панель администратора
          </p>

          <div className="space-y-4">
            {/* Organizer */}
            <button
              onClick={() => navigate("/login/organizer")}
              className="group w-full relative flex items-center gap-5 p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-neon-cyan/40 transition-all duration-300 cursor-pointer text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20 flex items-center justify-center flex-shrink-0 group-hover:from-neon-cyan/30 group-hover:to-neon-purple/30 transition-all">
                <Icon name="Mic2" size={24} className="text-neon-cyan" />
              </div>
              <div className="flex-1">
                <div className="font-oswald font-semibold text-white text-lg leading-tight">
                  Организатор
                </div>
                <div className="text-white/40 text-sm mt-0.5">
                  Управление турами, бронирование площадок
                </div>
              </div>
              <Icon
                name="ChevronRight"
                size={20}
                className="text-white/20 group-hover:text-neon-cyan transition-colors"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-neon-cyan/0 via-neon-cyan/0 to-neon-cyan/0 group-hover:from-transparent group-hover:via-neon-cyan/5 group-hover:to-transparent transition-all" />
            </button>

            {/* Admin */}
            <button
              onClick={() => navigate("/login/admin")}
              className="group w-full relative flex items-center gap-5 p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-neon-purple/40 transition-all duration-300 cursor-pointer text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 border border-neon-purple/20 flex items-center justify-center flex-shrink-0 group-hover:from-neon-purple/30 group-hover:to-neon-pink/30 transition-all">
                <Icon name="ShieldCheck" size={24} className="text-neon-purple" />
              </div>
              <div className="flex-1">
                <div className="font-oswald font-semibold text-white text-lg leading-tight">
                  Администратор
                </div>
                <div className="text-white/40 text-sm mt-0.5">
                  Управление платформой и пользователями
                </div>
              </div>
              <Icon
                name="ChevronRight"
                size={20}
                className="text-white/20 group-hover:text-neon-purple transition-colors"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-neon-purple/0 via-neon-purple/0 to-neon-purple/0 group-hover:from-transparent group-hover:via-neon-purple/5 group-hover:to-transparent transition-all" />
            </button>
          </div>

          {/* Back to main */}
          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <button
              onClick={() => navigate("/")}
              className="text-white/30 hover:text-white/60 text-sm transition-colors inline-flex items-center gap-1.5"
            >
              <Icon name="ArrowLeft" size={14} />
              Вернуться на главную
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

const HERO_IMAGE = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/e1d7542c-8ded-4ad1-8101-77b43e4b65bf.jpg";

interface HomeStats {
  venues: number; organizers: number; cities: number; totalUsers: number;
}

interface Props {
  onNavigate: (page: string) => void;
  stats: HomeStats | null;
  installPrompt: (Event & { prompt: () => void }) | null;
  installed: boolean;
  onInstall: () => void;
}

export default function HomeHeroSection({ onNavigate, stats, installPrompt, installed, onInstall }: Props) {
  return (
    <>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        {/* Decorative orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-neon-cyan/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6 animate-fade-in">
              <div className="h-px w-12 bg-neon-purple" />
              <Badge className="bg-neon-purple/20 text-neon-purple border-neon-purple/40 font-golos text-xs tracking-wider uppercase">
                Платформа для музыкальной индустрии
              </Badge>
            </div>

            <h1
              className="font-oswald font-bold text-6xl sm:text-7xl lg:text-8xl uppercase leading-none mb-6 animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="text-white">Соединяем</span>
              <br />
              <span className="gradient-text">Музыкантов</span>
              <br />
              <span className="text-white/70">и Площадки</span>
            </h1>

            <p
              className="text-white/60 text-lg sm:text-xl max-w-xl mb-10 leading-relaxed animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              Организуйте гастрольные туры, находите площадки по всей стране,
              управляйте райдерами и общайтесь напрямую — всё в одном сервисе.
            </p>

            <div
              className="flex flex-wrap gap-4 animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <button
                onClick={() => onNavigate("search")}
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold text-lg rounded-xl hover:opacity-90 transition-all duration-200 hover:shadow-lg hover:shadow-neon-purple/30"
              >
                Найти площадку
                <Icon name="ArrowRight" size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => onNavigate("tours")}
                className="flex items-center gap-2 px-8 py-4 glass text-white font-oswald font-semibold text-lg rounded-xl hover:bg-white/10 transition-all duration-200"
              >
                <Icon name="Route" size={20} />
                Создать тур
              </button>
              {installPrompt && !installed && (
                <button
                  onClick={onInstall}
                  className="flex items-center gap-2 px-8 py-4 border border-neon-purple/40 bg-neon-purple/10 text-neon-purple font-oswald font-semibold text-lg rounded-xl hover:bg-neon-purple/20 transition-all duration-200"
                >
                  <Icon name="Download" size={20} />
                  Установить приложение
                </button>
              )}
              {installed && (
                <div className="flex items-center gap-2 px-6 py-4 border border-neon-green/30 bg-neon-green/10 text-neon-green font-oswald font-semibold text-lg rounded-xl">
                  <Icon name="CheckCircle2" size={20} />
                  Приложение установлено
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
          <Icon name="ChevronDown" size={24} className="text-white/30" />
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: stats ? stats.venues.toLocaleString("ru-RU") : "—", label: "Площадок", icon: "Building2" },
              { value: stats ? (stats.organizers + 40).toLocaleString("ru-RU") : "—", label: "Организаторов", icon: "Users" },
              { value: stats ? stats.cities.toLocaleString("ru-RU") : "—", label: "Городов", icon: "MapPin" },
              { value: stats ? (stats.totalUsers + 40).toLocaleString("ru-RU") : "—", label: "Пользователей", icon: "UserCheck" },
            ].map((stat, i) => (
              <div key={i} className="text-center glass rounded-2xl p-6 hover-lift">
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-purple/15 flex items-center justify-center">
                    <Icon name={stat.icon} size={20} className="text-neon-purple" />
                  </div>
                </div>
                <div className="font-oswald font-bold text-3xl gradient-text mb-1">
                  {stats ? stat.value : <span className="text-white/20 text-2xl animate-pulse">...</span>}
                </div>
                <div className="text-white/50 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

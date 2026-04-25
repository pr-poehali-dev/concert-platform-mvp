import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

const HERO_IMAGE = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/e1d7542c-8ded-4ad1-8101-77b43e4b65bf.jpg";
const VENUE_IMAGE = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/2d0113c6-c12e-42b6-9cd4-2141cf50ef4f.jpg";
const CONCERT_IMAGE = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/69adfe90-676c-44a2-b9f1-8f6bf1c0f9b9.jpg";

const stats = [
  { value: "1 200+", label: "Площадок", icon: "Building2" },
  { value: "340+", label: "Организаторов", icon: "Users" },
  { value: "89", label: "Городов", icon: "MapPin" },
  { value: "4.9", label: "Средний рейтинг", icon: "Star" },
];

const features = [
  {
    icon: "Search",
    title: "Поиск площадок",
    desc: "Фильтрация по городу, вместимости, оборудованию и цене. Находите идеальную площадку за минуты.",
    color: "neon-purple",
  },
  {
    icon: "Route",
    title: "Планирование туров",
    desc: "Управляйте гастрольными маршрутами с несколькими городами. Полный контроль расписания.",
    color: "neon-cyan",
  },
  {
    icon: "MessageCircle",
    title: "Чат и переговоры",
    desc: "Прямое общение между организаторами и площадками. Всё в одном месте.",
    color: "neon-pink",
  },
  {
    icon: "FileText",
    title: "Технические райдеры",
    desc: "Создавайте и отправляйте технические требования. Площадки заранее знают, что нужно подготовить.",
    color: "neon-green",
  },
  {
    icon: "Star",
    title: "Рейтинги и отзывы",
    desc: "Честная система оценок между организаторами и площадками. Репутация решает всё.",
    color: "neon-purple",
  },
  {
    icon: "Shield",
    title: "Условия аренды",
    desc: "Прозрачные условия сотрудничества, цены и договорённости в одном месте.",
    color: "neon-cyan",
  },
];

const venues = [
  { name: "Volta", city: "Москва", capacity: "1 200", rating: 4.9, type: "Клуб", tags: ["Свет", "Звук", "Гримёрки"] },
  { name: "Зал Ожидания", city: "СПб", capacity: "600", rating: 4.8, type: "Концертный зал", tags: ["Стоянка", "Бар", "Сцена"] },
  { name: "Teleclub", city: "Екб", capacity: "2 500", rating: 4.7, type: "Клуб", tags: ["Свет", "Звук", "VIP"] },
];

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const colorMap: Record<string, string> = {
    "neon-purple": "text-neon-purple bg-neon-purple/10 border-neon-purple/20",
    "neon-cyan": "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20",
    "neon-pink": "text-neon-pink bg-neon-pink/10 border-neon-pink/20",
    "neon-green": "text-neon-green bg-neon-green/10 border-neon-green/20",
  };

  return (
    <div className="min-h-screen">
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
            {stats.map((stat, i) => (
              <div
                key={i}
                className="text-center glass rounded-2xl p-6 hover-lift"
              >
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-purple/15 flex items-center justify-center">
                    <Icon name={stat.icon} size={20} className="text-neon-purple" />
                  </div>
                </div>
                <div className="font-oswald font-bold text-3xl gradient-text mb-1">{stat.value}</div>
                <div className="text-white/50 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40 mb-4">Возможности платформы</Badge>
            <h2 className="font-oswald font-bold text-4xl sm:text-5xl text-white uppercase mb-4">
              Всё, что нужно для <span className="gradient-text">успешного тура</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Инструменты, которые ускоряют организацию концертов и снижают количество переписки
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-6 hover-lift group cursor-pointer"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${colorMap[f.color]}`}>
                  <Icon name={f.icon} size={22} />
                </div>
                <h3 className="font-oswald font-semibold text-xl text-white mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOP VENUES */}
      <section className="py-24 relative">
        <div className="absolute inset-0 gradient-bg-purple opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <Badge className="bg-neon-pink/20 text-neon-pink border-neon-pink/40 mb-4">Топ площадки</Badge>
              <h2 className="font-oswald font-bold text-4xl sm:text-5xl text-white uppercase">
                Популярные <span className="neon-text-purple">площадки</span>
              </h2>
            </div>
            <button
              onClick={() => onNavigate("search")}
              className="hidden sm:flex items-center gap-2 text-neon-cyan hover:text-white transition-colors text-sm"
            >
              Все площадки <Icon name="ArrowRight" size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {venues.map((venue, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden hover-lift group cursor-pointer">
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={i === 0 ? HERO_IMAGE : i === 1 ? VENUE_IMAGE : CONCERT_IMAGE}
                    alt={venue.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <Badge className="absolute top-3 right-3 bg-background/60 backdrop-blur text-white border-white/20 text-xs">
                    {venue.type}
                  </Badge>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-oswald font-bold text-xl text-white">{venue.name}</h3>
                    <div className="flex items-center gap-1 text-neon-green">
                      <Icon name="Star" size={14} className="fill-current" />
                      <span className="text-sm font-medium">{venue.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-white/50 text-sm mb-3">
                    <Icon name="MapPin" size={14} />
                    {venue.city}
                    <span className="mx-2">·</span>
                    <Icon name="Users" size={14} />
                    {venue.capacity} чел.
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {venue.tags.map((tag, j) => (
                      <span key={j} className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-white/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              Присоединяйтесь к сотням организаторов и площадок, которые уже работают через TourLink
            </p>
            <div className="flex flex-wrap justify-center gap-4 relative z-10">
              <button className="px-8 py-4 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold text-lg rounded-xl hover:opacity-90 transition-opacity hover:shadow-lg hover:shadow-neon-purple/30">
                Я организатор
              </button>
              <button className="px-8 py-4 glass-strong text-white font-oswald font-semibold text-lg rounded-xl hover:bg-white/10 transition-all border border-white/20">
                Я площадка
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

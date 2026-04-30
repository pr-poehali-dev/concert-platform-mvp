import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";

const HERO_IMAGE = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/e1d7542c-8ded-4ad1-8101-77b43e4b65bf.jpg";
const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";

interface VenueTop {
  id: string; name: string; city: string; venueType: string;
  capacity: number; photoUrl: string; rating: number; tags: string[];
}

interface HomeStats {
  venues: number; organizers: number; cities: number; totalUsers: number;
}

const features = [
  {
    icon: "Search",       title: "Поиск площадок",
    desc: "Фильтрация по городу, вместимости, оборудованию и цене. Находите идеальную площадку за минуты.",
    color: "neon-purple", tag: null,
  },
  {
    icon: "Route",        title: "Планирование туров",
    desc: "Гастрольные маршруты с несколькими городами, датами и площадками. Полный контроль расписания.",
    color: "neon-cyan",   tag: null,
  },
  {
    icon: "TrendingUp",   title: "Финансы и P&L",
    desc: "Бюджет, доходы, расходы. Налоги считаются автоматически. Полный отчёт одним кликом.",
    color: "neon-green",  tag: null,
  },
  {
    icon: "MessageCircle", title: "Чат и почта",
    desc: "Встроенный чат с площадками и командой + полноценный почтовый клиент с IMAP/SMTP.",
    color: "neon-pink",   tag: null,
  },
  {
    icon: "PenLine",      title: "ЭДО с подписью",
    desc: "Электронные договоры с юридической силой. Создавайте и подписывайте прямо в платформе.",
    color: "neon-purple", tag: null,
  },
  {
    icon: "ClipboardList", title: "CRM система",
    desc: "Задачи, дедлайны, воронки, контакты и история — полноценный CRM под туры и бронирования.",
    color: "neon-cyan",   tag: null,
  },
  {
    icon: "Briefcase",    title: "Логистика тура",
    desc: "Авиа, ЖД, отели для всей команды. Интеграция с Авиасейлс, РЖД, Ostrovok.",
    color: "neon-green",  tag: null,
  },
  {
    icon: "Ticket",       title: "Синхронизация билетов",
    desc: "Импорт продаж из Яндекс Афиши, Kassir.ru, Ticketmaster и других агрегаторов в реальном времени.",
    color: "neon-pink",   tag: null,
  },
  {
    icon: "Users",        title: "Команда и сотрудники",
    desc: "Добавляйте сотрудников с гибкими правами. Зарплаты, документы (паспорт, ИНН, СНИЛС) и расчётные листки.",
    color: "neon-purple", tag: "Новое",
  },
  {
    icon: "Wine",         title: "Бар-интеграция",
    desc: "Подключите iiko Cloud или R-Keeper. Продажи, остатки склада и смены прямо в кабинете площадки.",
    color: "neon-cyan",   tag: "Новое",
  },
  {
    icon: "Mail",         title: "Email-рассылка отчётов",
    desc: "Ежедневные отчёты по продажам и остаткам бара на почту. Расписание и мгновенная отправка.",
    color: "neon-green",  tag: null,
  },
  {
    icon: "Bell",         title: "Push-уведомления",
    desc: "Уведомления о сообщениях, задачах, дедлайнах и событиях тура — в браузере и на телефоне.",
    color: "neon-pink",   tag: null,
  },
];

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { user } = useAuth();
  const [authModal, setAuthModal] = useState<{ open: boolean; role: "organizer" | "venue" }>({ open: false, role: "organizer" });
  const [topVenues, setTopVenues] = useState<VenueTop[]>([]);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt: () => void } | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const safeFetch = async (url: string): Promise<unknown> => {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        return await r.json();
      } catch {
        return null;
      }
    };
    safeFetch(`${VENUES_URL}?action=home_stats`).then(d => { if (d) setStats(d as HomeStats); });
    safeFetch(`${VENUES_URL}?action=top`).then(d => {
      if (d && typeof d === "object" && "venues" in d) setTopVenues((d as { venues: VenueTop[] }).venues || []);
    });

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as Event & { prompt: () => void });
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.prompt = () => {};
    setInstallPrompt(null);
  };

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
              {installPrompt && !installed && (
                <button
                  onClick={handleInstall}
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
                className="glass rounded-2xl p-6 hover-lift group cursor-pointer relative overflow-hidden"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {f.tag && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neon-purple/20 text-neon-purple border border-neon-purple/30">
                    {f.tag}
                  </span>
                )}
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

          {topVenues.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Icon name="Building2" size={48} className="text-white/15 mx-auto mb-4" />
              <p className="text-white/40 font-oswald text-lg">Площадки появятся здесь</p>
              <p className="text-white/25 text-sm mt-1">Станьте первой площадкой на платформе</p>
              <button
                onClick={() => setAuthModal({ open: true, role: "venue" })}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Зарегистрировать площадку
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topVenues.map((venue, i) => (
                <div key={venue.id}
                  onClick={() => onNavigate("search")}
                  className="glass rounded-2xl overflow-hidden hover-lift group cursor-pointer">
                  <div className="relative h-40 overflow-hidden">
                    {venue.photoUrl ? (
                      <img src={venue.photoUrl} alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-neon-purple/20 to-neon-cyan/10 flex items-center justify-center">
                        <Icon name="Building2" size={48} className="text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <Badge className="absolute top-3 right-3 bg-background/60 backdrop-blur text-white border-white/20 text-xs">
                      {venue.venueType}
                    </Badge>
                    {i === 0 && (
                      <Badge className="absolute top-3 left-3 bg-neon-purple/80 text-white border-neon-purple/40 text-xs">
                        ТОП
                      </Badge>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-oswald font-bold text-xl text-white">{venue.name}</h3>
                      {venue.rating > 0 && (
                        <div className="flex items-center gap-1 text-neon-green shrink-0">
                          <Icon name="Star" size={14} className="fill-current" />
                          <span className="text-sm font-medium">{venue.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-white/50 text-sm mb-3">
                      <Icon name="MapPin" size={14} />
                      {venue.city}
                      <span className="mx-2">·</span>
                      <Icon name="Users" size={14} />
                      {venue.capacity.toLocaleString("ru-RU")} чел.
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {venue.tags.slice(0, 4).map((tag, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-white/50">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="py-24 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="bg-neon-green/20 text-neon-green border-neon-green/40 mb-4">Интеграции</Badge>
            <h2 className="font-oswald font-bold text-4xl sm:text-5xl text-white uppercase mb-4">
              Работает с вашими <span className="neon-text-cyan">системами</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Подключите кассовую систему, агрегаторы билетов и сервисы логистики — данные приходят автоматически
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                icon: "Wine", color: "neon-cyan", title: "iiko Cloud / R-Keeper",
                desc: "Продажи бара в реальном времени, остатки склада и отчёты по сменам. Экспорт в Excel одним кликом.",
                tags: ["Продажи", "Склад", "Смены", "Excel"],
              },
              {
                icon: "Ticket", color: "neon-purple", title: "Агрегаторы билетов",
                desc: "Яндекс Афиша, Kassir.ru, Ticketmaster — продажи синхронизируются в P&L автоматически.",
                tags: ["Яндекс Афиша", "Kassir", "Ticketmaster"],
              },
              {
                icon: "Briefcase", color: "neon-pink", title: "Логистика",
                desc: "Авиасейлс, РЖД, Ostrovok. Бронируйте перелёты, поезда и отели для всей команды в одном окне.",
                tags: ["Авиасейлс", "РЖД", "Ostrovok"],
              },
            ].map((int, i) => (
              <div key={i} className="glass rounded-2xl p-6 hover-lift">
                <div className={`w-12 h-12 rounded-xl bg-${int.color}/10 border border-${int.color}/20 flex items-center justify-center mb-4`}>
                  <Icon name={int.icon as never} size={22} className={`text-${int.color}`} />
                </div>
                <h3 className="font-oswald font-semibold text-xl text-white mb-2">{int.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-4">{int.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {int.tags.map((t, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-white/50">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Для кого */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-8 border border-neon-purple/15">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-neon-purple/15 flex items-center justify-center">
                  <Icon name="Route" size={20} className="text-neon-purple" />
                </div>
                <div>
                  <p className="text-white font-oswald font-bold text-lg">Для организаторов</p>
                  <p className="text-white/40 text-xs">Полное управление туром</p>
                </div>
              </div>
              <ul className="space-y-2">
                {["Поиск и бронирование площадок", "Финансы и P&L автоматически", "ЭДО и подписание договоров", "CRM: задачи, дедлайны, воронки", "Логистика для всей команды", "Синхронизация продаж из агрегаторов", "Сотрудники: права, зарплаты, документы"].map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/65">
                    <Icon name="CheckCircle" size={14} className="text-neon-purple shrink-0" />{t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-2xl p-8 border border-neon-cyan/15">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-neon-cyan/15 flex items-center justify-center">
                  <Icon name="Building2" size={20} className="text-neon-cyan" />
                </div>
                <div>
                  <p className="text-white font-oswald font-bold text-lg">Для площадок</p>
                  <p className="text-white/40 text-xs">Личный кабинет площадки</p>
                </div>
              </div>
              <ul className="space-y-2">
                {["Каталог с фото, схемой и ценами", "Чат с организаторами", "CRM бронирований и проектов", "Интеграция с iiko / R-Keeper", "Отчёты бара: продажи, склад, смены", "Email-рассылка отчётов по расписанию", "Управление командой и зарплатами"].map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/65">
                    <Icon name="CheckCircle" size={14} className="text-neon-cyan shrink-0" />{t}
                  </li>
                ))}
              </ul>
            </div>
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
    </div>
  );
}
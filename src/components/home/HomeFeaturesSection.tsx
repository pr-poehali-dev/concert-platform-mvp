import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

interface VenueTop {
  id: string; name: string; city: string; venueType: string;
  capacity: number; photoUrl: string; rating: number; tags: string[];
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

const colorMap: Record<string, string> = {
  "neon-purple": "text-neon-purple bg-neon-purple/10 border-neon-purple/20",
  "neon-cyan":   "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20",
  "neon-pink":   "text-neon-pink bg-neon-pink/10 border-neon-pink/20",
  "neon-green":  "text-neon-green bg-neon-green/10 border-neon-green/20",
};

interface Props {
  onNavigate: (page: string) => void;
  topVenues: VenueTop[];
  onRegisterVenue: () => void;
}

export default function HomeFeaturesSection({ onNavigate, topVenues, onRegisterVenue }: Props) {
  return (
    <>
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
                onClick={onRegisterVenue}
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
    </>
  );
}

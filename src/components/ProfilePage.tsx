import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

const CONCERT_IMAGE = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/69adfe90-676c-44a2-b9f1-8f6bf1c0f9b9.jpg";
const VENUE_IMAGE = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/2d0113c6-c12e-42b6-9cd4-2141cf50ef4f.jpg";

const reviews = [
  {
    id: 1,
    author: "Volta",
    type: "Площадка",
    rating: 5,
    text: "Отличная организация тура! Все требования были соблюдены, коммуникация на высшем уровне. Рекомендуем сотрудничество.",
    date: "15 авг 2025",
    avatar: "V",
    avatarColor: "from-neon-purple to-neon-pink",
  },
  {
    id: 2,
    author: "Космонавт",
    type: "Площадка",
    rating: 5,
    text: "Профессиональный подход, чёткие требования в райдере. Всё прошло без сюрпризов. Будем рады видеть снова.",
    date: "3 июл 2025",
    avatar: "К",
    avatarColor: "from-neon-cyan to-neon-green",
  },
  {
    id: 3,
    author: "Teleclub",
    type: "Площадка",
    rating: 4,
    text: "Хорошая коммуникация, понятный технический райдер. Небольшие задержки с подтверждением, но в целом — всё отлично.",
    date: "19 июн 2025",
    avatar: "T",
    avatarColor: "from-neon-pink to-neon-purple",
  },
];

const pastTours = [
  { name: "Весенний тур", year: 2025, cities: 6, status: "Завершён" },
  { name: "Осенний тур", year: 2024, cities: 4, status: "Завершён" },
  { name: "Новогодний", year: 2024, cities: 3, status: "Завершён" },
];

type ProfileType = "organizer" | "venue";

export default function ProfilePage() {
  const [profileType, setProfileType] = useState<ProfileType>("organizer");
  const [activeTab, setActiveTab] = useState("about");

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={profileType === "organizer" ? CONCERT_IMAGE : VENUE_IMAGE}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

        {/* Type switcher */}
        <div className="absolute top-6 right-6">
          <div className="flex items-center gap-1 glass-strong rounded-xl p-1">
            <button
              onClick={() => setProfileType("organizer")}
              className={`px-4 py-2 rounded-lg text-sm font-oswald font-medium transition-all ${
                profileType === "organizer"
                  ? "bg-neon-purple text-white"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Организатор
            </button>
            <button
              onClick={() => setProfileType("venue")}
              className={`px-4 py-2 rounded-lg text-sm font-oswald font-medium transition-all ${
                profileType === "venue"
                  ? "bg-neon-cyan text-background"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Площадка
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Profile card */}
        <div className="-mt-16 flex items-end gap-6 mb-8 flex-wrap">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center font-oswald font-bold text-4xl text-white border-4 border-background shadow-xl animate-glow-pulse shrink-0">
            {profileType === "organizer" ? "АС" : "MC"}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-oswald font-bold text-3xl text-white">
                {profileType === "organizer" ? "Алексей Соколов" : "Music Club"}
              </h1>
              <Badge className="bg-neon-green/20 text-neon-green border-neon-green/40 flex items-center gap-1">
                <Icon name="BadgeCheck" size={12} />
                Верифицирован
              </Badge>
              <Badge className={`${profileType === "organizer" ? "bg-neon-purple/20 text-neon-purple border-neon-purple/40" : "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40"}`}>
                {profileType === "organizer" ? "Организатор туров" : "Концертная площадка"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-white/50 text-sm flex-wrap">
              <span className="flex items-center gap-1">
                <Icon name="MapPin" size={14} />
                {profileType === "organizer" ? "Москва" : "Санкт-Петербург"}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="Star" size={14} className="text-neon-green fill-current" />
                <span className="text-white font-medium">4.9</span>
                <span>(47 отзывов)</span>
              </span>
              <span className="flex items-center gap-1">
                <Icon name="Calendar" size={14} />
                На платформе с 2023
              </span>
            </div>
          </div>
          <button className="px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity">
            Написать
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {(profileType === "organizer"
            ? [
                { icon: "Route", label: "Туров", value: "13" },
                { icon: "MapPin", label: "Городов", value: "47" },
                { icon: "Users", label: "Площадок", value: "32" },
                { icon: "Star", label: "Рейтинг", value: "4.9" },
              ]
            : [
                { icon: "Building2", label: "Концертов", value: "284" },
                { icon: "Users", label: "Вместимость", value: "1 200" },
                { icon: "Star", label: "Рейтинг", value: "4.9" },
                { icon: "Clock", label: "Работает", value: "5 лет" },
              ]
          ).map((s, i) => (
            <div key={i} className="glass rounded-2xl p-5 text-center hover-lift">
              <Icon name={s.icon} size={22} className="text-neon-purple mx-auto mb-2" />
              <div className="font-oswald font-bold text-2xl gradient-text">{s.value}</div>
              <div className="text-white/40 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 glass rounded-xl p-1 w-fit">
          {[
            { id: "about", label: "О себе", icon: "User" },
            { id: "tours", label: profileType === "organizer" ? "Туры" : "История", icon: "Route" },
            { id: "reviews", label: "Отзывы", icon: "Star" },
            { id: "rider", label: "Райдер", icon: "FileText" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-neon-purple text-white"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "about" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="glass rounded-2xl p-6">
              <h3 className="font-oswald font-semibold text-white text-xl mb-4">
                {profileType === "organizer" ? "Об организаторе" : "О площадке"}
              </h3>
              <p className="text-white/60 leading-relaxed">
                {profileType === "organizer"
                  ? "Организатор концертов и туров с 8-летним опытом. Специализируюсь на рок, электронной и поп-музыке. Работал с такими артистами как Звери, Би-2, Noize MC. Ценю прозрачность условий и профессиональный подход."
                  : "Концертная площадка в центре Санкт-Петербурга на 1200 мест. Профессиональное световое и звуковое оборудование, 4 гримёрные комнаты, вместительная сцена 15×10 м. Принимаем концерты любого уровня."}
              </p>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="font-oswald font-semibold text-white text-xl mb-4">Контакты</h3>
              <div className="space-y-3">
                {[
                  { icon: "Mail", label: "Email", value: profileType === "organizer" ? "sokolov@example.ru" : "booking@musicclub.ru" },
                  { icon: "Phone", label: "Телефон", value: "+7 (495) 123-45-67" },
                  { icon: "Globe", label: "Сайт", value: profileType === "organizer" ? "sokolov-events.ru" : "musicclub-spb.ru" },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neon-purple/15 flex items-center justify-center">
                      <Icon name={c.icon} size={15} className="text-neon-purple" />
                    </div>
                    <div>
                      <p className="text-xs text-white/30">{c.label}</p>
                      <p className="text-sm text-white/80">{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "tours" && (
          <div className="space-y-3 animate-fade-in">
            {pastTours.map((tour, i) => (
              <div key={i} className="glass rounded-xl p-5 flex items-center justify-between hover-lift">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neon-purple/15 flex items-center justify-center">
                    <Icon name="Route" size={20} className="text-neon-purple" />
                  </div>
                  <div>
                    <h4 className="font-oswald font-semibold text-white">{tour.name} {tour.year}</h4>
                    <p className="text-sm text-white/40">{tour.cities} городов</p>
                  </div>
                </div>
                <Badge className="bg-neon-green/10 text-neon-green border-neon-green/30">{tour.status}</Badge>
              </div>
            ))}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-4 glass rounded-2xl p-5 mb-6">
              <div className="text-center">
                <div className="font-oswald font-bold text-5xl gradient-text">4.9</div>
                <div className="flex gap-0.5 mt-1 justify-center">
                  {[1,2,3,4,5].map((s) => (
                    <Icon key={s} name="Star" size={14} className="text-neon-green fill-current" />
                  ))}
                </div>
                <p className="text-white/30 text-xs mt-1">47 отзывов</p>
              </div>
              <div className="flex-1 space-y-2">
                {[[5,38],[4,7],[3,2]].map(([stars, count]) => (
                  <div key={stars} className="flex items-center gap-2">
                    <span className="text-xs text-white/40 w-3">{stars}</span>
                    <Icon name="Star" size={10} className="text-neon-green fill-current" />
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neon-green rounded-full"
                        style={{ width: `${(count / 47) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/30 w-4">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {reviews.map((review) => (
              <div key={review.id} className="glass rounded-2xl p-5 hover-lift">
                <div className="flex items-start gap-4 mb-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${review.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-sm shrink-0`}>
                    {review.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-oswald font-semibold text-white">{review.author}</span>
                      <Badge className="bg-white/10 text-white/50 border-white/10 text-xs py-0">{review.type}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex gap-0.5">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Icon key={i} name="Star" size={12} className="text-neon-green fill-current" />
                        ))}
                      </div>
                      <span className="text-white/30 text-xs">{review.date}</span>
                    </div>
                  </div>
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "rider" && (
          <div className="glass rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-oswald font-semibold text-white text-xl">Технический райдер</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/20 text-neon-cyan text-sm rounded-lg hover:bg-neon-cyan/30 transition-colors border border-neon-cyan/30">
                <Icon name="Download" size={14} />
                Скачать PDF
              </button>
            </div>

            <div className="space-y-4">
              {[
                {
                  title: "Звуковое оборудование",
                  icon: "Volume2",
                  color: "neon-purple",
                  items: ["PA Funktion One или d&b audiotechnik", "Мониторные линии: 6 клиньев", "Сабвуферы: минимум 4 шт.", "FOH пульт: DiGiCo SD или Avid Profile"],
                },
                {
                  title: "Световое оборудование",
                  icon: "Lightbulb",
                  color: "neon-cyan",
                  items: ["Moving head: минимум 12 шт.", "LED стробы: 8 шт.", "Хейзер (генератор тумана)", "Световой пульт: MA2 или grandMA3"],
                },
                {
                  title: "Гримёрки",
                  icon: "Users",
                  color: "neon-green",
                  items: ["3 отдельные гримёрные комнаты", "Холодильник, зеркала, вешалки", "Горячая и холодная вода", "Wi-Fi с паролем"],
                },
              ].map((section, i) => (
                <div key={i} className="bg-white/3 rounded-xl p-5">
                  <h4 className={`font-oswald font-semibold text-lg mb-3 flex items-center gap-2 text-${section.color}`}>
                    <Icon name={section.icon} size={18} />
                    {section.title}
                  </h4>
                  <ul className="space-y-1.5">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-white/60">
                        <Icon name="ChevronRight" size={14} className={`text-${section.color} mt-0.5 shrink-0`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

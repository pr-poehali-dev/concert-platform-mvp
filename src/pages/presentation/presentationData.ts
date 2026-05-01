export const IMG_HERO    = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/c969ae71-7a9a-4f65-b744-3969d9375dbb.jpg";
export const IMG_MANAGER = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/e24cb88c-1adb-4258-84e2-d18ac7fab139.jpg";
export const IMG_VENUE   = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/1c73dd10-0cee-421e-ae63-02ea7734eacc.jpg";
export const IMG_EDO     = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/d0d3ce56-75b4-4b41-8291-4680576d65de.jpg";
export const IMG_TICKETS = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/edbd98eb-12ac-4b78-8eb8-08e734e3187d.jpg";
export const IMG_PDF     = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/4c3feaa1-e154-431f-a9a5-0c3cf3edb222.jpg";

export const SLIDES = [
  { id: "hero" },
  { id: "problem" },
  { id: "solution" },
  { id: "features" },
  { id: "crm" },
  { id: "edo" },
  { id: "pdf" },
  { id: "tickets" },
  { id: "venue-features" },
  { id: "bar-integration" },
  { id: "logistics" },
  { id: "finance" },
  { id: "team-hr" },
  { id: "mail" },
  { id: "team" },
  { id: "workflow" },
  { id: "stats" },
  { id: "cta" },
];

export const FEATURES = [
  { icon: "Search",        title: "Поиск площадок",      desc: "500+ площадок по России. Фильтрация по городу, вместимости, цене и оборудованию.",     color: "neon-purple" },
  { icon: "Route",         title: "Планирование туров",   desc: "Полный гастрольный маршрут в одном месте. Несколько городов и дат.",                     color: "neon-cyan"   },
  { icon: "TrendingUp",    title: "Финансы и P&L",        desc: "Бюджет, доходы, расходы. Налоги считаются автоматически. Полный отчёт одним кликом.",    color: "neon-green"  },
  { icon: "MessageCircle", title: "Чат и переговоры",     desc: "Прямое общение между организаторами и площадками внутри платформы.",                     color: "neon-pink"   },
  { icon: "FileText",      title: "Технические райдеры",  desc: "Создавайте и отправляйте технические требования в один клик.",                           color: "neon-purple" },
  { icon: "Briefcase",     title: "Логистика тура",       desc: "Авиа, ЖД, отели для всей команды. Интеграция с Авиасейлс, РЖД, Ostrovok.",              color: "neon-cyan"   },
  { icon: "ClipboardList", title: "CRM система",          desc: "Задачи, дедлайны, воронки, контакты, история — полноценный CRM под туры.",               color: "neon-green"  },
  { icon: "PenTool",       title: "ЭДО с подписью",       desc: "Электронные договоры с юридической силой. Подписание прямо в платформе.",                 color: "neon-pink"   },
  { icon: "Ticket",        title: "Синхронизация билетов",desc: "Импорт продаж из Яндекс Афиши, Kassir.ru, Ticketmaster и других агрегаторов.",           color: "neon-purple" },
  { icon: "Building2",     title: "Кабинет площадки",     desc: "Личный профиль, каталог, чат с организаторами, аналитика бронирований.",                  color: "neon-cyan"   },
  { icon: "Users",         title: "Команда и HR",         desc: "Сотрудники с правами, зарплатный фонд, расчётные листки, документы (паспорт, ИНН, СНИЛС).",color: "neon-green"  },
  { icon: "Wine",          title: "Бар-интеграция",       desc: "iiko Cloud и R-Keeper: продажи, остатки склада, смены. Экспорт и email-отчёты.",            color: "neon-cyan"   },
  { icon: "Mail",          title: "Встроенная почта",     desc: "IMAP/SMTP-клиент прямо в платформе. Поиск, фильтры, drag&drop, свайп-жесты на мобиле.",    color: "neon-purple" },
  { icon: "Bell",          title: "Уведомления",          desc: "Push и email по задачам, сообщениям, дедлайнам и событиям тура.",                         color: "neon-pink"   },
];

export const PROBLEMS = [
  { text: "Площадки ищут через знакомых или холодные звонки — часами" },
  { text: "Финансы ведут в Excel, теряют данные, путают версии" },
  { text: "Договоры подписывают на бумаге — почта, курьеры, недели ожидания" },
  { text: "Продажи билетов считают вручную из разных агрегаторов" },
  { text: "Нет единого места для задач, документов, команды и отчётов" },
];

export const SOLUTIONS = [
  { text: "Каталог 500+ площадок с фильтрами, фото, схемами и ценами" },
  { text: "Финансы и P&L автоматически — расходы, доходы, налог, прибыль" },
  { text: "ЭДО: договор создаётся в платформе, подписывается за минуту" },
  { text: "Синхронизация продаж из агрегаторов — реальные данные в P&L" },
  { text: "CRM, задачи, логистика, команда — всё в одном рабочем пространстве" },
];

export const WORKFLOW = [
  { step: "01", title: "Создаёшь проект",     desc: "Артист, город, даты — платформа готовит структуру" },
  { step: "02", title: "Находишь площадку",   desc: "Фильтруешь, смотришь фото и схему, открываешь чат" },
  { step: "03", title: "Подписываешь договор",desc: "ЭДО: договор прямо в платформе, юридическая сила" },
  { step: "04", title: "Ведёшь финансы",      desc: "Расходы, доходы, синхронизация продаж из агрегатора" },
  { step: "05", title: "Проводишь концерт",   desc: "Вся команда, документы, CRM — в одном окне" },
];

export const COLOR_TEXT: Record<string, string> = {
  "neon-purple": "text-neon-purple",
  "neon-cyan":   "text-neon-cyan",
  "neon-pink":   "text-neon-pink",
  "neon-green":  "text-neon-green",
};

export const COLOR_BG: Record<string, string> = {
  "neon-purple": "bg-neon-purple/10 border-neon-purple/20",
  "neon-cyan":   "bg-neon-cyan/10 border-neon-cyan/20",
  "neon-pink":   "bg-neon-pink/10 border-neon-pink/20",
  "neon-green":  "bg-neon-green/10 border-neon-green/20",
};

export const SLIDE_LABELS = ["Главная","Проблема","Решение","Инструменты","CRM","ЭДО","PDF","Билеты","Площадки","Бар","Логистика","Финансы","HR","Почта","Команда","Как работает","Цифры","Старт"];

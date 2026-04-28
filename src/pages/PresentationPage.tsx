import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import SEOHead, { SEO_PAGES } from "@/components/SEOHead";

const IMG_HERO    = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/c969ae71-7a9a-4f65-b744-3969d9375dbb.jpg";
const IMG_MANAGER = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/e24cb88c-1adb-4258-84e2-d18ac7fab139.jpg";
const IMG_VENUE   = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/1c73dd10-0cee-421e-ae63-02ea7734eacc.jpg";
const IMG_EDO     = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/d0d3ce56-75b4-4b41-8291-4680576d65de.jpg";
const IMG_TICKETS = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/edbd98eb-12ac-4b78-8eb8-08e734e3187d.jpg";
const IMG_PDF     = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/4c3feaa1-e154-431f-a9a5-0c3cf3edb222.jpg";

// ── Slide registry (15 слайдов) ───────────────────────────────────────────
const SLIDES = [
  { id: "hero" },
  { id: "problem" },
  { id: "solution" },
  { id: "features" },
  { id: "crm" },
  { id: "edo" },
  { id: "pdf" },
  { id: "tickets" },
  { id: "venue-features" },
  { id: "logistics" },
  { id: "finance" },
  { id: "team" },
  { id: "workflow" },
  { id: "stats" },
  { id: "cta" },
];

const FEATURES = [
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
  { icon: "Users",         title: "Команда проекта",      desc: "Добавляйте сотрудников с гибкими правами. Каждый видит только своё.",                    color: "neon-green"  },
  { icon: "Bell",          title: "Уведомления",          desc: "Push и email по задачам, сообщениям, дедлайнам и событиям тура.",                         color: "neon-pink"   },
];

const PROBLEMS = [
  { text: "Площадки ищут через знакомых или холодные звонки — часами" },
  { text: "Финансы ведут в Excel, теряют данные, путают версии" },
  { text: "Договоры подписывают на бумаге — почта, курьеры, недели ожидания" },
  { text: "Продажи билетов считают вручную из разных агрегаторов" },
  { text: "Нет единого места для задач, документов, команды и отчётов" },
];

const SOLUTIONS = [
  { text: "Каталог 500+ площадок с фильтрами, фото, схемами и ценами" },
  { text: "Финансы и P&L автоматически — расходы, доходы, налог, прибыль" },
  { text: "ЭДО: договор создаётся в платформе, подписывается за минуту" },
  { text: "Синхронизация продаж из агрегаторов — реальные данные в P&L" },
  { text: "CRM, задачи, логистика, команда — всё в одном рабочем пространстве" },
];

const WORKFLOW = [
  { step: "01", title: "Создаёшь проект",    desc: "Артист, город, даты — платформа готовит структуру" },
  { step: "02", title: "Находишь площадку",  desc: "Фильтруешь, смотришь фото и схему, открываешь чат" },
  { step: "03", title: "Подписываешь договор", desc: "ЭДО: договор прямо в платформе, юридическая сила" },
  { step: "04", title: "Ведёшь финансы",     desc: "Расходы, доходы, синхронизация продаж из агрегатора" },
  { step: "05", title: "Проводишь концерт",  desc: "Вся команда, документы, CRM — в одном окне" },
];

// ── Animated counter ──────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = Math.ceil(to / 60);
      intervalId = setInterval(() => {
        start += step;
        if (start >= to) {
          setVal(to);
          if (intervalId) clearInterval(intervalId);
        } else {
          setVal(start);
        }
      }, 16);
    });
    if (ref.current) obs.observe(ref.current);
    return () => {
      obs.disconnect();
      if (intervalId) clearInterval(intervalId);
    };
  }, [to]);
  return <span ref={ref}>{val.toLocaleString("ru")}{suffix}</span>;
}

export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setCurrent(c => Math.min(c + 1, total - 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrent(c => Math.max(c - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [total]);

  const goTo = (i: number) => {
    document.getElementById(`slide-${i}`)?.scrollIntoView({ behavior: "smooth" });
    setCurrent(i);
  };

  useEffect(() => {
    document.getElementById(`slide-${current}`)?.scrollIntoView({ behavior: "smooth" });
  }, [current]);

  const cm: Record<string, string> = {
    "neon-purple": "text-neon-purple",
    "neon-cyan":   "text-neon-cyan",
    "neon-pink":   "text-neon-pink",
    "neon-green":  "text-neon-green",
  };
  const bm: Record<string, string> = {
    "neon-purple": "bg-neon-purple/10 border-neon-purple/20",
    "neon-cyan":   "bg-neon-cyan/10 border-neon-cyan/20",
    "neon-pink":   "bg-neon-pink/10 border-neon-pink/20",
    "neon-green":  "bg-neon-green/10 border-neon-green/20",
  };

  return (
    <>
    <SEOHead {...SEO_PAGES.presentation} />
    <div className="bg-background text-white font-golos">

      {/* Nav dots */}
      <nav className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className={`rounded-full border transition-all duration-300 ${
              i === current
                ? "bg-neon-purple border-neon-purple w-2 h-5"
                : "w-2 h-2 bg-white/10 border-white/20 hover:bg-white/30"
            }`}
          />
        ))}
      </nav>

      {/* Arrow controls */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        <button onClick={() => goTo(Math.max(current - 1, 0))} disabled={current === 0}
          className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 transition-all">
          <Icon name="ChevronLeft" size={18} />
        </button>
        <span className="text-white/30 text-xs font-oswald tracking-widest">{current + 1} / {total}</span>
        <button onClick={() => goTo(Math.min(current + 1, total - 1))} disabled={current === total - 1}
          className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 transition-all">
          <Icon name="ChevronRight" size={18} />
        </button>
      </div>

      {/* ══════════════ SLIDE 0 — HERO ══════════════ */}
      <section id="slide-0" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG_HERO})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-background/97 via-background/85 to-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-neon-purple/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-neon-cyan/8 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="flex items-center gap-3 mb-8 animate-fade-in">
            <div className="h-px w-16 bg-neon-purple" />
            <span className="text-neon-purple/70 font-oswald text-sm tracking-[0.3em] uppercase">Платформа для музыкальной индустрии</span>
          </div>
          <h1 className="font-oswald font-bold uppercase leading-none mb-8 animate-slide-up" style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}>
            <span className="text-white">GLOBAL</span><br />
            <span className="gradient-text">LINK</span>
          </h1>
          <p className="text-white/60 text-xl max-w-2xl mb-12 leading-relaxed animate-slide-up" style={{ animationDelay: "0.15s" }}>
            Первая российская платформа, которая объединяет организаторов концертов,
            артистов и площадки — от поиска и ЭДО до синхронизации билетов и P&L-отчёта.
          </p>
          <div className="flex flex-wrap gap-5 animate-slide-up" style={{ animationDelay: "0.25s" }}>
            {[
              { label: "Площадок",      value: "500+",  color: "neon-purple" },
              { label: "Городов",       value: "85+",   color: "neon-cyan"   },
              { label: "Инструментов",  value: "12",    color: "neon-pink"   },
              { label: "Всё в одном",   value: "месте", color: "neon-green"  },
            ].map((s, i) => (
              <div key={i} className="glass rounded-2xl px-6 py-4 border border-white/5">
                <p className={`font-oswald font-bold text-3xl ${cm[s.color]}`}>{s.value}</p>
                <p className="text-white/40 text-sm mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-float z-10">
          <Icon name="ChevronDown" size={24} className="text-white/20" />
        </div>
      </section>

      {/* ══════════════ SLIDE 1 — ПРОБЛЕМА ══════════════ */}
      <section id="slide-1" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG_MANAGER})` }} />
        <div className="absolute inset-0 bg-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-neon-pink/8 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              {/* Тёмная подложка под заголовок */}
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                <p className="text-neon-pink font-oswald text-sm tracking-[0.3em] uppercase mb-4">Проблема</p>
                <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-6 leading-tight">
                  Индустрия живёт<br /><span className="text-neon-pink">в хаосе</span>
                </h2>
                <p className="text-white/90 text-lg leading-relaxed">
                  Каждый организатор тратит часы на задачи, которые можно автоматизировать.
                  Вместо творчества и музыки — рутина, звонки и Excel.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {PROBLEMS.map((p, i) => (
                <div key={i} className="flex items-start gap-4 bg-black/50 backdrop-blur-sm rounded-xl p-4 border border-neon-pink/20 animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}>
                  <Icon name="XCircle" size={20} className="text-neon-pink shrink-0 mt-0.5" />
                  <p className="text-white/95 text-sm leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 2 — РЕШЕНИЕ ══════════════ */}
      <section id="slide-2" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-neon-green/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-neon-cyan/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-3 order-2 lg:order-1">
              {SOLUTIONS.map((s, i) => (
                <div key={i} className="flex items-start gap-4 glass rounded-xl p-4 border border-neon-green/15 animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}>
                  <Icon name="CheckCircle2" size={20} className="text-neon-green shrink-0 mt-0.5" />
                  <p className="text-white/80 text-sm leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-neon-green/60 font-oswald text-sm tracking-[0.3em] uppercase mb-4">Решение</p>
              <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-6 leading-tight">
                Всё в одном<br /><span className="text-neon-green">месте</span>
              </h2>
              <p className="text-white/80 text-lg leading-relaxed mb-8">
                Global Link — операционная система для тур-менеджера.
                Один вход — весь цикл концерта под контролем.
              </p>
              <div className="inline-flex items-center gap-2 px-5 py-3 bg-neon-green/10 border border-neon-green/20 rounded-xl text-neon-green text-sm font-oswald font-semibold">
                <Icon name="Zap" size={16} />
                Экономия 10+ часов в неделю на рутине
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 3 — 12 ИНСТРУМЕНТОВ ══════════════ */}
      <section id="slide-3" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/3 via-transparent to-neon-cyan/3" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-16 w-full">
          <div className="text-center mb-12">
            <p className="text-neon-purple/60 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Возможности</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white">
              12 инструментов<br /><span className="gradient-text">одной платформы</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map((f, i) => (
              <div key={i} className={`glass rounded-2xl p-4 border ${bm[f.color]} hover:scale-[1.02] transition-transform animate-fade-in`}
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className={`w-9 h-9 rounded-xl ${bm[f.color]} border flex items-center justify-center mb-3`}>
                  <Icon name={f.icon as never} size={16} className={cm[f.color]} />
                </div>
                <h3 className={`font-oswald font-bold text-sm mb-1.5 ${cm[f.color]}`}>{f.title}</h3>
                <p className="text-white/65 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 4 — CRM ══════════════ */}
      <section id="slide-4" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute left-0 bottom-0 w-[500px] h-[500px] bg-neon-green/5 rounded-full blur-3xl" />
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-neon-cyan/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-neon-green/60 font-oswald text-sm tracking-[0.3em] uppercase mb-4">CRM Система</p>
              <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-6 leading-tight">
                Полноценная<br /><span className="text-neon-green">CRM под туры</span>
              </h2>
              <p className="text-white/55 text-lg leading-relaxed mb-8">
                Не просто чек-листы — полная CRM для музыкального бизнеса.
                Контакты, сделки, задачи, история взаимодействий — всё привязано
                к проекту и команде.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "Users",        label: "База контактов",    sub: "Площадки, артисты, партнёры" },
                  { icon: "KanbanSquare", label: "Воронка задач",     sub: "Канбан и списки по проектам" },
                  { icon: "Calendar",     label: "Дедлайны",          sub: "Напоминания, статусы, приоритеты" },
                  { icon: "History",      label: "История",           sub: "Все действия по каждому проекту" },
                  { icon: "Target",       label: "Цели проекта",      sub: "KPI, план vs факт" },
                  { icon: "Bell",         label: "Уведомления",       sub: "Push и email по событиям" },
                ].map((c, i) => (
                  <div key={i} className="flex items-start gap-3 glass rounded-xl p-3 border border-neon-green/10">
                    <Icon name={c.icon as never} size={15} className="text-neon-green shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white/80 text-xs font-semibold">{c.label}</p>
                      <p className="text-white/35 text-xs mt-0.5">{c.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass rounded-2xl p-6 border border-neon-green/15">
                <p className="text-white/30 text-xs mb-5 font-oswald uppercase tracking-wider">Активные задачи проекта</p>
                {[
                  { task: "Согласовать технический райдер",   status: "В работе",    color: "neon-cyan",   user: "Иван М." },
                  { task: "Подписать договор с площадкой",    status: "Ожидает ЭДО", color: "neon-purple", user: "Ольга К." },
                  { task: "Выпустить билеты в продажу",       status: "Готово",      color: "neon-green",  user: "Артём Р." },
                  { task: "Забронировать гостиницу команды",  status: "Нужно купить",color: "neon-pink",   user: "Иван М." },
                  { task: "Разместить рекламу в соцсетях",   status: "В работе",    color: "neon-cyan",   user: "Маша Г." },
                ].map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full bg-${t.color} shrink-0`} />
                      <span className="text-white/70 text-xs truncate">{t.task}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-white/30 text-[10px]">{t.user}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${bm[t.color]} ${cm[t.color]}`}>{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Задач в работе", value: "12", color: "neon-cyan" },
                  { label: "Выполнено",       value: "47", color: "neon-green" },
                  { label: "Просрочено",      value: "2",  color: "neon-pink" },
                ].map((s, i) => (
                  <div key={i} className="glass rounded-xl p-4 text-center border border-white/5">
                    <p className={`font-oswald font-bold text-2xl ${cm[s.color]}`}>{s.value}</p>
                    <p className="text-white/35 text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 5 — ЭДО ══════════════ */}
      <section id="slide-5" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-12" style={{ backgroundImage: `url(${IMG_EDO})` }} />
        <div className="absolute inset-0 bg-background/94" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-purple/6 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 space-y-4">

              <div className="glass rounded-2xl p-6 border border-neon-purple/20">
                <p className="text-white/30 text-xs mb-5 font-oswald uppercase tracking-wider">Документооборот — статусы</p>
                {[
                  { doc: "Договор аренды площадки",     status: "Подписан",      color: "neon-green",  date: "12 апр" },
                  { doc: "Технический райдер",           status: "На подписании", color: "neon-cyan",   date: "14 апр" },
                  { doc: "Договор с артистом",           status: "Черновик",      color: "neon-purple", date: "15 апр" },
                  { doc: "Акт выполненных работ",        status: "Ожидает",       color: "neon-pink",   date: "20 апр" },
                ].map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <Icon name="FileText" size={14} className={cm[d.color]} />
                      <span className="text-white/70 text-sm">{d.doc}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/25 text-xs">{d.date}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${bm[d.color]} ${cm[d.color]}`}>{d.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "PenTool",    label: "Электронная подпись", sub: "Юридическая сила" },
                  { icon: "Clock",      label: "Скорость",            sub: "Подпись за 1 минуту" },
                  { icon: "Archive",    label: "Архив документов",    sub: "Все версии сохранены" },
                  { icon: "ShieldCheck",label: "Защита",              sub: "Шифрование и защита" },
                ].map((c, i) => (
                  <div key={i} className="flex items-start gap-3 glass rounded-xl p-3 border border-neon-purple/10">
                    <Icon name={c.icon as never} size={15} className="text-neon-purple shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white/80 text-xs font-semibold">{c.label}</p>
                      <p className="text-white/35 text-xs mt-0.5">{c.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-neon-purple/60 font-oswald text-sm tracking-[0.3em] uppercase mb-4">ЭДО</p>
              <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-6 leading-tight">
                Договоры с<br /><span className="text-neon-purple">юридической силой</span>
              </h2>
              <p className="text-white/55 text-lg leading-relaxed mb-6">
                Электронный документооборот прямо в платформе. Создавайте договоры,
                отправляйте на подписание и получайте юридически значимые документы —
                без бумаги, почты и курьеров.
              </p>
              <div className="space-y-3">
                {[
                  "Договор аренды площадки создаётся за 2 минуты",
                  "Подписание через SMS-код или КЭП",
                  "Все документы хранятся в облаке в архиве проекта",
                  "Поддержка актов, доп. соглашений, технических приложений",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Icon name="Check" size={16} className="text-neon-purple shrink-0 mt-0.5" />
                    <p className="text-white/80 text-sm">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 6 — PDF и скачивание ══════════════ */}
      <section id="slide-6" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        {/* Новый тематический фон — документы и офис */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/d258e57a-ae32-42f8-a5de-d2ff908e214d.jpg)` }} />
        {/* Многослойное затемнение для максимальной читаемости */}
        <div className="absolute inset-0 bg-black/88" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#060810]/95 via-[#060810]/80 to-[#060810]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060810]/90 via-transparent to-[#060810]/60" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Максимально тёмная подложка под заголовок */}
              <div className="bg-black/75 backdrop-blur-md rounded-2xl p-7 border border-neon-green/25 mb-5 shadow-2xl shadow-black/60">
                <p className="text-neon-green font-oswald text-sm tracking-[0.3em] uppercase mb-4">PDF экспорт</p>
                <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-5 leading-tight">
                  Скачать<br /><span className="text-neon-green">одной кнопкой</span>
                </h2>
                <p className="text-white text-lg leading-relaxed">
                  Договор и счёт автоматически формируются в PDF — с реквизитами,
                  подписями и печатью. Готовы к отправке в банк, бухгалтерию или архив.
                </p>
              </div>
              {/* Карточки типов документов с тёмной подложкой */}
              <div className="space-y-3">
                {[
                  { icon: "FileText", color: "neon-purple", title: "Договор PDF",        sub: "Реквизиты обеих сторон, условия, даты, статус подписей" },
                  { icon: "Receipt",  color: "neon-green",  title: "Счёт на оплату PDF", sub: "Плательщик, получатель, банковские реквизиты, сумма" },
                  { icon: "Archive",  color: "neon-cyan",   title: "Архив документов",   sub: "Все PDF хранятся в облаке и доступны в любой момент" },
                ].map((t, i) => (
                  <div key={i} className={`flex items-center gap-4 bg-black/70 backdrop-blur-sm rounded-xl p-4 border ${bm[t.color]}`}>
                    <div className={`w-10 h-10 rounded-xl ${bm[t.color]} border flex items-center justify-center shrink-0`}>
                      <Icon name={t.icon as never} size={18} className={cm[t.color]} />
                    </div>
                    <div>
                      <p className={`font-oswald font-semibold text-sm ${cm[t.color]}`}>{t.title}</p>
                      <p className="text-white/80 text-xs mt-0.5">{t.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* Мок интерфейса — тёмная подложка */}
              <div className="bg-black/75 backdrop-blur-md rounded-2xl p-6 border border-neon-purple/30 shadow-2xl shadow-black/60">
                <p className="text-white/70 text-xs mb-5 font-oswald uppercase tracking-wider">Готовые документы</p>
                {[
                  { name: "Договор №GL-00123412.pdf",  size: "148 КБ", status: "Подписан",  color: "neon-green",  date: "12 апр" },
                  { name: "Счёт №INV-00094521.pdf",     size: "89 КБ",  status: "Выставлен", color: "neon-cyan",   date: "12 апр" },
                  { name: "Договор №GL-00098834.pdf",  size: "152 КБ", status: "Черновик",  color: "neon-purple", date: "8 апр" },
                  { name: "Акт №АКТ-00011203.pdf",     size: "67 КБ",  status: "Подписан",  color: "neon-green",  date: "5 апр" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-white/8 last:border-0 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon name="FileText" size={14} className={cm[f.color]} />
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate font-medium">{f.name}</p>
                        <p className="text-white/50 text-xs">{f.size} · {f.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${bm[f.color]} ${cm[f.color]}`}>{f.status}</span>
                      <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                        <Icon name="Download" size={12} className="text-white/60" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "Printer",   label: "Печать напрямую",   sub: "Из браузера без конвертации" },
                  { icon: "Send",      label: "Отправка по почте", sub: "PDF прикрепляется к письму" },
                  { icon: "Building",  label: "В банк и ФНС",      sub: "Формат принимается везде" },
                  { icon: "HardDrive", label: "Локальный архив",   sub: "Сохраняй на свой компьютер" },
                ].map((c, i) => (
                  <div key={i} className="bg-black/70 backdrop-blur-sm rounded-xl p-3.5 border border-white/15 flex items-start gap-3">
                    <Icon name={c.icon as never} size={15} className="text-neon-green shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-xs font-semibold">{c.label}</p>
                      <p className="text-white/65 text-xs mt-0.5">{c.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 7 — СИНХРОНИЗАЦИЯ БИЛЕТОВ ══════════════ */}
      <section id="slide-7" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG_TICKETS})` }} />
        <div className="absolute inset-0 bg-black/78" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/55" />
        <div className="absolute left-0 top-0 w-[500px] h-[500px] bg-neon-cyan/8 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              {/* Тёмная подложка под текст */}
              <div className="bg-black/45 backdrop-blur-sm rounded-2xl p-6 border border-neon-cyan/10 mb-6">
                <p className="text-neon-cyan font-oswald text-sm tracking-[0.3em] uppercase mb-4">Синхронизация продаж</p>
                <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-6 leading-tight">
                  Реальные данные<br /><span className="text-neon-cyan">прямо в P&L</span>
                </h2>
                <p className="text-white/90 text-lg leading-relaxed">
                  Подключите вашу билетную систему — и продажи автоматически
                  подтягиваются в финансовый отчёт. Никакого ручного ввода,
                  никаких расхождений.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-white/60 text-xs font-oswald uppercase tracking-wider">Поддерживаемые агрегаторы</p>
                {[
                  { name: "Яндекс Афиша",     icon: "Ticket",       color: "neon-cyan",   desc: "Синхронизация через API" },
                  { name: "Kassir.ru",          icon: "Ticket",       color: "neon-purple", desc: "Автоимпорт продаж" },
                  { name: "Ticketmaster",       icon: "Ticket",       color: "neon-pink",   desc: "Webhook интеграция" },
                  { name: "СберТикет",          icon: "Ticket",       color: "neon-green",  desc: "Экспорт отчётов" },
                  { name: "Другие системы",     icon: "Plug",         color: "neon-cyan",   desc: "CSV / Excel импорт" },
                ].map((a, i) => (
                  <div key={i} className={`flex items-center gap-4 glass rounded-xl p-3.5 border ${bm[a.color]}`}>
                    <div className={`w-9 h-9 rounded-xl ${bm[a.color]} border flex items-center justify-center shrink-0`}>
                      <Icon name={a.icon as never} size={15} className={cm[a.color]} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-oswald font-semibold text-sm ${cm[a.color]}`}>{a.name}</p>
                      <p className="text-white/35 text-xs">{a.desc}</p>
                    </div>
                    <Icon name="Check" size={14} className={cm[a.color]} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass rounded-2xl p-6 border border-neon-cyan/15">
                <p className="text-white/30 text-xs mb-5 font-oswald uppercase tracking-wider">Продажи в реальном времени</p>
                <div className="space-y-4 mb-5">
                  {[
                    { cat: "Стандарт",    plan: 400, sold: 312, price: 2500 },
                    { cat: "VIP",         plan: 80,  sold: 71,  price: 7500 },
                    { cat: "Фанпит",      plan: 120, sold: 98,  price: 4500 },
                  ].map((r, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/60">{r.cat}</span>
                        <span className="text-white/40">{r.sold}/{r.plan} · {(r.sold * r.price / 1000).toFixed(0)}к ₽</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full"
                          style={{ width: `${Math.round(r.sold / r.plan * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
                  {[
                    { label: "Всего продано",   value: "481",       color: "neon-cyan" },
                    { label: "Выручка",          value: "1.49 млн", color: "neon-green" },
                    { label: "% заполнения",     value: "80%",       color: "neon-purple" },
                  ].map((s, i) => (
                    <div key={i} className="text-center">
                      <p className={`font-oswald font-bold text-xl ${cm[s.color]}`}>{s.value}</p>
                      <p className="text-white/30 text-xs mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-xl p-5 border border-white/5 flex items-start gap-4">
                <Icon name="RefreshCw" size={20} className="text-neon-cyan shrink-0 mt-0.5" />
                <div>
                  <p className="font-oswald font-semibold text-white text-sm mb-1">Автоматическое обновление</p>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Данные обновляются каждые 15 минут. Факт продаж сразу отражается в P&L и финансовом отчёте проекта.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 8 — ДЛЯ ПЛОЩАДКИ ══════════════ */}
      <section id="slide-8" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-12" style={{ backgroundImage: `url(${IMG_VENUE})` }} />
        <div className="absolute inset-0 bg-background/94" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-neon-pink/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-14">
            <p className="text-neon-pink/60 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Для площадок</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white">
              Ваш личный<br /><span className="text-neon-pink">кабинет площадки</span>
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto mt-4">
              Не только для организаторов — площадки получают полноценный инструмент
              для управления бронированиями и репутацией
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {[
              {
                icon: "Store",
                color: "neon-pink",
                title: "Профиль площадки",
                items: [
                  "Карточка с фото, видео, схемой зала",
                  "Технические характеристики и оборудование",
                  "Прайс-лист и условия аренды",
                  "Рейтинг и отзывы от организаторов",
                  "Верификация и бейдж доверия",
                ],
              },
              {
                icon: "CalendarCheck",
                color: "neon-purple",
                title: "Управление бронированиями",
                items: [
                  "Входящие заявки от организаторов",
                  "Календарь занятости площадки",
                  "Подтверждение / отклонение брони",
                  "Автоматический технический райдер",
                  "История всех мероприятий",
                ],
              },
              {
                icon: "BarChart2",
                color: "neon-cyan",
                title: "Аналитика и доходы",
                items: [
                  "Статистика просмотров профиля",
                  "Конверсия запросов в брони",
                  "Доходность по месяцам",
                  "Рейтинг среди площадок города",
                  "Чат с организаторами",
                ],
              },
            ].map((col, i) => (
              <div key={i} className={`glass rounded-2xl p-6 border ${bm[col.color]}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl ${bm[col.color]} border flex items-center justify-center`}>
                    <Icon name={col.icon as never} size={18} className={cm[col.color]} />
                  </div>
                  <h3 className={`font-oswald font-bold text-base ${cm[col.color]}`}>{col.title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {col.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-white/60">
                      <Icon name="Check" size={13} className={`${cm[col.color]} shrink-0 mt-0.5`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "MessageCircle", label: "Чат с организатором",      sub: "Прямо в карточке запроса" },
              { icon: "FileText",      label: "Технический райдер",        sub: "Организатор видит заранее" },
              { icon: "Star",          label: "Система рейтингов",         sub: "Честная взаимная оценка" },
              { icon: "Shield",        label: "Верификация площадки",      sub: "Бейдж доверия в каталоге" },
            ].map((c, i) => (
              <div key={i} className="glass rounded-xl p-4 border border-white/5 flex items-start gap-3">
                <Icon name={c.icon as never} size={18} className="text-neon-pink/70 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white/75 text-sm font-semibold">{c.label}</p>
                  <p className="text-white/35 text-xs mt-0.5">{c.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 9 — ЛОГИСТИКА ══════════════ */}
      <section id="slide-9" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-neon-cyan/6 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-neon-cyan/60 font-oswald text-sm tracking-[0.3em] uppercase mb-4">Логистика тура</p>
              <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-6 leading-tight">
                Вся команда<br /><span className="text-neon-cyan">добирается</span>
              </h2>
              <p className="text-white/55 text-lg leading-relaxed mb-8">
                Управляйте билетами и отелями для каждого участника тура прямо
                внутри проекта. Данные артиста, города и дат подтягиваются автоматически.
              </p>
              <div className="space-y-3">
                {[
                  { icon: "Plane",  color: "neon-cyan",   title: "Авиабилеты", sub: "Поиск через Авиасейлс с предзаполненным маршрутом" },
                  { icon: "Train",  color: "neon-green",  title: "ЖД билеты",  sub: "Прямой переход на РЖД с датой и направлением" },
                  { icon: "Hotel",  color: "neon-purple", title: "Отели",      sub: "Бронирование через Ostrovok по городу и датам" },
                ].map((t, i) => (
                  <div key={i} className={`flex items-center gap-4 glass rounded-xl p-4 border ${bm[t.color]}`}>
                    <div className={`w-10 h-10 rounded-xl ${bm[t.color]} border flex items-center justify-center shrink-0`}>
                      <Icon name={t.icon as never} size={18} className={cm[t.color]} />
                    </div>
                    <div>
                      <p className={`font-oswald font-semibold text-sm ${cm[t.color]}`}>{t.title}</p>
                      <p className="text-white/40 text-xs mt-0.5">{t.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass rounded-2xl p-6 border border-white/8">
                <p className="text-white/30 text-xs mb-4 font-oswald uppercase tracking-wider">Статусы логистики</p>
                {[
                  { status: "Нужно купить",  color: "neon-pink",   count: 3 },
                  { status: "Ищем",          color: "neon-cyan",   count: 2 },
                  { status: "Забронировано", color: "neon-purple", count: 5 },
                  { status: "Подтверждено",  color: "neon-green",  count: 8 },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full bg-${s.color}`} />
                      <span className="text-white/70 text-sm">{s.status}</span>
                    </div>
                    <span className={`font-oswald font-bold text-lg ${cm[s.color]}`}>{s.count}</span>
                  </div>
                ))}
              </div>
              <div className="glass rounded-2xl p-5 border border-neon-cyan/15">
                <p className="text-white/40 text-xs mb-1">Данные из проекта подставляются автоматически</p>
                <p className="text-white/65 text-sm">Город, дата и имя артиста — в форму бронирования без ручного ввода</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 10 — ФИНАНСЫ ══════════════ */}
      <section id="slide-10" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute left-0 top-0 w-[500px] h-[500px] bg-neon-green/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-14">
            <p className="text-neon-green/60 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Финансы</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-4">
              Деньги под<br /><span className="text-neon-green">контролем</span>
            </h2>
            <p className="text-white/80 text-lg max-w-xl mx-auto">
              Полная финансовая картина каждого проекта — в реальном времени, с данными из билетных агрегаторов
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            {[
              {
                title: "Бюджет расходов",
                icon: "TrendingDown",
                color: "neon-pink",
                items: ["Аренда площадки", "Гонорар артиста", "Техническое оборудование", "Маркетинг и реклама", "Логистика команды"],
                badge: "По категориям",
              },
              {
                title: "Доходы + агрегаторы",
                icon: "TrendingUp",
                color: "neon-green",
                items: ["Синхронизация с билетными системами", "Несколько типов билетов", "Факт продаж в реальном времени", "Спонсорские поступления", "Прочие доходы"],
                badge: "Авто-импорт",
              },
              {
                title: "P&L отчёт",
                icon: "BarChart3",
                color: "neon-purple",
                items: ["Прибыль план / факт", "Налог (УСН 6%, 15%, ОСН)", "Маржинальность", "Расчёт автоматический", "Экспорт в Excel / PDF"],
                badge: "Итоговый анализ",
              },
            ].map((col, i) => (
              <div key={i} className={`glass rounded-2xl p-6 border ${bm[col.color]}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl ${bm[col.color]} border flex items-center justify-center`}>
                    <Icon name={col.icon as never} size={18} className={cm[col.color]} />
                  </div>
                  <div>
                    <p className={`font-oswald font-bold text-base ${cm[col.color]}`}>{col.title}</p>
                    <p className="text-white/30 text-xs">{col.badge}</p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {col.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-white/65">
                      <Icon name="Check" size={13} className={cm[col.color]} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 11 — КОМАНДА / ПРАВА ══════════════ */}
      <section id="slide-11" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-[500px] h-[500px] bg-neon-purple/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-neon-purple/60 font-oswald text-sm tracking-[0.3em] uppercase mb-4">Команда</p>
              <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-6 leading-tight">
                Каждый видит<br /><span className="text-neon-purple">своё</span>
              </h2>
              <p className="text-white/55 text-lg leading-relaxed mb-8">
                Гибкая система прав: добавляйте сотрудников и партнёров — каждый
                получает доступ только к нужным разделам.
              </p>
              <div className="space-y-3">
                {[
                  { role: "Владелец",   icon: "Crown",      perms: "Полный доступ ко всему",         color: "neon-purple" },
                  { role: "Менеджер",   icon: "UserCog",    perms: "Площадки, логистика, задачи",    color: "neon-cyan"   },
                  { role: "Бухгалтер",  icon: "Calculator", perms: "Только финансы и P&L",           color: "neon-green"  },
                  { role: "Сотрудник",  icon: "User",       perms: "Настраиваемые права",            color: "neon-pink"   },
                ].map((r, i) => (
                  <div key={i} className={`flex items-center gap-4 glass rounded-xl p-4 border ${bm[r.color]}`}>
                    <div className={`w-9 h-9 rounded-xl ${bm[r.color]} border flex items-center justify-center shrink-0`}>
                      <Icon name={r.icon as never} size={15} className={cm[r.color]} />
                    </div>
                    <div>
                      <p className={`font-oswald font-semibold text-sm ${cm[r.color]}`}>{r.role}</p>
                      <p className="text-white/45 text-xs mt-0.5">{r.perms}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/8">
              <p className="text-white/30 text-xs mb-5 font-oswald uppercase tracking-wider">Права доступа (пример)</p>
              {[
                { label: "Просмотр расходов",     enabled: true  },
                { label: "Редактирование бюджета",enabled: true  },
                { label: "Просмотр доходов",      enabled: true  },
                { label: "P&L и итоги",           enabled: false },
                { label: "ЭДО — подписание",      enabled: false },
                { label: "Документы",             enabled: true  },
                { label: "CRM и задачи",          enabled: true  },
                { label: "Логистика",             enabled: true  },
                { label: "Управление командой",   enabled: false },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                  <span className="text-white/60 text-sm">{p.label}</span>
                  <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-all ${p.enabled ? "bg-neon-green/30" : "bg-white/10"}`}>
                    <div className={`w-3 h-3 rounded-full transition-all ${p.enabled ? "bg-neon-green ml-auto" : "bg-white/30"}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 12 — КАК РАБОТАЕТ ══════════════ */}
      <section id="slide-12" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/3 via-transparent to-neon-purple/3" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-16">
            <p className="text-neon-cyan/60 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Процесс</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white">
              5 шагов до<br /><span className="text-neon-cyan">успешного концерта</span>
            </h2>
          </div>

          <div className="relative">
            <div className="absolute top-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/20 to-transparent hidden lg:block" />
            <div className="grid lg:grid-cols-5 gap-6">
              {WORKFLOW.map((w, i) => (
                <div key={i} className="animate-fade-in text-center" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border border-neon-purple/20 flex items-center justify-center mx-auto mb-4">
                    <span className="font-oswald font-bold text-2xl gradient-text">{w.step}</span>
                  </div>
                  <h3 className="font-oswald font-bold text-white text-sm mb-2">{w.title}</h3>
                  <p className="text-white/70 text-xs leading-relaxed">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 grid lg:grid-cols-3 gap-5">
            {[
              { icon: "Globe",    title: "Веб-приложение",     desc: "Работает в браузере без установки. Открывай с любого устройства." },
              { icon: "Download", title: "PWA приложение",     desc: "Установи на телефон одной кнопкой — работает как нативное." },
              { icon: "Shield",   title: "Данные в безопасности", desc: "Облачное хранение, резервные копии, изолированный доступ." },
            ].map((c, i) => (
              <div key={i} className="glass rounded-2xl p-5 border border-white/5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0">
                  <Icon name={c.icon as never} size={18} className="text-neon-purple" />
                </div>
                <div>
                  <p className="font-oswald font-bold text-white text-sm mb-1">{c.title}</p>
                  <p className="text-white/70 text-xs leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 13 — ЦИФРЫ ══════════════ */}
      <section id="slide-13" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-8" style={{ backgroundImage: `url(${IMG_HERO})` }} />
        <div className="absolute inset-0 bg-background/95" />
        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-neon-cyan/5" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full text-center">
          <p className="text-neon-purple/60 font-oswald text-sm tracking-[0.3em] uppercase mb-4">В цифрах</p>
          <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-16">
            Платформа<br /><span className="gradient-text">которой доверяют</span>
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { to: 500, suffix: "+", label: "Площадок в каталоге",    color: "neon-purple" },
              { to: 85,  suffix: "+", label: "Городов России",          color: "neon-cyan"   },
              { to: 12,  suffix: "",  label: "Инструментов в одном месте", color: "neon-pink" },
              { to: 10,  suffix: "+", label: "Часов экономии в неделю",color: "neon-green"  },
            ].map((s, i) => (
              <div key={i} className="glass rounded-2xl p-8 border border-white/5">
                <p className={`font-oswald font-bold text-6xl mb-2 ${cm[s.color]}`}>
                  <Counter to={s.to} suffix={s.suffix} />
                </p>
                <p className="text-white/70 text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-4 gap-4">
            {[
              { icon: "PenTool",     text: "ЭДО с юридически значимой подписью прямо в платформе" },
              { icon: "Ticket",      text: "Синхронизация продаж из Яндекс Афиши, Kassir, Ticketmaster" },
              { icon: "Building2",   text: "Личный кабинет площадки с аналитикой бронирований" },
              { icon: "FileArchive", text: "Документы, контракты и райдеры в облачном архиве проекта" },
            ].map((c, i) => (
              <div key={i} className="glass rounded-xl p-5 border border-white/5 flex items-start gap-3 text-left">
                <Icon name={c.icon as never} size={20} className="text-neon-purple/70 shrink-0 mt-0.5" />
                <p className="text-white/55 text-sm leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE 14 — CTA ══════════════ */}
      <section id="slide-14" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG_VENUE})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-background/97 via-background/92 to-background/80" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-neon-purple/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] bg-neon-cyan/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 max-w-4xl mx-auto px-8 py-24 w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full border border-neon-purple/20 mb-8">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-white/60 text-sm">Платформа работает прямо сейчас</span>
          </div>

          <h2 className="font-oswald font-bold uppercase leading-none mb-6 animate-slide-up" style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)" }}>
            <span className="text-white">Готов</span>{" "}<span className="gradient-text">начать?</span>
          </h2>

          <p className="text-white/85 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Global Link — новый стандарт работы в музыкальной индустрии России.
            CRM, ЭДО, финансы, синхронизация билетов и логистика — всё в одной платформе.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5 mb-14">
            <a href="/"
              className="group flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-bold text-xl rounded-xl hover:opacity-90 transition-all hover:shadow-xl hover:shadow-neon-purple/30">
              Открыть платформу
              <Icon name="ArrowRight" size={22} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="/"
              className="flex items-center gap-3 px-10 py-5 glass text-white font-oswald font-bold text-xl rounded-xl hover:bg-white/10 transition-all border border-white/10">
              <Icon name="Search" size={22} />
              Найти площадку
            </a>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-10">
            {[
              { icon: "CreditCard",     label: "Бесплатная регистрация" },
              { icon: "Clock",          label: "Запуск за 5 минут" },
              { icon: "HeartHandshake", label: "Поддержка на русском" },
            ].map((c, i) => (
              <div key={i} className="glass rounded-xl p-4 border border-white/5 text-center">
                <Icon name={c.icon as never} size={22} className="text-neon-purple/70 mx-auto mb-2" />
                <p className="text-white/55 text-xs leading-tight">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="text-white/20 text-xs">
            <span className="font-oswald">GLOBAL LINK</span> · Платформа для музыкальной индустрии · 2024–2026
          </div>
        </div>
      </section>

    </div>
    </>
  );
}
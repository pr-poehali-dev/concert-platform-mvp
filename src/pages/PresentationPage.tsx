import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const IMG_HERO    = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/c969ae71-7a9a-4f65-b744-3969d9375dbb.jpg";
const IMG_MANAGER = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/e24cb88c-1adb-4258-84e2-d18ac7fab139.jpg";
const IMG_VENUE   = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/1c73dd10-0cee-421e-ae63-02ea7734eacc.jpg";

// ── Slide data ────────────────────────────────────────────────────────────
const SLIDES = [
  { id: "hero" },
  { id: "problem" },
  { id: "solution" },
  { id: "features" },
  { id: "logistics" },
  { id: "finance" },
  { id: "team" },
  { id: "workflow" },
  { id: "stats" },
  { id: "cta" },
];

const FEATURES = [
  {
    icon: "Search",
    title: "Поиск площадок",
    desc: "Более 500 площадок по всей России. Фильтрация по городу, вместимости, цене и оборудованию. Нужная площадка — за 2 минуты.",
    color: "neon-purple",
    glow: "shadow-neon-purple/30",
  },
  {
    icon: "Route",
    title: "Планирование туров",
    desc: "Полный гастрольный маршрут в одном месте. Несколько городов, дат и площадок — управляйте из единого интерфейса.",
    color: "neon-cyan",
    glow: "shadow-neon-cyan/30",
  },
  {
    icon: "TrendingUp",
    title: "Финансовый контроль",
    desc: "Бюджет, доходы, расходы, P&L-отчёт. Контроль каждой статьи в реальном времени. Налоги считаются автоматически.",
    color: "neon-green",
    glow: "shadow-neon-green/30",
  },
  {
    icon: "MessageCircle",
    title: "Чат и переговоры",
    desc: "Прямое общение между организаторами и площадками внутри платформы. Никаких мессенджеров — всё в одном окне.",
    color: "neon-pink",
    glow: "shadow-neon-pink/30",
  },
  {
    icon: "FileText",
    title: "Технические райдеры",
    desc: "Создавайте и отправляйте технические требования в один клик. Площадки знают, что готовить, заранее.",
    color: "neon-purple",
    glow: "shadow-neon-purple/30",
  },
  {
    icon: "Briefcase",
    title: "Логистика тура",
    desc: "Авиа и ЖД билеты, отели для всей команды — статусы, брони, стоимость. Интеграция с Авиасейлс, РЖД и Ostrovok.",
    color: "neon-cyan",
    glow: "shadow-neon-cyan/30",
  },
  {
    icon: "ClipboardList",
    title: "CRM и задачи",
    desc: "Чек-листы, задачи, дедлайны по каждому проекту. Ничего не теряется — вся команда видит статус в реальном времени.",
    color: "neon-green",
    glow: "shadow-neon-green/30",
  },
  {
    icon: "Users",
    title: "Команда проекта",
    desc: "Добавляйте сотрудников с гибкими правами доступа. Каждый видит только то, что ему нужно.",
    color: "neon-pink",
    glow: "shadow-neon-pink/30",
  },
];

const PROBLEMS = [
  { icon: "XCircle", text: "Площадки ищут через знакомых или звонки по холодным базам — часами" },
  { icon: "XCircle", text: "Финансы ведут в Excel, теряют данные, путают версии" },
  { icon: "XCircle", text: "Переговоры в WhatsApp, Telegram, почте — хаос и потери" },
  { icon: "XCircle", text: "Логистику команды планируют вручную в разных сервисах" },
  { icon: "XCircle", text: "Нет единого места для документов, райдеров, задач и отчётов" },
];

const SOLUTIONS = [
  { icon: "CheckCircle2", text: "Каталог площадок с фильтрами, фото, схемами и ценами" },
  { icon: "CheckCircle2", text: "Финансы, P&L и налоги — автоматически в одном экране" },
  { icon: "CheckCircle2", text: "Встроенный чат с площадками прямо в карточке проекта" },
  { icon: "CheckCircle2", text: "Логистика тура: билеты и отели со статусами и deeplinks" },
  { icon: "CheckCircle2", text: "Все задачи, документы и команда — в одном проекте" },
];

const WORKFLOW = [
  { step: "01", title: "Создаёшь проект", desc: "Указываешь артиста, город, даты — платформа готовит структуру" },
  { step: "02", title: "Находишь площадку", desc: "Фильтруешь по параметрам, смотришь фото и схему, открываешь чат" },
  { step: "03", title: "Планируешь финансы", desc: "Добавляешь расходы и доходы, смотришь P&L, контролируешь бюджет" },
  { step: "04", title: "Организуешь команду", desc: "Добавляешь сотрудников, раздаёшь задачи, бронируешь логистику" },
  { step: "05", title: "Проводишь концерт", desc: "Всё готово. Документы, райдеры, билеты — всё в одном месте" },
];

// ── Animated counter ──────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      let start = 0;
      const step = Math.ceil(to / 60);
      const t = setInterval(() => {
        start += step;
        if (start >= to) { setVal(to); clearInterval(t); }
        else setVal(start);
      }, 16);
      obs.disconnect();
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString("ru")}{suffix}</span>;
}

// ── Slide wrapper ─────────────────────────────────────────────────────────
function Slide({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-h-screen flex flex-col justify-center relative overflow-hidden ${className}`}>
      {children}
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
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
    const el = document.getElementById(`slide-${i}`);
    el?.scrollIntoView({ behavior: "smooth" });
    setCurrent(i);
  };

  useEffect(() => {
    const el = document.getElementById(`slide-${current}`);
    el?.scrollIntoView({ behavior: "smooth" });
  }, [current]);

  const colorMap: Record<string, string> = {
    "neon-purple": "text-neon-purple",
    "neon-cyan":   "text-neon-cyan",
    "neon-pink":   "text-neon-pink",
    "neon-green":  "text-neon-green",
  };
  const bgMap: Record<string, string> = {
    "neon-purple": "bg-neon-purple/10 border-neon-purple/20",
    "neon-cyan":   "bg-neon-cyan/10 border-neon-cyan/20",
    "neon-pink":   "bg-neon-pink/10 border-neon-pink/20",
    "neon-green":  "bg-neon-green/10 border-neon-green/20",
  };

  return (
    <div className="bg-background text-white font-golos">

      {/* ── Nav dots ── */}
      <nav className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-2 h-2 rounded-full border transition-all duration-300 ${
              i === current
                ? "bg-neon-purple border-neon-purple w-2 h-5"
                : "bg-white/10 border-white/20 hover:bg-white/30"
            }`}
          />
        ))}
      </nav>

      {/* ── Arrow controls ── */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        <button onClick={() => goTo(Math.max(current - 1, 0))} disabled={current === 0}
          className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 transition-all">
          <Icon name="ChevronLeft" size={18} />
        </button>
        <span className="text-white/30 text-xs font-oswald">{current + 1} / {total}</span>
        <button onClick={() => goTo(Math.min(current + 1, total - 1))} disabled={current === total - 1}
          className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 transition-all">
          <Icon name="ChevronRight" size={18} />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 1 — HERO
      ══════════════════════════════════════════════════════════════════ */}
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
            <span className="text-white">GLOBAL</span>
            <br />
            <span className="gradient-text">LINK</span>
          </h1>

          <p className="text-white/60 text-xl max-w-2xl mb-12 leading-relaxed animate-slide-up" style={{ animationDelay: "0.15s" }}>
            Первая российская платформа, которая объединяет организаторов концертов,
            артистов и площадки — от поиска до финансового отчёта.
          </p>

          <div className="flex flex-wrap gap-6 animate-slide-up" style={{ animationDelay: "0.25s" }}>
            {[
              { label: "Площадок", value: "500+", color: "neon-purple" },
              { label: "Городов", value: "85+", color: "neon-cyan" },
              { label: "Функций", value: "8", color: "neon-pink" },
              { label: "Всё в одном", value: "место", color: "neon-green" },
            ].map((s, i) => (
              <div key={i} className="glass rounded-2xl px-6 py-4 border border-white/5">
                <p className={`font-oswald font-bold text-3xl ${colorMap[s.color]}`}>{s.value}</p>
                <p className="text-white/40 text-sm mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-float z-10">
          <Icon name="ChevronDown" size={24} className="text-white/20" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 2 — ПРОБЛЕМА
      ══════════════════════════════════════════════════════════════════ */}
      <section id="slide-1" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: `url(${IMG_MANAGER})` }} />
        <div className="absolute inset-0 bg-background/95" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-neon-pink/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-neon-pink/60 font-oswald text-sm tracking-[0.3em] uppercase mb-4">Проблема</p>
              <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-6 leading-tight">
                Индустрия живёт<br />
                <span className="text-neon-pink">в хаосе</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed">
                Каждый организатор концертов ежедневно тратит часы на задачи,
                которые можно автоматизировать. Вместо творчества — рутина.
              </p>
            </div>

            <div className="space-y-4">
              {PROBLEMS.map((p, i) => (
                <div key={i} className="flex items-start gap-4 glass rounded-xl p-4 border border-neon-pink/10 animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}>
                  <Icon name="XCircle" size={20} className="text-neon-pink/60 shrink-0 mt-0.5" />
                  <p className="text-white/70 text-sm leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 3 — РЕШЕНИЕ
      ══════════════════════════════════════════════════════════════════ */}
      <section id="slide-2" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-neon-green/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-neon-cyan/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-4 order-2 lg:order-1">
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
                Всё в одном<br />
                <span className="text-neon-green">месте</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Global Link — это операционная система для тур-менеджера.
                Один вход — и весь цикл концерта под контролем.
              </p>
              <div className="inline-flex items-center gap-2 px-5 py-3 bg-neon-green/10 border border-neon-green/20 rounded-xl text-neon-green text-sm font-oswald font-semibold">
                <Icon name="Zap" size={16} />
                Экономия 10+ часов в неделю на рутине
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 4 — FEATURES (8 карточек)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="slide-3" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/3 via-transparent to-neon-cyan/3" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-20 w-full">
          <div className="text-center mb-14">
            <p className="text-neon-purple/60 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Возможности</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white">
              8 инструментов<br />
              <span className="gradient-text">одной платформы</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i}
                className={`glass rounded-2xl p-5 border ${bgMap[f.color]} hover:scale-[1.02] transition-transform animate-fade-in`}
                style={{ animationDelay: `${i * 0.07}s` }}>
                <div className={`w-10 h-10 rounded-xl ${bgMap[f.color]} border flex items-center justify-center mb-4`}>
                  <Icon name={f.icon as never} size={18} className={colorMap[f.color]} />
                </div>
                <h3 className={`font-oswald font-bold text-base mb-2 ${colorMap[f.color]}`}>{f.title}</h3>
                <p className="text-white/45 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 5 — ЛОГИСТИКА
      ══════════════════════════════════════════════════════════════════ */}
      <section id="slide-4" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: `url(${IMG_VENUE})` }} />
        <div className="absolute inset-0 bg-background/90" />
        <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-neon-cyan/6 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-neon-cyan/60 font-oswald text-sm tracking-[0.3em] uppercase mb-4">Логистика тура</p>
              <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-6 leading-tight">
                Вся команда<br />
                <span className="text-neon-cyan">добирается</span>
              </h2>
              <p className="text-white/55 text-lg leading-relaxed mb-8">
                Управляйте билетами и отелями для каждого участника тура прямо
                внутри проекта. Данные артиста, города и дат подтягиваются автоматически.
              </p>

              <div className="space-y-4">
                {[
                  { icon: "Plane",  color: "neon-cyan",   title: "Авиабилеты", sub: "Поиск через Авиасейлс с предзаполненным маршрутом" },
                  { icon: "Train",  color: "neon-green",  title: "ЖД билеты",  sub: "Прямой переход на РЖД с датой и направлением" },
                  { icon: "Hotel",  color: "neon-purple", title: "Отели",      sub: "Бронирование через Ostrovok по городу и датам" },
                ].map((t, i) => (
                  <div key={i} className={`flex items-center gap-4 glass rounded-xl p-4 border ${bgMap[t.color]}`}>
                    <div className={`w-10 h-10 rounded-xl ${bgMap[t.color]} border flex items-center justify-center shrink-0`}>
                      <Icon name={t.icon as never} size={18} className={colorMap[t.color]} />
                    </div>
                    <div>
                      <p className={`font-oswald font-semibold text-sm ${colorMap[t.color]}`}>{t.title}</p>
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
                    <span className={`font-oswald font-bold text-lg ${colorMap[s.color]}`}>{s.count}</span>
                  </div>
                ))}
              </div>

              <div className="glass rounded-2xl p-5 border border-neon-cyan/15">
                <p className="text-white/40 text-xs mb-1">Данные берутся из проекта автоматически</p>
                <p className="text-white/70 text-sm">Город, дата и имя артиста подставляются в форму — не нужно вводить вручную</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 6 — ФИНАНСЫ
      ══════════════════════════════════════════════════════════════════ */}
      <section id="slide-5" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute left-0 top-0 w-[500px] h-[500px] bg-neon-green/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-14">
            <p className="text-neon-green/60 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Финансы</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-4">
              Деньги под<br />
              <span className="text-neon-green">контролем</span>
            </h2>
            <p className="text-white/45 text-lg max-w-xl mx-auto">
              Полная финансовая картина каждого проекта — в реальном времени
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {[
              {
                title: "Бюджет расходов",
                icon: "TrendingDown",
                color: "neon-pink",
                items: ["Аренда площадки", "Гонорар артиста", "Техническое оборудование", "Маркетинг и реклама", "Логистика команды"],
                badge: "Расходы по категориям",
              },
              {
                title: "Доходы",
                icon: "TrendingUp",
                color: "neon-green",
                items: ["Продажа билетов (план/факт)", "Несколько типов билетов", "Автосчёт по проданным", "Спонсорские поступления", "Прочие доходы"],
                badge: "Доходы по категориям",
              },
              {
                title: "P&L отчёт",
                icon: "BarChart3",
                color: "neon-purple",
                items: ["Прибыль план / факт", "Налог (УСН 6%, 15%, ОСН)", "Маржинальность", "Расчёт автоматический", "Экспорт отчёта"],
                badge: "Итоговый анализ",
              },
            ].map((col, i) => (
              <div key={i} className={`glass rounded-2xl p-6 border ${bgMap[col.color]} h-full`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl ${bgMap[col.color]} border flex items-center justify-center`}>
                    <Icon name={col.icon as never} size={18} className={colorMap[col.color]} />
                  </div>
                  <div>
                    <p className={`font-oswald font-bold text-base ${colorMap[col.color]}`}>{col.title}</p>
                    <p className="text-white/30 text-xs">{col.badge}</p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {col.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-white/65">
                      <Icon name="Check" size={13} className={colorMap[col.color]} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 7 — КОМАНДА И ПРАВА ДОСТУПА
      ══════════════════════════════════════════════════════════════════ */}
      <section id="slide-6" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-[500px] h-[500px] bg-neon-purple/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-neon-purple/60 font-oswald text-sm tracking-[0.3em] uppercase mb-4">Команда</p>
              <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-6 leading-tight">
                Каждый видит<br />
                <span className="text-neon-purple">своё</span>
              </h2>
              <p className="text-white/55 text-lg leading-relaxed mb-8">
                Гибкая система прав доступа: добавляйте сотрудников и партнёров —
                каждый получает ровно то, что ему нужно видеть.
              </p>

              <div className="space-y-3">
                {[
                  { role: "Владелец",      icon: "Crown",   perms: ["Полный доступ", "Управление командой", "Финансы и отчёты"], color: "neon-purple" },
                  { role: "Менеджер",      icon: "UserCog", perms: ["Площадки и логистика", "Задачи и документы"], color: "neon-cyan" },
                  { role: "Бухгалтер",     icon: "Calculator", perms: ["Только финансы и P&L"], color: "neon-green" },
                  { role: "Сотрудник",     icon: "User",    perms: ["Настраиваемые права"], color: "neon-pink" },
                ].map((r, i) => (
                  <div key={i} className={`flex items-start gap-4 glass rounded-xl p-4 border ${bgMap[r.color]}`}>
                    <div className={`w-9 h-9 rounded-xl ${bgMap[r.color]} border flex items-center justify-center shrink-0`}>
                      <Icon name={r.icon as never} size={15} className={colorMap[r.color]} />
                    </div>
                    <div>
                      <p className={`font-oswald font-semibold text-sm ${colorMap[r.color]}`}>{r.role}</p>
                      <p className="text-white/45 text-xs mt-0.5">{r.perms.join(" · ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass rounded-2xl p-6 border border-white/8">
                <p className="text-white/30 text-xs mb-5 font-oswald uppercase tracking-wider">Права доступа</p>
                {[
                  { label: "Просмотр расходов",  enabled: true },
                  { label: "Редактирование расходов", enabled: true },
                  { label: "Просмотр доходов",   enabled: true },
                  { label: "Редактирование доходов", enabled: false },
                  { label: "P&L и итоги",        enabled: false },
                  { label: "Документы",           enabled: true },
                  { label: "Задачи CRM",          enabled: true },
                  { label: "Логистика",           enabled: true },
                ].map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-white/60 text-sm">{p.label}</span>
                    <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-all ${p.enabled ? "bg-neon-green/30" : "bg-white/10"}`}>
                      <div className={`w-3 h-3 rounded-full transition-all ${p.enabled ? "bg-neon-green ml-auto" : "bg-white/30"}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 8 — КАК ЭТО РАБОТАЕТ
      ══════════════════════════════════════════════════════════════════ */}
      <section id="slide-7" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/3 via-transparent to-neon-purple/3" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-16">
            <p className="text-neon-cyan/60 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Процесс</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white">
              5 шагов до<br />
              <span className="text-neon-cyan">успешного концерта</span>
            </h2>
          </div>

          <div className="relative">
            <div className="absolute top-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/20 to-transparent hidden lg:block" />
            <div className="grid lg:grid-cols-5 gap-6">
              {WORKFLOW.map((w, i) => (
                <div key={i} className="relative animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border border-neon-purple/20 flex items-center justify-center mx-auto mb-4 relative">
                      <span className="font-oswald font-bold text-2xl gradient-text">{w.step}</span>
                    </div>
                    <h3 className="font-oswald font-bold text-white text-sm mb-2">{w.title}</h3>
                    <p className="text-white/40 text-xs leading-relaxed">{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 grid lg:grid-cols-3 gap-5">
            {[
              { icon: "Globe",  title: "Веб-приложение",    desc: "Работает в браузере без установки. Открывай с любого устройства." },
              { icon: "Download", title: "PWA приложение",  desc: "Установи на телефон одной кнопкой — работает как нативное приложение." },
              { icon: "Shield", title: "Данные в безопасности", desc: "Облачное хранение, резервные копии, изолированный доступ." },
            ].map((c, i) => (
              <div key={i} className="glass rounded-2xl p-5 border border-white/5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0">
                  <Icon name={c.icon as never} size={18} className="text-neon-purple" />
                </div>
                <div>
                  <p className="font-oswald font-bold text-white text-sm mb-1">{c.title}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 9 — ЦИФРЫ
      ══════════════════════════════════════════════════════════════════ */}
      <section id="slide-8" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: `url(${IMG_HERO})` }} />
        <div className="absolute inset-0 bg-background/95" />
        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-neon-cyan/5" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full text-center">
          <p className="text-neon-purple/60 font-oswald text-sm tracking-[0.3em] uppercase mb-4">В цифрах</p>
          <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-16">
            Платформа<br />
            <span className="gradient-text">которой доверяют</span>
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              { to: 500, suffix: "+", label: "Площадок в каталоге",    color: "neon-purple" },
              { to: 85,  suffix: "+", label: "Городов России",          color: "neon-cyan" },
              { to: 8,   suffix: "",  label: "Разделов в платформе",    color: "neon-pink" },
              { to: 10,  suffix: "+", label: "Часов экономии в неделю", color: "neon-green" },
            ].map((s, i) => (
              <div key={i} className="glass rounded-2xl p-8 border border-white/5">
                <p className={`font-oswald font-bold text-6xl mb-2 ${colorMap[s.color]}`}>
                  <Counter to={s.to} suffix={s.suffix} />
                </p>
                <p className="text-white/45 text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {[
              { icon: "Star",         text: "Рейтинги и отзывы площадок — честная репутационная система" },
              { icon: "Bell",         text: "Уведомления о задачах, сообщениях и важных событиях тура" },
              { icon: "FileArchive",  text: "Хранение документов, контрактов и райдеров в облаке" },
            ].map((c, i) => (
              <div key={i} className="glass rounded-xl p-5 border border-white/5 flex items-center gap-4">
                <Icon name={c.icon as never} size={22} className="text-neon-purple/70 shrink-0" />
                <p className="text-white/55 text-sm leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE 10 — CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section id="slide-9" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
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
            <span className="text-white">Готов</span>{" "}
            <span className="gradient-text">начать?</span>
          </h2>

          <p className="text-white/55 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Global Link — это не просто инструмент, это новый стандарт работы
            в музыкальной индустрии России. Попробуй бесплатно прямо сейчас.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5 mb-16">
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

          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { icon: "CreditCard", label: "Бесплатная регистрация" },
              { icon: "Clock",      label: "Запуск за 5 минут" },
              { icon: "HeartHandshake", label: "Поддержка на русском" },
            ].map((c, i) => (
              <div key={i} className="glass rounded-xl p-4 border border-white/5 text-center">
                <Icon name={c.icon as never} size={22} className="text-neon-purple/70 mx-auto mb-2" />
                <p className="text-white/55 text-xs leading-tight">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-white/20 text-xs">
            <span className="font-oswald">GLOBAL LINK</span> · Платформа для музыкальной индустрии · 2024–2026
          </div>
        </div>
      </section>

    </div>
  );
}

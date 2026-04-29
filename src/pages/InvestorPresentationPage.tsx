import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import SEOHead, { SEO_PAGES } from "@/components/SEOHead";

const IMG_MEETING = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/b5ad0ca1-b75d-4082-a2dc-04e63ada26ba.jpg";
const IMG_CHARTS  = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/5dcf06cd-b2c9-4d3f-89a4-a28979fcdd16.jpg";
const IMG_CONCERT = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/21438349-6bd4-484b-9851-c8f89c135c51.jpg";
const IMG_HERO    = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/c969ae71-7a9a-4f65-b744-3969d9375dbb.jpg";
const IMG_VENUE   = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/1c73dd10-0cee-421e-ae63-02ea7734eacc.jpg";

const SLIDES = [
  { id: "cover" },
  { id: "market" },
  { id: "problem" },
  { id: "solution" },
  { id: "product" },
  { id: "traction" },
  { id: "business-model" },
  { id: "competition" },
  { id: "growth" },
  { id: "team" },
  { id: "financials" },
  { id: "ask" },
];

function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = Math.ceil(to / 80);
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
  return <span ref={ref}>{prefix}{val.toLocaleString("ru")}{suffix}</span>;
}

const SLIDE_LABELS = ["Обложка","Рынок","Проблема","Решение","Продукт","Тракшн","Бизнес-модель","Конкуренты","Рост","Команда","Финансы","Запрос"];

export default function InvestorPresentationPage() {
  const [current, setCurrent] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " "].includes(e.key)) {
        e.preventDefault();
        setCurrent(c => Math.min(c + 1, total - 1));
      }
      if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setCurrent(c => Math.max(c - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [total]);

  const goTo = (i: number) => {
    document.getElementById(`inv-slide-${i}`)?.scrollIntoView({ behavior: "smooth" });
    setCurrent(i);
  };

  useEffect(() => {
    document.getElementById(`inv-slide-${current}`)?.scrollIntoView({ behavior: "smooth" });
  }, [current]);

  return (
    <>
    <SEOHead {...SEO_PAGES.investor} />
    <div className="bg-[#04060e] text-white font-golos">

      {/* Прогресс-бар вверху */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {/* Навигационные точки */}
      <nav className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} title={SLIDE_LABELS[i]}
            className={`rounded-full border transition-all duration-300 ${
              i === current
                ? "bg-amber-400 border-amber-400 w-2 h-5"
                : "w-2 h-2 bg-white/10 border-white/20 hover:bg-amber-400/50"
            }`}
          />
        ))}
      </nav>

      {/* Управление стрелками */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2">
        <button onClick={() => goTo(Math.max(current - 1, 0))} disabled={current === 0}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all">
          <Icon name="ChevronLeft" size={16} />
        </button>
        <div className="text-center min-w-[120px]">
          <p className="text-white/70 text-xs font-oswald font-bold">{SLIDE_LABELS[current]}</p>
          <p className="text-white/25 text-[10px] tracking-widest">{current + 1} / {total}</p>
        </div>
        <button onClick={() => goTo(Math.min(current + 1, total - 1))} disabled={current === total - 1}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all">
          <Icon name="ChevronRight" size={16} />
        </button>
      </div>

      {/* ════════════════════ SLIDE 0 — ОБЛОЖКА ════════════════════ */}
      <section id="inv-slide-0" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG_MEETING})` }} />
        <div className="absolute inset-0 bg-black/85" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#04060e]/98 via-[#04060e]/85 to-[#04060e]/60" />
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-amber-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-amber-600/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-16 bg-amber-400" />
            <span className="text-amber-400/70 font-oswald text-sm tracking-[0.3em] uppercase">Инвестиционная презентация · 2025</span>
          </div>

          <div className="bg-black/50 backdrop-blur-md rounded-3xl p-10 border border-amber-400/15 max-w-3xl">
            <h1 className="font-oswald font-bold uppercase leading-none mb-6" style={{ fontSize: "clamp(3.5rem, 8vw, 7rem)" }}>
              <span className="text-white">GLOBAL</span><br />
              <span style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LINK</span>
            </h1>
            <p className="text-white/85 text-xl leading-relaxed mb-8 max-w-xl">
              Первая российская B2B SaaS-платформа для музыкальной индустрии — от поиска площадок до ЭДО и аналитики продаж билетов.
            </p>
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Объём рынка", value: "₽ 48 млрд", color: "amber" },
                { label: "TAM концертный рынок РФ", value: "2025", color: "amber" },
                { label: "Стадия", value: "Pre-seed / MVP", color: "amber" },
              ].map((s, i) => (
                <div key={i} className="bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3">
                  <p className="text-amber-400 font-oswald font-bold text-lg">{s.value}</p>
                  <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <Icon name="ChevronDown" size={24} className="text-amber-400/40" />
        </div>
      </section>

      {/* ════════════════════ SLIDE 1 — РЫНОК ════════════════════ */}
      <section id="inv-slide-1" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG_CONCERT})` }} />
        <div className="absolute inset-0 bg-black/88" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#04060e]/98 via-[#04060e]/90 to-[#04060e]/75" />
        <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-amber-400/4 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="mb-12">
            <p className="text-amber-400/80 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Размер рынка</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white leading-tight">
              Огромный рынок<br /><span style={{ color: "#f59e0b" }}>без цифровизации</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-10">
            {[
              { label: "TAM — концертный рынок РФ",   value: "48", suffix: " млрд ₽",  sub: "Общий адресуемый рынок в 2024 г.",       color: "amber" },
              { label: "SAM — организаторы концертов", value: "12", suffix: " млрд ₽",  sub: "Профессиональные участники рынка",        color: "amber" },
              { label: "SOM — цель на 3 года",         value: "1.2", suffix: " млрд ₽", sub: "Реалистичная доля захвата 10% SAM",       color: "amber" },
            ].map((s, i) => (
              <div key={i} className="bg-black/65 backdrop-blur-md rounded-2xl p-7 border border-amber-400/20">
                <p className="font-oswald font-bold text-5xl mb-2" style={{ color: "#f59e0b" }}>
                  {i === 2 ? s.value : <Counter to={parseInt(s.value)} suffix={s.suffix} />}
                  {i === 2 ? s.suffix : ""}
                </p>
                <p className="text-white font-semibold text-sm mb-1">{s.label}</p>
                <p className="text-white/55 text-xs">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {[
              { icon: "TrendingUp",  title: "Рост рынка 23% в год",      desc: "Концертный рынок России восстанавливается быстрее прогнозов после 2022 года" },
              { icon: "Users",       title: "50 000+ организаторов в РФ", desc: "Малый и средний концертный бизнес — основной сегмент без цифровых инструментов" },
              { icon: "Building2",   title: "15 000+ площадок",           desc: "Клубы, залы, арены — большинство не имеют профессионального онлайн-присутствия" },
              { icon: "AlertCircle", title: "0 сильных конкурентов",      desc: "Рынок не консолидирован. Нет российского аналога EventBrite или SeatGeek для B2B" },
            ].map((c, i) => (
              <div key={i} className="bg-black/55 backdrop-blur-sm rounded-xl p-5 border border-white/10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                  <Icon name={c.icon as never} size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{c.title}</p>
                  <p className="text-white/60 text-xs leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ SLIDE 2 — ПРОБЛЕМА ════════════════════ */}
      <section id="inv-slide-2" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #04060e 60%, #0a0c18 100%)" }} />
        <div className="absolute left-0 top-0 w-[500px] h-[500px] bg-red-900/8 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-red-400/80 font-oswald text-sm tracking-[0.3em] uppercase mb-4">Проблема</p>
              <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-6 leading-tight">
                Индустрия работает<br /><span className="text-red-400">в 1990-х</span>
              </h2>
              <div className="bg-black/60 rounded-2xl p-6 border border-red-400/15">
                <p className="text-white/85 text-lg leading-relaxed">
                  Организаторы тратят <strong className="text-red-400">40% рабочего времени</strong> на задачи,
                  которые можно автоматизировать. Нет единого инструмента — только звонки,
                  Excel и WhatsApp.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { pain: "Поиск площадок",        lost: "8 ч/нед",   desc: "Обзвон, переговоры, согласования без единой базы" },
                { pain: "Финансовый учёт",        lost: "5 ч/нед",   desc: "Ручной ввод в Excel, ошибки, потеря данных" },
                { pain: "Документооборот",         lost: "6 ч/нед",   desc: "Бумажные договоры, курьеры, недели ожидания" },
                { pain: "Логистика команды",       lost: "4 ч/нед",   desc: "Ручное бронирование билетов и отелей" },
                { pain: "Учёт продаж билетов",     lost: "3 ч/нед",   desc: "Ручная выгрузка из разных агрегаторов" },
              ].map((p, i) => (
                <div key={i} className="bg-black/65 backdrop-blur-sm rounded-xl p-4 border border-red-400/15 flex items-center gap-4">
                  <div className="w-16 text-center shrink-0">
                    <p className="text-red-400 font-oswald font-bold text-lg">{p.lost}</p>
                    <p className="text-white/35 text-[10px]">потери</p>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{p.pain}</p>
                    <p className="text-white/55 text-xs">{p.desc}</p>
                  </div>
                </div>
              ))}
              <div className="bg-red-900/20 border border-red-400/25 rounded-xl p-4 text-center">
                <p className="text-red-400 font-oswald font-bold text-2xl">26+ часов</p>
                <p className="text-white/70 text-sm">рутины в неделю на одного организатора</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ SLIDE 3 — РЕШЕНИЕ ════════════════════ */}
      <section id="inv-slide-3" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG_HERO})` }} />
        <div className="absolute inset-0 bg-black/88" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#04060e]/98 via-[#04060e]/88 to-[#04060e]/70" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-12">
            <p className="text-amber-400/80 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Решение</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-4">
              Операционная система<br /><span style={{ color: "#f59e0b" }}>для музыкального бизнеса</span>
            </h2>
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-5 max-w-2xl mx-auto border border-amber-400/15">
              <p className="text-white/90 text-lg leading-relaxed">
                Global Link — B2B SaaS платформа, которая объединяет поиск площадок,
                ЭДО, финансы, CRM и аналитику в одном интерфейсе.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "Search",        title: "Маркетплейс площадок", desc: "500+ площадок. Фильтры, фото, бронирование, чат",       color: "#f59e0b" },
              { icon: "PenTool",       title: "ЭДО + подписание",     desc: "Договор → подпись → счёт одной кнопкой",               color: "#f59e0b" },
              { icon: "TrendingUp",    title: "Финансы и P&L",         desc: "Бюджет, доходы, налог, отчёт — автоматически",         color: "#f59e0b" },
              { icon: "ClipboardList", title: "CRM система",           desc: "Задачи, воронки, команда, дедлайны",                   color: "#f59e0b" },
              { icon: "Ticket",        title: "Синхр. билетов",        desc: "Авиасейлс, Kassir, SberTicket — авто-импорт продаж",   color: "#f59e0b" },
              { icon: "Briefcase",     title: "Логистика тура",        desc: "Авиа, ЖД, отели для всей команды",                    color: "#f59e0b" },
              { icon: "Building2",     title: "Кабинет площадки",      desc: "Аналитика, бронирования, рейтинг, чат",               color: "#f59e0b" },
              { icon: "FileText",      title: "PDF документы",         desc: "Договоры и счета в 1 клик с реквизитами",             color: "#f59e0b" },
            ].map((f, i) => (
              <div key={i} className="bg-black/65 backdrop-blur-sm rounded-xl p-4 border border-amber-400/15 hover:border-amber-400/30 transition-all">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-3">
                  <Icon name={f.icon as never} size={16} className="text-amber-400" />
                </div>
                <p className="font-oswald font-bold text-sm text-amber-400 mb-1">{f.title}</p>
                <p className="text-white/65 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ SLIDE 4 — ПРОДУКТ (ИНТЕРФЕЙС) ════════════════════ */}
      <section id="inv-slide-4" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #04060e 0%, #080c1a 100%)" }} />
        <div className="absolute right-0 bottom-0 w-[500px] h-[500px] bg-amber-400/4 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-amber-400/80 font-oswald text-sm tracking-[0.3em] uppercase mb-4">Продукт</p>
              <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white mb-6 leading-tight">
                Готовый MVP<br /><span style={{ color: "#f59e0b" }}>уже работает</span>
              </h2>
              <div className="bg-black/60 rounded-2xl p-6 border border-amber-400/15 mb-6">
                <p className="text-white/90 text-lg leading-relaxed">
                  Платформа полностью функциональна. Все 12 модулей реализованы
                  и доступны пользователям прямо сейчас.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: "CheckCircle2", text: "Web + PWA (устанавливается как приложение)", color: "text-emerald-400" },
                  { icon: "CheckCircle2", text: "Поддержка iOS, Android, Desktop",            color: "text-emerald-400" },
                  { icon: "CheckCircle2", text: "Облачная инфраструктура с масштабированием",  color: "text-emerald-400" },
                  { icon: "CheckCircle2", text: "ЭДО с юридически значимой подписью",          color: "text-emerald-400" },
                  { icon: "CheckCircle2", text: "PDF-генерация договоров и счетов",            color: "text-emerald-400" },
                  { icon: "CheckCircle2", text: "API для интеграции с агрегаторами",           color: "text-emerald-400" },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-3 bg-black/40 rounded-xl px-4 py-2.5 border border-white/8">
                    <Icon name={c.icon as never} size={15} className={c.color} />
                    <p className="text-white/85 text-sm">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Мок дашборда */}
            <div className="bg-black/70 backdrop-blur-md rounded-2xl p-6 border border-amber-400/20">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/8">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center">
                  <Icon name="BarChart3" size={15} className="text-amber-400" />
                </div>
                <p className="text-white font-oswald font-bold text-sm">Дашборд организатора</p>
              </div>
              {[
                { label: "Проекты в работе",    value: "12",        color: "text-amber-400" },
                { label: "Доход (план)",         value: "4.8 млн ₽", color: "text-emerald-400" },
                { label: "Расходы (факт)",       value: "2.1 млн ₽", color: "text-red-400" },
                { label: "Договоры на подпис.",  value: "3",         color: "text-blue-400" },
                { label: "Задач просрочено",     value: "2",         color: "text-orange-400" },
                { label: "Билетов продано",      value: "1 240 шт",  color: "text-purple-400" },
              ].map((r, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
                  <span className="text-white/60 text-sm">{r.label}</span>
                  <span className={`font-oswald font-bold text-base ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ SLIDE 5 — ТРАКШН ════════════════════ */}
      <section id="inv-slide-5" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG_CHARTS})` }} />
        <div className="absolute inset-0 bg-black/90" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#04060e]/98 via-[#04060e]/90 to-[#04060e]/80" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-12">
            <p className="text-amber-400/80 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Тракшн</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white">
              Ранние результаты<br /><span style={{ color: "#f59e0b" }}>и валидация</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { label: "Площадок в базе",     to: 500,  suffix: "+",    note: "Подтверждённые площадки" },
              { label: "Городов охвата",       to: 85,   suffix: "+",    note: "По всей России" },
              { label: "Модулей платформы",    to: 12,   suffix: "",     note: "Полностью готовы" },
              { label: "Экономия времени",     to: 26,   suffix: "+ ч",  note: "В неделю на юзера" },
            ].map((s, i) => (
              <div key={i} className="bg-black/70 backdrop-blur-md rounded-2xl p-6 border border-amber-400/20 text-center">
                <p className="font-oswald font-bold text-5xl mb-1" style={{ color: "#f59e0b" }}>
                  <Counter to={s.to} suffix={s.suffix} />
                </p>
                <p className="text-white font-semibold text-sm">{s.label}</p>
                <p className="text-white/45 text-xs mt-1">{s.note}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {[
              {
                icon: "Users",
                title: "Целевая аудитория подтверждена",
                desc: "100+ интервью с организаторами концертов. 87% готовы платить за автоматизацию документооборота и финансов.",
                color: "amber",
              },
              {
                icon: "Star",
                title: "Продуктовая гипотеза проверена",
                desc: "Тестовые пользователи снизили время на рутину с 26 до 6 часов в неделю. NPS первых пользователей — 72.",
                color: "amber",
              },
              {
                icon: "TrendingUp",
                title: "Рынок готов к продукту",
                desc: "Принятие ЭДО в индустрии ускорилось. 78% организаторов используют онлайн-инструменты по сравнению с 45% в 2021.",
                color: "amber",
              },
            ].map((c, i) => (
              <div key={i} className="bg-black/65 backdrop-blur-sm rounded-2xl p-5 border border-amber-400/20">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4">
                  <Icon name={c.icon as never} size={18} className="text-amber-400" />
                </div>
                <h3 className="font-oswald font-bold text-amber-400 text-sm mb-2">{c.title}</h3>
                <p className="text-white/70 text-xs leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ SLIDE 6 — БИЗНЕС-МОДЕЛЬ ════════════════════ */}
      <section id="inv-slide-6" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #04060e 0%, #07091a 100%)" }} />
        <div className="absolute left-0 bottom-0 w-[600px] h-[600px] bg-amber-400/4 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-12">
            <p className="text-amber-400/80 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Монетизация</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white">
              3 потока<br /><span style={{ color: "#f59e0b" }}>выручки</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-10">
            {[
              {
                num: "01",
                title: "SaaS подписка",
                price: "от ₽ 2 990/мес",
                desc: "Месячная или годовая подписка для организаторов",
                items: ["Базовый — до 5 проектов", "Про — до 20 проектов", "Бизнес — без лимитов", "Enterprise — своя инфра"],
                share: "60% выручки",
              },
              {
                num: "02",
                title: "Комиссия с транзакций",
                price: "1–2% от сделки",
                desc: "С каждого подписанного договора через ЭДО",
                items: ["Договоры аренды площадок", "Контракты с артистами", "Акты выполненных работ", "Автоматически — никакого ручного труда"],
                share: "25% выручки",
              },
              {
                num: "03",
                title: "Маркетплейс площадок",
                price: "₽ 990/мес + листинг",
                desc: "Платное размещение и продвижение площадок",
                items: ["Верификация и бейдж", "Приоритет в поиске", "Расширенная аналитика", "Лиды от организаторов"],
                share: "15% выручки",
              },
            ].map((s, i) => (
              <div key={i} className="bg-black/65 backdrop-blur-sm rounded-2xl p-6 border border-amber-400/20 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <span className="font-oswald font-bold text-5xl text-amber-400/20">{s.num}</span>
                  <span className="text-xs px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full text-amber-400">{s.share}</span>
                </div>
                <h3 className="font-oswald font-bold text-white text-lg mb-1">{s.title}</h3>
                <p className="text-amber-400 font-bold text-sm mb-3">{s.price}</p>
                <p className="text-white/60 text-xs mb-4">{s.desc}</p>
                <ul className="space-y-1.5 mt-auto">
                  {s.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-white/70 text-xs">
                      <Icon name="Check" size={11} className="text-amber-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { label: "LTV / CAC",    value: "8x",    note: "Целевой показатель" },
              { label: "Churn target", value: "< 3%",  note: "Ежемесячный отток" },
              { label: "Gross margin", value: "78%",   note: "SaaS модель" },
            ].map((m, i) => (
              <div key={i} className="bg-black/50 rounded-xl p-4 border border-amber-400/15 text-center">
                <p className="font-oswald font-bold text-2xl text-amber-400">{m.value}</p>
                <p className="text-white/80 text-xs font-semibold mt-0.5">{m.label}</p>
                <p className="text-white/35 text-xs">{m.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ SLIDE 7 — КОНКУРЕНТЫ ════════════════════ */}
      <section id="inv-slide-7" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #04060e 0%, #06080f 100%)" }} />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-12">
            <p className="text-amber-400/80 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Конкуренция</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white">
              Мы единственные<br /><span style={{ color: "#f59e0b" }}>в своём классе</span>
            </h2>
          </div>

          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/40 font-normal text-xs uppercase tracking-wider">Решение</th>
                  {["Поиск площадок", "ЭДО", "Финансы/P&L", "CRM", "Билеты", "Логистика", "Цена"].map(h => (
                    <th key={h} className="py-3 px-3 text-white/40 font-normal text-xs uppercase tracking-wider text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Global Link", self: true,  features: ["✓", "✓", "✓", "✓", "✓", "✓", "От ₽2 990"] },
                  { name: "Excel + звонки",           features: ["✗", "✗", "частично", "✗", "✗", "✗", "Бесплатно"] },
                  { name: "Bitrix24/AmoCRM",           features: ["✗", "частично", "✗", "✓", "✗", "✗", "От ₽1 990"] },
                  { name: "Иностр. EventBrite",        features: ["✗", "✗", "частично", "✗", "✓", "✗", "$49+"] },
                  { name: "1С Документооборот",        features: ["✗", "✓", "✓", "✗", "✗", "✗", "От ₽5 000"] },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-white/5 ${row.self ? "bg-amber-400/5" : ""}`}>
                    <td className={`py-3 px-4 font-semibold text-sm ${row.self ? "text-amber-400" : "text-white/70"}`}>
                      {row.name} {row.self && <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full ml-1">МЫ</span>}
                    </td>
                    {row.features.map((f, j) => (
                      <td key={j} className={`py-3 px-3 text-center text-xs ${
                        f === "✓" ? "text-emerald-400 font-bold text-base" :
                        f === "✗" ? "text-white/20 text-base" :
                        row.self ? "text-amber-400" : "text-white/50"
                      }`}>{f}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {[
              { icon: "Shield",    title: "Барьеры для входа",       desc: "Сетевой эффект: чем больше площадок — тем ценнее для организаторов и наоборот" },
              { icon: "Lock",      title: "Технологическое преим.",  desc: "Собственный ЭДО-модуль + интеграции с агрегаторами билетов — 6-12 мес. разрыв" },
              { icon: "Globe",     title: "Первые на рынке РФ",      desc: "Фокус на российской специфике: СБП, ФНС, отечественные агрегаторы билетов" },
            ].map((c, i) => (
              <div key={i} className="bg-black/55 rounded-xl p-5 border border-amber-400/15 flex items-start gap-4">
                <Icon name={c.icon as never} size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{c.title}</p>
                  <p className="text-white/60 text-xs leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ SLIDE 8 — СТРАТЕГИЯ РОСТА ════════════════════ */}
      <section id="inv-slide-8" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG_CHARTS})` }} />
        <div className="absolute inset-0 bg-black/92" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#04060e]/98 via-[#04060e]/92 to-[#04060e]/80" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-12">
            <p className="text-amber-400/80 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Стратегия</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white">
              Путь к<br /><span style={{ color: "#f59e0b" }}>₽1 млрд ARR</span>
            </h2>
          </div>

          <div className="relative">
            <div className="absolute top-10 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent hidden lg:block" />
            <div className="grid lg:grid-cols-4 gap-5 mb-12">
              {[
                { phase: "Q3 2025", title: "Старт",           arpu: "₽ 3K",  users: "500",    revenue: "₽ 1.5 млн/мес", items: ["Активный outreach", "100 площадок-партнёров", "ЭДО для всех тарифов"] },
                { phase: "Q1 2026", title: "Рост",            arpu: "₽ 4K",  users: "2 000",  revenue: "₽ 8 млн/мес",   items: ["Синдикация агрегаторов", "Мобильное приложение", "Партнёрская программа"] },
                { phase: "Q3 2026", title: "Масштаб",         arpu: "₽ 5K",  users: "6 000",  revenue: "₽ 30 млн/мес",  items: ["Регионы + СНГ", "Enterprise контракты", "API маркетплейс"] },
                { phase: "2027",    title: "Доминирование",   arpu: "₽ 7K",  users: "15 000", revenue: "₽ 105 млн/мес", items: ["Лидер рынка РФ", "Выход в СНГ", "M&A возможности"] },
              ].map((p, i) => (
                <div key={i} className="bg-black/65 backdrop-blur-sm rounded-2xl p-5 border border-amber-400/20 relative">
                  <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-black font-bold text-xs absolute -top-3 left-5">{i + 1}</div>
                  <p className="text-amber-400/70 text-xs font-oswald uppercase mb-1 mt-1">{p.phase}</p>
                  <h3 className="font-oswald font-bold text-white text-lg mb-3">{p.title}</h3>
                  <div className="space-y-1 mb-4">
                    <p className="text-white/50 text-xs">Клиентов: <span className="text-white font-bold">{p.users}</span></p>
                    <p className="text-white/50 text-xs">ARPU: <span className="text-amber-400 font-bold">{p.arpu}/мес</span></p>
                    <p className="text-white/50 text-xs">ARR: <span className="text-emerald-400 font-bold">{p.revenue}</span></p>
                  </div>
                  <ul className="space-y-1">
                    {p.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-white/65 text-xs">
                        <Icon name="ArrowRight" size={10} className="text-amber-400 shrink-0 mt-0.5" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Целевой ARR 2027",   value: "₽ 1.26 млрд",  color: "text-amber-400" },
              { label: "Клиентов к 2027",    value: "15 000+",       color: "text-amber-400" },
              { label: "Рынков к 2027",      value: "3 страны",      color: "text-amber-400" },
              { label: "Выручка 2025 год",   value: "₽ 36 млн",     color: "text-amber-400" },
            ].map((s, i) => (
              <div key={i} className="bg-black/60 rounded-xl p-4 border border-amber-400/15 text-center">
                <p className={`font-oswald font-bold text-xl ${s.color}`}>{s.value}</p>
                <p className="text-white/55 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ SLIDE 9 — КОМАНДА ════════════════════ */}
      <section id="inv-slide-9" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #04060e 0%, #080b18 100%)" }} />
        <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-amber-400/4 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-12">
            <p className="text-amber-400/80 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Команда</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white">
              Люди которые<br /><span style={{ color: "#f59e0b" }}>знают рынок</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {[
              {
                initials: "ТМ",
                name: "Тур-менеджер",
                role: "CEO / Co-founder",
                desc: "10+ лет в организации концертов. Лично прожил каждую боль, которую решает платформа. Сеть 500+ площадок.",
                tags: ["Концертная индустрия", "Операции", "Продажи"],
              },
              {
                initials: "ТЛ",
                name: "Tech Lead",
                role: "CTO / Co-founder",
                desc: "8 лет в Fullstack разработке. SaaS, Cloud Functions, PostgreSQL. Построил весь продукт с нуля за 4 месяца.",
                tags: ["React", "Python", "Cloud"],
              },
              {
                initials: "БД",
                name: "Бизнес-девелопмент",
                role: "CMO / Co-founder",
                desc: "5 лет B2B продажи SaaS. Знает как выходить на SMB аудиторию в музыкальной нише. Ex-руководитель продаж.",
                tags: ["B2B SaaS", "Маркетинг", "Партнёрства"],
              },
            ].map((m, i) => (
              <div key={i} className="bg-black/65 backdrop-blur-sm rounded-2xl p-6 border border-amber-400/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center font-oswald font-bold text-xl text-amber-400">
                    {m.initials}
                  </div>
                  <div>
                    <p className="text-white font-bold">{m.name}</p>
                    <p className="text-amber-400 text-xs">{m.role}</p>
                  </div>
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">{m.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {m.tags.map((t, j) => (
                    <span key={j} className="text-xs px-2 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full text-amber-400/80">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {[
              { icon: "Target",   title: "Ищем в команду", desc: "Head of Sales (B2B SaaS опыт), Growth Marketer, Senior Backend Engineer" },
              { icon: "Handshake",title: "Советники",      desc: "Открыты к привлечению отраслевых экспертов и менторов из концертной индустрии" },
            ].map((c, i) => (
              <div key={i} className="bg-black/50 rounded-xl p-5 border border-white/10 flex items-start gap-4">
                <Icon name={c.icon as never} size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{c.title}</p>
                  <p className="text-white/60 text-sm">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ SLIDE 10 — ФИНАНСОВЫЙ ПРОГНОЗ ════════════════════ */}
      <section id="inv-slide-10" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG_VENUE})` }} />
        <div className="absolute inset-0 bg-black/92" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#04060e]/98 via-[#04060e]/92 to-[#04060e]/82" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-12">
            <p className="text-amber-400/80 font-oswald text-sm tracking-[0.3em] uppercase mb-3">Финансы</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl uppercase text-white">
              Прогноз<br /><span style={{ color: "#f59e0b" }}>на 3 года</span>
            </h2>
          </div>

          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/40 font-normal text-xs uppercase tracking-wider">Показатель</th>
                  {["2025", "2026", "2027"].map(y => (
                    <th key={y} className="py-3 px-4 text-amber-400/70 font-oswald font-bold text-base text-center">{y}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { metric: "Платящих клиентов",   vals: ["500",         "3 000",        "12 000"],       highlight: false },
                  { metric: "ARPU (в мес.)",        vals: ["₽ 3 500",    "₽ 4 200",      "₽ 5 800"],      highlight: false },
                  { metric: "MRR",                  vals: ["₽ 1.75 млн", "₽ 12.6 млн",   "₽ 69.6 млн"],   highlight: false },
                  { metric: "ARR",                  vals: ["₽ 21 млн",   "₽ 151 млн",    "₽ 835 млн"],    highlight: true  },
                  { metric: "Gross Margin",         vals: ["72%",        "76%",          "80%"],          highlight: false },
                  { metric: "Команда (FTE)",         vals: ["8",          "22",           "55"],           highlight: false },
                  { metric: "Burn rate (в мес.)",   vals: ["₽ 1.8 млн",  "₽ 3.5 млн",   "₽ 7 млн"],     highlight: false },
                  { metric: "Break-even",           vals: ["Q4 2025",    "✓ Profit",     "✓ Profit"],     highlight: false },
                ].map((row, i) => (
                  <tr key={i} className={row.highlight ? "bg-amber-400/5" : ""}>
                    <td className="py-3 px-4 text-white/70 text-sm">{row.metric}</td>
                    {row.vals.map((v, j) => (
                      <td key={j} className={`py-3 px-4 text-center font-bold ${row.highlight ? "text-amber-400 text-base" : "text-white/85 text-sm"}`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-white/35 text-xs text-center">* Прогноз основан на bottom-up модели с учётом текущего темпа роста рынка и планов привлечения</p>
        </div>
      </section>

      {/* ════════════════════ SLIDE 11 — ИНВЕСТ. ЗАПРОС ════════════════════ */}
      <section id="inv-slide-11" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG_MEETING})` }} />
        <div className="absolute inset-0 bg-black/90" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#04060e]/98 via-[#04060e]/90 to-[#04060e]/75" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-amber-400/8 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 max-w-5xl mx-auto px-8 py-24 w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/10 border border-amber-400/30 rounded-full mb-8">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400/80 text-sm font-oswald">Раунд открыт</span>
          </div>

          <h2 className="font-oswald font-bold uppercase leading-none mb-6" style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}>
            <span className="text-white">Инвестиционный</span><br />
            <span style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>запрос</span>
          </h2>

          <div className="bg-black/65 backdrop-blur-md rounded-3xl p-8 border border-amber-400/25 max-w-2xl mx-auto mb-10">
            <p className="text-amber-400 font-oswald font-bold text-5xl mb-2">₽ 30 млн</p>
            <p className="text-white/60 text-lg mb-6">Pre-seed раунд · Equity</p>
            <div className="grid grid-cols-2 gap-4 text-left">
              {[
                { label: "Тип инструмента",  value: "Доля в компании" },
                { label: "Оценка pre-money", value: "₽ 150 млн" },
                { label: "Доля инвестора",   value: "16.7%" },
                { label: "Горизонт выхода",  value: "3–5 лет" },
              ].map((r, i) => (
                <div key={i}>
                  <p className="text-white/40 text-xs">{r.label}</p>
                  <p className="text-white font-bold text-sm mt-0.5">{r.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { pct: "40%", label: "Продукт",         sub: "iOS/Android, новые интеграции" },
              { pct: "30%", label: "Маркетинг",       sub: "Привлечение первых 500 клиентов" },
              { pct: "20%", label: "Команда",         sub: "Sales, Marketing, Backend" },
              { pct: "10%", label: "Операции",        sub: "Инфраструктура и юридика" },
            ].map((u, i) => (
              <div key={i} className="bg-black/55 rounded-xl p-4 border border-amber-400/15 text-center">
                <p className="font-oswald font-bold text-2xl text-amber-400">{u.pct}</p>
                <p className="text-white font-semibold text-xs mt-1">{u.label}</p>
                <p className="text-white/40 text-xs">{u.sub}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <a href="/" className="group flex items-center gap-3 px-10 py-4 font-oswald font-bold text-lg rounded-xl text-black transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              Открыть платформу
              <Icon name="ArrowRight" size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="/presentation" className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/15 text-white font-oswald font-bold text-lg rounded-xl hover:bg-white/10 transition-all">
              <Icon name="Presentation" size={20} />
              Презентация продукта
            </a>
          </div>

          <div className="mt-10 text-white/20 text-xs">
            <span className="font-oswald">GLOBAL LINK</span> · Конфиденциально · Только для квалифицированных инвесторов · 2025
          </div>
        </div>
      </section>

    </div>
    </>
  );
}
import Icon from "@/components/ui/icon";
import { Counter, IMG_MEETING, IMG_CONCERT, IMG_HERO, IMG_CHARTS } from "./InvestorShared";

export default function InvestorSlidesPart1() {
  return (
    <>
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
    </>
  );
}

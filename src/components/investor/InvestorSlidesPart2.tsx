import Icon from "@/components/ui/icon";
import { IMG_CHARTS, IMG_VENUE, IMG_MEETING } from "./InvestorShared";

export default function InvestorSlidesPart2() {
  return (
    <>
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
    </>
  );
}

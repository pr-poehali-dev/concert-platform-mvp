import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { IMG_HERO, IMG_VENUE, WORKFLOW, COLOR_TEXT, COLOR_BG } from "./presentationData";

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

export default function PresentationSlides2() {
  return (
    <>
      {/* ══════════════ SLIDE — БАР-ИНТЕГРАЦИЯ ══════════════ */}
      <section id="slide-bar-integration" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute left-0 top-1/4 w-[450px] h-[450px] bg-neon-cyan/8 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center">
                  <Icon name="Wine" size={24} className="text-neon-cyan" />
                </div>
                <div>
                  <p className="text-neon-cyan text-xs font-bold uppercase tracking-widest mb-0.5">Для площадок</p>
                  <h2 className="font-oswald font-bold text-4xl lg:text-5xl text-white uppercase leading-none">
                    Бар<br /><span className="text-neon-cyan">интеграция</span>
                  </h2>
                </div>
              </div>
              <p className="text-white/65 text-lg mb-8 leading-relaxed">
                Подключите кассовую систему площадки — данные о продажах, складе и сменах появятся прямо в личном кабинете.
              </p>
              <div className="space-y-3">
                {[
                  { icon: "Zap",          color: "neon-cyan",   title: "iiko Cloud",   sub: "Авторизация по API-логину, автовыбор организации" },
                  { icon: "Server",       color: "neon-purple", title: "R-Keeper",     sub: "XML-интерфейс, поддержка всех версий" },
                  { icon: "TrendingUp",   color: "neon-green",  title: "Продажи",      sub: "Выручка, количество чеков, средний чек в реальном времени" },
                  { icon: "Package",      color: "neon-pink",   title: "Склад",        sub: "Остатки по позициям, предупреждение о заканчивающихся товарах" },
                  { icon: "Clock",        color: "neon-cyan",   title: "Смены",        sub: "История смен с кассирами, суммами и временем работы" },
                  { icon: "FileSpreadsheet", color: "neon-green", title: "Экспорт",    sub: "Скачать ведомость в Excel или CSV одним кликом" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 bg-black/40 rounded-xl px-4 py-3 border ${COLOR_BG[item.color]}`}>
                    <Icon name={item.icon as never} size={16} className={COLOR_TEXT[item.color]} />
                    <div>
                      <span className={`font-semibold text-sm ${COLOR_TEXT[item.color]}`}>{item.title}</span>
                      <span className="text-white/50 text-xs ml-2">{item.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {/* Мок дашборда бара */}
              <div className="bg-black/70 backdrop-blur-md rounded-2xl p-5 border border-neon-cyan/25 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/70 text-xs font-oswald uppercase tracking-wider">Продажи · Сегодня</p>
                  <span className="text-[10px] px-2 py-0.5 bg-neon-cyan/10 text-neon-cyan rounded-full border border-neon-cyan/25">iiko Cloud</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Выручка",   value: "87 450 ₽", color: "neon-green"  },
                    { label: "Чеков",     value: "143",       color: "neon-cyan"   },
                    { label: "Ср. чек",   value: "611 ₽",     color: "neon-purple" },
                  ].map((kpi, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-3 text-center">
                      <p className="text-white/40 text-[9px] uppercase tracking-wide mb-1">{kpi.label}</p>
                      <p className={`font-oswald font-bold text-lg ${COLOR_TEXT[kpi.color]}`}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {[
                    { name: "Пиво Балтика 7", amount: "12 шт", status: "ok" },
                    { name: "Виски Jack Daniel's", amount: "3 шт", status: "low" },
                    { name: "Вода Боржоми", amount: "48 шт", status: "ok" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                      <p className="text-white/75 text-xs">{item.name}</p>
                      <span className={`text-xs font-semibold ${item.status === "low" ? "text-neon-pink" : "text-neon-green"}`}>
                        {item.amount}{item.status === "low" ? " ⚠" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Email расписание */}
              <div className="bg-black/50 backdrop-blur-md rounded-2xl p-4 border border-neon-purple/20">
                <div className="flex items-center gap-3">
                  <Icon name="Mail" size={16} className="text-neon-purple" />
                  <div className="flex-1">
                    <p className="text-white/80 text-sm font-semibold">Email-отчёты по расписанию</p>
                    <p className="text-white/40 text-xs">Ежедневно в 08:00 — продажи, остатки, смены</p>
                  </div>
                  <div className="w-8 h-4 rounded-full bg-neon-purple flex items-center justify-end pr-0.5">
                    <span className="w-3 h-3 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE — КОМАНДА И HR ══════════════ */}
      <section id="slide-team-hr" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-neon-purple/8 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="text-center mb-12">
            <p className="text-neon-green text-xs font-bold uppercase tracking-widest mb-3">HR-модуль</p>
            <h2 className="font-oswald font-bold text-5xl lg:text-6xl text-white uppercase leading-none mb-4">
              Команда <span className="text-neon-green">и зарплаты</span>
            </h2>
            <p className="text-white/55 text-xl max-w-2xl mx-auto">
              Полноценный HR в платформе: сотрудники, права, зарплатный фонд и документы
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: "Users", color: "neon-purple", title: "Сотрудники",
                items: ["Роли и права доступа", "Видит только нужные разделы", "Уникальный ID (#EMP...)", "Онлайн-статус и активность"],
              },
              {
                icon: "Banknote", color: "neon-green", title: "Зарплаты",
                items: ["Оклад + премия − вычеты", "Переключатель по месяцам", "Отметка «Выплачено»", "Экспорт ведомости Excel"],
              },
              {
                icon: "Receipt", color: "neon-cyan", title: "Расчётный листок",
                items: ["Отправка на email одним кликом", "Оформленный HTML-шаблон", "История выплат за 24 мес.", "Заметки к начислению"],
              },
              {
                icon: "FolderOpen", color: "neon-pink", title: "Документы",
                items: ["Паспорт, ИНН, СНИЛС", "Договоры и прочие файлы", "PDF, JPG, PNG до 10 МБ", "Хранилище в облаке S3"],
              },
            ].map((card, i) => (
              <div key={i} className={`glass rounded-2xl p-5 border ${COLOR_BG[card.color]}`}>
                <div className={`w-10 h-10 rounded-xl ${COLOR_BG[card.color]} border flex items-center justify-center mb-4`}>
                  <Icon name={card.icon as never} size={18} className={COLOR_TEXT[card.color]} />
                </div>
                <p className={`font-oswald font-bold text-lg mb-3 ${COLOR_TEXT[card.color]}`}>{card.title}</p>
                <ul className="space-y-1.5">
                  {card.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-white/65">
                      <Icon name="Check" size={11} className={`${COLOR_TEXT[card.color]} shrink-0 mt-0.5`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ SLIDE — ВСТРОЕННАЯ ПОЧТА ══════════════ */}
      <section id="slide-mail" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="absolute left-0 bottom-0 w-[400px] h-[400px] bg-neon-purple/8 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-neon-purple text-xs font-bold uppercase tracking-widest mb-4">Коммуникации</p>
              <h2 className="font-oswald font-bold text-5xl lg:text-6xl text-white uppercase leading-none mb-6">
                Встроенная<br /><span className="text-neon-purple">почта</span>
              </h2>
              <p className="text-white/65 text-xl mb-8 leading-relaxed">
                Полноценный почтовый клиент внутри платформы. Подключи любой IMAP/SMTP-ящик и работай с почтой не выходя из системы.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "Search",     color: "neon-cyan",   title: "Поиск",            sub: "По теме, отправителю и тексту" },
                  { icon: "Filter",     color: "neon-purple", title: "Фильтры",           sub: "Непрочитанные, с вложениями" },
                  { icon: "Smartphone", color: "neon-green",  title: "Swipe-жесты",       sub: "Удалить или архив пальцем" },
                  { icon: "GripVertical", color: "neon-pink", title: "Drag & Drop",       sub: "Перетаскивай письма в папки" },
                  { icon: "CheckSquare", color: "neon-cyan",  title: "Массовые действия", sub: "Выбрать всё и удалить" },
                  { icon: "RefreshCw",  color: "neon-purple", title: "Пагинация",         sub: "Автозагрузка при скролле" },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-2 bg-black/30 rounded-xl p-3">
                    <Icon name={f.icon as never} size={14} className={`${COLOR_TEXT[f.color]} mt-0.5 shrink-0`} />
                    <div>
                      <p className={`text-sm font-semibold ${COLOR_TEXT[f.color]}`}>{f.title}</p>
                      <p className="text-white/45 text-xs">{f.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="px-4 py-3 border-b border-white/8 bg-white/3 flex items-center gap-2">
                <Icon name="Mail" size={14} className="text-neon-purple" />
                <span className="text-white/60 text-xs font-oswald uppercase tracking-wider">Входящие</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 bg-neon-purple/15 text-neon-purple rounded-full">3 новых</span>
              </div>
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded-lg mb-2">
                  <Icon name="Search" size={12} className="text-white/30" />
                  <span className="text-white/25 text-xs">Поиск по теме, отправителю, тексту...</span>
                </div>
              </div>
              {[
                { from: "booking@atlas-arena.ru", subj: "Подтверждение брони 15 мая", time: "10:24", unread: true },
                { from: "manager@kassir.ru",      subj: "Отчёт продаж за неделю",     time: "вчера",  unread: true },
                { from: "tech@sberbank.ru",        subj: "Выписка по счёту",           time: "вчера",  unread: false },
                { from: "noreply@avito.ru",        subj: "Ваше объявление одобрено",   time: "2 дня",  unread: false },
                { from: "support@ticketmaster.ru", subj: "Синхронизация завершена",    time: "3 дня",  unread: false },
              ].map((m, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0 ${m.unread ? "border-l-2 border-l-neon-purple" : ""}`}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {m.from[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${m.unread ? "text-white font-bold" : "text-white/65"}`}>{m.from}</p>
                    <p className={`text-xs truncate ${m.unread ? "text-white/80 font-semibold" : "text-white/40"}`}>{m.subj}</p>
                  </div>
                  <span className="text-[10px] text-white/30 shrink-0">{m.time}</span>
                </div>
              ))}
            </div>
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
                  <div key={i} className={`flex items-center gap-4 glass rounded-xl p-4 border ${COLOR_BG[t.color]}`}>
                    <div className={`w-10 h-10 rounded-xl ${COLOR_BG[t.color]} border flex items-center justify-center shrink-0`}>
                      <Icon name={t.icon as never} size={18} className={COLOR_TEXT[t.color]} />
                    </div>
                    <div>
                      <p className={`font-oswald font-semibold text-sm ${COLOR_TEXT[t.color]}`}>{t.title}</p>
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
                    <span className={`font-oswald font-bold text-lg ${COLOR_TEXT[s.color]}`}>{s.count}</span>
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
              <div key={i} className={`glass rounded-2xl p-6 border ${COLOR_BG[col.color]}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl ${COLOR_BG[col.color]} border flex items-center justify-center`}>
                    <Icon name={col.icon as never} size={18} className={COLOR_TEXT[col.color]} />
                  </div>
                  <div>
                    <p className={`font-oswald font-bold text-base ${COLOR_TEXT[col.color]}`}>{col.title}</p>
                    <p className="text-white/30 text-xs">{col.badge}</p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {col.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-white/65">
                      <Icon name="Check" size={13} className={COLOR_TEXT[col.color]} />
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
                  <div key={i} className={`flex items-center gap-4 glass rounded-xl p-4 border ${COLOR_BG[r.color]}`}>
                    <div className={`w-9 h-9 rounded-xl ${COLOR_BG[r.color]} border flex items-center justify-center shrink-0`}>
                      <Icon name={r.icon as never} size={15} className={COLOR_TEXT[r.color]} />
                    </div>
                    <div>
                      <p className={`font-oswald font-semibold text-sm ${COLOR_TEXT[r.color]}`}>{r.role}</p>
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
                <p className={`font-oswald font-bold text-6xl mb-2 ${COLOR_TEXT[s.color]}`}>
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
    </>
  );
}

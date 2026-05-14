import Icon from "@/components/ui/icon";
import { COLOR_TEXT, COLOR_BG } from "../presentationData";

export default function SlideBarAndTeam() {
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
    </>
  );
}

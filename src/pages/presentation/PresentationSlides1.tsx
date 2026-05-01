import Icon from "@/components/ui/icon";
import { IMG_HERO, IMG_MANAGER, IMG_VENUE, IMG_EDO, IMG_TICKETS, IMG_PDF, FEATURES, PROBLEMS, SOLUTIONS, COLOR_TEXT, COLOR_BG } from "./presentationData";

export default function PresentationSlides1() {
  return (
    <>
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
                <p className={`font-oswald font-bold text-3xl ${COLOR_TEXT[s.color]}`}>{s.value}</p>
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
              <div key={i} className={`glass rounded-2xl p-4 border ${COLOR_BG[f.color]} hover:scale-[1.02] transition-transform animate-fade-in`}
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className={`w-9 h-9 rounded-xl ${COLOR_BG[f.color]} border flex items-center justify-center mb-3`}>
                  <Icon name={f.icon as never} size={16} className={COLOR_TEXT[f.color]} />
                </div>
                <p className={`font-oswald font-bold text-sm mb-1 ${COLOR_TEXT[f.color]}`}>{f.title}</p>
                <p className="text-white/45 text-xs leading-relaxed">{f.desc}</p>
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
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${COLOR_BG[t.color]} ${COLOR_TEXT[t.color]}`}>{t.status}</span>
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
                    <p className={`font-oswald font-bold text-2xl ${COLOR_TEXT[s.color]}`}>{s.value}</p>
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
                      <Icon name="FileText" size={14} className={COLOR_TEXT[d.color]} />
                      <span className="text-white/70 text-sm">{d.doc}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/25 text-xs">{d.date}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${COLOR_BG[d.color]} ${COLOR_TEXT[d.color]}`}>{d.status}</span>
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
        {/* Тёмный тематический фон — ноутбук с PDF документом */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/17f9f786-13c1-4b2e-8db8-171ca2557570.jpg)` }} />
        {/* Максимальное затемнение — фон почти чёрный, текст чётко виден */}
        <div className="absolute inset-0 bg-black/92" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(4,6,14,0.98) 0%, rgba(4,6,14,0.93) 60%, rgba(4,6,14,0.85) 100%)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04060e]/95 via-transparent to-[#04060e]/70" />

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
                  <div key={i} className={`flex items-center gap-4 bg-black/70 backdrop-blur-sm rounded-xl p-4 border ${COLOR_BG[t.color]}`}>
                    <div className={`w-10 h-10 rounded-xl ${COLOR_BG[t.color]} border flex items-center justify-center shrink-0`}>
                      <Icon name={t.icon as never} size={18} className={COLOR_TEXT[t.color]} />
                    </div>
                    <div>
                      <p className={`font-oswald font-semibold text-sm ${COLOR_TEXT[t.color]}`}>{t.title}</p>
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
                      <Icon name="FileText" size={14} className={COLOR_TEXT[f.color]} />
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate font-medium">{f.name}</p>
                        <p className="text-white/50 text-xs">{f.size} · {f.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${COLOR_BG[f.color]} ${COLOR_TEXT[f.color]}`}>{f.status}</span>
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
                  { name: "Kassir.ru",         icon: "Ticket",       color: "neon-purple", desc: "Автоматический импорт отчётов" },
                  { name: "Ticketmaster",       icon: "Ticket",       color: "neon-pink",   desc: "Webhook интеграция" },
                  { name: "СберТикет",          icon: "Ticket",       color: "neon-green",  desc: "Экспорт отчётов" },
                  { name: "Другие системы",     icon: "Plug",         color: "neon-cyan",   desc: "CSV / Excel импорт" },
                ].map((a, i) => (
                  <div key={i} className={`flex items-center gap-4 glass rounded-xl p-3.5 border ${COLOR_BG[a.color]}`}>
                    <div className={`w-9 h-9 rounded-xl ${COLOR_BG[a.color]} border flex items-center justify-center shrink-0`}>
                      <Icon name={a.icon as never} size={15} className={COLOR_TEXT[a.color]} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-oswald font-semibold text-sm ${COLOR_TEXT[a.color]}`}>{a.name}</p>
                      <p className="text-white/35 text-xs">{a.desc}</p>
                    </div>
                    <Icon name="Check" size={14} className={COLOR_TEXT[a.color]} />
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
                      <p className={`font-oswald font-bold text-xl ${COLOR_TEXT[s.color]}`}>{s.value}</p>
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
              <div key={i} className={`glass rounded-2xl p-6 border ${COLOR_BG[col.color]}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl ${COLOR_BG[col.color]} border flex items-center justify-center`}>
                    <Icon name={col.icon as never} size={18} className={COLOR_TEXT[col.color]} />
                  </div>
                  <h3 className={`font-oswald font-bold text-base ${COLOR_TEXT[col.color]}`}>{col.title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {col.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-white/60">
                      <Icon name="Check" size={13} className={`${COLOR_TEXT[col.color]} shrink-0 mt-0.5`} />
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
    </>
  );
}

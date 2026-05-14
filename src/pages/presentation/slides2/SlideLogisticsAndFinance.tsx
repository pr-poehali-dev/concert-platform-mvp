import Icon from "@/components/ui/icon";
import { WORKFLOW, COLOR_TEXT, COLOR_BG } from "../presentationData";

export default function SlideLogisticsAndFinance() {
  return (
    <>
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
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${COLOR_TEXT[s.color].replace("text-", "bg-")}`} />
                      <span className="text-white/60 text-sm">{s.status}</span>
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
                  <Icon name={w.icon as never} size={20} className="text-neon-cyan/70 mx-auto mb-3" />
                  <p className="font-oswald font-bold text-white text-sm mb-2">{w.title}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{w.desc}</p>
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
    </>
  );
}

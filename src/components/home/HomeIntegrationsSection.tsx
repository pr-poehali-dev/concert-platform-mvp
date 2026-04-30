import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

export default function HomeIntegrationsSection() {
  return (
    <section className="py-24 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge className="bg-neon-green/20 text-neon-green border-neon-green/40 mb-4">Интеграции</Badge>
          <h2 className="font-oswald font-bold text-4xl sm:text-5xl text-white uppercase mb-4">
            Работает с вашими <span className="neon-text-cyan">системами</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Подключите кассовую систему, агрегаторы билетов и сервисы логистики — данные приходят автоматически
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            {
              icon: "Wine", color: "neon-cyan", title: "iiko Cloud / R-Keeper",
              desc: "Продажи бара в реальном времени, остатки склада и отчёты по сменам. Экспорт в Excel одним кликом.",
              tags: ["Продажи", "Склад", "Смены", "Excel"],
            },
            {
              icon: "Ticket", color: "neon-purple", title: "Агрегаторы билетов",
              desc: "Яндекс Афиша, Kassir.ru, Ticketmaster — продажи синхронизируются в P&L автоматически.",
              tags: ["Яндекс Афиша", "Kassir", "Ticketmaster"],
            },
            {
              icon: "Briefcase", color: "neon-pink", title: "Логистика",
              desc: "Авиасейлс, РЖД, Ostrovok. Бронируйте перелёты, поезда и отели для всей команды в одном окне.",
              tags: ["Авиасейлс", "РЖД", "Ostrovok"],
            },
          ].map((int, i) => (
            <div key={i} className="glass rounded-2xl p-6 hover-lift">
              <div className={`w-12 h-12 rounded-xl bg-${int.color}/10 border border-${int.color}/20 flex items-center justify-center mb-4`}>
                <Icon name={int.icon as never} size={22} className={`text-${int.color}`} />
              </div>
              <h3 className="font-oswald font-semibold text-xl text-white mb-2">{int.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-4">{int.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {int.tags.map((t, j) => (
                  <span key={j} className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-white/50">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Для кого */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-8 border border-neon-purple/15">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-neon-purple/15 flex items-center justify-center">
                <Icon name="Route" size={20} className="text-neon-purple" />
              </div>
              <div>
                <p className="text-white font-oswald font-bold text-lg">Для организаторов</p>
                <p className="text-white/40 text-xs">Полное управление туром</p>
              </div>
            </div>
            <ul className="space-y-2">
              {["Поиск и бронирование площадок", "Финансы и P&L автоматически", "ЭДО и подписание договоров", "CRM: задачи, дедлайны, воронки", "Логистика для всей команды", "Синхронизация продаж из агрегаторов", "Сотрудники: права, зарплаты, документы"].map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/65">
                  <Icon name="CheckCircle" size={14} className="text-neon-purple shrink-0" />{t}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-2xl p-8 border border-neon-cyan/15">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-neon-cyan/15 flex items-center justify-center">
                <Icon name="Building2" size={20} className="text-neon-cyan" />
              </div>
              <div>
                <p className="text-white font-oswald font-bold text-lg">Для площадок</p>
                <p className="text-white/40 text-xs">Личный кабинет площадки</p>
              </div>
            </div>
            <ul className="space-y-2">
              {["Каталог с фото, схемой и ценами", "Чат с организаторами", "CRM бронирований и проектов", "Интеграция с iiko / R-Keeper", "Отчёты бара: продажи, склад, смены", "Email-рассылка отчётов по расписанию", "Управление командой и зарплатами"].map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/65">
                  <Icon name="CheckCircle" size={14} className="text-neon-cyan shrink-0" />{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

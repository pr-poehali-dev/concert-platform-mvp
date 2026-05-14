import Icon from "@/components/ui/icon";
import { IMG_HERO, IMG_VENUE, COLOR_TEXT } from "../presentationData";
import Counter from "./Counter";

export default function SlideStatsAndCta() {
  return (
    <>
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

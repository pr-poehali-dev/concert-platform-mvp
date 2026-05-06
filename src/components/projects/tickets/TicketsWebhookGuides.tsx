import { useState } from "react";
import Icon from "@/components/ui/icon";

const TICKETS_URL = "https://functions.poehali.dev/e8e3c7c9-b452-4e77-8db2-ca0266399006";

// ── Инструкция по настройке вебхука ──────────────────────────────────────────
export function WebhookInstructions({ integrationId, provider }: { integrationId: string; provider: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (provider !== "ticketscloud") return null;

  const webhookUrl = `${TICKETS_URL}?action=webhook&provider=ticketscloud&integration_id=${integrationId}`;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const STEPS = [
    {
      num: 1,
      text: "Откройте TicketsCloud → Мероприятия → выберите событие",
      link: "https://manager.ticketscloud.com",
      linkText: "Перейти в TicketsCloud →",
    },
    {
      num: 2,
      text: "В настройках события найдите раздел «Вебхуки» или «Уведомления»",
    },
    {
      num: 3,
      text: "Нажмите «Добавить вебхук» и вставьте URL:",
      copyKey: "url",
      copyValue: webhookUrl,
    },
    {
      num: 4,
      text: "Выберите события: order.done (оплата), order.returned (возврат)",
    },
    {
      num: 5,
      text: "Сохраните. Теперь каждая продажа будет мгновенно появляться в проекте.",
    },
  ];

  return (
    <div className="mt-4 border-t border-white/8 pt-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-white/35 hover:text-white/60 text-xs transition-colors w-full"
      >
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={13} />
        <Icon name="Webhook" size={13} />
        Как настроить вебхук для получения заказов в реальном времени
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-4 space-y-3">
            <p className="text-neon-cyan text-xs font-semibold flex items-center gap-1.5">
              <Icon name="Zap" size={13} />
              Вебхук = заказы появляются мгновенно, без ручной синхронизации
            </p>
            <p className="text-white/40 text-xs">
              Автосинхронизация уже работает каждые 30 минут. Вебхук ускоряет это до секунды.
            </p>
          </div>

          <div className="space-y-2">
            {STEPS.map(s => (
              <div key={s.num} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-white/8 border border-white/15 flex items-center justify-center text-[10px] text-white/40 font-bold shrink-0 mt-0.5">
                  {s.num}
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-white/55 text-xs">{s.text}</p>
                  {s.copyValue && (
                    <div className="flex items-center gap-2 glass border border-white/10 rounded-lg px-2.5 py-1.5">
                      <code className="flex-1 text-neon-cyan text-[11px] break-all">{s.copyValue}</code>
                      <button
                        onClick={() => copy(s.copyValue!, s.copyKey!)}
                        className="shrink-0 text-white/30 hover:text-neon-cyan transition-colors"
                        title="Скопировать"
                      >
                        <Icon name={copied === s.copyKey ? "Check" : "Copy"} size={13} className={copied === s.copyKey ? "text-neon-green" : ""} />
                      </button>
                    </div>
                  )}
                  {s.link && (
                    <a href={s.link} target="_blank" rel="noopener noreferrer"
                      className="text-neon-cyan/60 hover:text-neon-cyan text-xs flex items-center gap-1 transition-colors">
                      <Icon name="ExternalLink" size={11} />{s.linkText}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-white/25 text-xs flex items-center gap-1.5 pt-1">
            <Icon name="Info" size={11} />
            Если вебхука нет в настройках — обратитесь в поддержку TicketsCloud для его активации
          </p>
        </div>
      )}
    </div>
  );
}

// ── Гайд после создания интеграции ────────────────────────────────────────────
export function CreatedWebhookGuide({ webhookUrl, webhookSecret }: { webhookUrl: string; webhookSecret: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  return (
    <div className="space-y-3 border border-white/8 rounded-xl p-4">
      <p className="text-white/50 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
        <Icon name="Webhook" size={12} />Как подключить вебхук (реальное время)
      </p>
      <div className="space-y-2.5 text-xs">
        {[
          { num: 1, text: "Откройте TicketsCloud → Мероприятия → ваше событие", link: "https://manager.ticketscloud.com", linkText: "Открыть кабинет →" },
          { num: 2, text: "Настройки события → раздел «Вебхуки» / «Уведомления» → Добавить" },
          { num: 3, text: "Вставьте URL вебхука:", copy: webhookUrl, copyKey: "url" },
          { num: 4, text: "Если есть поле «Секрет» — вставьте:", copy: webhookSecret, copyKey: "secret" },
          { num: 5, text: "Выберите события: order.done, order.returned → Сохранить" },
        ].map(s => (
          <div key={s.num} className="flex gap-2.5">
            <span className="w-4 h-4 rounded-full bg-white/8 flex items-center justify-center text-[10px] text-white/35 font-bold shrink-0 mt-0.5">{s.num}</span>
            <div className="flex-1">
              <p className="text-white/50">{s.text}</p>
              {s.copy && (
                <div className="flex items-center gap-1.5 glass border border-white/10 rounded-lg px-2 py-1 mt-1">
                  <code className="flex-1 text-neon-cyan text-[10px] break-all">{s.copy}</code>
                  <button onClick={() => copy(s.copy!, s.copyKey!)} className="text-white/25 hover:text-neon-cyan shrink-0 transition-colors">
                    <Icon name={copied === s.copyKey ? "Check" : "Copy"} size={12} className={copied === s.copyKey ? "text-neon-green" : ""} />
                  </button>
                </div>
              )}
              {s.link && (
                <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-neon-cyan/60 hover:text-neon-cyan flex items-center gap-1 mt-0.5 transition-colors">
                  <Icon name="ExternalLink" size={10} />{s.linkText}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-white/25 text-[11px] flex items-center gap-1.5 pt-1 border-t border-white/8">
        <Icon name="RefreshCw" size={10} />
        Без вебхука данные автоматически обновляются каждые 30 минут
      </p>
    </div>
  );
}

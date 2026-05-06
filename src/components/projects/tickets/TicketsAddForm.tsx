import Icon from "@/components/ui/icon";
import { CreatedWebhookGuide } from "./TicketsWebhookGuides";

const PROVIDERS: Record<string, { label: string; logo: string; color: string; docsUrl: string }> = {
  ticketscloud: {
    label: "TicketsCloud",
    logo: "🎫",
    color: "neon-purple",
    docsUrl: "https://ticketscloud.com/developers",
  },
};

interface FormState {
  provider: string;
  name: string;
  apiKey: string;
  eventId: string;
}

interface Props {
  form: FormState;
  adding: boolean;
  addError: string;
  created: { webhookUrl: string; webhookSecret: string } | null;
  onFormChange: (patch: Partial<FormState>) => void;
  onAdd: () => void;
  onCancel: () => void;
  onDone: () => void;
}

export default function TicketsAddForm({
  form, adding, addError, created,
  onFormChange, onAdd, onCancel, onDone,
}: Props) {
  if (created) {
    return (
      <div className="glass rounded-2xl border border-neon-green/30 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-green/15 flex items-center justify-center">
            <Icon name="CheckCircle2" size={20} className="text-neon-green" />
          </div>
          <div>
            <h4 className="font-oswald font-bold text-white">Интеграция создана!</h4>
            <p className="text-white/45 text-xs">Данные за всё время уже загружаются. Настройте вебхук для обновлений в реальном времени.</p>
          </div>
        </div>

        {/* Встроенная инструкция с раскрытым состоянием */}
        <CreatedWebhookGuide webhookUrl={created.webhookUrl} webhookSecret={created.webhookSecret} />

        <button onClick={onDone}
          className="px-4 py-2 glass border border-white/10 rounded-xl text-white/60 hover:text-white text-sm transition-colors">
          Готово
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-neon-purple/20 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-oswald font-bold text-white">Новая интеграция</h4>
        <button onClick={onCancel} className="text-white/30 hover:text-white transition-colors">
          <Icon name="X" size={16} />
        </button>
      </div>

      {/* Провайдер */}
      <div>
        <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Билетная система</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(PROVIDERS).map(([id, p]) => (
            <button
              key={id}
              onClick={() => onFormChange({ provider: id })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                form.provider === id
                  ? "bg-neon-purple/20 border-neon-purple/50 text-white"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white"
              }`}
            >
              <span>{p.logo}</span>{p.label}
            </button>
          ))}
        </div>
      </div>

      {form.provider === "ticketscloud" && (
        <div className="bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="BookOpen" size={14} className="text-neon-cyan" />
            <span className="text-neon-cyan text-xs font-semibold">Как подключить TicketsCloud</span>
          </div>
          <ol className="space-y-1.5 text-xs text-white/65">
            <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-neon-purple/20 text-neon-purple text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">1</span>Зайдите в личный кабинет <b className="text-white/80">ticketscloud.ru</b></li>
            <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-neon-purple/20 text-neon-purple text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">2</span>Профиль → <b className="text-white/80">API-ключи</b> → Создать новый ключ. Скопируйте токен</li>
            <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-neon-purple/20 text-neon-purple text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">3</span>ID события — откройте нужное событие, скопируйте ID из URL или из карточки события (формат: <code className="text-neon-cyan/80 bg-neon-cyan/10 px-1 rounded">5f3c8d2a1e4b7c9d0f123456</code>)</li>
            <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-neon-pink/20 text-neon-pink text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">4</span><span className="text-neon-pink/80">После создания — скопируйте URL вебхука и добавьте его в настройках события: TicketsCloud → Событие → Настройки → Вебхуки</span></li>
            <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-neon-green/20 text-neon-green text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">5</span><span className="text-neon-green/80">Нажмите «Синхр.» для ручной загрузки уже существующих заказов</span></li>
          </ol>
          <a href="https://ticketscloud.readthedocs.io/ru/old/v1/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-neon-cyan text-xs hover:underline">
            <Icon name="ExternalLink" size={11} />Документация TicketsCloud API v1
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Название (необязательно)</label>
          <input
            value={form.name}
            onChange={e => onFormChange({ name: e.target.value })}
            placeholder="Например: Концерт Ivanov Live"
            className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm"
          />
        </div>
        <div>
          <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">ID события *</label>
          <input
            value={form.eventId}
            onChange={e => onFormChange({ eventId: e.target.value })}
            placeholder="12345"
            className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm font-mono"
          />
        </div>
      </div>

      <div>
        <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">API-ключ (токен) *</label>
        <input
          type="password"
          value={form.apiKey}
          onChange={e => onFormChange({ apiKey: e.target.value })}
          placeholder="Bearer токен или API-ключ провайдера"
          className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm font-mono"
        />
        <p className="text-white/25 text-xs mt-1 flex items-center gap-1">
          <Icon name="Shield" size={10} />Ключ хранится в зашифрованном виде
        </p>
      </div>

      {addError && (
        <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2">
          <Icon name="AlertCircle" size={14} />{addError}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-white/50 hover:text-white text-sm transition-colors">
          Отмена
        </button>
        <button
          onClick={onAdd}
          disabled={adding}
          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 text-sm"
        >
          {adding ? <><Icon name="Loader2" size={14} className="animate-spin" />Создаю...</> : <><Icon name="Zap" size={14} />Подключить</>}
        </button>
      </div>
    </div>
  );
}

import Icon from "@/components/ui/icon";
import UserSearch from "./SignatureUserSearch";

// ── Send Internal ────────────────────────────────────────────────────────────

interface SendInternalProps {
  sendEmail: string;
  sendName: string;
  sendMsg: string;
  sendLoading: boolean;
  sendSent: { name: string; registered: boolean } | null;
  onEmailChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onMsgChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onReset: () => void;
}

export function SendInternalStep({
  sendEmail, sendName, sendMsg, sendLoading, sendSent,
  onEmailChange, onNameChange, onMsgChange, onSubmit, onBack, onReset,
}: SendInternalProps) {
  if (sendSent) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="w-12 h-12 rounded-xl bg-neon-green/20 border border-neon-green/20 flex items-center justify-center mx-auto">
          <Icon name="CheckCircle2" size={22} className="text-neon-green" />
        </div>
        <p className="text-white font-semibold">Документ отправлен</p>
        <p className="text-white/65 text-sm">
          {sendSent.registered
            ? <>Документ добавлен в раздел «Документы» пользователя <span className="text-white/70">{sendSent.name}</span></>
            : <>Письмо со ссылкой отправлено на <span className="text-white/70">{sendEmail}</span></>}
        </p>
        <button onClick={onReset} className="mt-2 text-neon-cyan text-sm hover:opacity-80 transition-opacity">
          Вернуться
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-white/70 text-sm mb-1">Отправить документ контрагенту:</p>
      <UserSearch
        label="Email или имя получателя"
        email={sendEmail}
        name={sendName}
        onEmailChange={onEmailChange}
        onNameChange={onNameChange}
      />
      <div>
        <label className="text-xs text-white/65 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Icon name="MessageSquare" size={10} />Сообщение (необязательно)
        </label>
        <textarea value={sendMsg} onChange={e => onMsgChange(e.target.value)}
          placeholder="Направляю вам договор для ознакомления..." rows={2}
          className="gl-input resize-none" />
      </div>
      <div className="bg-neon-cyan/5 border border-neon-cyan/15 rounded-xl px-3.5 py-2.5 flex gap-2">
        <Icon name="Info" size={13} className="text-neon-cyan/50 mt-0.5 shrink-0" />
        <p className="text-xs text-white/60 leading-relaxed">
          Если получатель зарегистрирован в GLOBAL LINK — документ автоматически появится в его разделе «Документы». Иначе — придёт письмо со ссылкой.
        </p>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white text-sm transition-all flex items-center">
          <Icon name="ArrowLeft" size={14} />
        </button>
        <button type="submit" disabled={sendLoading || !sendEmail.includes("@")}
          className="flex-1 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {sendLoading
            ? <><Icon name="Loader2" size={14} className="animate-spin" />Отправка...</>
            : <><Icon name="Send" size={14} />Отправить</>}
        </button>
      </div>
    </form>
  );
}

// ── Send Request ─────────────────────────────────────────────────────────────

interface SendRequestProps {
  reqEmail: string;
  reqName: string;
  reqMsg: string;
  reqLoading: boolean;
  reqSent: boolean;
  onEmailChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onMsgChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onReset: () => void;
}

export function SendRequestStep({
  reqEmail, reqName, reqMsg, reqLoading, reqSent,
  onEmailChange, onNameChange, onMsgChange, onSubmit, onBack, onReset,
}: SendRequestProps) {
  if (reqSent) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="w-12 h-12 rounded-xl bg-neon-green/20 border border-neon-green/20 flex items-center justify-center mx-auto">
          <Icon name="CheckCircle2" size={22} className="text-neon-green" />
        </div>
        <p className="text-white font-semibold">Запрос отправлен</p>
        <p className="text-white/65 text-sm">Получатель получит письмо со ссылкой на документ</p>
        <button onClick={onReset} className="mt-2 text-neon-cyan text-sm hover:opacity-80 transition-opacity">
          Вернуться к документу
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-white/70 text-sm mb-1">Запросить подпись у другой стороны:</p>
      <UserSearch
        label="Email или имя получателя"
        email={reqEmail}
        name={reqName}
        onEmailChange={onEmailChange}
        onNameChange={onNameChange}
      />
      <div>
        <label className="text-xs text-white/65 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Icon name="MessageSquare" size={10} />Сообщение (необязательно)
        </label>
        <textarea value={reqMsg} onChange={e => onMsgChange(e.target.value)}
          placeholder="Прошу ознакомиться и подписать договор..." rows={2}
          className="gl-input resize-none" />
      </div>
      <div className="bg-neon-purple/5 border border-neon-purple/15 rounded-xl px-3.5 py-2.5 flex gap-2">
        <Icon name="Info" size={13} className="text-neon-purple/50 mt-0.5 shrink-0" />
        <p className="text-xs text-white/60 leading-relaxed">
          Документ скопируется получателю — каждая сторона подписывает внутри платформы. Итоговый PDF будет содержать подписи обеих сторон.
        </p>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white text-sm transition-all flex items-center gap-1.5">
          <Icon name="ArrowLeft" size={14} />
        </button>
        <button type="submit" disabled={reqLoading || !reqEmail.includes("@")}
          className="flex-1 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {reqLoading
            ? <><Icon name="Loader2" size={14} className="animate-spin" />Отправка...</>
            : <><Icon name="Send" size={14} />Отправить запрос</>}
        </button>
      </div>
    </form>
  );
}
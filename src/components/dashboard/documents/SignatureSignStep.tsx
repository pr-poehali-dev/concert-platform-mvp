import Icon from "@/components/ui/icon";
import { type Doc } from "./docTypes";

interface Props {
  doc: Doc;
  codeSent: boolean;
  codeInput: string[];
  codeLoading: boolean;
  confirmLoading: boolean;
  onRequestCode: () => void;
  onCodeDigit: (i: number, val: string) => void;
  onCodeKeyDown: (i: number, e: React.KeyboardEvent) => void;
  onConfirm: (code?: string) => void;
  onPasteCode: (pasted: string) => void;
  onBack: () => void;
}

export default function SignatureSignStep({
  doc, codeSent, codeInput, codeLoading, confirmLoading,
  onRequestCode, onCodeDigit, onCodeKeyDown, onConfirm, onPasteCode, onBack,
}: Props) {

  // ── Выбор типа подписи ──────────────────────────────────────────────
  if (!codeSent) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3 mb-1">
          <Icon name="FileText" size={15} className="text-neon-cyan shrink-0" />
          <p className="text-white/60 text-sm truncate flex-1">{doc.name}</p>
          <a href={doc.fileUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-xs rounded-lg hover:bg-neon-cyan/20 transition-colors shrink-0">
            <Icon name="Eye" size={12} />Открыть
          </a>
        </div>
        <p className="text-white/50 text-sm">Выберите способ подписания:</p>

        <button onClick={onRequestCode} disabled={codeLoading}
          className="w-full text-left p-4 rounded-xl border border-neon-purple/30 bg-neon-purple/5 hover:bg-neon-purple/10 transition-all group">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-neon-purple/20 flex items-center justify-center shrink-0 mt-0.5">
              {codeLoading
                ? <Icon name="Loader2" size={16} className="text-neon-purple animate-spin" />
                : <Icon name="Mail" size={16} className="text-neon-purple" />}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Простая ЭП (ПЭП)</p>
              <p className="text-white/40 text-xs mt-0.5">Подтверждение кодом из email. Юридически значима при наличии соглашения сторон.</p>
            </div>
          </div>
        </button>

        <div className="w-full text-left p-4 rounded-xl border border-white/5 bg-white/2 opacity-50 cursor-not-allowed">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="ShieldCheck" size={16} className="text-white/20" />
            </div>
            <div>
              <p className="text-white/50 font-semibold text-sm">Квалифицированная ЭП (КЭП)</p>
              <p className="text-white/25 text-xs mt-0.5">Скоро · Требует КЭП-сертификата (Контур, СБИС и др.)</p>
            </div>
          </div>
        </div>

        <button onClick={onBack}
          className="w-full py-2.5 text-white/30 hover:text-white/60 text-sm transition-colors flex items-center justify-center gap-2">
          <Icon name="ArrowLeft" size={14} />Назад
        </button>
      </div>
    );
  }

  // ── Ввод кода ───────────────────────────────────────────────────────
  return (
    <div className="text-center space-y-5">
      <div className="w-12 h-12 rounded-xl bg-neon-purple/20 border border-neon-purple/20 flex items-center justify-center mx-auto">
        <Icon name="Mail" size={22} className="text-neon-purple" />
      </div>
      <div>
        <p className="text-white font-semibold mb-1">Введите код из письма</p>
        <p className="text-white/40 text-sm">Код отправлен на вашу почту</p>
      </div>

      <div className="flex gap-2 justify-center">
        {codeInput.map((digit, i) => (
          <input
            key={i}
            id={`sig-code-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => onCodeDigit(i, e.target.value)}
            onKeyDown={e => onCodeKeyDown(i, e)}
            onPaste={i === 0 ? (e) => {
              const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
              if (pasted.length === 6) onPasteCode(pasted);
            } : undefined}
            className="w-10 h-12 rounded-xl border text-center text-lg font-bold text-white outline-none transition-all"
            style={{
              background: digit ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)",
              borderColor: digit ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </div>

      <button onClick={() => onConfirm()} disabled={confirmLoading || codeInput.some(d => !d)}
        className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
        {confirmLoading
          ? <><Icon name="Loader2" size={15} className="animate-spin" />Проверяю...</>
          : <><Icon name="ShieldCheck" size={15} />Подписать</>}
      </button>

      <button onClick={onRequestCode} disabled={codeLoading}
        className="text-white/30 hover:text-white/60 text-sm transition-colors">
        {codeLoading ? "Отправка..." : "Отправить код повторно"}
      </button>
    </div>
  );
}

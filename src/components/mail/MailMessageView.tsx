import Icon from "@/components/ui/icon";
import { type MailFull } from "./mailTypes";

interface Props {
  openMail: MailFull | null;
  loadingMail: boolean;
  onReply: () => void;
}

export default function MailMessageView({ openMail, loadingMail, onReply }: Props) {
  return (
    <article className="hidden lg:flex lg:col-span-6 glass rounded-xl border border-white/10 overflow-hidden flex-col">
      {loadingMail ? (
        <div className="flex-1 flex items-center justify-center">
          <Icon name="Loader2" size={20} className="text-white/40 animate-spin" />
        </div>
      ) : !openMail ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-white/40 px-6">
          <Icon name="MailOpen" size={32} className="mb-3 text-white/25" />
          <p className="text-sm">Выберите письмо</p>
        </div>
      ) : (
        <>
          <div className="p-4 border-b border-white/10">
            <h2 className="font-oswald font-bold text-xl text-white mb-2">{openMail.subject || "(без темы)"}</h2>
            <div className="flex items-start gap-2 text-xs">
              <span className="text-white/45 w-12 shrink-0">От:</span>
              <span className="text-white/85">
                {openMail.fromName ? `${openMail.fromName} ` : ""}
                <span className="text-white/55">&lt;{openMail.fromEmail}&gt;</span>
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs mt-1">
              <span className="text-white/45 w-12 shrink-0">Кому:</span>
              <span className="text-white/75 truncate">{openMail.to}</span>
            </div>
            <div className="flex items-start gap-2 text-xs mt-1">
              <span className="text-white/45 w-12 shrink-0">Дата:</span>
              <span className="text-white/75">{openMail.date ? new Date(openMail.date).toLocaleString("ru") : ""}</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={onReply}
                className="px-3 py-1.5 bg-neon-purple/15 hover:bg-neon-purple/25 text-neon-purple rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Icon name="Reply" size={12} /> Ответить
              </button>
              {openMail.attachments.length > 0 && (
                <span className="text-white/55 text-xs flex items-center gap-1">
                  <Icon name="Paperclip" size={12} />
                  {openMail.attachments.length} вложен.
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            {openMail.html ? (
              <iframe
                srcDoc={openMail.html}
                sandbox="allow-same-origin"
                className="w-full min-h-[400px] bg-white rounded-lg"
                title="email"
              />
            ) : (
              <pre className="whitespace-pre-wrap text-white/85 text-sm font-sans break-words">
                {openMail.text || "(пусто)"}
              </pre>
            )}

            {openMail.attachments.length > 0 && (
              <div className="mt-4 space-y-1">
                {openMail.attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-xs">
                    <Icon name="Paperclip" size={12} className="text-white/55" />
                    <span className="text-white/85 truncate flex-1">{a.name}</span>
                    <span className="text-white/45">{Math.round(a.size / 1024)} КБ</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </article>
  );
}

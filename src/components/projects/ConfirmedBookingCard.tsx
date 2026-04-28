import { useState } from "react";
import Icon from "@/components/ui/icon";
import { fmt } from "@/hooks/useProjects";
import { TASK_STATUS_CONFIG, type BookingInfo } from "./venueTabTypes";
import ContractModal from "./ContractModal";
import InvoiceModal from "./InvoiceModal";

interface Props {
  booking: BookingInfo;
  unreadMap: Record<string, number>;
  updatingTask: string | null;
  onOpenChat?: (conversationId: string) => void;
  onUpdateTask: (taskId: string, status: "pending" | "in_progress" | "done") => void;
}

export default function ConfirmedBookingCard({ booking, unreadMap, updatingTask, onOpenChat, onUpdateTask }: Props) {
  const doneTasks  = booking.tasks.filter(t => t.status === "done").length;
  const totalTasks = booking.tasks.length;
  const progress   = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const [showContract, setShowContract] = useState(false);
  const [showInvoice,  setShowInvoice]  = useState(false);
  const [invoiceReady, setInvoiceReady] = useState(false);

  const handleContractSigned = (invId?: string) => {
    if (invId) setInvoiceReady(true);
  };

  return (
    <>
      <div className="glass rounded-2xl overflow-hidden border border-neon-purple/10">
        {/* Заголовок */}
        <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-oswald font-bold text-white text-lg flex items-center gap-2">
              <Icon name="Building2" size={16} className="text-neon-purple" />
              {booking.venueName}
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-white/40">
              <span className="flex items-center gap-1">
                <Icon name="Calendar" size={11} />
                {booking.eventDate}{booking.eventTime ? ` ${booking.eventTime}` : ""}
              </span>
              {booking.artist && (
                <span className="flex items-center gap-1">
                  <Icon name="Music" size={11} />{booking.artist}
                </span>
              )}
              {booking.rentalAmount !== null && (
                <span className="flex items-center gap-1 text-neon-green font-medium">
                  <Icon name="Banknote" size={11} />Аренда: {fmt(booking.rentalAmount)} ₽
                </span>
              )}
            </div>
            {booking.venueConditions && (
              <p className="text-white/30 text-xs mt-1.5 line-clamp-2">{booking.venueConditions}</p>
            )}
          </div>

          {/* Кнопки справа */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Чат */}
            {booking.conversationId && onOpenChat && (
              <button
                onClick={() => onOpenChat(booking.conversationId)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 rounded-lg text-xs hover:bg-neon-cyan/20 transition-colors"
              >
                <Icon name="MessageCircle" size={13} />Чат
                {(unreadMap[booking.conversationId] || 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neon-pink rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadMap[booking.conversationId] > 9 ? "9+" : unreadMap[booking.conversationId]}
                  </span>
                )}
              </button>
            )}

            {/* Договор */}
            <button
              onClick={() => setShowContract(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-purple/10 text-neon-purple border border-neon-purple/20 rounded-lg text-xs hover:bg-neon-purple/20 transition-colors"
            >
              <Icon name="FileText" size={13} />Договор
            </button>

            {/* Счёт — показываем всегда, внутри объясним что ждём */}
            <button
              onClick={() => setShowInvoice(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs transition-colors ${
                invoiceReady
                  ? "bg-neon-green/15 text-neon-green border-neon-green/25 hover:bg-neon-green/25"
                  : "bg-white/5 text-white/35 border-white/10 hover:bg-white/10 hover:text-white/60"
              }`}
            >
              <Icon name="Receipt" size={13} />
              {invoiceReady ? "Счёт готов" : "Счёт"}
            </button>

            <span className="text-xs text-white/30">{doneTasks}/{totalTasks} задач</span>
          </div>
        </div>

        {/* Прогресс */}
        {totalTasks > 0 && (
          <div className="px-5 py-3 border-b border-white/5">
            <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
              <span>Прогресс организации</span>
              <span className={progress === 100 ? "text-neon-green font-medium" : ""}>{progress}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-neon-green" : "bg-neon-purple"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Подсказка про ЭДО */}
        <div className="px-5 py-2.5 flex items-center gap-2 border-b border-white/5 bg-neon-purple/3">
          <Icon name="PenTool" size={12} className="text-neon-purple/50" />
          <p className="text-white/30 text-xs">
            Нажмите <span className="text-neon-purple/70">«Договор»</span> — система автоматически подставит реквизиты из профилей обеих сторон
          </p>
        </div>

        {/* Задачи */}
        {totalTasks > 0 && (
          <div className="divide-y divide-white/5">
            {booking.tasks.map(task => {
              const cfg = TASK_STATUS_CONFIG[task.status];
              return (
                <div key={task.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${task.status === "done" ? "line-through text-white/40" : "text-white"}`}>
                        {task.title}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-lg border ${cfg.cls}`}>
                        <Icon name={cfg.icon} size={10} className="inline mr-1" />{cfg.label}
                      </span>
                    </div>
                    {task.description && <p className="text-white/30 text-xs mt-0.5">{task.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(["pending", "in_progress", "done"] as const).map(s => (
                      <button key={s} disabled={task.status === s || updatingTask === task.id}
                        onClick={() => onUpdateTask(task.id, s)} title={TASK_STATUS_CONFIG[s].label}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all text-xs disabled:cursor-default
                          ${task.status === s ? TASK_STATUS_CONFIG[s].cls : "border-white/10 text-white/20 hover:text-white/60 hover:border-white/20"}`}>
                        {updatingTask === task.id && task.status !== s
                          ? <Icon name="Loader2" size={11} className="animate-spin" />
                          : <Icon name={TASK_STATUS_CONFIG[s].icon} size={11} />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модалки */}
      {showContract && (
        <ContractModal
          bookingId={booking.id}
          venueName={booking.venueName}
          eventDate={booking.eventDate}
          rentalAmount={booking.rentalAmount}
          organizerId={booking.organizerId}
          venueUserId={booking.venueUserId}
          onClose={() => setShowContract(false)}
          onContractSigned={handleContractSigned}
        />
      )}
      {showInvoice && (
        <InvoiceModal
          bookingId={booking.id}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </>
  );
}

import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { type PendingUser, formatDate } from "./types";

interface Props {
  pending: PendingUser[];
  pendingLoading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onRefresh: () => void;
}

export default function AdminPendingTab({ pending, pendingLoading, onApprove, onReject, onRefresh }: Props) {
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleReject = () => {
    if (!rejectModal) return;
    onReject(rejectModal.id, rejectReason);
    setRejectModal(null);
    setRejectReason("");
  };

  return (
    <>
      <div className="animate-fade-in space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-oswald font-bold text-2xl text-white">Заявки на регистрацию</h2>
            <p className="text-white/40 text-sm mt-0.5">Новые пользователи, ожидающие проверки</p>
          </div>
          <button onClick={onRefresh} className="p-2.5 glass rounded-xl border border-white/10 text-white/40 hover:text-white transition-colors">
            <Icon name={pendingLoading ? "Loader2" : "RefreshCw"} size={16} className={pendingLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {pendingLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-36 animate-pulse" />)}
          </div>
        ) : pending.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <Icon name="CheckCircle" size={48} className="text-neon-green/40 mx-auto mb-4" />
            <p className="text-white/40 font-oswald text-lg">Все заявки обработаны</p>
            <p className="text-white/25 text-sm mt-1">Новых запросов нет</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pending.map(u => (
              <div key={u.id} className="glass rounded-2xl p-5 border border-neon-purple/15">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${u.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-lg shrink-0`}>
                    {u.avatar || u.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-oswald font-semibold text-white text-lg">{u.name}</h3>
                      <Badge className={u.role === "organizer" ? "bg-neon-purple/20 text-neon-purple border-neon-purple/30 text-xs" : "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30 text-xs"}>
                        {u.role === "organizer" ? "Организатор" : "Площадка"}
                      </Badge>
                    </div>
                    <p className="text-white/50 text-sm">{u.email}</p>
                    {u.city && <p className="text-white/30 text-xs flex items-center gap-1 mt-0.5"><Icon name="MapPin" size={11} />{u.city}</p>}
                    <p className="text-white/20 text-xs mt-1">Зарегистрирован: {formatDate(u.createdAt)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onApprove(u.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-green/20 text-neon-green border border-neon-green/30 rounded-xl hover:bg-neon-green/30 transition-colors font-oswald font-medium text-sm">
                    <Icon name="CheckCircle" size={15} />Одобрить
                  </button>
                  <button
                    onClick={() => { setRejectModal({ id: u.id, name: u.name }); setRejectReason(""); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-pink/10 text-neon-pink border border-neon-pink/20 rounded-xl hover:bg-neon-pink/20 transition-colors font-oswald font-medium text-sm">
                    <Icon name="XCircle" size={15} />Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setRejectModal(null)} />
          <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl p-6 border border-white/10 animate-scale-in">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-pink to-transparent rounded-t-2xl" />
            <h3 className="font-oswald font-bold text-xl text-white mb-1">Отклонить заявку</h3>
            <p className="text-white/40 text-sm mb-4">{rejectModal.name}</p>
            <div className="mb-4">
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Причина отклонения (необязательно)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Укажите причину, пользователь получит уведомление..."
                rows={3}
                className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/20 outline-none border border-white/10 focus:border-neon-pink/50 transition-colors text-sm resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 glass text-white/50 rounded-xl border border-white/10 text-sm hover:text-white transition-colors">
                Отмена
              </button>
              <button onClick={handleReject}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-xl hover:bg-neon-pink/30 transition-colors font-oswald font-medium text-sm">
                <Icon name="XCircle" size={15} />Отклонить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

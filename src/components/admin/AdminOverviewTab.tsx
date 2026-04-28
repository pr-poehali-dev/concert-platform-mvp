import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { type Stats, type AdminUser, formatDate } from "./types";

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon name={icon} size={20} className="text-white" />
      </div>
      <div className="font-oswald font-bold text-3xl text-white mb-0.5">{value}</div>
      <div className="text-white/50 text-sm">{label}</div>
      {sub && <div className="text-white/30 text-xs mt-1">{sub}</div>}
    </div>
  );
}

interface Props {
  stats: Stats | null;
  statsLoading: boolean;
  onGoToPending: () => void;
}

export default function AdminOverviewTab({ stats, statsLoading, onGoToPending }: Props) {
  return (
    <div className="animate-fade-in space-y-8">
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={`skeleton-${i}`} className="glass rounded-2xl h-28 animate-pulse" />)}
        </div>
      ) : stats ? (
        <>
          <div>
            <h2 className="font-oswald font-bold text-xl text-white mb-4 flex items-center gap-2">
              <Icon name="Users" size={18} className="text-neon-purple" />Пользователи
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="Users" label="Всего пользователей" value={stats.totalUsers} sub={`+${stats.newUsersWeek} за неделю`} color="bg-neon-purple/20" />
              <StatCard icon="Route" label="Организаторы" value={stats.organizers} color="bg-neon-pink/20" />
              <StatCard icon="Building2" label="Площадки" value={stats.venueOwners} color="bg-neon-cyan/20" />
              <div className="glass rounded-2xl p-5 cursor-pointer hover:ring-1 hover:ring-neon-pink/50 transition-all" onClick={onGoToPending}>
                <div className="w-10 h-10 rounded-xl bg-neon-pink/20 flex items-center justify-center mb-3">
                  <Icon name="ClipboardList" size={20} className="text-neon-pink" />
                </div>
                <div className="font-oswald font-bold text-3xl text-white mb-0.5 flex items-center gap-2">
                  {stats.pendingCount}
                  {stats.pendingCount > 0 && <span className="text-sm px-2 py-0.5 bg-neon-pink/20 text-neon-pink rounded-lg animate-pulse">Новые</span>}
                </div>
                <div className="text-white/50 text-sm">Ожидают проверки</div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-oswald font-bold text-xl text-white mb-4 flex items-center gap-2">
              <Icon name="Building2" size={18} className="text-neon-cyan" />Площадки и активность
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="Building2" label="Всего площадок" value={stats.totalVenues} color="bg-neon-cyan/20" />
              <StatCard icon="BadgeCheck" label="Верифицировано" value={stats.verifiedVenues} color="bg-neon-green/20" />
              <StatCard icon="MessageCircle" label="Диалоги" value={stats.totalConversations} color="bg-neon-purple/20" />
              <StatCard icon="Send" label="Сообщений" value={stats.totalMessages} color="bg-neon-pink/20" />
            </div>
          </div>

          <div>
            <h2 className="font-oswald font-bold text-xl text-white mb-4 flex items-center gap-2">
              <Icon name="Clock" size={18} className="text-neon-pink" />Последние регистрации
            </h2>
            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Пользователь","Email","Роль","Дата"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map((u: AdminUser, i: number) => (
                    <tr key={u.id} className={`hover:bg-white/3 transition-colors ${i < stats.recentUsers.length - 1 ? "border-b border-white/5" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center font-oswald font-bold text-white text-xs shrink-0">
                            {u.name[0]?.toUpperCase()}
                          </div>
                          <span className="text-white text-sm font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-white/50 text-sm">{u.email}</td>
                      <td className="px-5 py-3">
                        <Badge className={u.role === "organizer" ? "bg-neon-purple/20 text-neon-purple border-neon-purple/30 text-xs" : "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30 text-xs"}>
                          {u.role === "organizer" ? "Организатор" : "Площадка"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-white/40 text-sm">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-white/30">Нет данных</div>
      )}
    </div>
  );
}
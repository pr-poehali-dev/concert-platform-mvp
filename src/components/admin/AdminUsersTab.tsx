import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { type AdminUser, formatDate } from "./types";

interface Props {
  users: AdminUser[];
  usersTotal: number;
  usersPage: number;
  usersPages: number;
  usersSearch: string;
  usersRole: string;
  usersLoading: boolean;
  onSearchChange: (val: string) => void;
  onRoleChange: (val: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onToggleVerify: (id: string) => void;
  onToggleAdmin: (id: string) => void;
}

export default function AdminUsersTab({
  users, usersTotal, usersPage, usersPages,
  usersSearch, usersRole, usersLoading,
  onSearchChange, onRoleChange, onPageChange,
  onRefresh, onToggleVerify, onToggleAdmin,
}: Props) {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5 border border-white/10 flex-1 min-w-48">
          <Icon name="Search" size={15} className="text-white/30 shrink-0" />
          <input
            type="text" placeholder="Поиск по имени или email..."
            value={usersSearch}
            onChange={e => onSearchChange(e.target.value)}
            className="bg-transparent text-white placeholder:text-white/25 outline-none text-sm flex-1"
          />
        </div>
        <div className="flex gap-1 glass rounded-xl p-1 border border-white/10">
          {[["", "Все"], ["organizer", "Организаторы"], ["venue", "Площадки"]].map(([val, label]) => (
            <button key={val} onClick={() => onRoleChange(val)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-all ${usersRole === val ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={onRefresh} className="p-2.5 glass rounded-xl border border-white/10 text-white/40 hover:text-white transition-colors">
          <Icon name={usersLoading ? "Loader2" : "RefreshCw"} size={16} className={usersLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {["Пользователь","Роль","Город","Площадок","Дата рег.","Статус","Действия"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-white/40 uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usersLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 bg-white/5 rounded animate-pulse" /></td></tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-white/30">Пользователи не найдены</td></tr>
            ) : users.map((u, i) => (
              <tr key={u.id} className={`hover:bg-white/3 transition-colors ${i < users.length - 1 ? "border-b border-white/5" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${u.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-xs shrink-0`}>
                      {u.avatar || u.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-sm font-medium">{u.name}</span>
                        {u.isAdmin && <Icon name="ShieldCheck" size={13} className="text-neon-purple" />}
                      </div>
                      <span className="text-white/40 text-xs">{u.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge className={u.role === "organizer" ? "bg-neon-purple/20 text-neon-purple border-neon-purple/30 text-xs" : "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30 text-xs"}>
                    {u.role === "organizer" ? "Организатор" : "Площадка"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-white/50 text-sm">{u.city || "—"}</td>
                <td className="px-4 py-3 text-center">
                  {u.role === "venue" ? (
                    <span className="text-white/70 text-sm font-medium">{u.venuesCount}</span>
                  ) : <span className="text-white/20">—</span>}
                </td>
                <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <Badge className={u.verified ? "bg-neon-green/20 text-neon-green border-neon-green/30 text-xs" : "bg-white/5 text-white/40 border-white/10 text-xs"}>
                    {u.verified ? "Верифицирован" : "Не верифицирован"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleVerify(u.id)}
                      title={u.verified ? "Снять верификацию" : "Верифицировать"}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${u.verified ? "bg-neon-green/20 text-neon-green hover:bg-neon-green/30" : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-neon-green"}`}>
                      <Icon name="BadgeCheck" size={13} />
                    </button>
                    <button
                      onClick={() => onToggleAdmin(u.id)}
                      title={u.isAdmin ? "Снять права админа" : "Сделать администратором"}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${u.isAdmin ? "bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30" : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-neon-purple"}`}>
                      <Icon name="ShieldCheck" size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {usersPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-sm">Всего: {usersTotal}</span>
          <div className="flex gap-1">
            <button onClick={() => onPageChange(Math.max(1, usersPage - 1))} disabled={usersPage === 1}
              className="w-8 h-8 glass rounded-lg flex items-center justify-center text-white/50 hover:text-white disabled:opacity-30 border border-white/10">
              <Icon name="ChevronLeft" size={15} />
            </button>
            {[...Array(usersPages)].map((_, i) => (
              <button key={i} onClick={() => onPageChange(i + 1)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${usersPage === i + 1 ? "bg-neon-purple text-white" : "glass text-white/50 hover:text-white border border-white/10"}`}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => onPageChange(Math.min(usersPages, usersPage + 1))} disabled={usersPage === usersPages}
              className="w-8 h-8 glass rounded-lg flex items-center justify-center text-white/50 hover:text-white disabled:opacity-30 border border-white/10">
              <Icon name="ChevronRight" size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

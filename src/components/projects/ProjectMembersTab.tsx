import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL } from "@/hooks/useProjects";
import { useAuth } from "@/context/AuthContext";
import { SIGN_URL } from "@/components/dashboard/documents/docTypes";

interface Member {
  id: string;
  userId: string;
  role: "owner" | "partner" | "viewer" | "removed";
  invitedAt: string;
  name: string;
  email: string;
  userRole: string;
  company: string;
  logoUrl: string;
  avatar: string;
}

interface Owner {
  userId: string;
  name: string;
  email: string;
  userRole: string;
  company: string;
  logoUrl: string;
  avatar: string;
  role: "owner";
}

interface UserSuggestion {
  id: string;
  name: string;
  displayName: string;
  email: string;
  role: string;
  roleLabel: string;
  logoUrl: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  partner: "Партнёр",
  viewer: "Наблюдатель",
};

const USER_ROLE_LABELS: Record<string, string> = {
  organizer: "Организатор",
  venue: "Площадка",
  employee: "Сотрудник",
};

const USER_ROLE_COLORS: Record<string, string> = {
  organizer: "text-neon-purple border-neon-purple/25 bg-neon-purple/8",
  venue: "text-neon-cyan border-neon-cyan/25 bg-neon-cyan/8",
  employee: "text-neon-green border-neon-green/25 bg-neon-green/8",
};

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || "").slice(0, 2).join("") || "?";
}

export default function ProjectMembersTab({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const { user } = useAuth();
  const [members, setMembers]   = useState<Member[]>([]);
  const [owner, setOwner]       = useState<Owner | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName]   = useState("");
  const [inviteRole, setInviteRole]   = useState<"partner" | "viewer">("partner");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${PROJECTS_URL}?action=members&project_id=${projectId}&user_id=${user?.id || ""}`);
      const d = await r.json();
      setMembers((d.members || []).filter((m: Member) => m.role !== "removed"));
      setOwner(d.owner || null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const searchUsers = async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setSearchOpen(false); return; }
    try {
      const r = await fetch(`${SIGN_URL}?action=search_users&q=${encodeURIComponent(q)}`, {
        headers: { "X-Session-Id": localStorage.getItem("gl_session") || "" },
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setSuggestions(d.users || []);
      setSearchOpen((d.users || []).length > 0);
    } catch { /* silent */ }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.includes("@")) { setInviteError("Введите корректный email"); return; }
    setInviting(true); setInviteError("");
    try {
      const r = await fetch(`${PROJECTS_URL}?action=invite_member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, userId: user?.id, email: inviteEmail, role: inviteRole }),
      });
      const d = await r.json();
      if (!r.ok) { setInviteError(d.error || "Ошибка"); return; }
      setShowInvite(false);
      setInviteEmail(""); setInviteName(""); setInviteRole("partner");
      await load();
    } catch { setInviteError("Ошибка соединения"); }
    finally { setInviting(false); }
  };

  const handleRemove = async (memberId: string) => {
    setRemoving(memberId);
    try {
      await fetch(`${PROJECTS_URL}?action=remove_member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, userId: user?.id, memberId }),
      });
      await load();
    } finally { setRemoving(null); }
  };

  const allParticipants: (Owner | Member)[] = owner ? [owner, ...members] : members;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
          <Icon name="Users" size={18} className="text-neon-cyan" />
        </div>
        <div className="flex-1">
          <h2 className="font-oswald font-bold text-xl text-white">Участники проекта</h2>
          <p className="text-white/40 text-sm">Совместная работа с партнёрами и коллегами</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white text-sm font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            <Icon name="UserPlus" size={15} />Пригласить
          </button>
        )}
      </div>

      {/* Права доступа */}
      <div className="glass rounded-xl border border-white/5 p-4">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Уровни доступа</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { role: "owner", icon: "Crown", desc: "Полный доступ, управление участниками, удаление проекта" },
            { role: "partner", icon: "HandshakeIcon", desc: "Просмотр и редактирование бюджета, задач, документов" },
            { role: "viewer", icon: "Eye", desc: "Только просмотр данных проекта без права редактирования" },
          ].map(item => (
            <div key={item.role} className="bg-white/3 rounded-xl p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon name={item.icon as never} size={14} className="text-neon-purple" />
                <span className="text-white text-xs font-semibold">{ROLE_LABELS[item.role]}</span>
              </div>
              <p className="text-white/35 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Список участников */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-white/30">
          <Icon name="Loader2" size={22} className="animate-spin mr-3" />Загрузка...
        </div>
      ) : (
        <div className="space-y-2">
          {allParticipants.map((m, idx) => {
            const isOwnerRow = m.role === "owner";
            const memberId = "id" in m ? m.id : "";
            const isMe = m.userId === user?.id;
            return (
              <div key={idx} className={`flex items-center gap-4 glass rounded-2xl border px-5 py-4 ${
                isOwnerRow ? "border-neon-purple/20" : "border-white/8"
              }`}>
                {/* Аватар */}
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
                  {m.logoUrl ? (
                    <img src={m.logoUrl} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center font-oswald font-bold text-base ${
                      isOwnerRow ? "bg-neon-purple/20 text-neon-purple" : "bg-white/8 text-white/60"
                    }`}>
                      {initials(m.name)}
                    </div>
                  )}
                </div>

                {/* Инфо */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">{m.name}</span>
                    {isMe && <span className="text-white/30 text-xs">(вы)</span>}
                    {/* Роль в проекте */}
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                      isOwnerRow
                        ? "text-neon-purple border-neon-purple/30 bg-neon-purple/8"
                        : "text-white/50 border-white/15 bg-white/5"
                    }`}>
                      {ROLE_LABELS[m.role] || m.role}
                    </span>
                    {/* Тип пользователя */}
                    {m.userRole && (
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${USER_ROLE_COLORS[m.userRole] || "text-white/30 border-white/10 bg-white/3"}`}>
                        {USER_ROLE_LABELS[m.userRole] || m.userRole}
                      </span>
                    )}
                  </div>
                  <p className="text-white/35 text-xs mt-0.5 truncate">{m.email}</p>
                  {m.company && <p className="text-white/25 text-xs truncate">{m.company}</p>}
                </div>

                {/* Кнопка удалить (только для владельца проекта, только для не-владельцев) */}
                {isOwner && !isOwnerRow && !isMe && memberId && (
                  <button
                    onClick={() => handleRemove(memberId)}
                    disabled={removing === memberId}
                    className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-neon-pink hover:bg-neon-pink/10 rounded-lg transition-all disabled:opacity-40"
                    title="Удалить участника"
                  >
                    {removing === memberId
                      ? <Icon name="Loader2" size={14} className="animate-spin" />
                      : <Icon name="UserMinus" size={14} />}
                  </button>
                )}
              </div>
            );
          })}

          {allParticipants.length === 0 && (
            <div className="text-center py-12 glass rounded-2xl border border-white/5">
              <Icon name="Users" size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/30 text-sm">Нет участников</p>
            </div>
          )}
        </div>
      )}

      {/* Модал приглашения */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-visible" style={{ background: "#15152a" }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
              <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
                <Icon name="UserPlus" size={16} className="text-neon-cyan" />
              </div>
              <p className="text-white font-semibold flex-1">Пригласить участника</p>
              <button onClick={() => setShowInvite(false)} className="text-white/30 hover:text-white">
                <Icon name="X" size={18} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              {inviteError && (
                <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2">
                  <Icon name="AlertCircle" size={14} />{inviteError}
                </div>
              )}

              {/* Поиск с автодополнением */}
              <div className="relative">
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  Email или имя партнёра
                </label>
                <input
                  type="text"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); searchUsers(e.target.value); }}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  placeholder="partner@example.com или Иван Иванов"
                  className="gl-input"
                  autoComplete="off"
                  required
                />
                {searchOpen && suggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "#1a1a30" }}>
                    {suggestions.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onMouseDown={() => {
                          setInviteEmail(u.email);
                          setInviteName(u.displayName || u.name);
                          setSuggestions([]); setSearchOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center text-xs font-bold text-neon-purple shrink-0">
                          {u.logoUrl
                            ? <img src={u.logoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                            : (u.displayName || u.name).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{u.displayName || u.name}</p>
                          <p className="text-white/35 text-xs truncate">{u.email}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 ${
                          u.role === "venue"
                            ? "text-neon-cyan border-neon-cyan/20 bg-neon-cyan/5"
                            : "text-neon-purple border-neon-purple/20 bg-neon-purple/5"
                        }`}>
                          {u.roleLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Уровень доступа */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Уровень доступа</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["partner", "viewer"] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInviteRole(r)}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all text-left ${
                        inviteRole === r
                          ? "border-neon-purple/50 bg-neon-purple/15 text-neon-purple"
                          : "border-white/10 bg-white/3 text-white/50 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      <div className="font-oswald font-semibold">{ROLE_LABELS[r]}</div>
                      <div className="text-xs mt-0.5 opacity-60">
                        {r === "partner" ? "Редактирование" : "Только просмотр"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-neon-cyan/5 border border-neon-cyan/15 rounded-xl px-3.5 py-2.5 flex gap-2">
                <Icon name="Info" size={13} className="text-neon-cyan/50 mt-0.5 shrink-0" />
                <p className="text-xs text-white/35 leading-relaxed">
                  Партнёр должен быть зарегистрирован в GLOBAL LINK. После приглашения проект появится в его списке.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowInvite(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all">
                  Отмена
                </button>
                <button type="submit" disabled={inviting || !inviteEmail.includes("@")}
                  className="flex-1 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {inviting
                    ? <><Icon name="Loader2" size={14} className="animate-spin" />Приглашаю...</>
                    : <><Icon name="UserPlus" size={14} />Пригласить</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
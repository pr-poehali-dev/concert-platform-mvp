import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL } from "@/hooks/useProjects";

interface Member {
  id: string;
  userId: string;
  role: string;
  invitedAt: string;
  name: string;
  email: string;
  company: string;
  logoUrl: string;
  avatar: string;
}

interface Props {
  groupId: string;
  groupTitle: string;
  userId: string;
  projectCount: number;
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  partner: "Партнёр",
  viewer: "Наблюдатель",
};

export default function GroupShareModal({ groupId, groupTitle, userId, projectCount, onClose }: Props) {
  const [tab, setTab] = useState<"invite" | "members">("invite");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("partner");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=group_members&group_id=${groupId}&user_id=${userId}`);
      const data = await res.json();
      setMembers(data.members || []);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (tab === "members") loadMembers();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInvite = async () => {
    if (!email.trim() || !email.includes("@")) return;
    setSaving(true); setResult(null);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=invite_group_member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, userId, email: email.trim().toLowerCase(), role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setResult({ ok: true, msg: `${data.partnerName} добавлен в ${data.added} проект(ов) группы` });
      setEmail("");
    } catch (e: unknown) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : "Ошибка" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (member: Member) => {
    if (!confirm(`Удалить доступ для ${member.name || member.email}? Партнёр потеряет доступ ко всем проектам группы.`)) return;
    setRemovingId(member.id);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=remove_group_member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, userId, memberId: member.id }),
      });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== member.id));
      }
    } finally {
      setRemovingId(null);
    }
  };

  const avatar = (m: Member) => m.avatar || m.logoUrl;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl overflow-hidden animate-scale-in">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
              <Icon name="Users" size={18} className="text-neon-cyan" />
            </div>
            <div>
              <h2 className="font-oswald font-bold text-xl text-white">Доступ к группе</h2>
              <p className="text-white/40 text-xs">«{groupTitle}» · {projectCount} проект(ов)</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pb-4">
          {([["invite", "UserPlus", "Пригласить"], ["members", "Users", "Участники"]] as const).map(([t, icon, label]) => (
            <button key={t} onClick={() => { setTab(t); setResult(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${tab === t ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30" : "text-white/40 hover:text-white/70 border border-transparent"}`}>
              <Icon name={icon} size={13} />{label}
              {t === "members" && members.length > 0 && (
                <span className="ml-0.5 bg-neon-cyan/20 text-neon-cyan text-xs px-1.5 py-0.5 rounded-full leading-none">{members.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6 space-y-4">

          {/* === ВКЛАДКА ПРИГЛАСИТЬ === */}
          {tab === "invite" && (
            <>
              <p className="text-white/50 text-sm">
                Партнёр получит доступ сразу ко всем {projectCount} проектам в этой группе.
              </p>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Email партнёра</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                  placeholder="partner@example.com"
                  autoFocus
                  className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Уровень доступа</label>
                <div className="flex gap-2">
                  {[
                    { val: "partner", label: "Партнёр", desc: "Полный просмотр" },
                    { val: "viewer", label: "Наблюдатель", desc: "Только чтение" },
                  ].map(r => (
                    <button key={r.val} onClick={() => setRole(r.val)}
                      className={`flex-1 px-3 py-2.5 rounded-xl border text-left transition-all ${role === r.val ? "border-neon-cyan/50 bg-neon-cyan/10" : "border-white/10 glass hover:border-white/20"}`}>
                      <p className={`text-sm font-medium ${role === r.val ? "text-neon-cyan" : "text-white/60"}`}>{r.label}</p>
                      <p className="text-white/30 text-xs mt-0.5">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {result && (
                <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl border ${result.ok ? "text-neon-green bg-neon-green/10 border-neon-green/20" : "text-neon-pink bg-neon-pink/10 border-neon-pink/20"}`}>
                  <Icon name={result.ok ? "CheckCircle" : "AlertCircle"} size={14} />{result.msg}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 py-2.5 glass border border-white/10 rounded-xl text-white/50 hover:text-white text-sm transition-colors">
                  {result?.ok ? "Закрыть" : "Отмена"}
                </button>
                {!result?.ok && (
                  <button onClick={handleInvite} disabled={saving || !email.includes("@")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/40 text-neon-cyan font-semibold rounded-xl text-sm disabled:opacity-40 transition-all">
                    {saving ? <><Icon name="Loader2" size={14} className="animate-spin" />Отправляю...</> : <><Icon name="UserPlus" size={14} />Пригласить</>}
                  </button>
                )}
              </div>
            </>
          )}

          {/* === ВКЛАДКА УЧАСТНИКИ === */}
          {tab === "members" && (
            <>
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8 text-white/40 gap-2">
                  <Icon name="Loader2" size={16} className="animate-spin" />Загружаю...
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-sm">
                  <Icon name="Users" size={32} className="mx-auto mb-2 opacity-30" />
                  Нет участников
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 glass rounded-xl border border-white/5">
                      {avatar(m) ? (
                        <img src={avatar(m)} alt={m.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-white/50 font-bold text-sm">
                          {(m.name || m.email)[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{m.name || m.email}</p>
                        <p className="text-white/35 text-xs truncate">{m.email}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/40 flex-shrink-0">
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                      <button
                        onClick={() => handleRemove(m)}
                        disabled={removingId === m.id}
                        title="Удалить доступ"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-neon-pink hover:bg-neon-pink/10 transition-all flex-shrink-0 disabled:opacity-40">
                        {removingId === m.id
                          ? <Icon name="Loader2" size={13} className="animate-spin" />
                          : <Icon name="UserMinus" size={13} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={onClose} className="w-full py-2.5 glass border border-white/10 rounded-xl text-white/50 hover:text-white text-sm transition-colors">
                Закрыть
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

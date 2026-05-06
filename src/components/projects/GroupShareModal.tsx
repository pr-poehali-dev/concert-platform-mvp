import { useState } from "react";
import Icon from "@/components/ui/icon";
import { PROJECTS_URL } from "@/hooks/useProjects";

interface Props {
  groupId: string;
  groupTitle: string;
  userId: string;
  projectCount: number;
  onClose: () => void;
}

export default function GroupShareModal({ groupId, groupTitle, userId, projectCount, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("partner");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl overflow-hidden animate-scale-in">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
              <Icon name="UserPlus" size={18} className="text-neon-cyan" />
            </div>
            <div>
              <h2 className="font-oswald font-bold text-xl text-white">Поделиться группой</h2>
              <p className="text-white/40 text-xs">«{groupTitle}» · {projectCount} проект(ов)</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
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
        </div>
      </div>
    </div>
  );
}

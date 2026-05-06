import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { PROJECTS_URL, STATUS_CONFIG, fmt, type Project, type ProjectGroup } from "@/hooks/useProjects";
import { useNotifications } from "@/context/NotificationsContext";
import CreateProjectModal from "./CreateProjectModal";
import ProjectDetailPage from "./ProjectDetailPage";
import TcImportModal from "./TcImportModal";
import GroupModal from "./GroupModal";

const TICKETS_URL = "https://functions.poehali.dev/e8e3c7c9-b452-4e77-8db2-ca0266399006";

// ── Модал шаринга группы ──────────────────────────────────────────────────────
function GroupShareModal({ groupId, groupTitle, userId, projectCount, onClose }: {
  groupId: string; groupTitle: string; userId: string; projectCount: number; onClose: () => void;
}) {
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

// ── Карточка проекта ──────────────────────────────────────────────────────────
function ProjectCard({ p, onClick, bookingBadge }: {
  p: Project; onClick: () => void; bookingBadge?: number;
}) {
  const f = p.finance;
  const profitPositive = f.profitPlan >= 0;
  return (
    <div onClick={onClick}
      className={`relative glass rounded-2xl p-5 cursor-pointer hover-lift group transition-all border hover:border-neon-purple/20 ${p.hasOverdueTasks ? "border-neon-pink/40 animate-pulse-border" : "border-white/5"}`}>
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={`text-xs border shrink-0 ${STATUS_CONFIG[p.status]?.color}`}>
              {STATUS_CONFIG[p.status]?.label}
            </Badge>
            <span className="text-white/30 text-xs">{p.projectType === "single" ? "Концерт" : "Тур"}</span>
            {p.isPartner && (
              <span className="flex items-center gap-1 text-neon-cyan text-[10px] border border-neon-cyan/25 bg-neon-cyan/8 px-1.5 py-0.5 rounded">
                <Icon name="Handshake" size={10} />Партнёрский
              </span>
            )}
            {p.hasOverdueTasks && (
              <span className="flex items-center gap-1 text-neon-pink text-xs animate-pulse">
                <Icon name="AlertTriangle" size={11} />просрочено
              </span>
            )}
          </div>
          <h3 className="font-oswald font-bold text-xl text-white group-hover:text-neon-purple transition-colors truncate">{p.title}</h3>
          {p.artist && <p className="text-neon-cyan text-sm">{p.artist}</p>}
          {p.isPartner && p.ownerName && (
            <p className="text-white/30 text-xs flex items-center gap-1 mt-0.5">
              <Icon name="User" size={10} />от {p.ownerName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {!!bookingBadge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neon-pink text-white min-w-[18px] text-center animate-pulse">
              {bookingBadge > 9 ? "9+" : bookingBadge}
            </span>
          )}
          <Icon name="ChevronRight" size={16} className="text-white/20 group-hover:text-neon-purple transition-colors" />
        </div>
      </div>
      <div className="flex items-center gap-3 text-white/35 text-xs mb-4 flex-wrap">
        {p.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{p.city}</span>}
        {p.dateStart && <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{p.dateStart}</span>}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/40">Доход план</span>
          <span className="text-neon-green font-medium">{fmt(p.totalIncomePlan)} ₽</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/40">Расходы план</span>
          <span className="text-neon-pink font-medium">{fmt(p.totalExpensesPlan)} ₽</span>
        </div>
        {f.taxPlan > 0 && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-white/40">{f.taxLabel}</span>
            <span className="text-neon-cyan font-medium">−{fmt(f.taxPlan)} ₽</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-white text-sm font-medium">Чистая прибыль</span>
          <span className={`font-oswald font-bold text-lg ${profitPositive ? "text-neon-green" : "text-neon-pink"}`}>
            {profitPositive ? "+" : ""}{fmt(f.profitPlan)} ₽
          </span>
        </div>
        {p.totalIncomePlan > 0 && (
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${profitPositive ? "bg-gradient-to-r from-neon-purple to-neon-green" : "bg-neon-pink"}`}
              style={{ width: `${Math.min(100, Math.max(0, f.profitPlan / p.totalIncomePlan * 100))}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Карточка группы ───────────────────────────────────────────────────────────
function GroupCard({ g, onClick, onEdit }: {
  g: ProjectGroup; onClick: () => void; onEdit: (e: React.MouseEvent) => void;
}) {
  const f = g.finance;
  const profitPositive = f.profitPlan >= 0;
  const color = g.color || "neon-purple";
  return (
    <div onClick={onClick}
      className={`relative glass rounded-2xl p-5 cursor-pointer hover-lift group transition-all border border-${color}/25 hover:border-${color}/50`}>
      {/* цветная полоска сверху */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-${color}/60`} />

      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-7 h-7 rounded-lg bg-${color}/15 border border-${color}/25 flex items-center justify-center shrink-0`}>
              <Icon name="FolderOpen" size={14} className={`text-${color}`} />
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded border border-${color}/30 bg-${color}/10 text-${color} font-medium`}>
              {g.projectCount} {g.projectCount === 1 ? "проект" : g.projectCount < 5 ? "проекта" : "проектов"}
            </span>
          </div>
          <h3 className={`font-oswald font-bold text-xl text-white group-hover:text-${color} transition-colors truncate mt-1`}>
            {g.title}
          </h3>
          {g.description && <p className="text-white/35 text-xs mt-0.5 truncate">{g.description}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-1">
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            title="Редактировать"
          >
            <Icon name="Settings" size={13} />
          </button>
          <Icon name="ChevronRight" size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
        </div>
      </div>

      <div className="flex items-center gap-3 text-white/35 text-xs mb-4 flex-wrap">
        {g.dateStart && <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{g.dateStart}</span>}
        {g.dateEnd && g.dateEnd !== g.dateStart && <span className="text-white/20">→ {g.dateEnd}</span>}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/40">Доход план</span>
          <span className="text-neon-green font-medium">{fmt(g.totalIncomePlan)} ₽</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/40">Факт</span>
          <span className="text-neon-green/60 font-medium">{fmt(g.totalIncomeFact)} ₽</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/40">Расходы план</span>
          <span className="text-neon-pink font-medium">{fmt(g.totalExpensesPlan)} ₽</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-white text-sm font-medium">Прибыль (∑)</span>
          <span className={`font-oswald font-bold text-lg ${profitPositive ? "text-neon-green" : "text-neon-pink"}`}>
            {profitPositive ? "+" : ""}{fmt(f.profitPlan)} ₽
          </span>
        </div>
        {g.totalIncomePlan > 0 && (
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-${color}/60 transition-all`}
              style={{ width: `${Math.min(100, Math.max(0, f.profitPlan / g.totalIncomePlan * 100))}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Экран внутри группы ───────────────────────────────────────────────────────
function GroupDetailScreen({ group, userId, projects, onBack, onOpenProject, onEditGroup, onReload }: {
  group: ProjectGroup;
  userId: string;
  projects: Project[];
  onBack: () => void;
  onOpenProject: (id: string) => void;
  onEditGroup: () => void;
  onReload: () => void;
}) {
  const color = group.color || "neon-purple";
  const f = group.finance;
  const [showShare, setShowShare] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSyncAll = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch(`${TICKETS_URL}?action=sync_all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`Синхронизировано ${data.synced} из ${data.total} интеграций`);
        onReload();
      } else {
        setSyncResult("Ошибка синхронизации");
      }
    } catch {
      setSyncResult("Ошибка соединения");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen pt-2">
      {showShare && (
        <GroupShareModal
          groupId={group.id}
          groupTitle={group.title}
          userId={userId}
          projectCount={projects.length}
          onClose={() => setShowShare(false)}
        />
      )}
      {/* Header */}
      <div className="relative py-4 overflow-hidden">
        <div className={`absolute inset-0 opacity-20`} style={{ background: `radial-gradient(ellipse at 50% 0%, var(--tw-gradient-stops))` }} />
        <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-${color} to-transparent`} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors glass px-3 py-1.5 rounded-lg border border-white/10">
              <Icon name="ChevronLeft" size={16} />Назад
            </button>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-${color}/15 border border-${color}/30 flex items-center justify-center`}>
                <Icon name="FolderOpen" size={22} className={`text-${color}`} />
              </div>
              <div>
                <h1 className="font-oswald font-bold text-2xl text-white">{group.title}</h1>
                {group.description && <p className="text-white/40 text-sm">{group.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleSyncAll} disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 glass border border-white/10 hover:border-neon-cyan/40 text-white/50 hover:text-neon-cyan rounded-lg text-sm transition-all disabled:opacity-50">
                <Icon name={syncing ? "Loader2" : "RefreshCw"} size={15} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Синхр...." : "Синхр. все"}
              </button>
              <button onClick={() => setShowShare(true)}
                className="flex items-center gap-2 px-4 py-2 glass border border-neon-cyan/30 hover:border-neon-cyan/60 bg-neon-cyan/8 hover:bg-neon-cyan/15 text-neon-cyan rounded-lg text-sm transition-all">
                <Icon name="UserPlus" size={15} />Поделиться
              </button>
              <button onClick={onEditGroup}
                className="flex items-center gap-2 px-4 py-2 glass border border-white/10 hover:border-white/25 text-white/50 hover:text-white rounded-lg text-sm transition-all">
                <Icon name="Settings" size={15} />Настройки
              </button>
            </div>
          </div>
          {syncResult && (
            <p className="text-neon-cyan text-xs mt-2 flex items-center gap-1.5">
              <Icon name="CheckCircle" size={12} />{syncResult}
            </p>
          )}

          {/* Сводка */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            {[
              { icon: "FolderOpen", label: "Проектов", val: projects.length, color: `text-${color}` },
              { icon: "TrendingUp", label: "Доход план", val: `${fmt(group.totalIncomePlan)} ₽`, color: "text-neon-green" },
              { icon: "TrendingDown", label: "Расходы план", val: `${fmt(group.totalExpensesPlan)} ₽`, color: "text-neon-pink" },
              { icon: "BarChart3", label: "Прибыль", val: `${f.profitPlan >= 0 ? "+" : ""}${fmt(f.profitPlan)} ₽`, color: f.profitPlan >= 0 ? "text-neon-green" : "text-neon-pink" },
            ].map((s, i) => (
              <div key={i} className="glass rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon name={s.icon} size={12} className={s.color} />
                  <span className="text-white/45 text-[11px]">{s.label}</span>
                </div>
                <p className={`font-oswald font-bold text-base ${s.color} leading-tight`}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-24">
        {projects.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <Icon name="FolderOpen" size={48} className="text-white/15 mx-auto mb-4" />
            <p className="text-white/40 text-lg font-oswald">Нет проектов в группе</p>
            <p className="text-white/25 text-sm mt-1">Добавьте проекты через кнопку «Редактировать группу»</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map(p => (
              <ProjectCard key={p.id} p={p} onClick={() => onOpenProject(p.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Основная страница ─────────────────────────────────────────────────────────
export default function ProjectsPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user } = useAuth();
  const { unreadByType } = useNotifications();
  const totalBookingUnread = unreadByType("booking");
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showTcImport, setShowTcImport] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProjectGroup | null>(null);
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<{ synced: number; total: number; failed: number } | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [pRes, gRes] = await Promise.all([
        fetch(`${PROJECTS_URL}?action=list&user_id=${user.id}`),
        fetch(`${PROJECTS_URL}?action=groups_list&user_id=${user.id}`),
      ]);
      const [pData, gData] = await Promise.all([pRes.json(), gRes.json()]);
      setProjects(pData.projects || []);
      setGroups(gData.groups || []);
    } catch {
      setProjects([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSyncAll = async () => {
    if (!user) return;
    setSyncingAll(true); setSyncAllResult(null);
    try {
      const res = await fetch(`${TICKETS_URL}?action=sync_all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncAllResult({ synced: data.synced, total: data.total, failed: data.failed });
        load();
      } else {
        setSyncAllResult({ synced: 0, total: 0, failed: 1 });
      }
    } catch {
      setSyncAllResult({ synced: 0, total: 0, failed: 1 });
    } finally { setSyncingAll(false); }
  };

  // Открытый проект
  if (openProjectId) return (
    <ProjectDetailPage
      projectId={openProjectId}
      onBack={() => { setOpenProjectId(null); load(); }}
      onOpenChat={onNavigate ? (convId) => onNavigate(`chat:${convId}`) : undefined}
    />
  );

  // Открытая группа
  const openGroup = groups.find(g => g.id === openGroupId);
  const groupProjects = openGroupId ? projects.filter(p => p.groupId === openGroupId) : [];

  if (openGroupId && openGroup) return (
    <>
      <GroupDetailScreen
        group={openGroup}
        userId={user!.id}
        projects={groupProjects}
        onBack={() => { setOpenGroupId(null); load(); }}
        onOpenProject={id => setOpenProjectId(id)}
        onEditGroup={() => setEditingGroup(openGroup)}
        onReload={load}
      />
      {editingGroup && (
        <GroupModal
          userId={user!.id}
          projects={projects}
          group={editingGroup}
          groupProjects={projects.filter(p => p.groupId === editingGroup.id).map(p => p.id)}
          onClose={() => setEditingGroup(null)}
          onSaved={() => { setEditingGroup(null); load(); }}
        />
      )}
    </>
  );

  // Проекты без группы
  const ungroupedProjects = projects.filter(p => !p.groupId);
  const filteredProjects = filter === "all" ? ungroupedProjects : ungroupedProjects.filter(p => p.status === filter);

  return (
    <div className="min-h-screen pt-2">
      {/* Hero */}
      <div className="relative py-4 overflow-hidden">
        <div className="absolute inset-0 gradient-bg-purple opacity-25" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center shrink-0">
                <Icon name="FolderOpen" size={20} className="text-neon-purple" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-oswald font-bold text-2xl text-white uppercase leading-none">
                    Мои <span className="gradient-text">Проекты</span>
                  </h1>
                  <Badge className="bg-neon-purple/15 text-neon-purple border-neon-purple/30 text-[10px] py-0 px-2">Организатор</Badge>
                </div>
                <p className="text-white/45 text-xs mt-0.5">Управление бюджетами, P&L и финансовая отчётность</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowTcImport(true)}
                className="flex items-center gap-2 px-3 py-2 glass border border-white/10 hover:border-neon-cyan/40 text-white/50 hover:text-neon-cyan rounded-lg text-sm transition-all">
                <span className="text-base leading-none">🎫</span>
                <span className="hidden sm:inline">Импорт из TC</span>
              </button>
              <button onClick={handleSyncAll} disabled={syncingAll}
                className="flex items-center gap-2 px-3 py-2 glass border border-white/10 hover:border-neon-green/40 text-white/50 hover:text-neon-green rounded-lg text-sm transition-all disabled:opacity-50"
                title="Синхронизировать все интеграции с TicketsCloud">
                <Icon name={syncingAll ? "Loader2" : "RefreshCw"} size={15} className={syncingAll ? "animate-spin" : ""} />
                <span className="hidden sm:inline">{syncingAll ? "Синхр...." : "Синхр. все"}</span>
              </button>
              <button onClick={() => { setEditingGroup(null); setShowGroupModal(true); }}
                className="flex items-center gap-2 px-3 py-2 glass border border-white/10 hover:border-neon-purple/40 text-white/50 hover:text-neon-purple rounded-lg text-sm transition-all">
                <Icon name="FolderPlus" size={15} />
                <span className="hidden sm:inline">Новая группа</span>
              </button>
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm">
                <Icon name="Plus" size={16} />Новый проект
              </button>
            </div>
          </div>

          {/* Результат синхронизации */}
          {syncAllResult && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Icon name="CheckCircle" size={12} className="text-neon-green" />
              <span className="text-neon-green">
                Синхронизировано {syncAllResult.synced} из {syncAllResult.total} интеграций
              </span>
              {syncAllResult.failed > 0 && (
                <span className="text-neon-pink">· {syncAllResult.failed} с ошибкой</span>
              )}
              <button onClick={() => setSyncAllResult(null)} className="text-white/20 hover:text-white/50 ml-1">
                <Icon name="X" size={11} />
              </button>
            </div>
          )}

          {/* Сводка */}
          {projects.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              {[
                { icon: "FolderOpen", label: "Всего проектов", val: projects.length, color: "text-neon-purple" },
                { icon: "TrendingUp", label: "Доход (план)", val: `${fmt(projects.reduce((s, p) => s + p.totalIncomePlan, 0))} ₽`, color: "text-neon-green" },
                { icon: "TrendingDown", label: "Расходы (план)", val: `${fmt(projects.reduce((s, p) => s + p.totalExpensesPlan, 0))} ₽`, color: "text-neon-pink" },
                { icon: "BarChart3", label: "Прибыль (план)", val: `${fmt(projects.reduce((s, p) => s + p.finance.profitPlan, 0))} ₽`, color: projects.reduce((s, p) => s + p.finance.profitPlan, 0) >= 0 ? "text-neon-green" : "text-neon-pink" },
              ].map((s, i) => (
                <div key={i} className="glass rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon name={s.icon} size={12} className={s.color} />
                    <span className="text-white/45 text-[11px]">{s.label}</span>
                  </div>
                  <p className={`font-oswald font-bold text-base ${s.color} leading-tight`}>{s.val}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-24 space-y-8">

        {/* Группы */}
        {!loading && groups.filter(g => g.title).length > 0 && (
          <div>
            <h2 className="text-white/50 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <Icon name="FolderOpen" size={13} />Группы проектов
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {groups.filter(g => g.title).map(g => (
                <GroupCard
                  key={g.id}
                  g={g}
                  onClick={() => setOpenGroupId(g.id)}
                  onEdit={(e) => { e.stopPropagation(); setEditingGroup(g); setShowGroupModal(true); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Фильтры и проекты без группы */}
        {!loading && (
          <div>
            {ungroupedProjects.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Icon name="LayoutGrid" size={13} />Отдельные проекты
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {[["all", "Все"], ["planning", "Планируется"], ["active", "Активные"], ["completed", "Завершённые"]].map(([v, l]) => (
                    <button key={v} onClick={() => setFilter(v)}
                      className={`px-3 py-1 rounded-lg text-xs border transition-all ${filter === v ? "bg-neon-purple/20 text-neon-purple border-neon-purple/40" : "glass text-white/40 border-white/8 hover:text-white/70"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl h-56 animate-pulse" />)}
              </div>
            ) : filteredProjects.length === 0 && ungroupedProjects.length === 0 && groups.filter(g => g.title).length === 0 ? (
              <div className="text-center py-20 glass rounded-2xl">
                <Icon name="FolderOpen" size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg font-oswald">Нет проектов</p>
                <button onClick={() => setShowCreate(true)}
                  className="mt-5 px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity">
                  Создать первый проект
                </button>
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProjects.map(p => (
                  <ProjectCard
                    key={p.id}
                    p={p}
                    onClick={() => setOpenProjectId(p.id)}
                    bookingBadge={totalBookingUnread || undefined}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl h-56 animate-pulse" />)}
          </div>
        )}
      </div>

      {/* Модалы */}
      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={id => { setShowCreate(false); setOpenProjectId(id); load(); }}
      />

      {showTcImport && (
        <TcImportModal
          userId={user!.id}
          onClose={() => setShowTcImport(false)}
          onImported={(id) => { setShowTcImport(false); setOpenProjectId(id); load(); }}
        />
      )}

      {showGroupModal && (
        <GroupModal
          userId={user!.id}
          projects={projects}
          group={editingGroup}
          groupProjects={editingGroup ? projects.filter(p => p.groupId === editingGroup.id).map(p => p.id) : []}
          onClose={() => { setShowGroupModal(false); setEditingGroup(null); }}
          onSaved={() => { setShowGroupModal(false); setEditingGroup(null); load(); }}
        />
      )}
    </div>
  );
}
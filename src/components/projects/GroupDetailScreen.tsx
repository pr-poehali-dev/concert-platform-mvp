import { useState } from "react";
import Icon from "@/components/ui/icon";
import { fmt, type Project, type ProjectGroup } from "@/hooks/useProjects";
import { ProjectCard } from "./ProjectCards";
import GroupShareModal from "./GroupShareModal";

const TICKETS_URL = "https://functions.poehali.dev/e8e3c7c9-b452-4e77-8db2-ca0266399006";

interface Props {
  group: ProjectGroup;
  userId: string;
  projects: Project[];
  onBack: () => void;
  onOpenProject: (id: string) => void;
  onEditGroup: () => void;
  onReload: () => void;
}

export default function GroupDetailScreen({ group, userId, projects, onBack, onOpenProject, onEditGroup, onReload }: Props) {
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
              {group.isPartner && group.ownerName && (
                <span className="flex items-center gap-1.5 text-neon-cyan/70 text-xs border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-1.5 rounded-lg">
                  <Icon name="Handshake" size={13} />Владелец: {group.ownerName}
                </span>
              )}
              <button onClick={handleSyncAll} disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 glass border border-white/10 hover:border-neon-cyan/40 text-white/50 hover:text-neon-cyan rounded-lg text-sm transition-all disabled:opacity-50">
                <Icon name={syncing ? "Loader2" : "RefreshCw"} size={15} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Синхр...." : "Синхр. все"}
              </button>
              {!group.isPartner && (
                <>
                  <button onClick={() => setShowShare(true)}
                    className="flex items-center gap-2 px-4 py-2 glass border border-neon-cyan/30 hover:border-neon-cyan/60 bg-neon-cyan/8 hover:bg-neon-cyan/15 text-neon-cyan rounded-lg text-sm transition-all">
                    <Icon name="UserPlus" size={15} />Поделиться
                  </button>
                  <button onClick={onEditGroup}
                    className="flex items-center gap-2 px-4 py-2 glass border border-white/10 hover:border-white/25 text-white/50 hover:text-white rounded-lg text-sm transition-all">
                    <Icon name="Settings" size={15} />Настройки
                  </button>
                </>
              )}
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
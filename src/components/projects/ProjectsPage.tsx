import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { PROJECTS_URL, fmt, type Project, type ProjectGroup } from "@/hooks/useProjects";
import { useNotifications } from "@/context/NotificationsContext";
import CreateProjectModal from "./CreateProjectModal";
import ProjectDetailPage from "./ProjectDetailPage";
import TcImportModal from "./TcImportModal";
import GroupModal from "./GroupModal";
import { ProjectCard, GroupCard } from "./ProjectCards";
import GroupDetailScreen from "./GroupDetailScreen";

const TICKETS_URL = "https://functions.poehali.dev/e8e3c7c9-b452-4e77-8db2-ca0266399006";

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
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
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
    setSyncingAll(true); setSyncAllResult(null); setSyncProgress(null);
    try {
      // 1. Получаем список интеграций
      const listRes = await fetch(`${TICKETS_URL}?action=list_for_sync&user_id=${user.id}`);
      const listData = await listRes.json();
      const integrations: { id: string; name: string }[] = listData.integrations || [];
      if (integrations.length === 0) {
        setSyncAllResult({ synced: 0, total: 0, failed: 0 });
        return;
      }
      // 2. Синхронизируем каждую поочерёдно — каждый вызов ≤ 30 сек
      let synced = 0; let failed = 0;
      for (let i = 0; i < integrations.length; i++) {
        setSyncProgress({ current: i + 1, total: integrations.length });
        try {
          const res = await fetch(`${TICKETS_URL}?action=sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ integrationId: integrations[i].id }),
          });
          if (res.ok) synced++; else failed++;
        } catch { failed++; }
      }
      setSyncAllResult({ synced, total: integrations.length, failed });
      load();
    } catch {
      setSyncAllResult({ synced: 0, total: 0, failed: 1 });
    } finally { setSyncingAll(false); setSyncProgress(null); }
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
                <span className="hidden sm:inline">
                  {syncProgress ? `${syncProgress.current}/${syncProgress.total}` : syncingAll ? "Синхр..." : "Синхр. все"}
                </span>
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
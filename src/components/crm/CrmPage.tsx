import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { CRM_URL, BOARD_COLORS, type Board, type Goal } from "./crmTypes";
import BoardDetail from "./BoardDetail";
import CrmGoalsTab from "./CrmGoalsTab";
import CrmPipelinesTab from "./CrmPipelinesTab";

export default function CrmPage({ onNavigate: _onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"boards" | "goals" | "pipelines">("boards");
  const [boards, setBoards] = useState<Board[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBoard, setOpenBoard] = useState<Board | null>(null);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [boardForm, setBoardForm] = useState({ title: "", description: "", color: BOARD_COLORS[0] });
  const [goalForm, setGoalForm] = useState({ title: "", description: "", targetValue: "", unit: "", deadline: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [boardsRes, goalsRes] = await Promise.all([
      fetch(`${CRM_URL}?action=crm_boards_list&user_id=${user.id}`),
      fetch(`${CRM_URL}?action=crm_goals_list&user_id=${user.id}`),
    ]);
    const [boardsData, goalsData] = await Promise.all([boardsRes.json(), goalsRes.json()]);
    setBoards(boardsData.boards || []);
    setGoals(goalsData.goals || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const createBoard = async () => {
    if (!user || !boardForm.title.trim()) return;
    setSaving(true);
    await fetch(`${CRM_URL}?action=crm_board_create`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, title: boardForm.title.trim(), description: boardForm.description, color: boardForm.color }),
    });
    setSaving(false);
    setShowBoardForm(false);
    setBoardForm({ title: "", description: "", color: BOARD_COLORS[0] });
    load();
  };

  const createGoal = async () => {
    if (!user || !goalForm.title.trim()) return;
    setSaving(true);
    await fetch(`${CRM_URL}?action=crm_goal_create`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id, title: goalForm.title.trim(), description: goalForm.description,
        targetValue: goalForm.targetValue ? Number(goalForm.targetValue) : null,
        unit: goalForm.unit, deadline: goalForm.deadline || null,
      }),
    });
    setSaving(false);
    setShowGoalForm(false);
    setGoalForm({ title: "", description: "", targetValue: "", unit: "", deadline: "" });
    load();
  };

  const updateGoalValue = async (goalId: string, value: number) => {
    await fetch(`${CRM_URL}?action=crm_goal_update`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, currentValue: value }),
    });
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, currentValue: value } : g));
  };

  const deleteBoard = async (boardId: string) => {
    await fetch(`${CRM_URL}?action=crm_board_delete`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId, userId: user?.id }),
    });
    setBoards(prev => prev.filter(b => b.id !== boardId));
  };

  if (openBoard) {
    return <BoardDetail board={openBoard} userId={user?.id || ""} onBack={() => { setOpenBoard(null); load(); }} />;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div className="pt-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
            <Icon name="Kanban" size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-oswald font-bold text-2xl text-white">CRM</h1>
            <p className="text-white/40 text-xs">Доски, цели и воронки продаж</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
        {([
          { id: "boards",    label: "Доски",   icon: "Kanban" },
          { id: "goals",     label: "Цели",    icon: "Target" },
          { id: "pipelines", label: "Воронки", icon: "GitMerge" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-oswald font-medium transition-all ${tab === t.id ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}>
            <Icon name={t.icon} size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* ── ДОСКИ ── */}
      {tab === "boards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-white/40 text-sm">Канбан-доски для управления процессами</p>
            <button onClick={() => setShowBoardForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90">
              <Icon name="Plus" size={15} />Новая доска
            </button>
          </div>

          {showBoardForm && (
            <div className="glass-strong rounded-2xl p-5 border border-neon-purple/30 animate-scale-in">
              <div className="space-y-3">
                <input value={boardForm.title} onChange={e => setBoardForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Название доски *"
                  className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
                <input value={boardForm.description} onChange={e => setBoardForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Описание"
                  className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 text-sm" />
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs">Цвет:</span>
                  {BOARD_COLORS.map(c => (
                    <button key={c} onClick={() => setBoardForm(f => ({ ...f, color: c }))}
                      className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c} ${boardForm.color === c ? "ring-2 ring-white ring-offset-1 ring-offset-transparent" : ""}`} />
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={createBoard} disabled={saving || !boardForm.title.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50">
                    {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Kanban" size={15} />}
                    Создать
                  </button>
                  <button onClick={() => setShowBoardForm(false)} className="px-5 py-2.5 glass rounded-xl text-white/50 hover:text-white text-sm border border-white/10">Отмена</button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl h-32 animate-pulse" />)}
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl">
              <Icon name="Kanban" size={40} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 font-oswald text-lg">Нет досок</p>
              <p className="text-white/20 text-sm mt-1">Создайте первую канбан-доску для управления задачами</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map(board => (
                <div key={board.id} className="glass rounded-2xl border border-white/10 hover:border-neon-purple/30 transition-all group">
                  <div className={`h-2 rounded-t-2xl bg-gradient-to-r ${board.color}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <h3 className="font-oswald font-bold text-white text-lg cursor-pointer hover:text-neon-purple transition-colors"
                        onClick={() => setOpenBoard(board)}>
                        {board.title}
                      </h3>
                      <button onClick={() => deleteBoard(board.id)}
                        className="w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white/20 hover:text-neon-pink transition-all rounded-lg">
                        <Icon name="Trash2" size={13} />
                      </button>
                    </div>
                    {board.description && <p className="text-white/40 text-sm mt-1">{board.description}</p>}
                    <button onClick={() => setOpenBoard(board)}
                      className="mt-4 flex items-center gap-2 text-neon-purple text-sm hover:gap-3 transition-all">
                      <Icon name="ArrowRight" size={14} />Открыть доску
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ЦЕЛИ ── */}
      {tab === "goals" && (
        <CrmGoalsTab
          goals={goals}
          userId={user?.id || ""}
          saving={saving}
          showForm={showGoalForm}
          goalForm={goalForm}
          onShowFormToggle={() => setShowGoalForm(v => !v)}
          onFormChange={setGoalForm}
          onCreateGoal={createGoal}
          onCancelForm={() => setShowGoalForm(false)}
          onUpdateGoalValue={updateGoalValue}
        />
      )}

      {/* ── ВОРОНКИ ── */}
      {tab === "pipelines" && (
        <div className="text-center py-20 glass rounded-2xl">
          <Icon name="GitMerge" size={40} className="text-neon-purple/40 mx-auto mb-3" />
          <p className="text-white/40 font-oswald text-lg">Воронки продаж</p>
          <p className="text-white/20 text-sm mt-1 mb-6">Управляйте этапами работы с клиентами</p>
          <CrmPipelinesTab userId={user?.id || ""} />
        </div>
      )}
    </div>
  );
}

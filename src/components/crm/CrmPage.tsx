import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

const CRM_URL = "https://functions.poehali.dev/8641d4ef-87cd-4f51-bbe3-01b7a911724e";

// ── Types ──────────────────────────────────────────────────────────────────
interface Board {
  id: string; title: string; description: string; color: string;
  columnsCount?: number; cardsCount?: number;
}

interface Column {
  id: string; boardId: string; title: string; color: string; sortOrder: number;
}

interface Card {
  id: string; columnId: string; boardId: string; title: string;
  description: string; assignedTo: string | null; dueDate: string | null;
  priority: "low" | "medium" | "high" | "urgent"; tags: string; sortOrder: number;
}

interface Goal {
  id: string; title: string; description: string; targetValue: number | null;
  currentValue: number; unit: string; status: string; deadline: string | null; color: string;
}

const BOARD_COLORS = [
  "from-neon-purple to-neon-cyan",
  "from-neon-cyan to-neon-green",
  "from-neon-pink to-neon-purple",
  "from-neon-green to-neon-cyan",
];

const PRIORITY_CONFIG = {
  low:    { label: "Низкий",  cls: "text-white/40",     dot: "bg-white/30" },
  medium: { label: "Средний", cls: "text-neon-cyan",    dot: "bg-neon-cyan" },
  high:   { label: "Высокий", cls: "text-neon-purple",  dot: "bg-neon-purple" },
  urgent: { label: "Срочно!", cls: "text-neon-pink font-bold", dot: "bg-neon-pink" },
} as const;

// ── Board Detail ──────────────────────────────────────────────────────────
function BoardDetail({ board, userId, onBack }: { board: Board; userId: string; onBack: () => void }) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [newColTitle, setNewColTitle] = useState("");
  const [addingCol, setAddingCol] = useState(false);
  const [addingCard, setAddingCard] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [colRes, cardRes] = await Promise.all([
      fetch(`${CRM_URL}?action=crm_columns_list&board_id=${board.id}`),
      fetch(`${CRM_URL}?action=crm_cards_list&board_id=${board.id}`),
    ]);
    const [colData, cardData] = await Promise.all([colRes.json(), cardRes.json()]);
    setColumns(colData.columns || []);
    setCards(cardData.cards || []);
    setLoading(false);
  }, [board.id]);

  useEffect(() => { load(); }, [load]);

  const addColumn = async () => {
    if (!newColTitle.trim()) return;
    setAddingCol(true);
    await fetch(`${CRM_URL}?action=crm_column_create`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: board.id, title: newColTitle.trim(), sortOrder: columns.length }),
    });
    setNewColTitle(""); setAddingCol(false); load();
  };

  const addCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return;
    await fetch(`${CRM_URL}?action=crm_card_create`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId, boardId: board.id, title: newCardTitle.trim(), sortOrder: cards.filter(c => c.columnId === columnId).length }),
    });
    setNewCardTitle(""); setAddingCard(null); load();
  };

  const moveCard = async (cardId: string, newColumnId: string) => {
    await fetch(`${CRM_URL}?action=crm_card_update`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, columnId: newColumnId }),
    });
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, columnId: newColumnId } : c));
  };

  const deleteCard = async (cardId: string) => {
    await fetch(`${CRM_URL}?action=crm_card_delete`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId }),
    });
    setCards(prev => prev.filter(c => c.id !== cardId));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl glass border border-white/10 text-white/50 hover:text-white transition-all">
          <Icon name="ArrowLeft" size={16} />
        </button>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${board.color} flex items-center justify-center`}>
          <Icon name="Kanban" size={16} className="text-white" />
        </div>
        <h2 className="font-oswald font-bold text-xl text-white">{board.title}</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Icon name="Loader2" size={28} className="animate-spin text-neon-purple" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(col => {
            const colCards = cards.filter(c => c.columnId === col.id);
            return (
              <div key={col.id} className="w-72 shrink-0 glass rounded-2xl p-3 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-oswald font-semibold text-white text-sm">{col.title}</h3>
                  <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded-full">{colCards.length}</span>
                </div>

                <div className="space-y-2 min-h-[60px]">
                  {colCards.map(card => {
                    const pc = PRIORITY_CONFIG[card.priority];
                    return (
                      <div key={card.id} className="glass rounded-xl p-3 border border-white/5 hover:border-neon-purple/20 group transition-all">
                        <div className="flex items-start gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${pc.dot}`} />
                          <p className="text-white text-sm flex-1">{card.title}</p>
                          <button onClick={() => deleteCard(card.id)}
                            className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white/30 hover:text-neon-pink transition-all">
                            <Icon name="X" size={11} />
                          </button>
                        </div>
                        {card.dueDate && (
                          <p className="text-white/30 text-xs mt-1.5 ml-3.5 flex items-center gap-1">
                            <Icon name="Calendar" size={9} />{new Date(card.dueDate).toLocaleDateString("ru", { day: "numeric", month: "short" })}
                          </p>
                        )}
                        {/* Перемещение */}
                        {columns.length > 1 && (
                          <select value={col.id} onChange={e => moveCard(card.id, e.target.value)}
                            className="mt-2 w-full text-[10px] bg-transparent text-white/25 border-0 outline-none cursor-pointer hover:text-white/50 ml-3.5">
                            {columns.map(c => <option key={c.id} value={c.id} className="bg-gray-900">{c.title}</option>)}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>

                {addingCard === col.id ? (
                  <div className="mt-2">
                    <input value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)}
                      placeholder="Название карточки..."
                      className="w-full glass rounded-xl px-3 py-2 text-white placeholder:text-white/25 text-xs border border-neon-purple/30 outline-none mb-1"
                      onKeyDown={e => { if (e.key === "Enter") addCard(col.id); if (e.key === "Escape") { setAddingCard(null); setNewCardTitle(""); } }}
                      autoFocus />
                    <div className="flex gap-1">
                      <button onClick={() => addCard(col.id)} className="px-3 py-1.5 bg-neon-purple/20 text-neon-purple border border-neon-purple/30 rounded-lg text-xs hover:bg-neon-purple/30">Добавить</button>
                      <button onClick={() => { setAddingCard(null); setNewCardTitle(""); }} className="px-3 py-1.5 text-white/30 hover:text-white text-xs">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setAddingCard(col.id); setNewCardTitle(""); }}
                    className="w-full mt-2 py-1.5 text-white/20 hover:text-white/50 text-xs flex items-center justify-center gap-1 rounded-lg hover:bg-white/5 transition-all">
                    <Icon name="Plus" size={11} />Карточка
                  </button>
                )}
              </div>
            );
          })}

          {/* Новая колонка */}
          <div className="w-60 shrink-0">
            <div className="flex items-center gap-2">
              <input value={newColTitle} onChange={e => setNewColTitle(e.target.value)}
                placeholder="Название колонки..."
                className="flex-1 glass rounded-xl px-3 py-2 text-white placeholder:text-white/25 text-xs border border-white/10 outline-none focus:border-neon-cyan/40"
                onKeyDown={e => e.key === "Enter" && addColumn()} />
              <button onClick={addColumn} disabled={!newColTitle.trim() || addingCol}
                className="w-8 h-8 flex items-center justify-center bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan rounded-xl hover:bg-neon-cyan/20 disabled:opacity-40 transition-all">
                <Icon name="Plus" size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main CRM Page ─────────────────────────────────────────────────────────
export default function CrmPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
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
          { id: "boards", label: "Доски", icon: "Kanban" },
          { id: "goals",  label: "Цели",  icon: "Target" },
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
              {[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-32 animate-pulse" />)}
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-white/40 text-sm">OKR и ключевые результаты компании</p>
            <button onClick={() => setShowGoalForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90">
              <Icon name="Plus" size={15} />Новая цель
            </button>
          </div>

          {showGoalForm && (
            <div className="glass-strong rounded-2xl p-5 border border-neon-purple/30 animate-scale-in">
              <div className="space-y-3">
                <input value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Название цели *"
                  className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
                <div className="grid grid-cols-3 gap-3">
                  <input type="number" value={goalForm.targetValue} onChange={e => setGoalForm(f => ({ ...f, targetValue: e.target.value }))}
                    placeholder="Цель (число)"
                    className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none" />
                  <input value={goalForm.unit} onChange={e => setGoalForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="Единица (₽, %)"
                    className="glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm border border-white/10 outline-none" />
                  <input type="date" value={goalForm.deadline} onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))}
                    className="glass rounded-xl px-4 py-2.5 text-white text-sm border border-white/10 outline-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={createGoal} disabled={saving || !goalForm.title.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50">
                    {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Target" size={15} />}
                    Создать
                  </button>
                  <button onClick={() => setShowGoalForm(false)} className="px-5 py-2.5 glass rounded-xl text-white/50 hover:text-white text-sm border border-white/10">Отмена</button>
                </div>
              </div>
            </div>
          )}

          {goals.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl">
              <Icon name="Target" size={40} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 font-oswald text-lg">Нет целей</p>
              <p className="text-white/20 text-sm mt-1">Задайте цели компании и отслеживайте прогресс</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {goals.map(goal => {
                const pct = goal.targetValue ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0;
                return (
                  <div key={goal.id} className="glass rounded-2xl p-5 border border-white/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${goal.color} flex items-center justify-center shrink-0`}>
                          <Icon name="Target" size={14} className="text-white" />
                        </div>
                        <h4 className="font-oswald font-bold text-white">{goal.title}</h4>
                      </div>
                      <Badge className={`text-xs border shrink-0 ${pct >= 100 ? "text-neon-green bg-neon-green/10 border-neon-green/20" : "text-white/40 bg-white/5 border-white/10"}`}>
                        {pct >= 100 ? "Достигнута" : "Активна"}
                      </Badge>
                    </div>
                    {goal.targetValue && (
                      <>
                        <div className="flex items-center justify-between mb-2 text-sm">
                          <span className="text-white/60">{goal.currentValue.toLocaleString("ru")} {goal.unit}</span>
                          <span className="text-white/30">/ {goal.targetValue.toLocaleString("ru")} {goal.unit}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                          <div className={`h-full rounded-full transition-all bg-gradient-to-r ${goal.color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" defaultValue={goal.currentValue}
                            className="flex-1 glass rounded-lg px-3 py-1.5 text-white text-xs border border-white/10 outline-none"
                            onBlur={e => updateGoalValue(goal.id, Number(e.target.value))} />
                          <span className="text-white/30 text-xs">{goal.unit}</span>
                          <span className={`text-xs font-bold ${pct >= 100 ? "text-neon-green" : "text-neon-purple"}`}>{pct}%</span>
                        </div>
                      </>
                    )}
                    {goal.deadline && (
                      <p className="text-white/30 text-xs mt-2 flex items-center gap-1">
                        <Icon name="Calendar" size={10} />
                        до {new Date(goal.deadline).toLocaleDateString("ru", { day: "numeric", month: "long" })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ВОРОНКИ ── */}
      {tab === "pipelines" && (
        <div className="text-center py-20 glass rounded-2xl">
          <Icon name="GitMerge" size={40} className="text-neon-purple/40 mx-auto mb-3" />
          <p className="text-white/40 font-oswald text-lg">Воронки продаж</p>
          <p className="text-white/20 text-sm mt-1 mb-6">Управляйте этапами работы с клиентами</p>
          <PipelinesTab userId={user?.id || ""} />
        </div>
      )}
    </div>
  );
}

// ── Pipelines Tab ─────────────────────────────────────────────────────────
function PipelinesTab({ userId }: { userId: string }) {
  const [pipelines, setPipelines] = useState<{ id: string; title: string; description: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${CRM_URL}?action=crm_pipelines_list&user_id=${userId}`)
      .then(r => r.json())
      .then(d => setPipelines(d.pipelines || []))
      .finally(() => setLoading(false));
  }, [userId]);

  const create = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch(`${CRM_URL}?action=crm_pipeline_create`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title: form.title.trim(), description: form.description }),
    });
    setSaving(false); setShowForm(false);
    setForm({ title: "", description: "" });
    fetch(`${CRM_URL}?action=crm_pipelines_list&user_id=${userId}`).then(r => r.json()).then(d => setPipelines(d.pipelines || []));
  };

  if (loading) return <Icon name="Loader2" size={20} className="animate-spin text-neon-purple mx-auto" />;

  return (
    <div className="space-y-4 text-left max-w-2xl mx-auto">
      <button onClick={() => setShowForm(v => !v)}
        className="flex items-center gap-2 px-4 py-2 bg-neon-purple/20 border border-neon-purple/30 text-neon-purple rounded-xl text-sm font-medium hover:bg-neon-purple/30 transition-all mx-auto">
        <Icon name="Plus" size={14} />Новая воронка
      </button>
      {showForm && (
        <div className="glass-strong rounded-2xl p-4 border border-neon-purple/30">
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Название воронки"
              className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 text-sm" />
            <div className="flex gap-3">
              <button onClick={create} disabled={saving || !form.title.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : "Создать"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 glass rounded-xl text-white/40 text-sm border border-white/10">Отмена</button>
            </div>
          </div>
        </div>
      )}
      {pipelines.map(p => (
        <div key={p.id} className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-neon-purple/20 flex items-center justify-center">
            <Icon name="GitMerge" size={14} className="text-neon-purple" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">{p.title}</p>
            {p.description && <p className="text-white/40 text-xs">{p.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
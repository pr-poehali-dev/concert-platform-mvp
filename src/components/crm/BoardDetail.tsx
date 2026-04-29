import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { CRM_URL, PRIORITY_CONFIG, type Board, type Column, type Card } from "./crmTypes";

interface Props {
  board: Board;
  userId: string;
  onBack: () => void;
}

export default function BoardDetail({ board, userId: _userId, onBack }: Props) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [newColTitle, setNewColTitle] = useState("");
  const [addingCol, setAddingCol] = useState(false);
  const [addingCard, setAddingCard] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [colRes, cardRes] = await Promise.all([
        fetch(`${CRM_URL}?action=crm_columns_list&board_id=${board.id}`),
        fetch(`${CRM_URL}?action=crm_cards_list&board_id=${board.id}`),
      ]);
      const [colData, cardData] = await Promise.all([colRes.json(), cardRes.json()]);
      setColumns(colData.columns || []);
      setCards(cardData.cards || []);
    } catch {
      setColumns([]);
      setCards([]);
    } finally {
      setLoading(false);
    }
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
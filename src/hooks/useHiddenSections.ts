import { useState, useCallback } from "react";

const HIDDEN_KEY = "gl_hidden_sections";
const ORDER_KEY  = "gl_sections_order";

export function useHiddenSections() {
  const [hidden, setHidden] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // order[group] = массив id в нужном порядке
  const [order, setOrder] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem(ORDER_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const toggle = useCallback((id: string) => {
    setHidden(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id];
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isHidden = useCallback((id: string) => hidden.includes(id), [hidden]);

  // Сохраняет новый порядок для конкретной группы
  const saveOrder = useCallback((group: string, ids: string[]) => {
    setOrder(prev => {
      const next = { ...prev, [group]: ids };
      localStorage.setItem(ORDER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Возвращает отсортированный список секций для группы
  const sortedIds = useCallback((group: string, defaultIds: string[]): string[] => {
    const saved = order[group];
    if (!saved || saved.length === 0) return defaultIds;
    // Берём сохранённый порядок, добавляем новые (которых ещё нет в saved) в конец
    const known = new Set(saved);
    const extra = defaultIds.filter(id => !known.has(id));
    return [...saved.filter(id => defaultIds.includes(id)), ...extra];
  }, [order]);

  const reset = useCallback(() => {
    setHidden([]);
    setOrder({});
    localStorage.removeItem(HIDDEN_KEY);
    localStorage.removeItem(ORDER_KEY);
  }, []);

  return { hidden, toggle, isHidden, saveOrder, sortedIds, reset };
}

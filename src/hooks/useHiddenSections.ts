import { useState, useCallback } from "react";

const STORAGE_KEY = "gl_hidden_sections";

export function useHiddenSections() {
  const [hidden, setHidden] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const toggle = useCallback((id: string) => {
    setHidden(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isHidden = useCallback((id: string) => hidden.includes(id), [hidden]);

  const reset = useCallback(() => {
    setHidden([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { hidden, toggle, isHidden, reset };
}

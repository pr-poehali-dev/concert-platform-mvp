import { useState, useCallback } from "react";

export const PROJECTS_URL = "https://functions.poehali.dev/d04caaa7-d9f2-4792-9dd8-ad5ff602223b";

export interface Finance {
  incomePlan: number; incomeFact: number;
  expensesPlan: number; expensesFact: number;
  taxSystem: string; taxLabel: string; taxRate: number;
  taxPlan: number; taxFact: number;
  profitPlan: number; profitFact: number;
}

export interface Expense {
  id: string; category: string; title: string;
  amountPlan: number; amountFact: number; note: string; sortOrder: number;
}

export interface IncomeLine {
  id: string; category: string;
  ticketCount: number; ticketPrice: number; soldCount: number;
  note: string; sortOrder: number;
  totalPlan: number; totalFact: number;
}

export interface Project {
  id: string; userId: string; title: string; artist: string;
  projectType: "single" | "tour"; status: string;
  dateStart: string | null; dateEnd: string | null;
  city: string; venueName: string; description: string; taxSystem: string;
  totalExpensesPlan: number; totalExpensesFact: number;
  totalIncomePlan: number; totalIncomeFact: number;
  createdAt: string; updatedAt: string;
  finance: Finance;
  expenses?: Expense[];
  incomeLines?: IncomeLine[];
  hasOverdueTasks?: boolean;
}

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planning:  { label: "Планируется", color: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30" },
  active:    { label: "Активный",    color: "text-neon-green bg-neon-green/10 border-neon-green/30" },
  completed: { label: "Завершён",    color: "text-white/50 bg-white/5 border-white/10" },
  cancelled: { label: "Отменён",     color: "text-neon-pink bg-neon-pink/10 border-neon-pink/20" },
};

export const TAX_OPTIONS = [
  { value: "none",   label: "Без налога" },
  { value: "usn_6",  label: "УСН 6% (доходы)" },
  { value: "usn_15", label: "УСН 15% (доходы − расходы)" },
  { value: "osn",    label: "ОСН НДС 20%" },
  { value: "npd",    label: "Самозанятый 6%" },
];

export const EXPENSE_CATEGORIES = [
  "Аренда площадки","Техническое обеспечение","Логистика","Реклама и PR",
  "Гонорар артиста","Гостиница","Питание","Безопасность","Полиграфия","Страхование","Прочее",
];

export const CITIES = ["Москва","Санкт-Петербург","Екатеринбург","Новосибирск","Казань","Ростов-на-Дону","Краснодар","Воронеж","Самара","Уфа"];

export function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

export function useProjectsApi() {
  const [loading, setLoading] = useState(false);

  const call = useCallback(async (path: string, opts?: RequestInit) => {
    setLoading(true);
    try {
      const res = await fetch(`${PROJECTS_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...opts,
      });
      return await res.json();
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, call };
}
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
  isPartner?: boolean;
  ownerName?: string | null;
  groupId?: string | null;
}

export interface ProjectGroup {
  id: string;
  title: string;
  description: string;
  color: string;
  createdAt: string;
  projectCount: number;
  totalIncomePlan: number;
  totalIncomeFact: number;
  totalExpensesPlan: number;
  totalExpensesFact: number;
  dateStart: string | null;
  dateEnd: string | null;
  finance: Finance;
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

const TAX_RATES: Record<string, number> = {
  none: 0, usn_6: 0.06, usn_15: 0.15, osn: 0.20, npd: 0.06,
};
const TAX_LABELS: Record<string, string> = {
  none: "Без налога", usn_6: "УСН 6% (доходы)",
  usn_15: "УСН 15% (доходы − расходы)", osn: "ОСН НДС 20%", npd: "Самозанятый 6%",
};

export function recalcFinance(ip: number, iF: number, ep: number, ef: number, taxSystem: string): Finance {
  const rate = TAX_RATES[taxSystem] ?? 0;
  const tp = taxSystem === "usn_15" ? Math.max(0, (ip - ep) * rate) : ip * rate;
  const tf = taxSystem === "usn_15" ? Math.max(0, (iF - ef) * rate) : iF * rate;
  return {
    incomePlan: ip, incomeFact: iF,
    expensesPlan: ep, expensesFact: ef,
    taxSystem, taxLabel: TAX_LABELS[taxSystem] ?? "",
    taxRate: rate, taxPlan: tp, taxFact: tf,
    profitPlan: ip - ep - tp, profitFact: iF - ef - tf,
  };
}

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
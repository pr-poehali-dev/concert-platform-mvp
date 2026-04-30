export const CITIES = ["Москва","Санкт-Петербург","Екатеринбург","Новосибирск","Казань","Ростов-на-Дону","Краснодар","Воронеж","Самара","Уфа"];
export const EMPLOYEES_URL = "https://functions.poehali.dev/cc27106d-e3a4-4d7a-b6c2-47eb9365104e";
export const AUTH_URL = "https://functions.poehali.dev/f5e06ba0-2cd8-4b53-8899-3cfc3badc3e8";

import type { CompanyType } from "@/context/AuthContext";

export const COMPANY_LABELS: Record<CompanyType, string> = {
  individual: "Физическое лицо",
  ip:  "ИП",
  ooo: "ООО",
  other: "Другая форма",
};

export const ROLE_LABELS: Record<string, string> = {
  employee:   "Сотрудник",
  manager:    "Менеджер",
  accountant: "Бухгалтер",
  admin:      "Администратор",
};

export interface AccessPermissions {
  canViewExpenses: boolean;
  canViewIncome: boolean;
  canViewSummary: boolean;
  canEditExpenses: boolean;
  canEditIncome: boolean;
}

export const DEFAULT_ACCESS_PERMISSIONS: AccessPermissions = {
  canViewExpenses: true,
  canViewIncome: true,
  canViewSummary: true,
  canEditExpenses: true,
  canEditIncome: true,
};

export interface Employee {
  id: string; name: string; email: string;
  roleInCompany: string; avatar: string; avatarColor: string;
  isActive: boolean; createdAt: string;
  accessPermissions: AccessPermissions;
  lastSeen?: string;
}

export function formatEmployeeLastSeen(str?: string): { text: string; isOnline: boolean; color: string; dot: string } {
  if (!str) return { text: "никогда не входил", isOnline: false, color: "text-white/55", dot: "bg-white/25" };
  const date = new Date(str);
  if (isNaN(date.getTime())) return { text: "никогда не входил", isOnline: false, color: "text-white/55", dot: "bg-white/25" };
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 5)  return { text: "в сети", isOnline: true,  color: "text-neon-green", dot: "bg-neon-green" };
  if (diffMin < 60) return { text: `${diffMin} мин назад`, isOnline: false, color: "text-white/75", dot: "bg-white/40" };
  if (diffHr < 24)  return { text: `${diffHr} ч назад`,    isOnline: false, color: "text-white/70", dot: "bg-white/30" };
  if (diffDay < 7)  return { text: `${diffDay} дн назад`,  isOnline: false, color: "text-white/65", dot: "bg-white/25" };
  return {
    text: date.toLocaleDateString("ru", { day: "numeric", month: "short" }),
    isOnline: false,
    color: "text-white/55",
    dot: "bg-white/20",
  };
}
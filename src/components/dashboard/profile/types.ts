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

export interface Employee {
  id: string; name: string; email: string;
  roleInCompany: string; avatar: string; avatarColor: string;
  isActive: boolean; createdAt: string;
}

import type { CompanyType, UserRole } from "@/context/AuthContext";

export const CITIES = [
  "Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск",
  "Казань", "Ростов-на-Дону", "Краснодар", "Воронеж",
];

export const COMPANY_TYPES: { value: CompanyType; label: string }[] = [
  { value: "individual", label: "Физическое лицо" },
  { value: "ip",         label: "ИП" },
  { value: "ooo",        label: "ООО" },
  { value: "other",      label: "Другое" },
];

export const ROLE_META = {
  organizer: {
    label:    "Организатор",
    icon:     "Mic2",
    color:    "text-neon-cyan",
    gradient: "from-neon-cyan to-neon-purple",
    border:   "border-neon-cyan/40",
    bg:       "bg-neon-cyan/10",
  },
  venue: {
    label:    "Площадка",
    icon:     "Building2",
    color:    "text-neon-pink",
    gradient: "from-neon-pink to-neon-cyan",
    border:   "border-neon-pink/40",
    bg:       "bg-neon-pink/10",
  },
} as const;

export type Screen = "login" | "register" | "verify" | "twofa";
export type RoleMeta = typeof ROLE_META[UserRole];

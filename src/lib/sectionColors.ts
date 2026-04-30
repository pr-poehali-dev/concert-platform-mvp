/**
 * Единая цветовая система разделов приложения.
 * Используется и в боковом меню (GlobalSidebar), и в шапках экранов (TabHeader / hero).
 * Сохранена синхронизация: один и тот же раздел всегда одного цвета.
 */
export type SectionColor = "purple" | "cyan" | "green" | "pink";

export const SECTION_COLORS: Record<string, SectionColor> = {
  // Главные страницы
  search:        "cyan",
  tours:         "purple",
  projects:      "purple",
  chat:          "green",
  mail:          "cyan",

  // Личный кабинет — организатор
  history:       "cyan",
  documents:     "cyan",
  signing:       "purple",
  notifications: "pink",
  company:       "green",
  crm:           "purple",
  ai_help:       "pink",
  ai_lawyer:     "cyan",

  // Личный кабинет — площадка
  venues:        "cyan",
  vprojects:     "purple",
  concerts:      "pink",
  venue_crm:     "purple",
  profile:       "purple",
};

/** Возвращает Tailwind-цвет (neon-purple/cyan/...) по ключу раздела. */
export function getSectionNeonColor(key: string): string {
  const c = SECTION_COLORS[key] || "purple";
  return `neon-${c}`;
}
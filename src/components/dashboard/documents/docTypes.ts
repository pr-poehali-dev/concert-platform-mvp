export const DOCS_URL = "https://functions.poehali.dev/b805f044-ba82-4db5-a2a5-7a88dfbfce4a";
export const SESSION_KEY = "tourlink_session";

export const CATEGORIES_ORGANIZER = [
  { value: "technical_rider", label: "Технический райдер", icon: "Settings2", color: "text-neon-cyan" },
  { value: "domestic_rider",  label: "Бытовой райдер",     icon: "Coffee",    color: "text-neon-purple" },
  { value: "artist_contract", label: "Договор с артистом", icon: "FileText",  color: "text-neon-pink" },
  { value: "other",           label: "Прочее",             icon: "File",      color: "text-white/40" },
];

export const CATEGORIES_VENUE = [
  { value: "technical_rider", label: "Технический райдер", icon: "Settings2",  color: "text-neon-cyan" },
  { value: "domestic_rider",  label: "Бытовой райдер",     icon: "Coffee",     color: "text-neon-purple" },
  { value: "venue_contract",  label: "Договор с площадкой",icon: "Building2",  color: "text-neon-pink" },
  { value: "other",           label: "Прочее",             icon: "File",       color: "text-white/40" },
];

export const MIME_ICONS: Record<string, string> = {
  "application/pdf":   "FileText",
  "application/msword": "FileText",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "FileText",
  "application/vnd.ms-excel": "Table",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Table",
  "image/jpeg": "Image",
  "image/png":  "Image",
  "text/plain": "AlignLeft",
};

export interface Doc {
  id: string;
  category: string;
  categoryLabel: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  fileSizeHuman: string;
  mimeType: string;
  note: string;
  createdAt: string;
}

export type Category = { value: string; label: string; icon: string; color: string };

export function mimeIcon(mime: string): string {
  return MIME_ICONS[mime] || "File";
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}

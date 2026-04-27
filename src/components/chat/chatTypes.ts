export const CHAT_URL = "https://functions.poehali.dev/85035195-bd7b-44ce-b77c-db1255f711b5";

export const AVATAR_COLORS = [
  "from-neon-purple to-neon-pink",
  "from-neon-cyan to-neon-green",
  "from-neon-pink to-neon-purple",
  "from-neon-green to-neon-cyan",
];

export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function getInitial(name: string) {
  return name.trim()[0]?.toUpperCase() || "?";
}

export function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export interface Conversation {
  id: string;
  organizerId: string;
  venueId: string;
  venueUserId: string;
  venueName: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  isOrganizer: boolean;
  organizerName: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMime?: string;
  attachmentSizeHuman?: string;
  senderName?: string;
  senderRole?: string;
  senderCompany?: string;
}

export function getRoleLabel(role?: string): string {
  if (role === "venue") return "Площадка";
  if (role === "organizer") return "Организатор";
  if (role === "employee") return "Сотрудник";
  return "";
}

export function getRoleColor(role?: string): string {
  if (role === "venue") return "text-neon-cyan border-neon-cyan/30 bg-neon-cyan/8";
  if (role === "organizer") return "text-neon-purple border-neon-purple/30 bg-neon-purple/8";
  if (role === "employee") return "text-neon-green border-neon-green/30 bg-neon-green/8";
  return "text-white/40 border-white/10 bg-white/5";
}

export interface PendingAttachment {
  url: string;
  name: string;
  size: number;
  mime: string;
  sizeHuman: string;
  uploading?: boolean;
}
export const ADMIN_URL = "https://functions.poehali.dev/19ba5519-e548-4443-845c-9cb446cfc909";

export interface Stats {
  totalUsers: number;
  organizers: number;
  venueOwners: number;
  verifiedUsers: number;
  pendingCount: number;
  totalVenues: number;
  verifiedVenues: number;
  totalConversations: number;
  totalMessages: number;
  newUsersWeek: number;
  recentUsers: AdminUser[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string;
  verified: boolean;
  isAdmin: boolean;
  avatar: string;
  avatarColor: string;
  createdAt: string;
  venuesCount: number;
  status: string;
  lastSeen?: string;
}

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string;
  avatar: string;
  avatarColor: string;
  createdAt: string;
}

export interface AdminVenue {
  id: string;
  name: string;
  city: string;
  venueType: string;
  capacity: number;
  priceFrom: number;
  verified: boolean;
  rating: number;
  reviewsCount: number;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
}

export function formatDate(str: string) {
  return new Date(str).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" });
}

export function formatLastSeen(str?: string): { text: string; isOnline: boolean; color: string } {
  if (!str) return { text: "никогда", isOnline: false, color: "text-white/30" };
  const date = new Date(str);
  if (isNaN(date.getTime())) return { text: "никогда", isOnline: false, color: "text-white/30" };
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 5) return { text: "онлайн", isOnline: true, color: "text-neon-green" };
  if (diffMin < 60) return { text: `${diffMin} мин назад`, isOnline: false, color: "text-white/70" };
  if (diffHr < 24) return { text: `${diffHr} ч назад`, isOnline: false, color: "text-white/60" };
  if (diffDay < 7) return { text: `${diffDay} дн назад`, isOnline: false, color: "text-white/50" };
  return {
    text: date.toLocaleDateString("ru", { day: "numeric", month: "short" }),
    isOnline: false,
    color: "text-white/40",
  };
}
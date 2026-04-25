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

export interface BookingTask {
  id: string;
  bookingId: string;
  projectId: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "done";
  sortOrder: number;
}

export interface BookingInfo {
  id: string;
  venueId: string;
  venueName: string;
  projectId: string;
  projectTitle: string;
  eventDate: string;
  eventTime: string;
  artist: string;
  ageLimit: string;
  expectedGuests: number;
  status: string;
  rentalAmount: number | null;
  venueConditions: string;
  organizerId: string;
  venueUserId: string;
  conversationId: string;
  tasks: BookingTask[];
}

export interface VenueOption {
  id: string;
  userId: string;
  name: string;
  city: string;
  venueType: string;
  capacity: number;
  priceFrom: number;
  photoUrl: string;
}

export interface BookedDate { date: string; note: string; }

export interface BookForm {
  eventDate: string;
  eventTime: string;
  artist: string;
  ageLimit: string;
  expectedGuests: string;
}

export const TASK_STATUS_CONFIG = {
  pending:     { label: "Ожидает", cls: "text-white/50 bg-white/5 border-white/10", icon: "Circle" },
  in_progress: { label: "В работе", cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20", icon: "Clock" },
  done:        { label: "Готово", cls: "text-neon-green bg-neon-green/10 border-neon-green/20", icon: "CheckCircle2" },
} as const;

export const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Ожидает ответа", cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20" },
  confirmed: { label: "Подтверждено площадкой", cls: "text-neon-green bg-neon-green/10 border-neon-green/20" },
  accepted:  { label: "Бронирование активно", cls: "text-neon-green bg-neon-green/10 border-neon-green/20" },
  rejected:  { label: "Отклонено", cls: "text-neon-pink bg-neon-pink/10 border-neon-pink/20" },
  cancelled: { label: "Отменено", cls: "text-white/40 bg-white/5 border-white/10" },
};

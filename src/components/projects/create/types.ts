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

export interface BookedDate {
  date: string;
  note: string;
  source: string;
}

export interface ExpenseLine {
  id: string;
  category: string;
  title: string;
  amountPlan: number;
  amountFact: number;
  note: string;
}

export interface IncomeLine {
  id: string;
  category: string;
  ticketCount: number;
  ticketPrice: number;
  soldCount: number;
  note: string;
}

export interface ProjectForm {
  title: string;
  artist: string;
  projectType: "single" | "tour";
  status: string;
  dateStart: string;
  dateEnd: string;
  city: string;
  venueName: string;
  description: string;
  taxSystem: string;
  ticketingFeePercent: number;
  eventTime: string;
  ageLimit: string;
  expectedGuests: number;
}

export const DEFAULT_EXPENSES: Omit<ExpenseLine, "id" | "amountFact" | "note">[] = [
  { category: "Аренда площадки", title: "Аренда площадки", amountPlan: 0 },
  { category: "Гонорар артиста", title: "Гонорар артиста", amountPlan: 0 },
  { category: "Техническое обеспечение", title: "Техническое обеспечение", amountPlan: 0 },
  { category: "Реклама и PR", title: "Реклама и PR", amountPlan: 0 },
  { category: "Логистика", title: "Логистика", amountPlan: 0 },
];

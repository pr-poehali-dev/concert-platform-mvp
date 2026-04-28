export const CRM_URL = "https://functions.poehali.dev/8641d4ef-87cd-4f51-bbe3-01b7a911724e";

export const BOARD_COLORS = [
  "from-neon-purple to-neon-cyan",
  "from-neon-cyan to-neon-green",
  "from-neon-pink to-neon-purple",
  "from-neon-green to-neon-cyan",
];

export const PRIORITY_CONFIG = {
  low:    { label: "Низкий",  cls: "text-white/40",           dot: "bg-white/30" },
  medium: { label: "Средний", cls: "text-neon-cyan",          dot: "bg-neon-cyan" },
  high:   { label: "Высокий", cls: "text-neon-purple",        dot: "bg-neon-purple" },
  urgent: { label: "Срочно!", cls: "text-neon-pink font-bold", dot: "bg-neon-pink" },
} as const;

export interface Board {
  id: string;
  title: string;
  description: string;
  color: string;
  columnsCount?: number;
  cardsCount?: number;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  color: string;
  sortOrder: number;
}

export interface Card {
  id: string;
  columnId: string;
  boardId: string;
  title: string;
  description: string;
  assignedTo: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  tags: string;
  sortOrder: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetValue: number | null;
  currentValue: number;
  unit: string;
  status: string;
  deadline: string | null;
  color: string;
}

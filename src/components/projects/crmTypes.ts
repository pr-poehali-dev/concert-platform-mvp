import { PROJECTS_URL } from "@/hooks/useProjects";

export { PROJECTS_URL };

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isDone: boolean;
  doneBy: string | null;
  doneByName?: string;
  doneAt: string | null;
  comment: string;
  sortOrder: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetValue: number | null;
  currentValue: number;
  unit: string;
  status: "active" | "completed" | "paused";
  deadline: string | null;
  color: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  companyUserId: string;
  assignedTo: string | null;
  parentTaskId: string | null;
  goalId: string | null;
  createdBy: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  sortOrder: number;
  assigneeName: string;
  creatorName: string;
  subtasks?: Subtask[];
  comments?: TaskComment[];
}

export const STATUS_CONFIG = {
  todo:        { label: "К выполнению", cls: "text-white/50 bg-white/5 border-white/10",                  icon: "Circle",       bg: "bg-white/5" },
  in_progress: { label: "В работе",     cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20",        icon: "Clock",        bg: "bg-neon-cyan/5" },
  review:      { label: "На проверке",  cls: "text-neon-purple bg-neon-purple/10 border-neon-purple/20",  icon: "Eye",          bg: "bg-neon-purple/5" },
  done:        { label: "Готово",       cls: "text-neon-green bg-neon-green/10 border-neon-green/20",     icon: "CheckCircle2", bg: "bg-neon-green/5" },
} as const;

export const PRIORITY_CONFIG = {
  low:    { label: "Низкий",  cls: "text-white/40",            dot: "bg-white/30",    icon: "ArrowDown" },
  medium: { label: "Средний", cls: "text-neon-cyan",           dot: "bg-neon-cyan",   icon: "Minus" },
  high:   { label: "Высокий", cls: "text-neon-purple",         dot: "bg-neon-purple", icon: "ArrowUp" },
  urgent: { label: "Срочно!", cls: "text-neon-pink font-bold", dot: "bg-neon-pink",   icon: "Flame" },
} as const;

export const STATUS_ORDER = ["todo", "in_progress", "review", "done"] as const;

export function formatDue(d: string | null) {
  if (!d) return null;
  const date = new Date(d);
  const now = new Date();
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const label = date.toLocaleDateString("ru", { day: "numeric", month: "short" });
  if (diff < 0)  return { label, cls: "text-neon-pink" };
  if (diff === 0) return { label: "Сегодня", cls: "text-neon-pink" };
  if (diff <= 2)  return { label, cls: "text-neon-cyan" };
  return { label, cls: "text-white/40" };
}

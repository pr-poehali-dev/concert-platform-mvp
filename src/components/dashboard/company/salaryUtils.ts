export interface SalaryRow {
  employeeId: string;
  name: string;
  roleInCompany: string;
  avatar: string;
  avatarColor: string;
  recordId: string | null;
  baseSalary: number;
  bonus: number;
  deduction: number;
  note: string;
  status: "pending" | "paid";
  paidAt: string | null;
  period: string;
  displayId: string;
}

export interface HistoryRow {
  id: string;
  period: string;
  baseSalary: number;
  bonus: number;
  deduction: number;
  note: string;
  status: "pending" | "paid";
  paidAt: string | null;
}

export function periodLabel(p: string) {
  const [y, m] = p.split("-");
  const months = ["Январь","Февраль","Март","Апрель","Май","Июнь",
                  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function prevPeriod(p: string) {
  const [y, m] = p.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function nextPeriod(p: string) {
  const [y, m] = p.split("-").map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

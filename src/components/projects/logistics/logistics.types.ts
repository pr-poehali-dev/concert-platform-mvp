export type LogType   = "flight" | "train" | "hotel";
export type LogStatus = "needed" | "searching" | "booked" | "confirmed" | "cancelled";

export interface LogItem {
  id: string;
  projectId: string;
  personName: string;
  personRole: string;
  type: LogType;
  status: LogStatus;
  routeFrom: string;
  routeTo: string;
  dateDepart: string | null;
  dateReturn: string | null;
  bookingRef: string;
  price: number;
  notes: string;
  fileUrl: string;
  fileName: string;
  createdAt: string;
}

export const TYPE_CONFIG: Record<LogType, { label: string; icon: string; color: string; search: (r: LogItem) => string }> = {
  flight: {
    label: "Авиабилет", icon: "Plane", color: "text-neon-cyan",
    search: (r) => {
      const from = encodeURIComponent(r.routeFrom || "");
      const to   = encodeURIComponent(r.routeTo   || "");
      const date = r.dateDepart?.replace(/-/g, "") || "";
      return `https://www.aviasales.ru/search/${from}${date}${to}1`;
    },
  },
  train: {
    label: "ЖД билет", icon: "Train", color: "text-neon-green",
    search: (r) => {
      const from = encodeURIComponent(r.routeFrom || "");
      const to   = encodeURIComponent(r.routeTo   || "");
      const date = r.dateDepart
        ? new Date(r.dateDepart).toLocaleDateString("ru", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\./g, ".")
        : "";
      return `https://www.rzd.ru/tickets/direction/ru?from=${from}&to=${to}&date=${date}`;
    },
  },
  hotel: {
    label: "Отель", icon: "Hotel", color: "text-neon-purple",
    search: (r) => {
      const city  = encodeURIComponent(r.routeTo || r.routeFrom || "");
      const cin   = r.dateDepart  || "";
      const cout  = r.dateReturn  || "";
      return `https://ostrovok.ru/hotels/${city}/?arrival=${cin}&departure=${cout}`;
    },
  },
};

export const STATUS_CONFIG: Record<LogStatus, { label: string; cls: string }> = {
  needed:    { label: "Нужно купить", cls: "text-neon-pink bg-neon-pink/10 border-neon-pink/20" },
  searching: { label: "Ищем",        cls: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20" },
  booked:    { label: "Забронировано",cls: "text-neon-purple bg-neon-purple/10 border-neon-purple/20" },
  confirmed: { label: "Подтверждено",cls: "text-neon-green bg-neon-green/10 border-neon-green/20" },
  cancelled: { label: "Отменено",    cls: "text-white/30 bg-white/5 border-white/10" },
};

export const ROLES = ["Артист", "Звукорежиссёр", "Световик", "Менеджер тура", "Технический директор", "Охрана", "Фотограф", "Другое"];

export const fmt = (n: number) => n > 0 ? n.toLocaleString("ru") + " ₽" : "—";

export function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru", { day: "numeric", month: "short" });
}

export const EMPTY: Omit<LogItem, "id" | "projectId" | "createdAt"> = {
  personName: "", personRole: "Артист", type: "flight", status: "needed",
  routeFrom: "", routeTo: "", dateDepart: null, dateReturn: null,
  bookingRef: "", price: 0, notes: "", fileUrl: "", fileName: "",
};

import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import type { CompanyType, UserRole } from "@/context/AuthContext";

export const CITIES = [
  "Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск",
  "Казань", "Ростов-на-Дону", "Краснодар", "Воронеж",
];

export const COMPANY_TYPES: { value: CompanyType; label: string }[] = [
  { value: "individual", label: "Физическое лицо" },
  { value: "ip",         label: "ИП" },
  { value: "ooo",        label: "ООО" },
  { value: "other",      label: "Другое" },
];

export const ROLE_META = {
  organizer: {
    label:    "Организатор",
    icon:     "Mic2",
    color:    "text-neon-cyan",
    gradient: "from-neon-cyan to-neon-purple",
    border:   "border-neon-cyan/40",
    bg:       "bg-neon-cyan/10",
  },
  venue: {
    label:    "Площадка",
    icon:     "Building2",
    color:    "text-neon-pink",
    gradient: "from-neon-pink to-neon-cyan",
    border:   "border-neon-pink/40",
    bg:       "bg-neon-pink/10",
  },
} as const;

export type Screen = "login" | "register" | "verify" | "twofa";
export type RoleMeta = (typeof ROLE_META)[UserRole];

export function Bg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-neon-cyan/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-neon-purple/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1.2s" }} />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
    </div>
  );
}

export function BackBtn() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate("/login")}
      className="absolute top-6 left-6 flex items-center gap-2 text-white/30 hover:text-white/70 text-sm transition-colors z-10">
      <Icon name="ArrowLeft" size={16} />Назад
    </button>
  );
}

export function Field({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-wider mb-1.5">
        <Icon name={icon as never} size={11} />{label}
      </label>
      {children}
    </div>
  );
}

export function ErrorBox({ error }: { error: string }) {
  return (
    <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-3 py-2 border border-neon-pink/20 mb-4">
      <Icon name="AlertCircle" size={14} />{error}
    </div>
  );
}
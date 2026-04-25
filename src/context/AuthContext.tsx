import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "organizer" | "venue";
export type CompanyType = "individual" | "ip" | "ooo" | "other";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  city: string;
  verified: boolean;
  status: "pending" | "approved" | "rejected";
  avatar: string;
  avatarColor: string;
  // Реквизиты компании
  companyType: CompanyType;
  legalName: string;
  inn: string;
  kpp: string;
  ogrn: string;
  legalAddress: string;
  actualAddress: string;
  bankName: string;
  bankAccount: string;
  bankBik: string;
  logoUrl: string;
  phone: string;
  // Настройки
  emailNotificationsEnabled?: boolean;
  // Сотрудник
  isEmployee?: boolean;
  employeeId?: string;
  roleInCompany?: string;
  companyName?: string;
  accessPermissions?: {
    canViewExpenses: boolean;
    canViewIncome: boolean;
    canViewSummary: boolean;
    canEditExpenses: boolean;
    canEditIncome: boolean;
  };
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  city: string;
  companyType: CompanyType;
  legalName: string;
  inn: string;
  kpp: string;
  ogrn: string;
  legalAddress: string;
  actualAddress: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (data: RegisterData) => Promise<string | null>;
  updateProfile: (fields: Partial<User>) => Promise<string | null>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AUTH_URL = "https://functions.poehali.dev/f5e06ba0-2cd8-4b53-8899-3cfc3badc3e8";
const SESSION_KEY = "tourlink_session";
const USER_CACHE_KEY = "tourlink_user_cache";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem(USER_CACHE_KEY);
      return cached ? (JSON.parse(cached) as User) : null;
    } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(true);

  const setUserWithCache = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_CACHE_KEY);
  };

  useEffect(() => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) { setIsLoading(false); return; }
    fetch(`${AUTH_URL}?action=me`, { headers: { "X-Session-Id": sessionId } })
      .then((r) => r.json())
      .then((data) => { if (data.user) setUserWithCache(data.user); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}?action=login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Ошибка входа";
      localStorage.setItem(SESSION_KEY, data.sessionId);
      setUserWithCache(data.user);
      return null;
    } catch {
      return "Ошибка соединения";
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<string | null> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}?action=register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return json.error || "Ошибка регистрации";
      localStorage.setItem(SESSION_KEY, json.sessionId);
      setUserWithCache(json.user);
      return null;
    } catch {
      return "Ошибка соединения";
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (fields: Partial<User>): Promise<string | null> => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) return "Не авторизован";
    try {
      const res = await fetch(`${AUTH_URL}?action=update_profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Ошибка сохранения";
      if (data.user) setUserWithCache(data.user);
      return null;
    } catch {
      return "Ошибка соединения";
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUserWithCache(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, updateProfile, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
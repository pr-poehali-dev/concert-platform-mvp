import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "organizer" | "venue";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  city: string;
  verified: boolean;
  avatar: string;
  avatarColor: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (data: RegisterData) => Promise<string | null>;
  logout: () => void;
  isLoading: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  city: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_URL = "https://functions.poehali.dev/f5e06ba0-2cd8-4b53-8899-3cfc3badc3e8";
const SESSION_KEY = "tourlink_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) { setIsLoading(false); return; }
    fetch(`${AUTH_URL}?action=me`, { headers: { "X-Session-Id": sessionId } })
      .then((r) => r.json())
      .then((data) => { if (data.user) setUser(data.user); })
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
      setUser(data.user);
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
      setUser(json.user);
      return null;
    } catch {
      return "Ошибка соединения";
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

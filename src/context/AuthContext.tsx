import { createContext, useContext, useState, ReactNode } from "react";

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
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
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

const mockUsers: Record<string, User & { password: string }> = {
  "org@example.ru": {
    id: "1",
    name: "Алексей Соколов",
    email: "org@example.ru",
    password: "123456",
    role: "organizer",
    city: "Москва",
    verified: true,
    avatar: "АС",
    avatarColor: "from-neon-purple to-neon-cyan",
  },
  "venue@example.ru": {
    id: "2",
    name: "Music Club",
    email: "venue@example.ru",
    password: "123456",
    role: "venue",
    city: "Санкт-Петербург",
    verified: true,
    avatar: "MC",
    avatarColor: "from-neon-cyan to-neon-green",
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const found = mockUsers[email.toLowerCase()];
    if (found && found.password === password) {
      const { password: _, ...userData } = found;
      setUser(userData);
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    const initials = data.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const colors = [
      "from-neon-purple to-neon-cyan",
      "from-neon-cyan to-neon-green",
      "from-neon-pink to-neon-purple",
      "from-neon-green to-neon-cyan",
    ];
    const newUser: User = {
      id: String(Date.now()),
      name: data.name,
      email: data.email,
      role: data.role,
      city: data.city,
      verified: false,
      avatar: initials,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    };
    setUser(newUser);
    setIsLoading(false);
    return true;
  };

  const logout = () => setUser(null);

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

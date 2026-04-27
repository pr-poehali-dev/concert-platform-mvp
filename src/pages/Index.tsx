import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HomePage from "@/components/HomePage";
import SearchPage from "@/components/SearchPage";
import ToursPage from "@/components/ToursPage";
import ChatPage from "@/components/ChatPage";
import DashboardPage from "@/components/DashboardPage";
import ProjectsPage from "@/components/projects/ProjectsPage";
import SupportChat from "@/components/SupportChat";
import { useAuth } from "@/context/AuthContext";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import SharedProjectPage from "./SharedProjectPage";

type Page = "home" | "search" | "tours" | "chat" | "dashboard" | "projects";
const PROTECTED: Page[] = ["chat", "dashboard", "projects"];
const PAGE_KEY = "gl_active_page";
const CONV_KEY = "gl_chat_conv";

export default function Index() {
  const m = window.location.pathname.match(/^\/share\/([^/]+)/);
  if (m) return <SharedProjectPage linkId={m[1]} />;
  return <IndexInner />;
}

function IndexInner() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState<Page>("home");
  const [openChatConvId, setOpenChatConvId] = useState<string | null>(null);

  // Восстанавливаем страницу из localStorage после загрузки
  useEffect(() => {
    const saved = localStorage.getItem(PAGE_KEY) as Page | null;
    const savedConv = localStorage.getItem(CONV_KEY);
    if (saved && saved !== "home") {
      if (PROTECTED.includes(saved) && !user) return;
      setActivePage(saved);
      if (saved === "chat" && savedConv) setOpenChatConvId(savedConv);
    }
  }, [user]);

  const handleNavigate = (page: string) => {
    if (page.startsWith("chat:")) {
      const convId = page.slice(5);
      if (!user) { setActivePage("home"); return; }
      setOpenChatConvId(convId);
      setActivePage("chat");
      localStorage.setItem(PAGE_KEY, "chat");
      localStorage.setItem(CONV_KEY, convId);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setOpenChatConvId(null);
    localStorage.removeItem(CONV_KEY);
    const p = page as Page;
    if (PROTECTED.includes(p) && !user) {
      setActivePage("home");
      localStorage.setItem(PAGE_KEY, "home");
    } else {
      setActivePage(p);
      localStorage.setItem(PAGE_KEY, p);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar activePage={activePage} onNavigate={handleNavigate} />
      <EmailVerifyBanner />
      <main>
        {activePage === "home" && <HomePage onNavigate={handleNavigate} />}
        {activePage === "search" && <SearchPage onNavigate={handleNavigate} />}
        {activePage === "tours" && <ToursPage />}
        {activePage === "chat" && <ChatPage initialConversationId={openChatConvId} />}
        {activePage === "dashboard" && <DashboardPage onNavigate={handleNavigate} />}
        {activePage === "projects" && <ProjectsPage onNavigate={handleNavigate} />}
      </main>
      <SupportChat />
    </div>
  );
}
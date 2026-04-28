import { useState, useEffect } from "react";
import SharedProjectPage from "./SharedProjectPage";
import Navbar from "@/components/Navbar";
import SEOHead, { SEO_PAGES } from "@/components/SEOHead";
import HomePage from "@/components/HomePage";
import SearchPage from "@/components/SearchPage";
import ToursPage from "@/components/ToursPage";
import ChatPage from "@/components/ChatPage";
import DashboardPage from "@/components/DashboardPage";
import ProjectsPage from "@/components/projects/ProjectsPage";
import CrmPage from "@/components/crm/CrmPage";
import SupportChat from "@/components/SupportChat";
import GlobalSidebar from "@/components/layout/GlobalSidebar";
import PushPermissionBanner from "@/components/PushPermissionBanner";
import { useAuth } from "@/context/AuthContext";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";

type Page = "home" | "search" | "tours" | "chat" | "dashboard" | "projects" | "crm";
const PROTECTED: Page[] = ["chat", "dashboard", "projects", "crm"];
const PAGE_KEY = "gl_active_page";
const CONV_KEY = "gl_chat_conv";

export default function Index() {
  const shareId = new URLSearchParams(window.location.search).get("share");
  if (shareId) return <SharedProjectPage linkId={shareId} />;
  return (
    <>
      <SEOHead {...SEO_PAGES.home} />
      <IndexInner />
    </>
  );
}

function IndexInner() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState<Page>("home");
  const [openChatConvId, setOpenChatConvId] = useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(PAGE_KEY) as Page | null;
    const savedConv = localStorage.getItem(CONV_KEY);
    if (saved && saved !== "home") {
      if (PROTECTED.includes(saved) && !user) return;
      setActivePage(saved);
      if (saved === "chat" && savedConv) setOpenChatConvId(savedConv);
    }
  }, [user]);

  // Слушаем навигацию от Service Worker (клик по push-уведомлению)
  useEffect(() => {
    const handler = (e: Event) => {
      const page = (e as CustomEvent<string>).detail;
      if (page) handleNavigate(page);
    };
    window.addEventListener("gl:navigate", handler);
    return () => window.removeEventListener("gl:navigate", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (page.startsWith("dashboard:")) {
      const tabName = page.slice(10);
      if (!user) { setActivePage("home"); return; }
      setDashboardTab(tabName);
      setActivePage("dashboard");
      localStorage.setItem(PAGE_KEY, "dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (page === "signing") {
      if (!user) { setActivePage("home"); return; }
      setDashboardTab("signing");
      setActivePage("dashboard");
      localStorage.setItem(PAGE_KEY, "dashboard");
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

  // Страницы, где показывается глобальный сайдбар
  const showSidebar = user && activePage !== "home";

  return (
    <div className="min-h-screen bg-background">
      <Navbar activePage={activePage} onNavigate={handleNavigate} />
      <EmailVerifyBanner />
      {user && <PushPermissionBanner />}
      <main className={showSidebar ? "flex max-w-[1400px] mx-auto px-4 sm:px-6 pt-20 gap-6" : ""}>
        {showSidebar && (
          <GlobalSidebar
            activePage={activePage}
            dashboardTab={dashboardTab || undefined}
            onNavigate={handleNavigate}
          />
        )}
        <div className={showSidebar ? "flex-1 min-w-0" : "w-full"}>
          {activePage === "home" && <HomePage onNavigate={handleNavigate} />}
          {activePage === "search" && <SearchPage onNavigate={handleNavigate} />}
          {activePage === "tours" && <ToursPage onNavigate={handleNavigate} />}
          {activePage === "chat" && <ChatPage initialConversationId={openChatConvId} />}
          {activePage === "dashboard" && (
            <DashboardPage onNavigate={handleNavigate} initialTab={dashboardTab || undefined} />
          )}
          {activePage === "projects" && <ProjectsPage onNavigate={handleNavigate} />}
          {activePage === "crm" && <CrmPage onNavigate={handleNavigate} />}
        </div>
      </main>
      <SupportChat />
    </div>
  );
}
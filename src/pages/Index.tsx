import { useState } from "react";
import Navbar from "@/components/Navbar";
import HomePage from "@/components/HomePage";
import SearchPage from "@/components/SearchPage";
import ToursPage from "@/components/ToursPage";
import ChatPage from "@/components/ChatPage";
import DashboardPage from "@/components/DashboardPage";
import ProjectsPage from "@/components/projects/ProjectsPage";
import { useAuth } from "@/context/AuthContext";

type Page = "home" | "search" | "tours" | "chat" | "dashboard" | "projects";

export default function Index() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState<Page>("home");

  const handleNavigate = (page: string) => {
    const protected_pages = ["chat", "dashboard", "projects"];
    if (protected_pages.includes(page) && !user) {
      setActivePage("home");
    } else {
      setActivePage(page as Page);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar activePage={activePage} onNavigate={handleNavigate} />
      <main>
        {activePage === "home" && <HomePage onNavigate={handleNavigate} />}
        {activePage === "search" && <SearchPage onNavigate={handleNavigate} />}
        {activePage === "tours" && <ToursPage />}
        {activePage === "chat" && <ChatPage />}
        {activePage === "dashboard" && <DashboardPage onNavigate={handleNavigate} />}
        {activePage === "projects" && <ProjectsPage />}
      </main>
    </div>
  );
}
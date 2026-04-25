import { useState } from "react";
import Navbar from "@/components/Navbar";
import HomePage from "@/components/HomePage";
import SearchPage from "@/components/SearchPage";
import ToursPage from "@/components/ToursPage";
import ChatPage from "@/components/ChatPage";
import DashboardPage from "@/components/DashboardPage";

type Page = "home" | "search" | "tours" | "chat" | "dashboard";

export default function Index() {
  const [activePage, setActivePage] = useState<Page>("home");

  const handleNavigate = (page: string) => {
    setActivePage(page as Page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar activePage={activePage} onNavigate={handleNavigate} />
      <main>
        {activePage === "home" && <HomePage onNavigate={handleNavigate} />}
        {activePage === "search" && <SearchPage />}
        {activePage === "tours" && <ToursPage />}
        {activePage === "chat" && <ChatPage />}
        {activePage === "dashboard" && <DashboardPage />}
      </main>
    </div>
  );
}

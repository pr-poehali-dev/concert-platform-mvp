
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminPage from "./components/AdminPage";
import LoginSelectPage from "./pages/LoginSelectPage";
import OrganizerLoginPage from "./pages/OrganizerLoginPage";
import VenueLoginPage from "./pages/VenueLoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<AdminPage />} />
            {/* ── Login routes ── */}
            <Route path="/login" element={<LoginSelectPage />} />
            <Route path="/login/organizer" element={<OrganizerLoginPage />} />
            <Route path="/login/venue" element={<VenueLoginPage />} />
            <Route path="/login/admin" element={<AdminLoginPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </NotificationsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
import { useState, useEffect } from "react";
import HomeHeroSection from "@/components/home/HomeHeroSection";
import HomeFeaturesSection from "@/components/home/HomeFeaturesSection";
import HomeIntegrationsSection from "@/components/home/HomeIntegrationsSection";
import HomeCtaSection from "@/components/home/HomeCtaSection";

const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";

interface VenueTop {
  id: string; name: string; city: string; venueType: string;
  capacity: number; photoUrl: string; rating: number; tags: string[];
}

interface HomeStats {
  venues: number; organizers: number; cities: number; totalUsers: number;
}

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [topVenues, setTopVenues] = useState<VenueTop[]>([]);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [installPrompt, setInstallPrompt] = useState<(Event & { prompt: () => void }) | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const safeFetch = async (url: string): Promise<unknown> => {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        return await r.json();
      } catch {
        return null;
      }
    };
    safeFetch(`${VENUES_URL}?action=home_stats`).then(d => { if (d) setStats(d as HomeStats); });
    safeFetch(`${VENUES_URL}?action=top`).then(d => {
      if (d && typeof d === "object" && "venues" in d) setTopVenues((d as { venues: VenueTop[] }).venues || []);
    });

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as Event & { prompt: () => void });
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.prompt = () => {};
    setInstallPrompt(null);
  };

  return (
    <div className="min-h-screen">
      <HomeHeroSection
        onNavigate={onNavigate}
        stats={stats}
        installPrompt={installPrompt}
        installed={installed}
        onInstall={handleInstall}
      />
      <HomeFeaturesSection
        onNavigate={onNavigate}
        topVenues={topVenues}
        onRegisterVenue={() => {/* открывает AuthModal — обрабатывается внутри HomeCtaSection */}}
      />
      <HomeIntegrationsSection />
      <HomeCtaSection onNavigate={onNavigate} />
    </div>
  );
}
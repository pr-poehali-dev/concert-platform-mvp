import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { BOOKING_DATA_URL } from "@/lib/bookingUrls";
import { startPolling, stopPolling } from "@/lib/polling";

interface PendingBooking {
  id: string;
  projectTitle: string;
  eventDate: string;
  eventTime: string;
  artist: string;
  ageLimit: string;
  expectedGuests: number;
  organizerName: string;
  status: string;
}

interface VenuePendingBookingsState {
  pendingBookings: PendingBooking[];
  pendingCount: number;
  loading: boolean;
  refresh: () => void;
}

export function useVenuePendingBookings(): VenuePendingBookingsState {
  const { user } = useAuth();
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!user || user.role !== "venue") return;
    setLoading(true);
    try {
      const res = await fetch(`${BOOKING_DATA_URL}?action=bookings_for_venue&venue_user_id=${user.id}`);
      const data = await res.json();
      const all = data.bookings || [];
      setPendingBookings(all.filter((b: PendingBooking) => b.status === "pending"));
    } catch {
      setPendingBookings([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch_();
    const t = startPolling(fetch_, 30000);
    return () => stopPolling(t);
  }, [fetch_]);

  return {
    pendingBookings,
    pendingCount: pendingBookings.length,
    loading,
    refresh: fetch_,
  };
}
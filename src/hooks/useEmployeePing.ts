import { useEffect } from "react";
import { EMPLOYEES_URL } from "@/components/dashboard/profile/types";

/**
 * Если текущий пользователь — сотрудник, периодически дёргаем backend ?action=ping
 * чтобы обновлять last_seen в БД. Используется для индикации "был в сети" у руководителя.
 */
export function useEmployeePing(employeeId?: string, isEmployee?: boolean) {
  useEffect(() => {
    if (!isEmployee || !employeeId) return;

    const ping = () => {
      fetch(`${EMPLOYEES_URL}?action=ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: employeeId }),
      }).catch(() => { /* silent */ });
    };

    ping();
    const interval = setInterval(ping, 60_000);
    return () => clearInterval(interval);
  }, [employeeId, isEmployee]);
}

export default useEmployeePing;

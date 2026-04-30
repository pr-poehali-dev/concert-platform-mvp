import { useEffect } from "react";
import { EMPLOYEES_URL } from "@/components/dashboard/profile/types";

/**
 * Если текущий пользователь — сотрудник, периодически дёргаем backend ?action=ping
 * чтобы обновлять last_seen в БД. Используется для индикации "был в сети" у руководителя.
 *
 * Опрос идёт ТОЛЬКО когда:
 *  • пользователь авторизован как сотрудник
 *  • вкладка активна (document.visibilityState === "visible")
 * При сворачивании — пауза, при возврате — мгновенный пинг + продолжение.
 */
export function useEmployeePing(employeeId?: string, isEmployee?: boolean) {
  useEffect(() => {
    if (!isEmployee || !employeeId) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const ping = () => {
      fetch(`${EMPLOYEES_URL}?action=ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: employeeId }),
      }).catch(() => { /* silent */ });
    };

    const start = () => {
      if (intervalId !== null) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      ping();
      intervalId = setInterval(ping, 60_000);
    };

    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [employeeId, isEmployee]);
}

export default useEmployeePing;
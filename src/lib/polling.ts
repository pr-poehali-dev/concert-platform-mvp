/**
 * Утилита управления поллингом.
 * Флаг __GL_POLLING_ENABLED__ выставляется через Админ → Настройки.
 */

function isPollingEnabled(): boolean {
  const gl = window as unknown as Record<string, unknown>;
  if (typeof gl.__GL_POLLING_ENABLED__ === "boolean") return gl.__GL_POLLING_ENABLED__ as boolean;
  try {
    const raw = localStorage.getItem("gl_admin_settings");
    if (raw) return JSON.parse(raw)?.pollingEnabled === true;
  } catch { /* ignore */ }
  return false;
}

function getPollingInterval(fallback = 10000): number {
  const gl = window as unknown as Record<string, unknown>;
  if (typeof gl.__GL_POLLING_INTERVAL__ === "number") return gl.__GL_POLLING_INTERVAL__ as number;
  return fallback;
}

/**
 * Запускает setInterval только если поллинг включён в Настройках.
 * Возвращает id интервала или null.
 */
export function startPolling(fn: () => void, fallbackMs = 10000): ReturnType<typeof setInterval> | null {
  if (!isPollingEnabled()) return null;
  const ms = getPollingInterval(fallbackMs);
  return setInterval(fn, ms);
}

/**
 * Останавливает интервал если он был запущен.
 */
export function stopPolling(id: ReturnType<typeof setInterval> | null) {
  if (id !== null) clearInterval(id);
}

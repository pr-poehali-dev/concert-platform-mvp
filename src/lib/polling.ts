/**
 * Утилита управления поллингом.
 * Флаг __GL_POLLING_ENABLED__ выставляется через Админ → Настройки.
 *
 * Все опросы автоматически:
 *  • работают только при видимой вкладке (document.visibilityState === "visible")
 *  • работают только если включены в Настройках админа
 *  • могут требовать авторизации (опция requireAuth)
 *  • автоматически возобновляются при возврате на вкладку
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

function isAuthorized(): boolean {
  try {
    return !!localStorage.getItem("tourlink_session");
  } catch {
    return false;
  }
}

/**
 * Обёртка-handle для управления поллингом с учётом видимости вкладки.
 */
export interface PollingHandle {
  stop: () => void;
}

/**
 * Запускает поллинг только если:
 *  • поллинг включён в админ-настройках
 *  • вкладка видима (visibilityState === "visible")
 *  • (опц.) пользователь авторизован
 *
 * При сворачивании вкладки опрос автоматически приостанавливается,
 * при возврате — продолжается без перезапуска эффекта.
 *
 * Возвращает handle с методом .stop() — совместимо со старым API через адаптер.
 */
export function startSmartPolling(
  fn: () => void,
  options: { fallbackMs?: number; requireAuth?: boolean } = {},
): PollingHandle {
  const { fallbackMs = 10000, requireAuth = false } = options;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const canRun = (): boolean => {
    if (!isPollingEnabled()) return false;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return false;
    if (requireAuth && !isAuthorized()) return false;
    return true;
  };

  const ensureRunning = () => {
    if (intervalId !== null) return;
    if (!canRun()) return;
    const ms = getPollingInterval(fallbackMs);
    intervalId = setInterval(fn, ms);
  };

  const ensureStopped = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") ensureRunning();
    else ensureStopped();
  };

  ensureRunning();
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }

  return {
    stop() {
      ensureStopped();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    },
  };
}

/**
 * УСТАРЕВШИЙ API — оставлен для обратной совместимости.
 * Внутри использует startSmartPolling, возвращая фейковый id.
 * Рекомендуется переходить на startSmartPolling напрямую.
 */
export function startPolling(fn: () => void, fallbackMs = 10000): ReturnType<typeof setInterval> | null {
  if (!isPollingEnabled()) return null;
  const handle = startSmartPolling(fn, { fallbackMs });
  // Сохраняем handle на объекте, чтобы stopPolling мог его остановить
  const fakeId = { __pollingHandle: handle } as unknown as ReturnType<typeof setInterval>;
  return fakeId;
}

/**
 * Останавливает интервал если он был запущен.
 */
export function stopPolling(id: ReturnType<typeof setInterval> | null) {
  if (id === null) return;
  // Если это наш handle через startPolling — вызовем stop
  const wrapper = id as unknown as { __pollingHandle?: PollingHandle };
  if (wrapper && typeof wrapper.__pollingHandle === "object" && wrapper.__pollingHandle) {
    wrapper.__pollingHandle.stop();
    return;
  }
  // Старый интерфейс (если кто-то использовал setInterval напрямую)
  clearInterval(id);
}
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

const NOTIF_URL = "https://functions.poehali.dev/68f4b989-d93d-4a45-af4c-d54ad6815826";
const PUSH_PERM_KEY = "gl_push_asked";

export type PushState = "unsupported" | "default" | "granted" | "denied" | "loading";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // Инициализация — проверяем текущее состояние
  useEffect(() => {
    if (!isSupported) { setState("unsupported"); return; }
    if (!user) return;

    const perm = Notification.permission;
    if (perm === "denied") { setState("denied"); return; }
    if (perm === "granted") {
      setState("granted");
      // Проверяем есть ли активная подписка
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setSubscription(sub);
        })
      );
    } else {
      setState("default");
    }
  }, [user, isSupported]);

  // Запросить разрешение и подписаться
  const subscribe = useCallback(async () => {
    if (!isSupported || !user) return;
    setState("loading");

    try {
      // Регистрируем SW если не зарегистрирован
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Получаем VAPID публичный ключ
      const res = await fetch(`${NOTIF_URL}?action=vapid_public_key`);
      const data = await res.json();
      const vapidKey = data.publicKey;

      if (!vapidKey) {
        console.warn("[push] VAPID public key not configured");
        setState("default");
        return;
      }

      // Запрашиваем разрешение браузера
      const permission = await Notification.requestPermission();
      localStorage.setItem(PUSH_PERM_KEY, "asked");

      if (permission !== "granted") {
        setState(permission as PushState);
        return;
      }

      // Подписываемся на push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      setSubscription(sub);
      setState("granted");

      // Сохраняем подписку в БД
      const subJson = sub.toJSON();
      await fetch(`${NOTIF_URL}?action=push_subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:    user.id,
          endpoint:  sub.endpoint,
          p256dh:    subJson.keys?.p256dh   || "",
          auth:      subJson.keys?.auth     || "",
          userAgent: navigator.userAgent,
        }),
      });
    } catch (err) {
      console.error("[push] subscribe error:", err);
      setState("default");
    }
  }, [user, isSupported]);

  // Отписаться
  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      setSubscription(null);
      setState("default");
      await fetch(`${NOTIF_URL}?action=push_unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    } catch (err) {
      console.error("[push] unsubscribe error:", err);
    }
  }, [subscription]);

  // Слушаем postMessage от SW для навигации
  useEffect(() => {
    if (!isSupported) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NAVIGATE") {
        window.dispatchEvent(new CustomEvent("gl:navigate", { detail: event.data.page }));
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [isSupported]);

  return { state, subscription, isSupported, subscribe, unsubscribe };
}

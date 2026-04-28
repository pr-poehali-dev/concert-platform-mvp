// GLOBAL LINK Service Worker — кэш + Web Push уведомления
const CACHE = "globallink-v2";
const STATIC = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.hostname.includes("functions.poehali.dev")) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Web Push ───────────────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;

  let payload;
  try {
    payload = e.data.json();
  } catch {
    payload = { title: "GLOBAL LINK", body: e.data.text() };
  }

  const title = payload.title || "GLOBAL LINK";
  const options = {
    body:               payload.body    || "",
    icon:               "/favicon.ico",
    badge:              "/favicon.ico",
    tag:                payload.tag     || "gl-notif",
    data:               payload.data    || {},
    vibrate:            [200, 100, 200],
    requireInteraction: !!payload.requireInteraction,
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Клик по уведомлению ────────────────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const linkPage = (e.notification.data || {}).linkPage || "";

  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.focus();
            if (linkPage) client.postMessage({ type: "NAVIGATE", page: linkPage });
            return;
          }
        }
        return self.clients.openWindow(self.location.origin);
      })
  );
});

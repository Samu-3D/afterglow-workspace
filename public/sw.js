const CACHE_NAME = "afterglow-pwa-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/Logo_AFTERGLOW1-05.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => null))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => null);
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { title:"AFTERGLOW reminder", body:event.data ? event.data.text() : "Open AFTERGLOW." }; }
  const title = payload.title || "AFTERGLOW reminder";
  const options = {
    body: payload.body || "Open AFTERGLOW to continue your next action.",
    icon: payload.icon || "/Logo_AFTERGLOW1-05.png",
    badge: payload.badge || "/Logo_AFTERGLOW1-05.png",
    tag: payload.tag || "afterglow-reminder",
    renotify: true,
    requireInteraction: payload.requireInteraction === true,
    data: {
      url: payload.url || "/",
      taskId: payload.taskId || ""
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type:"window", includeUncontrolled:true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl).catch(() => null);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return null;
    })
  );
});

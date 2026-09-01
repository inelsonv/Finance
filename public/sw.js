const CACHE_NAME = "smart-finance-v3";
const APP_SHELL = ["/Finance/", "/Finance/index.html", "/Finance/icon.svg", "/Finance/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: red primero (para no mostrar datos viejos), con respaldo en caché
// si no hay conexión. Los datos reales siempre vienen de Firestore, que ya
// maneja su propia caché/reconexión.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/Finance/index.html")))
  );
});

// Notificaciones push: muestra la notificación del sistema al recibirla, y
// abre/enfoca la app al tocarla.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Smart Finance", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Smart Finance";
  const options = {
    body: data.body || "",
    icon: "/Finance/icon-192.png",
    badge: "/Finance/icon-192.png",
    data: { url: data.url || "/Finance/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/Finance/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/Finance/") && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

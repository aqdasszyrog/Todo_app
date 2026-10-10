// Service worker: required for the app to be installable, and the place where
// push notifications will be handled later. It deliberately does no caching,
// so every request still goes to the network and data is never stale.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

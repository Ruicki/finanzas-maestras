// Service worker mínimo para que el navegador considere la app instalable
// (ícono en pantalla de inicio, modo standalone). A propósito NO cachea nada:
// esto es una app de finanzas, y servir una respuesta vieja de una Server
// Action o de una página con saldos/transacciones sería mostrar datos
// incorrectos al usuario. Cada fetch pasa directo a la red.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

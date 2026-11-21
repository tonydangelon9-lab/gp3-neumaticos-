/* Moto4 Técnica · service worker
   Permite instalar la app y abrirla aunque la señal sea mala. Solo guarda la pantalla y los íconos
   del propio panel. Nunca guarda datos: tandas, fichas y costos siempre viajan en línea al servidor. */
// Subir la versión cuando cambien el manifiesto o los íconos
const CACHE = 'm4t-v1';
const BASICOS = ['/tecnica', '/tecnica.webmanifest', '/app-moto4-180.png', '/app-moto4-192.png', '/app-moto4-512.png', '/app-moto4-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('m4t-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;          // el servidor de datos (otro dominio) no pasa por aquí
  if (r.mode === 'navigate' && u.pathname === '/tecnica') {                        // la pantalla: primero la red (siempre la última versión)
    const red = fetch(r).then(res => { if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put('/tecnica', copia)); } return res; });
    // con señal débil, a los 4 segundos se muestra la copia guardada (si existe) mientras la red sigue intentando
    const espera = new Promise(ok => setTimeout(() => caches.match('/tecnica').then(c => c && ok(c)), 4000));
    e.respondWith(Promise.race([red, espera]).catch(() => caches.match('/tecnica')));
    return;
  }
  if (BASICOS.includes(u.pathname)) e.respondWith(caches.match(r).then(c => c || fetch(r)));
});

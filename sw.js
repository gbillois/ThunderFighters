// Thunder Fighters service worker: offline play + fast start.
// Cache-first for the app shell, refreshed in the background (stale-while-revalidate).
const CACHE = 'thunderfighters-v2';
const ASSETS = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icon.png',
  'js/core.js', 'js/font.js', 'js/forge.js', 'js/sprites.js', 'js/bg.js', 'js/fx.js',
  'js/music.js', 'js/audio.js', 'js/enemies.js', 'js/bosses.js', 'js/player.js',
  'js/stages.js', 'js/game.js', 'js/main.js',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || net;
  }));
});

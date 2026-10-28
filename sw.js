/* Dynasty League app: keeps the app itself available offline. League data is cached by the page, not here. */
var CACHE = 'dl-app-v1';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function keep(req, res) {
  if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Live league data always comes straight from the league server.
  if (/script\.google\.com|googleusercontent\.com/.test(url.hostname)) return;
  if (req.mode === 'navigate' || url.origin === self.location.origin) {
    // The app itself: newest version when online, saved copy when offline.
    e.respondWith(fetch(req).then(function (res) { return keep(req, res); }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('./index.html'); });
    }));
    return;
  }
  // Fonts and the chart library: saved copy first.
  e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req).then(function (res) { return keep(req, res); }); }));
});

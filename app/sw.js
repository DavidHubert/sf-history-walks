/* Keeps the app shell and story data available with a weak signal. Map tiles and photos stay online only. */
var CACHE = "sfhw-v11";
var SHELL = [
  "./", "index.html", "style.css", "app.js", "lib.js", "config.js", "manifest.webmanifest",
  "vendor/leaflet/leaflet.js", "vendor/leaflet/leaflet.css",
  "vendor/maplibre/maplibre-gl.js", "vendor/maplibre/maplibre-gl.css", "vendor/maplibre/leaflet-maplibre-gl.js", "data/stories.json",
  "icons/icon-192.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; // tiles, fonts and photos go straight to the network
  // network first so edits show up, cache as the fallback when offline
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }); })
  );
});

/* Keeps the workshop working with no wifi. The page is fetched fresh whenever there
   is a connection, and the saved copy is used when there is none. Fonts are kept after the first online visit. */
var V = "workshop-v2";
var SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET") return;
  var u = new URL(r.url);
  var fonts = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (u.origin !== location.origin && !fonts) return;
  var page = r.mode === "navigate" || /(\/|index\.html)$/.test(u.pathname);
  e.respondWith(caches.open(V).then(function (c) {
    return c.match(r, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(r).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) c.put(r, res.clone());
        return res;
      }).catch(function () { return hit; });
      if (!page) return hit || net;
      /* the page itself: the newest copy when online, the saved copy when offline or the network is slow */
      if (!hit) return net;
      return Promise.race([net, new Promise(function (ok) { setTimeout(function () { ok(hit); }, 3000); })]);
    });
  }));
});

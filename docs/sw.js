/* Keeps Lectio Vulgata working with no signal. A new version replaces the old one the next time the app is opened online. */
const VERSION = "lectio-5e4c69fb1e71";
const FONTS = "lectio-fonts";
const OFFICE = "lectio-office-c9a4c8a253";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
self.addEventListener("install", e => {
  // cache: "reload" skips the browser's HTTP cache, so an update never re-saves the previous version.
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS && k !== OFFICE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // The page: try the network first so updates show up, fall back to the saved copy offline.
    if (req.mode === "navigate") {
      e.respondWith(fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); } return r; })
        .catch(() => caches.match("./index.html")));
      return;
    }
    // The Office: each file is kept once fetched, so days already opened (or saved for the year) work offline.
    if (url.pathname.includes("/data/office/") || url.pathname.includes("/data/library/") || url.pathname.includes("/data/summa/")) {
      e.respondWith(caches.open(OFFICE).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }))));
      return;
    }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
    return;
  }
  // Web fonts: keep a copy once seen, so the page looks the same offline.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }))));
  }
});

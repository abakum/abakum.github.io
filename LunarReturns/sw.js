const CACHE = "lunarreturns-v1";
const INSTALL_URLS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./qr/qrcode.js",
    "./1f319.webp",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(INSTALL_URLS)).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", e => {
    const req = e.request;
    if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
    if (req.mode === "navigate") {
        e.respondWith(
            fetch(req).catch(() => caches.match("./index.html"))
        );
        return;
    }
    e.respondWith(
        caches.match(req).then(cached => {
            const fresh = fetch(req).then(resp => {
                if (resp.ok) caches.open(CACHE).then(c => c.put(req, resp.clone()));
                return resp;
            }).catch(() => cached);
            return cached || fresh;
        })
    );
});

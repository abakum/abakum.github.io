const CACHE = "lunarreturns-v2";
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

function readDb() {
    return new Promise(res => {
        const rq = indexedDB.open("lunarreturns", 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
        rq.onsuccess = () => {
            const idb = rq.result;
            try {
                const rq2 = idb.transaction("kv").objectStore("kv").get("db");
                rq2.onsuccess = () => { idb.close(); res(rq2.result || null); };
                rq2.onerror = () => { idb.close(); res(null); };
            } catch (e) { idb.close(); res(null); }
        };
        rq.onerror = () => res(null);
    });
}

function todayMsk() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Moscow" });
}

function birthdayNames(list) {
    const iso = todayMsk();
    const year = iso.slice(0, 4);
    const today = iso.slice(5);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const mds = [today];
    if (today === "02-28" && !leap) mds.push("02-29");
    return list.filter(r => r && typeof r.d === "string" && mds.includes(r.d.slice(5))).map(r => r.n);
}

self.addEventListener("push", e => {
    e.waitUntil((async () => {
        const raw = await readDb();
        if (raw === null)
            return self.registration.showNotification("День рождения", {
                body: "Проверьте дни рождения в приложении",
                tag: "bd"
            });
        let names = [];
        try { names = birthdayNames(JSON.parse(raw)); } catch (err) { return; }
        if (names.length)
            return self.registration.showNotification("День рождения", {
                body: names.join(", "),
                tag: "bd"
            });
    })());
});

self.addEventListener("notificationclick", e => {
    e.notification.close();
    e.waitUntil(clients.openWindow("./"));
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

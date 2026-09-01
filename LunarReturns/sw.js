const CACHE = "lunarreturns-v8";
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

function readKey(key) {
    return new Promise(res => {
        const rq = indexedDB.open("lunarreturns", 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
        rq.onsuccess = () => {
            const idb = rq.result;
            try {
                const rq2 = idb.transaction("kv").objectStore("kv").get(key);
                rq2.onsuccess = () => { idb.close(); res(rq2.result || null); };
                rq2.onerror = () => { idb.close(); res(null); };
            } catch (e) { idb.close(); res(null); }
        };
        rq.onerror = () => res(null);
    });
}

function idbPutLog(entry) {
    return new Promise(res => {
        try {
            const rq = indexedDB.open("lunarreturns", 1);
            rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
            rq.onerror = () => res();
            rq.onsuccess = () => {
                const idb = rq.result;
                try {
                    const tx = idb.transaction("kv", "readwrite");
                    const store = tx.objectStore("kv");
                    const rq2 = store.get("pushlog");
                    rq2.onerror = () => { idb.close(); res(); };
                    rq2.onsuccess = () => {
                        try {
                            const log = Array.isArray(rq2.result) ? rq2.result : [];
                            log.unshift(entry);
                            const rq3 = store.put(log.slice(0, 10), "pushlog");
                            rq3.onsuccess = () => { idb.close(); res(); };
                            rq3.onerror = () => { idb.close(); res(); };
                        } catch (e) { idb.close(); res(); }
                    };
                } catch (e) { idb.close(); res(); }
            };
        } catch (e) { res(); }
    });
}

function todayMsk() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Moscow" });
}

const WED = {
    1: "ситцевая", 2: "бумажная", 3: "кожаная", 4: "льняная", 5: "деревянная",
    6: "чугунная", 7: "медная", 8: "жестяная", 9: "фаянсовая", 10: "оловянная",
    11: "стальная", 12: "никелевая", 13: "кружевная", 14: "агатовая", 15: "стеклянная",
    16: "бирюзовая", 17: "розовая", 18: "гранатовая", 19: "криптоновая", 20: "фарфоровая",
    21: "опаловая", 22: "бронзовая", 23: "берилловая", 24: "сатиновая", 25: "серебряная",
    30: "жемчужная", 35: "полотняная", 40: "рубиновая", 45: "сапфировая", 50: "золотая",
    55: "изумрудная", 60: "бриллиантовая", 65: "железная", 70: "благодатная", 75: "корональная",
    80: "дубовая"
};

function yearsOf(d) {
    const y = Number(todayMsk().slice(0, 4)) - Number(d.slice(0, 4));
    return y >= 1 ? y : null;
}

function dbLabels(list) {
    const iso = todayMsk();
    const year = iso.slice(0, 4);
    const today = iso.slice(5);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const mds = [today];
    if (today === "02-28" && !leap) mds.push("02-29");
    return list.filter(r => r && typeof r.d === "string" && mds.includes(r.d.slice(5))).map(r => {
        const y = yearsOf(r.d);
        if (y === null) return r.n;
        return r.n.includes("+") ? r.n + " " + y + (WED[y] ? " " + WED[y] : "") : r.n + " " + y;
    });
}

function dayNames(list) {
    const today = todayMsk().slice(5);
    return (list || []).filter(r => r && typeof r.d === "string" && r.d === today && typeof r.n === "string").map(r => r.n);
}

self.addEventListener("push", e => {
    e.waitUntil((async () => {
        let nDb = null, nDays = null, shown = false;
        const [raw, rawDays] = await Promise.all([readKey("db"), readKey("days")]);
        let labels = [], days = [];
        try { if (raw !== null) labels = dbLabels(JSON.parse(raw)); } catch (err) { }
        try { if (rawDays !== null) days = dayNames(JSON.parse(rawDays)); } catch (err) { }
        nDb = raw === null ? null : labels.length;
        nDays = rawDays === null ? null : days.length;
        const all = labels.concat(days);
        if (all.length) {
            await self.registration.showNotification("Сегодня", {
                body: all.join(", "),
                tag: "bd"
            });
            shown = true;
        }
        await idbPutLog({
            t: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
            v: CACHE,
            db: nDb,
            days: nDays,
            shown: shown,
            body: all.join(", ").slice(0, 200)
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

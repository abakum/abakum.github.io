# PWA для LunarReturns (установка + офлайн, без уведомлений)

Файлы: `LunarReturns/` (index.html + новые manifest, sw.js, иконки). Бэкенд, GitHub-воркфловы и хранилище не трогаем.

## Решения

- Только PWA: устанавливаемость + офлайн. Уведомления и Periodic Sync — **out of scope** (отказались: серверный push требует расширения Yandex Cloud Function; браузерный не работает на iOS).
- Хранилище данных **остаётся localStorage** (`DB_KEY`, `PD_CONSENT_KEY`): без уведомлений SW не читает базу, миграция на Cache API не нужна. Cache API — только для app shell внутри SW.
- Существующий `1f319.webp` 128×128 ниже минимума Chrome (144px) → нужны иконки 192 и 512; источник — официальный Noto-emoji арт 🌙 с тега `v2020-09-16-unicode13_1` (эпоха Android 11, unicode 13.1).

## Задачи

1. **Иконки** `LunarReturns/icons/icon-512.png`, `icons/icon-192.png` — растеризация официального SVG:
   - источник (проверено, 200): `https://raw.githubusercontent.com/googlefonts/noto-emoji/v2020-09-16-unicode13_1/svg/emoji_u1f319.svg` — классический градиентно-жёлтый полумесяц с кратерами, тот самый дизайн Android 11; в этом теге НЕТ `png/512` (404), поэтому SVG → PNG локально;
   - ВНИМАНИЕ: `main`-ветка не годится — там 🌙 уже перерисован в плоский двухцветный (#FFB803/#FFCA29), это НЕ Android 11 арт;
   - растеризация (на машине есть только `python3`, ни ImageMagick, ни rsvg-convert):
     1. основной путь: `python3 -m pip install cairosvg`, затем
        `python3 -m cairosvg emoji_u1f319.svg -W 512 -H 512 -o icons/icon-512.png` и `-W 192 -H 192 -o icons/icon-192.png`;
     2. если cairosvg не встаёт (нет libcairo): статический бинарь resvg
        `https://github.com/linebender/resvg/releases` → `resvg --width 512 emoji_u1f319.svg icons/icon-512.png` (и 192);
   - фон иконок — прозрачный (луна с прозрачными углами, `purpose: "any"`; maskable не делать — обрежется по кругу);
   - лицензия noto-emoji — Apache 2.0, допустимо хранить PNG в репозитории;
   - проверить результат: `file icons/*.png` → `512 x 512` / `192 x 192`, RGBA.

2. **`LunarReturns/manifest.webmanifest`**:
   ```json
   {
     "name": "Лунно-солнечные юбилеи",
     "short_name": "Юбилеи",
     "start_url": "./index.html",
     "scope": "./",
     "display": "standalone",
     "background_color": "#f9f9f9",
     "theme_color": "#f9f9f9",
     "icons": [
       { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
     ]
   }
   ```

3. **`LunarReturns/sw.js`** (~30 строк, без зависимостей):
   - `const CACHE = "lunarreturns-v1"`; `INSTALL_URLS = ["./", "./index.html", "./manifest.webmanifest", "./qr/qrcode.js", "./1f319.webp", "./icons/icon-192.png", "./icons/icon-512.png"]`.
   - `install`: `caches.open(CACHE).then(c => c.addAll(INSTALL_URLS))` + `skipWaiting()`.
   - `activate`: удалить кэши с именами ≠ CACHE + `clients.claim()`.
   - `fetch`-обработчик: только same-origin GET.
     - `request.mode === "navigate"` → **network-first**, при ошибке — `cache.match("./index.html")` (OAuth-редирект Яндекс·OAuth всегда ходит по сети и не ломается; офлайн-загрузка страницы работает).
     - прочее (qrcode.js, иконки, webp) → **stale-while-revalidate**: отдать из кэша, в фоне `fetch` + `cache.put` (обновления доезжают со следующей загрузкой без смены версии кэша).
   - При существенных изменениях статики в будущем — bump `lunarreturns-v1` → `v2`.

4. **`LunarReturns/index.html`**, в `<head>`:
   ```html
   <link rel="manifest" href="manifest.webmanifest">
   <meta name="theme-color" content="#f9f9f9">
   <link rel="apple-touch-icon" href="icons/icon-192.png">
   ```
   В конец основного `<script>` (после `checkOAuthHash();`):
   ```js
   if ("serviceWorker" in navigator && location.protocol === "https:")
       navigator.serviceWorker.register("./sw.js");
   ```

## Не менять

- `loadDb`/`saveDb`/`pdConsentGiven`/`initPdConsent` — localStorage как есть; данные существующих пользователей сохраняются без миграции.
- `qr/qrcode.js`, OAuth-поток, облачные кнопки, `.github/`, `.well-known/`.

## Валидация

1. Локально (`npx serve LunarReturns`, localhost = secure context): DevTools → Application → Manifest без ошибок, SW activated; адресная строка предлагает установку.
2. Офлайн: Network → Offline → reload → приложение работает, список из localStorage рендерится.
3. Кнопка 🔑 (OAuth): переход на Яндекс и возврат работают, `access_token` из hash обрабатывается (навигация не перехвачена кэшем).
4. Lighthouse → PWA: критерий «Installable» проходит.
5. Иконка визуально — градиентный жёлтый полумесяц с кратерами (как в Android 11), с прозрачным фоном; не плоский оранжевый (редизайн main).
6. После деплоя на GitHub Pages повторить 1–3 (Gh Pages отдаёт `.webmanifest` корректным MIME).

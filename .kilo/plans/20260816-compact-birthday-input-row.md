# Plan: Unified DB button row with auth/cloud buttons; logout replaces 🔑 (LunarReturns/index.html)

## Goal
- One button row in the DB section: `🔑 📤 📥 📋 ⛶ ⮻` (cloud buttons only after login).
- After login, 🔑 becomes a logout button.
- Remove `#cloud` section entirely (and `#authSec` login row — its button moves into the DB row).

## Changes — HTML (~lines 72–114)

### 1. Remove `#authSec` section (73–78)
Its `#loginInfo` span and 🔑 button move into the DB btnrow.

### 2. Remove `#cloud` section (108–114)

### 3. New DB btnrow order
```html
<div class="btnrow">
    <button id="loginBtn" onclick="loginYandex()" title="Войти через Яндекс">🔑</button>
    <span id="loginInfo"></span>
    <button id="cloudPutBtn" onclick="cloudPut()" title="Сохранить базу в облако" style="display:none;">📤</button>
    <button id="cloudGetBtn" onclick="cloudGet()" title="Загрузить базу из облака" style="display:none;">📥</button>
    <button onclick="pasteDb()" title="Вставить базу из буфера">📋</button>
    <button onclick="showDbQr()" title="Показать базу как QR">⛶</button>
    <button onclick="copyDb()" title="Скопировать базу">⮻</button>
</div>
```
Cloud buttons hidden until auth (inline `display:none` keeps logic simple; `#loginInfo` empty by default so it takes no space).

## Changes — JS

### 4. `checkOAuthHash()` — show cloud buttons, swap 🔑 → logout
Replace `document.getElementById("cloud").style.display = "block";` block:
```js
document.getElementById("cloudPutBtn").style.display = "";
document.getElementById("cloudGetBtn").style.display = "";
const lb = document.getElementById("loginBtn");
lb.textContent = "🚪";
lb.title = "Выйти";
lb.onclick = logoutYandex;
```
Keep `loginInfo.textContent = "✓ Вход выполнен"` and status message.

### 5. New `logoutYandex()`
Token lives only in the `yandexToken` page variable (OAuth hash is stripped via `history.replaceState`), so logout is UI-only:
```js
function logoutYandex() {
    yandexToken = "";
    document.getElementById("cloudPutBtn").style.display = "none";
    document.getElementById("cloudGetBtn").style.display = "none";
    document.getElementById("loginInfo").textContent = "";
    const lb = document.getElementById("loginBtn");
    lb.textContent = "🔑";
    lb.title = "Войти через Яндекс";
    lb.onclick = loginYandex;
    status("Вы вышли из аккаунта");
}
```

## Out of scope
- OAuth flow itself, `cloudPresign`, S3 logic — unchanged.
- Note: token persists only in memory; page reload drops the session (already true today).

## Validation
- Fresh page: row shows `🔑 📋 ⛶ ⮻` (cloud hidden).
- Complete OAuth flow (needs real YANDEX_CLIENT_ID): row shows `🚪 ✓ Вход выполнен 📤 📥 📋 ⛶ ⮻`; 📤/📥 work.
- Press 🚪: back to 🔑, cloud buttons hidden, status «Вы вышли из аккаунта»; 🔑 starts login again.
- No `#cloud`/`#authSec` remnants in HTML.

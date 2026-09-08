/**
 * Собирает статику мини-аппа LunarReturns в папку build/.
 * Запускается через `npm run build` (или автоматически через predeploy).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dest = path.join(root, "build");

// Файлы/папки, которые попадают на хостинг VK.
// sw.js / manifest.webmanifest / icons включаем для веб-версии: страница
// хостинга, открытая напрямую в браузере (без launch-параметров, vkminiapp
// false), подписывается на web-push Яндекса — без SW принимать пуши некому.
// Внутри клиента ВК (vkminiapp true) SW не регистрируется, а манифест
// удаляется из DOM (applyVkUi) — там по-прежнему native-уведомления ВК.
const entries = [
  "index.html",
  "1f319.webp",
  "sw.js",
  "manifest.webmanifest",
  "icons",
  "qr",
  "vendor"
];

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}
fs.mkdirSync(dest, { recursive: true });

for (const entry of entries) {
  const src = path.join(root, entry);
  if (!fs.existsSync(src)) {
    console.error(`Пропущен отсутствующий файл: ${entry}`);
    continue;
  }
  fs.cpSync(src, path.join(dest, entry), { recursive: true });
}

console.log(`Сборка готова: ${dest}`);
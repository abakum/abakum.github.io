/**
 * Собирает статику мини-аппа LunarReturns в папку build/.
 * Запускается через `npm run build` (или автоматически через predeploy).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dest = path.join(root, "build");

// Файлы/папки, которые попадают на хостинг VK.
// sw.js / manifest.webmanifest / icons не включаем: PWA в мини-аппах не используется,
// а index.html уже содержит .catch() для тихой регистрации отсутствующего сервис-воркера.
const entries = [
  "index.html",
  "1f319.webp",
  "qr"
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
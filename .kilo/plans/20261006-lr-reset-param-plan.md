# LunarReturns: параметр `#demo=1` для отладки экскурсии первого старта

## Цель

Единый hash-параметр `demo=1`, запускающий демо-«экскурсию» первого старта:

- **Веб** (`https://abakum.github.io/LunarReturns/#demo=1`): стереть ВСЕ
  локальные переменные (localStorage) и запустить экскурсию. Заменяет старый
  `?vk_app_id=1` (режим `vkTest` удаляется).
- **ВК** (`https://vk.ru/app54746591#demo=1`): то же + стереть ВСЕ переменные
  в облаке ВК (VKWebAppStorage: `lr_s_blob`, `cnt`, числовые чанки, легаси
  `lr_s_*`) — состояние «новый пользователь», затем обычный запуск
  (экскурсия сеется сама).

## Почему hash, а не query

В вебвью ВК launch-параметры затирают query, а фрагмент `#` сохраняется —
проект уже полагается на это (`checkOAuthHash()` читает `access_token` из
hash, `hashSelect()` — `#N`). Query-вариант не поддерживается вовсе.

## Изменения в `LunarReturns/index.html`

1. **Ранний блок (сейчас строки ~760–772, `vkTest`):** заменить на:

   ```js
   // #demo=1: отладка экскурсии первого старта. Hash, а не query: в вебвью ВК
   // launch-параметры затирают query, а фрагмент # сохраняется (на этом уже
   // держатся checkOAuthHash и #N). Стирает ВСЕ локальные переменные; в ВК —
   // также всё облако ВК (см. init-блок). Замена бывшего ?vk_app_id=1.
   const demoParam = location.hash.slice(1).split("&").includes("demo=1");
   if (demoParam) {
       try { localStorage.clear(); } catch (e) { }
       history.replaceState(null, "", location.pathname + location.search);
   }
   ```

   - `localStorage.clear()` — «все локальные переменные»: DB_KEY, FIRST_KEY,
     тема, согласия, FOOTER_KEY и пр. Блок стоит ДО чтения `savedFooter`
     (строка ~3897) и до `loadDb()` (~3900).
   - Hash стирается сразу (как в `checkOAuthHash`), чтобы PTR-reload /
     `location.reload()` не повторили сброс.
   - sessionStorage (отложенный OAuth-токен) не трогаем.

2. **`vkminiapp` (строка ~762):** `q.has("vk_app_id") || demoParam` — чтобы
   вне ВК сеялось демо (`loadDb` гейтит посев демо по `vkminiapp`) и
   включался VK-UI. Для логики восстановления оставить признак реального
   клиента: `const vkReal = q.has("vk_app_id")`.

3. **Новая функция `vkWipeAllCloud()`** (рядом с `vkLegacyWipe`, ~строка 3253):

   ```js
   async function vkWipeAllCloud() {
       const keys = await vkStorageGetKeys();
       for (const k of keys) await vkStorageSet(k, "");
       status("Облако ВКонтакте очищено (demo=1)");
   }
   ```

   Ошибку — в статус (`vkErr(e)`), не молча.

4. **Init-блок (строки ~3931–3939):**

   ```js
   const afterInit = () => {
       refreshThemeFromBridge();
       applyTheme();
       if (!vkReal) return;              // вне ВК restore не вызывался и раньше
       if (demoParam) vkWipeAllCloud().catch(()=>{}).finally(vkRestoreCloud);
       else vkRestoreCloud();
   };
   ```

   Порядок важен: `lrBlobHold` ещё равен 1 (отпускается в `finally`
   `vkRestoreCloud`), поэтому отложенный стартовый флш блоба настроек не может
   перезаписать ключ ПОСЛЕ wipe — гонка исключена. `vkRestoreCloud` после
   wipe безопасен: облако пусто, `vkRestoreSettings` вернёт false, `vkDbGet`
   не затрёт посеянное демо (`lrDemoSeeded`).

## Сопутствующие правки

- `LunarReturns/vk/screenshots.bat`: все `?vk_app_id=1` → `#demo=1`
  (7 строк; комбинации принимают вид `?appearance=dark#demo=1`,
  `?ptr=160#demo=1` и т.п.).
- `LunarReturns/README.md`: в раздел про debug добавить абзац про `#demo=1`
  с обоими URL: `https://abakum.github.io/LunarReturns/#demo=1` (веб:
  чистый localStorage + экскурсия) и `https://vk.ru/app54746591#demo=1`
  (ВК: чистый localStorage + чистое облако ВК + экскурсия).

## Как проверять

1. **Браузер:** `https://abakum.github.io/LunarReturns/#demo=1`,
   `…/?appearance=dark#demo=1` — сеется демо, подвал раскрыт, режим
   подсказок; тема/согласия сброшены. Повторный заход без `#demo=1` демо НЕ
   показывает.
2. **ВК:** задеплоить stage-версию (workflow), открыть
   `https://vk.ru/app54746591#demo=1` (или stage-URL мини-аппа с `#demo=1`)
   — статус «Облако ВКонтакте очищено», затем экскурсия; согласия/тема
   сброшены. Повторное открытие без `#demo=1` — обычный старт с чистым
   облаком (демо не повторяется, `FIRST_KEY` уже поставлен).
3. `npm run lint`/typecheck, если настроены; `npm run build` для LunarReturns
   НЕ запускать (AGENTS.md) — сборка в CI.

## Риски/заметки

- Предположение «фрагмент `#demo=1` из `vk.ru/app54746591#demo=1` доходит до
  вебвью» нужно проверить на stage-версии; если ВК его не пропускает —
  открыть мини-апп напрямую по URL хостинга (`…pages.vk-apps.com/#demo=1`).
- `vkStorageGetKeys` возвращает до 1000 ключей; поштучный
  `VKWebAppStorageSet(k, "")` уже используется (`vkLegacyWipe`, `vkDbClear`).
- `#demo=1` не конфликтует с `#N` (`hashSelect`) и OAuth-hash (формы разные).
- `demo=1` стирает ПДн пользователя из облака ВК — только для отладки
  собственного аккаунта; прод-URL без него.

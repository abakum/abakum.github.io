# LunarReturns: `#demo=1` в клиенте/iframe ВК — читать параметр `hash` из query

## Причина неработы в ВК

Веб работает (`abakum.github.io/LunarReturns/#demo=1`), ВК — нет. По доке ВК
(«Параметры запуска → Передача произвольных параметров»): при запуске по прямой
ссылке `https://vk.ru/app54746591#demo=1` символы после `#` передаются в апп
**query-параметром `hash`** (идёт последним в URL iframe/webview), а НЕ
фрагментом `location.hash`. Текущий код читает только `location.hash`
(index.html:50, :771) — в iframe ВК фрагмент пуст, `demoParam` ложен.

Критичный нюанс: проход-сброс перезапускает страницу
`location.replace(location.pathname + location.search)` (index.html:3965) и
стирает hash через `history.replaceState(null, "", pathname + search)`
(index.html:776). Если `demo=1` пришёл в query-параметре `hash` и его не
вырезать — перезапуск снова увидит `hash=demo%3D1` → бесконечный цикл сброса.

## Изменения в `LunarReturns/index.html`

1. **Хелпер парсинга (основной скрипт, рядом с `demoParam`, ~строка 771):**

   ```js
   // Прямая ссылка ВК передаёт фрагмент после # query-параметром hash (дока ВК,
   // «Передача произвольных параметров»): читаем оба источника.
   const demoHash = location.hash.slice(1) ||
       (new URLSearchParams(location.search).get("hash") || "");
   const demoParam = demoHash.split("&").includes("demo=1");
   ```

2. **Вырезание параметра при очистке URL (ранний блок, ~строки 772–777):**
   вместе с фрагментом вырезать и query-параметр `hash`:

   ```js
   if (demoParam) {
       try { localStorage.clear(); } catch (e) { }
       const q2 = new URLSearchParams(location.search);
       q2.delete("hash");
       const s = q2.toString();
       history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
   }
   ```

3. **Head-скрипт (~строки 49–53):** то же условие для раннего класса `.vk`:

   ```js
   var h = location.hash.slice(1) || (q.get("hash") || "");
   if (q.has("vk_app_id") || h.split("&").indexOf("demo=1") >= 0) { ... }
   ```

4. **Init-блок `done()` (~строка 3965):** перезапуск БЕЗ query-параметра `hash`
   (фрагмент уже стёрт ранним блоком):

   ```js
   const done = () => {
       try { localStorage.clear(); } catch (e) { }
       idbWipeKv().finally(() => {
           const q3 = new URLSearchParams(location.search);
           q3.delete("hash");
           const s = q3.toString();
           location.replace(location.pathname + (s ? "?" + s : ""));
       });
   };
   ```

5. **`vkminiapp` (~строка 780):** без изменений — уже `|| demoParam`.

Не трогать: `checkOAuthHash()` (читает `location.hash` — в ВК он пуст, свой
формат не конфликтует), `hashSelect()` (`#N`), `vkWipeAllCloud()`.

## Сопутствующие правки

- `LunarReturns/README.md` (раздел «Отладка экскурсии первого старта», ~строки
  225–237): дописать, что в клиенте ВК фрагмент доходит query-параметром
  `hash` (дока ВК), оба URL остаются прежними (`…#demo=1`).

## Как проверять

1. **Веб (регресс):** `https://abakum.github.io/LunarReturns/#demo=1` — как
   раньше: сброс, перезапуск, экскурсия; повторный заход без параметра — без
   демо. Здесь query-параметра `hash` нет, путь не меняется.
2. **ВК десктоп:** `https://vk.ru/app54746591#demo=1` — статус «Облако
   ВКонтакте очищено (#demo=1)», перезапуск без параметров (адрес iframe без
   `hash=`), экскурсия; повторный запуск аппа без `#demo=1` — обычный старт.
3. **ВК мобильные клиенты:** тот же URL в мобильном клиенте — аналогично
   (webview тоже получает `hash` в query).
4. **Анти-цикл:** после прохода-сброса страница обязана перезапуститься ровно
   один раз (проверить, что нет повторного wipe при холодном старте).
5. `npm run lint`/typecheck, если настроены; `npm run build` для LunarReturns
   НЕ запускать (AGENTS.md) — сборка в CI.

## Риски/заметки

- Дока формулирует раздел «Передача произвольных параметров» через «игру»;
  для мини-аппов механизм исторически тот же, но проверить на stage (или
  напрямую на prod-сборке после деплоя workflow).
- Query-параметр `hash` ВК ставит последним; `URLSearchParams` корректно
  декодирует `%3D` → `=`, `demo=1` находится сплитом по `&`.
- Прямой URL хостинга (`pages.vk-apps.com/...#demo=1`) работает по старому
  пути через фрагмент — `||` покрывает оба случая.

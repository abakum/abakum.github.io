# LunarReturns: религиозные дни как div-списки + оповещения — как сделано

Реализовано `2026-08-27` в `LunarReturns/index.html` и `LunarReturns/sw.js`.

## Итоговое поведение

- **🥚** (id `eggBtn`) — переключатель режима религий:
  - вход: показываются `religionBtns`; скрываются `recForm`, строка города (`cityRow`), `#list`, все кнопки тулбара кроме 🥚 и 🔔, блок согласия ПДн (`pdConsentLabel`) и `pdLocalNote`; скрывается `resultSec` (textarea + QR результата); при выбранной религии рендерится её div и заголовок;
  - выход: прежняя видимость элементов восстанавливается (динамически скрытые 🔔/🔑 не затрагиваются — сохраняются и восстанавливаются исходные значения `display` через `savedUiDisp`), div религиозных дней скрывается, заголовок возвращается к «🌙 Лунно-солнечные юбилеи».
- **☦️ ☪️ ☸️ ✝️ ✡️** — переключатели (radio, не чекбоксы): включён один вид дней одновременно; клик по другой религии скрывает предыдущий div и показывает новый; повторный клик по активной скрывает дни. Выбор скрывает `resultSec` (textarea + QR результата).
- **Вид строк** — как у `#list` дней рождения: `div.row` → `span.n` (название) + `span.d` (`ГГГГ-ММ-ДД`); заголовков внутри div нет.
- **Заголовок страницы** (`h1 id="titleH1"`): в режиме религий с выбранным видом заменяется на `☦️ Православные дни` и т.п. (иконка religion вместо 🌙-картинки); вне режима — исходный.
- **Выход из режима / перезагрузка**: религиозные дни не показываются, но выбранный вид «держится в уме» — оповещения и IndexedDB продолжают его включать.

## index.html

- CSS: селекторы `#list div.row` обобщены на `#list div.row, .days div.row` (hover, `span.n`, `span.d`); `cursor:pointer` остался только у `#list`.
- HTML: пять контейнеров `<div id="orthodox|islam|buddhist|catholic|jewish" class="days" style="display:none;">` после `#list`; id для `cityRow`, `toolbar`, `eggBtn`, `pdConsentLabel`, `titleH1`; кнопки религий → `toggleDays('<kind>')`.
- Ключ localStorage `lunarreturns.days` (`DAYS_KEY`): хранит один вид (`"orthodox"` и т.п.); старый JSON-массив читается обратно совместимо (`loadDayKind`).
- Переименования без слова «holidays»: `HOLIDAY_DEFS`→`DAYS_DEFS` (теперь `[название, builder, иконка]`), `showHolidays`→`toggleDays`, `buildChristianHolidays`→`buildChristianDays`, `holStart`/`holEnd`→`dayStart`/`dayEnd`.
- Функции: `toggleReligionBtns` (режим + `savedUiDisp` + `religionMode`), `loadDayKind`/`saveDayKind`, `buildDays` (365 дней от `mskToday()`), `renderDays`, `hideDaysDiv`, `renderTitle` (заголовок только при `religionMode && dayKind`), `toggleDays` (radio-логика + `hideResult()`), `daysEntries` (`{d:"MM-DD", n:название}` → IndexedDB, ключ `"days"`, store `kv`), `idbPutDays`, `religionDates`/`allPushDates`.
- Push: `updatePushDates()` и `togglePush()` отправляют `dates: allPushDates()` — дни рождения `"MM-DD"` + даты религиозных дней с дедупликацией. Подписи 🔔 — «о днях».
- Инициализация: `loadDayKind()` + `idbPutDays()` (дни не рендерятся, но доступны для оповещений).
- QR базы (`showDbQr`/`refreshDbQr`), облако (`cloudPut`/`cloudGet`), копирование/вставка базы — без изменений: сериализуется только `db`, религиозные дни в базу не входят.

## sw.js

- `readDb` обобщён в `readKey(key)`; кэш поднят до `lunarreturns-v3`.
- Обработчик `push` читает `"db"` и `"days"`, объединяет `birthdayNames` + `dayNames` (совпадение `"MM-DD"` с сегодняшней московской датой); заголовок «День рождения» / «События» / «День рождения и события».

## Проверено

- `node --check` обоих скриптов; устаревших идентификаторов (`holStart`, `showHolidays`, `HOLIDAY_DEFS`, `dayKinds`, `jdnYmd` — удалён как неиспользуемый) не осталось.
- Ручная проверка в браузере: вход/выход 🥚, переключение ☦️→☪️, повторный клик, перезагрузка (дни скрыты, но пишутся в IndexedDB), QR базы без религиозных данных.

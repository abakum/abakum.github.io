# 🔼🔽: навигация по записям с MM-DD выбранной записи + религиозные дни

## Контекст

`LunarReturns/index.html`: 🔼🔽 в row результата (строки 568–569) листают записи с MM-DD выбранной записи: `sameDateMds()`/`sameDateIdxs()` (index.html:2608–2618), `stepSame()` (index.html:2679), `updateTodayNav()` (index.html:2691). Автотап `autoTapToday()` не менялся.

Новое требование пользователя: в список переходов добавить **религиозные дни** выбранного календаря (`dayKind`), чей MM-DD совпадает с MM-DD выбранной записи. Стрелки в форму религиозных дней НЕ добавляются. Когда стрелка приводит к религиозному дню — «тапнуть на 🥚» (открыть режим религии), прокрутить список дней к строке с этим MM-DD и подсветить её.

## Решённые решения (с пользователем)

- Религиозный день — терминальный шаг навигации: `toggleReligionBtns()` скрывает resultSec (index.html:1902 `hideResult()`), продолжить стрелками из дня нельзя; пользователь в режиме религии тапает строку сам.
- Подсветка строки дня — как выделение записи: добавить CSS `.days div.row.selected { background: var(--sel); }` рядом с index.html:352.
- Участие дней: только при заданном `dayKind`; MM-DD-пара 02-28↔02-29 уже учитывается `sameDateMds()`.
- Порядок списка навигации: сначала записи БД (порядок `db`), затем религиозные дни (первый совпавший день из `buildDays(dayKind)`).

## Изменения (только `LunarReturns/index.html`)

1. CSS (около index.html:352): `.days div.row.selected { background: var(--sel); }`.
2. Новая функция `sameDateDay()` рядом с `sameDateIdxs()`:
   - если `!dayKind` → `null`;
   - `items = buildDays(dayKind)` (внимание: мутирует dayStart/dayEnd — допустимо, тот же вызов использует renderDays);
   - найти первый item `[j, name]`, чей `jdnToGreg(j)` даёт MM-DD из `sameDateMds()`; вернуть `{ j, name, md }` или `null`.
3. `stepSame(dir)` (index.html:2679):
   - позиция `p = idxs.indexOf(selectedIdx)`; при `p < 0` — выход (как сейчас);
   - границы расширяются: `q === idxs.length` и есть `sameDateDay()` → вызвать `gotoSameDay()` и вернуться; иначе текущая логика.
4. Новая `gotoSameDay()`:
   - если `!religionMode` → `toggleReligionBtns()` (он сам отрендерит дни и вызовет `scrollToTodayDay`);
   - `day = sameDateDay()`; `items = buildDays(dayKind)`; найти индекс item с тем же `{j, name}`; снять `.selected` со строк дня, поставить его найденной строке `#<dayKind> .row`, `scrollIntoView({behavior:"smooth", block:"center"})`; `try/catch` по образцу `scrollToTodayDay`.
5. `updateTodayNav()` (index.html:2691): `hasDay = p >= 0 && !!sameDateDay()`; `nextBtn` виден при `p < last || (p === last && hasDay)`; `prevBtn` — как сейчас (`p > 0`).
6. Комментарии: блок перед `sameDateMds`, `stepSame`, `updateTodayNav` — упомянуть religious-день как терминальный шаг; комментарии к `toggleReligionBtns` не трогать.
7. README.md (раздел «Автотап…», строки ~173–178): дополнить, что 🔼🔽 после записей с тем же MM-DD ведут к религиозному дню выбранного календаря — тап по 🥚, прокрутка и подсветка строки; стрелки в список дней не добавляются.

## Не трогать

`todayMds`, `todayIdxs`, `autoTapToday`, `checkDayRollover`, `scrollToTodayDay`, HTML стрелок в resultSec (уже `stepSame`), форму дней (`renderDays`).

## Риски / нюансы

- `buildDays()` перезаписывает `dayStart/dayEnd` — вызовы внутри `sameDateDay`/`gotoSameDay` идемпотентны (всегда от «сегодня»), конфликтов с `scrollToTodayDay` нет.
- В религ. режиме resultSec скрыт — стрелки недоступны, навигация из дня невозможна by design.
- Если у дня совпадает пара 02-28/02-29, подсвечивается первый совпавший item.

## Валидация

- `npm run build` для LunarReturns не запускать (AGENTS.md).
- Синтаксис: извлечь `<script>` и `node --check`.
- Ручной сценарий: выбрать календарь (🥚 → ☦️), выйти из режима религии; выбрать запись, чей MM-DD совпадает с религ. днём → 🔽 видна после последней записи; тап → открывается режим религии, строка дня прокручена и подсвечена; запись без совпадающего дня → 🔽 скрыта на последней записи; пара 02-28/02-29.

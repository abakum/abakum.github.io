# Подвал под кнопкой 👁 (LunarReturns)

Замечание модератора: дизайн должен быть комфортным и визуально ненавязчивым.
Решение: подвал («Разрешения» и ниже) скрыт по умолчанию, показывается кнопкой 👁;
при ошибке в статусе подвал показывается принудительно.

## Контекст

Файл: `LunarReturns/index.html` (единственный, других правок нет).

Подвал — блоки внутри `#ptrWrap` после `#cols` (строки 572–596):
`#pdConsentLabel`, `#pdPushConsentLabel`, `#pdLocalNote`, `#status` (включая
большой теоретический текст «Годы, когда обычный солнечный день рождения…»),
`#pushlog`, `#swver`.

Все сообщения статуса идут через единственную воронку `status(msg, isError)`
(строка ~1159): `el.className = isError ? "error" : ""`. Ошибки = `isError === true`.

Существенная логика, которую нельзя сломать (работает по inline `style.display`
дочерних элементов — обёртка ей не мешает):
- `toggleReligionBtns()` (строка ~1853) сохраняет/восстанавливает display
  `#pdConsentLabel/#pdPushConsentLabel/#pdLocalNote`;
- `applyPdConsent()` (строка ~2392) прячет/показывает согласия и заметки;
- `renderPushLog()/clearPushLog()` (строки ~2011–2043) переключают `#pushlog`;
- `renderSwVersion()/renderOriginLinks()` пишут в `#swver`.

## Решения (согласованы с пользователем)

1. Скрывается ВЕСЬ подвал, включая теоретический текст в `#status`.
2. Состояние 👁 помнится локально: `localStorage["lunarreturns.footer"]`
   (`"1"`/`"0"`), устройство-локально, БЕЗ добавления в `LR_LS_KEYS` (не
   синхронизируется в облако ВК). По умолчанию (нет ключа) — скрыт.

## Изменения

### 1. HTML (строки 570–572)
Между закрывающим `</div>` (`#cols`) и `#pdConsentLabel` вставить кнопку-глаз:

```html
<button type="button" id="footerToggle" onclick="toggleFooter()"
        title="Показать детали" aria-expanded="false" aria-controls="footer">👁</button>
<div id="footer" hidden>
    <!-- существующие блоки: #pdConsentLabel, #pdPushConsentLabel,
         #pdLocalNote, #status, #pushlog, #swver (строки 572–596) -->
</div>
```

Кнопка видимая ВСЕГДА (это единственный вход в подвал). Иконка: 👁 когда скрыт
(«Показать детали»), ⓘ когда показан («Скрыть детали»); title/aria-expanded
меняются вместе с иконкой.

### 2. CSS (в конец существующего `<style>`, рядом с `#status`-правилами)
Ненавязчивая «призрачная» кнопка по центру:

```css
#footerToggle {
    display: block;
    margin: 2px auto 6px;
    background: transparent;
    border: none;
    color: var(--muted2);
    opacity: .75;
    padding: 2px 8px;
    font-size: 1em;
}
#footerToggle:hover { background: transparent; opacity: 1; }
```

Перекрывает базовые `button { background/border/font-size }` и
`button:hover { background: var(--btn-h) }` за счёт специфичности ID.

### 3. JS
Добавить (можно рядом с функцией `status`, строка ~1159):

```js
const FOOTER_KEY = "lunarreturns.footer";
function footerOpen() { return !document.getElementById("footer").hidden; }
function setFooter(open, persist) {
    document.getElementById("footer").hidden = !open;
    const b = document.getElementById("footerToggle");
    b.textContent = open ? "ⓘ" : "👁";
    b.title = open ? "Скрыть детали" : "Показать детали";
    b.setAttribute("aria-expanded", String(open));
    if (persist) { try { localStorage.setItem(FOOTER_KEY, open ? "1" : "0"); } catch (e) {} }
}
function toggleFooter() { setFooter(!footerOpen(), true); }
```

В `status()` (строка ~1159) добавить форс-показ при ошибке:

```js
function status(msg, isError) {
    const el = document.getElementById("status");
    el.textContent = msg;
    el.className = isError ? "error" : "";
    if (isError) setFooter(true, false); // ошибка видна всегда; БЕЗ записи в localStorage
}
```

В стартовой последовательности (строка ~3422) ПЕРЕД `loadDb()` применить
сохранённое состояние (чтобы форс-показ ошибок старта, напр. «Локальная база
повреждена», срабатывал поверх него):

```js
let savedFooter = null;
try { savedFooter = localStorage.getItem(FOOTER_KEY); } catch (e) {}
setFooter(savedFooter === "1", false);
```

## Поведение (сценарии)

- Первый визит / нет ключа → подвал скрыт, видна только 👁 по центру.
- Тап 👁 → подвал открыт, кнопка становится ⓘ; тап ⓘ → скрыт, снова 👁;
  выбор пишется в localStorage.
- Ошибка (`status(..., true)` — повреждённая база, «База слишком велика для QR»,
  сбои облака и т.п.) → подвал принудительно показан (даже если пользователь
  его скрыл), состояние в localStorage НЕ переписывается.
- Успешные статусы («Скопировано» и т.п.) подвал НЕ открывают — по требованию
  только про ошибки.
- Религиозный режим 🥚, `applyPdConsent()`, журнал пушей, версии — работают как
  раньше внутри обёртки (их inline display дочерних элементов не трогаем).

## Риски / на что смотреть

- Не добавлять CSS-правило `#footer { display: ... }` — атрибут `hidden` должен
  работать (иначе `[hidden]` перебивается).
- Не трогать `className` кнопки/подвала: `status()` перезаписывает className
  `#status`, поэтому видимость делается атрибутом `hidden` на обёртке, а не
  классом.
- `#pushlog`/`#swver` продолжают управлять своими display — без изменений.

## Валидация (вручную; `npm run build` НЕ запускать — сборка только в CI при деплое)

1. Открыть страницу (канонический адрес `abakum.github.io/LunarReturns` для
   видимости согласий): подвал скрыт, кнопка 👁 по центру между контентом и
   низом; тумблер открывает/закрывает, перезагрузка помнит выбор.
2. Сломать базу (испортить `lunarreturns.db` в localStorage) → при старте
   красная ошибка в `#status`, подвал раскрыт принудительно.
3. Светлая/тёмная темы: призрачная кнопка читаема в обеих (`--muted2`).
4. Режим 🥚: согласия по-прежнему скрываются, 👁 не мешает.
5. `?ptr=N` скриншот-режим: подвал скрыт (чистые скриншоты).

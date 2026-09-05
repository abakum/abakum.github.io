# План: ⎘ ⛶ для выбранных религиозных дней

**Дата:** 2026-09-05
**Файл:** `LunarReturns/index.html`

## Контекст

Религиозные дни рендерятся в отдельные `div.days` (`#orthodox`, `#islam`,
`#buddhist`, `#catholic`, `#jewish`) через [`renderDays()`](LunarReturns/index.html:1821).
Выбор календаря — кнопки в `#religionBtns` (панель, открываемая кнопкой 🥚),
активный календарь хранится в `dayKind`. Требуется дать пользователю
скопировать список дней или показать его как QR в виде текстовых строк.

Требования (уточнены итеративно):
- кнопки показываются **только** когда выбран конкретный календарь в режиме религии;
- кнопки идут одной строкой после всех остальных кнопок панели (перенос — как у остальных, flex-wrap `.btnrow`);
- порядок кнопок во всех местах приложения — сначала ⎘ (копирование), затем ⛶ (QR);
- текст строк: сначала дата, потом название;
- QR — после кнопок.

## Изменение

### HTML (`#toolbar`)

После кнопки «Скопировать базу» (`copyDb`) в конец панели добавлены две кнопки
(скрыты по умолчанию, показом управляет JS):

```html
<button type="button" id="daysCopyBtn" onclick="copyDays()" title="Скопировать дни" style="display:none;">⎘</button>
<button type="button" id="daysQrBtn" onclick="showDaysQr()" title="Показать дни как QR" style="display:none;">⛶</button>
```

После закрытия `#toolbar` добавлен контейнер QR:

```html
<div id="daysQr" class="qr"></div>
```

Во всех парах кнопок (база, дни, результат) установлен порядок ⎘ → ⛶.

### JS

Новые функции после [`religionDates()`](LunarReturns/index.html:1860):

```js
let daysQrShown = false;
function daysText() {
    if (!dayKind) return "";
    const lines = buildDays(dayKind).map(([j, name]) => {
        const [y, m, d] = jdnToGreg(j);
        const date = y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
        return date + " " + name;
    });
    return [DAYS_DEFS[dayKind][0], ...lines].join("\n");
}
function copyDays() {
    if (!dayKind) { status("Религия не выбрана", true); return; }
    copyText(daysText());
}
function showDaysQr() {
    daysQrShown = !daysQrShown;
    const el = document.getElementById("daysQr");
    if (!daysQrShown || !dayKind) { el.style.display = "none"; el.innerHTML = ""; return; }
    el.style.display = "block";
    showQr(el, daysText());
}
function updateReligionActions() {
    const show = !!(religionMode && dayKind);
    document.getElementById("daysQrBtn").style.display = show ? "" : "none";
    document.getElementById("daysCopyBtn").style.display = show ? "" : "none";
    if (!show) {
        daysQrShown = false;
        const q = document.getElementById("daysQr");
        q.style.display = "none";
        q.innerHTML = "";
    }
}
```

Вызовы `updateReligionActions()`:
- в [`toggleReligionBtns()`](LunarReturns/index.html:1695) — перед `renderTitle()` (покрывает вход/выход из режима религии);
- в [`toggleDays()`](LunarReturns/index.html:1852) — в обеих ветках (выбор и снятие календаря).

Фильтр скрываемых элементов панели в `toggleReligionBtns()` дополнен,
чтобы не затирать новые кнопки:

```js
// ... c.id !== "pushBtn" && c.id !== "daysQrBtn" && c.id !== "daysCopyBtn")
```

## Заметки

- Формат текста: первая строка — название календаря (`DAYS_DEFS[dayKind][0]`),
  далее по строке `YYYY-MM-DD Название`.
- Кнопки показываются только при `religionMode && dayKind`; снятие выбора или
  выход из режима религии скрывает их и сбрасывает QR.
- QR строится существующим [`showQr()`](LunarReturns/index.html:1868) (svg), ошибка переполнения обрабатывается там же.

## Валидация

1. Режим не выбран / нет `dayKind` — кнопок ⎘ ⛶ нет.
2. Выбран календарь в режиме религии — в конце панели видны ⎘ ⛶ одной строкой;
   при нехватке места переносятся вместе с остальными кнопками.
3. ⎘ — в буфер попадают строки `YYYY-MM-DD Название` с заголовком календаря.
4. ⛶ — под кнопками появляется QR этих строк; повторный клик скрывает.
5. Снятие календаря / закрытие режима религии — кнопки и QR исчезают.
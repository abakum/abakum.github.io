# План: двухколоночный режим по ширине окна относительно ширины колонки

**Дата:** 2026-09-04
**Файлы:** `LunarReturns/index.html`
**Статус:** Реализовано и проверено в браузере; коммит не создан.

## Задача

Двухколоночный режим раньше включался медиазапросом по **пропорции экрана**
(`@media (min-aspect-ratio: 1/1)` и `matchMedia("(min-aspect-ratio: 1/1)")`).
Нужно определять режим по **ширине колонки**, которую задаёт разделитель
справа от первой колонки (`--colW`):

- ширина обёртки `#ptrWrap` = ширине колонки (`--colW`) в одну колонку и
  `2 * --colW` в две;
- две колонки — когда ширина окна больше удвоенной ширины колонки плюс зазор
  и разделитель: `window.innerWidth > 2 * --colW + 24` (24 = flex-gap 12px +
  разделитель 12px), чтобы не было горизонтального скролла;
- на портретной ориентации (телефон в руках) — принудительно одна колонка.

Такой порог нельзя выразить чистым CSS-медиазапросом (зависит от перетаскиваемого
`--colW`), поэтому режим переключает JS через класс `.two-col` на `#ptrWrap`.

## Изменения

### 1. CSS — колонка управляет шириной обёртки

Базовый `#ptrWrap` вместо фиксированных `640px`:

```css
#ptrWrap { max-width: var(--colW, 400px); }
```

Медиазапрос `@media (min-aspect-ratio: 1/1)` удалён, вместо него правила по классу:

```css
#ptrWrap.two-col { max-width: calc(2 * var(--colW, 400px)); }
#ptrWrap.two-col #cols { display: flex; gap: 12px; align-items: flex-start; }
#ptrWrap.two-col #cols > section:first-of-type { flex: 0 0 var(--colW, 400px); min-width: 0; margin-bottom: 12px; }
#ptrWrap.two-col #resultSec { flex: 1 1 0; min-width: 0; margin-bottom: 12px; }
/* #colSplitter — вертикальный перетаскиваемый, ::after, hover/dragging */
```

Базовые `#cols { display: block }` и горизонтальный `#colSplitter` остаются для
одноколоночного режима.

### 2. JS — состояние по классу и recalcLayout

- `TWO_COL_MQL` (matchMedia по пропорции) заменён состоянием:
  `let twoColActive`, `isTwoCol()` возвращает флаг, `setTwoCol(on)` вешает
  класс `.two-col` на `#ptrWrap`.
- Добавлен `PORTRAIT_MQL = matchMedia("(orientation: portrait)")`.
- Новая `recalcLayout()`:

```js
function recalcLayout() {
    setTwoCol(!PORTRAIT_MQL.matches && window.innerWidth > 2 * currentColW() + SPLITTER_EXTRA);
}
```

- Вспомогательные функции `currentColW()`/`setColW()` и константы
  `COL_W_KEY`, `COL_MIN`, `SPLITTER_EXTRA` подняты на уровень модуля.
  Старый `clampW`/`COL_MAX_RATIO` (для контейнера 1200px) заменены на
  `colWMax() = max(COL_MIN, floor((innerWidth − 24)/2) − 1)` — максимум
  ширины колонки, при котором ещё помещаются две колонки без скролла и
  без схлопывания по условию выше.
- В `initColSplitter()` `recalcLayout()` вызывается: при загрузке (после
  применения сохранённой `--colW`), на `resize`, `orientationchange` и по
  завершении перетаскивания (`endDrag`). Во время драга — без пересчёта,
  чтобы не мигал макет. Позиция разделителя (слева от него первая колонка)
  задаёт `--colW`, поэтому порог адаптируется после драга.
- `selectRecord()` уже использовал `isTwoCol()` для `scrollIntoView` — работает
  по новому состоянию без изменений.

### 3. Небо — месяц снова над заголовочным 🌙

Горизонталь `#ptrMoon` была жёстко привязана к прежней колонке 640px
(`calc(50% - 320px + 12px)`) и после перевода на `--colW` перестала попадать
над заголовком. Заменена на привязку к `--colW`:

```css
#ptrMoon { left: max(12px, calc(50% - var(--colW, 400px) / 2 + 12px)); }
#ptrWrap.two-col #ptrMoon { left: max(12px, calc(50% - var(--colW, 400px) + 12px)); }
```

В двух колонках заголовок живёт в начале левой колонки ширины `--colW`, поэтому
смещение иное.

## Почему это работает

- В одну колонку обёртка ровно по `--colW` → заголовок по центру, месяц
  `calc(50% - --colW/2 + 12px)` совпадает с ним.
- В две колонки обёртка `2*--colW`, первая колонка слева → месяц
  `calc(50% - --colW + 12px)` совпадает с началом левой колонки.
- Порог `innerWidth > 2*--colW + 24` гарантирует, что внешняя ширина обёртки
  (`2*--colW` контент + padding 24) умещается во вьюпорт без горизонтального
  скролла; вторая колонка получает остаток.
- Портретный телефон вынужденно одноколоночный, даже если `innerWidth`
  превышает порог (узкий по факту).

## Валидация

1. Синтаксис инлайн-скрипта: `node --check` — OK.
2. Браузер, ландшафт 1200×900 (колонка 400): две колонки; ошибок в консоли нет.
3. Браузер, портрет 900×1200: одна колонка (несмотря на `innerWidth > 824`).
4. Браузер, узкое ландшафтное окно < 824px: одна колонка.
5. Месяц `#ptrMoon` выровнен над заголовочным 🌙 в обоих режимах (формула
   привязана к `--colW`); ссылок на старую ширину 640/320 в раскладке нет.

## Коммит

Сообщение коммита (готово, не создан):

```
fix(layout): toggle columns by window width relative to column width

The two-column layout is now driven by a .two-col class on #ptrWrap,
enabled when the window is wider than twice the column width plus gap
and splitter (window.innerWidth > 2*--colW + 24). The column width is
set by the splitter to the right of the first column (--colW).

- CSS: base #ptrWrap max-width = var(--colW, 400px); .two-col sets
  calc(2 * var(--colW)); removed @media (min-aspect-ratio: 1/1).
- JS: replaced matchMedia/aspect-ratio with twoColActive state and
  recalcLayout(); two columns forcibly disabled in portrait orientation;
  helper functions hoisted to module scope; recalcLayout runs on load,
  resize, orientationchange and after splitter drag.
- Sky: #ptrMoon anchored to --colW (single column) and to the start of
  the left column in two-column mode, keeping it above the header moon.
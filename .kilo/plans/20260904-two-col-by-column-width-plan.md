# План: двухколоночный режим — первая колонка задаёт ширину, остальное следует

**Дата:** 2026-09-04
**Файл:** `LunarReturns/index.html`
**Статус:** Реализовано; валидация пользователем в браузере пройдена; `TEMP-DEBUG` удалён; коммит не создан.

## Требования

Ширину первой колонки задаёт разделитель справа от неё (`--colW`). Она —
единственный источник ширины раскладки:

1. **Одна колонка:** `#ptrWrap` принудительно равен ширине первой колонки
   (`--colW`); остальные элементы следуют за обёрткой и не могут её расширять.
   Ширина первой колонки **не меняется** при изменении ширины окна.
2. **Две колонки:** `#ptrWrap` растягивается почти на всю ширину окна
   (по 12px поля с каждой стороны); вторая колонка flex-заполняет остаток и не
   зависит от значения `--colW`.
3. Ширина первой колонки меняется **только** перетаскиванием разделителя в
   двухколоночном режиме.

## Ключевая проблема (корневая причина)

`--colW` задавался инлайн-стилем на `#cols` (`document.getElementById("cols")`),
а `#ptrWrap` — родитель `#cols`. Кастомные свойства наследуются только от предков
к потомкам, поэтому `width: var(--colW, …)` на `#ptrWrap` (и формула `#ptrMoon`)
не видели установленное значение и откатывались к дефолту при смене режима.
Исправлено: `--colW` теперь задаётся на `document.documentElement` (`:root`), и
её видят `#ptrWrap`, `#cols` и `#ptrMoon`.

## Изменения

### CSS

- `#ptrWrap`: `width: var(--colW, 414px)` вместо `width: fit-content`; убран
  `max-width: 100%` — обёртка держит ширину первой колонки и не «усаживается»
  при сужении окна. `margin: 0 auto; padding: 12px`.
- `section`: добавлен `box-sizing: border-box` — `width: var(--colW)` = полная
  видимая ширина колонки, совпадающая с измерением разделителя при перетаскивании.
- `#cols > section:first-of-type` и `#resultSec`: `width: var(--colW, 414px)`;
  убран `max-width: 100%`. В одну колонку обе колонки равны `--colW`.
- `#ptrWrap.two-col { width: calc(100% - 48px); max-width: 100%; }` — обёртка
  почти во всю ширину окна (border-box = `100% − 24`, по 12px поля). Вторая
  колонка `.two-col #resultSec { flex: 1 1 0; min-width: 0 }` — заполняет остаток.

### JS (разделитель и режим)

- Константы: `SPLITTER_EXTRA = 24` (gap 12 + разделитель 12), `WRAP_MARGIN = 24`
  (поля обёртки), `WRAP_PAD = 24` (padding `#ptrWrap`), `COL_MAX_EXTRA = 72`.
  `COL_MIN = 280`.
- `currentColW()`/`setColW()` работают с `document.documentElement`.
- `colWMax() = max(COL_MIN, floor(innerWidth − COL_MAX_EXTRA − COL_MIN) − 1)` —
  максимум ширины колонки, при котором вторая колонка ещё `≥ COL_MIN`.
- `recalcLayout()`: две колонки, если не портрет И
  `innerWidth > currentColW() + COL_MAX_EXTRA + COL_MIN`.
- `initColSplitter()`: применяет сохранённую ширину как есть
  (`setColW(saved, false)`, без корректировки под окно — ширину меняет только
  драг); обработчики `resize`/`orientationchange`/`endDrag` вызывают
  `recalcLayout()`. Драг ограничивает `colWMax()`.
- Дефолтная ширина колонки — **414px** (CSS-фолбэки, `currentColW()`, стартовое
  `saved`).

### Диагностика

Во время валидации в `recalcLayout()` выводилась ширина колонки в `#status`
(`TEMP colW=…px | win=…px | two=yes/no`). После подтверждения удалена.

## Валидация

1. Одна колонка: `#ptrWrap` = первой колонке; сужение окна не меняет `colW`;
   вторая колонка (при показе) той же ширины.
2. Две колонки: `#ptrWrap` почти на всю ширину окна; вторая колонка
   flex-заполняет остаток, не зависит от `--colW`.
3. Переключение 2→1 колонка сохраняет `--colW` (нет отката к дефолту).
4. Порог: перетаскивание `--colW` вправо до упора не схлопывает вторую колонку;
   при превышении — честный переход в одну колонку.
5. Портретный телефон — принудительно одна колонка.

## Коммит

```
fix(layout): keep column width as single source of width

The splitter to the right of the first column sets --colW, which now
drives the layout width instead of content fitting.

- Root cause: --colW was set inline on #cols (a child), invisible to the
  parent #ptrWrap due to custom-property inheritance direction; it fell
  back to the default after switching modes. Now set on :root so #ptrWrap,
  #cols and #ptrMoon all see the real value.
- Single column: #ptrWrap width = var(--colW) (was width: fit-content);
  removed max-width:100% from wrapper and columns so the first column keeps
  its width regardless of window size. sections use box-sizing: border-box
  so --colW is the full visible column width, matching splitter dragging.
- Two columns: #ptrWrap spans nearly the whole window (width calc(100% - 48px)),
  the second column flex-fills the remainder independently of --colW.
- JS: hoisted constants (SPLITTER_EXTRA/WRAP_MARGIN/WRAP_PAD/COL_MAX_EXTRA);
  recalcLayout() enables two columns when innerWidth > colW + COL_MAX_EXTRA
  + COL_MIN; colWMax() keeps the second column above COL_MIN. Applied saved
  --colW as-is on load (only splitter dragging changes it). Default column
  width changed 400 -> 414px.
```
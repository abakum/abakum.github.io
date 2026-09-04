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
3. Ширина первой колонки меняется **только** перетаскиванием разделителя —
   в обоих режимах (обновление 2026-09-04: ранее только в двухколоночном).

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

## Дополнение: регулятор ширины в одноколоночном режиме (2026-09-04)

**Проблема.** Драг `#colSplitter` уже разрешён в обоих режимах (JS-правка
внесена), но в одну колонку разделитель — горизонтальная линия 6px между
секциями: аффорданса нет, пользователь не догадается тащить её вбок.

**Решение (выбрано пользователем).** В одноколоночном режиме `#colSplitter`
превращается в вертикальную полосу у правого края `#ptrWrap` — тот же вид и
поведение, что в двухколоночном режиме. Горизонтальная линия-разделитель
между секциями убирается.

**Статус:** Реализовано (CSS-правки + ранее внесённый JS); валидация
пользователем в браузере pending; коммит не создан.

**Дополнение 2 (2026-09-04): дефолт при отсутствии сохранённой ширины.**
Если в `localStorage` нет `lunarreturns.colw`, стартовая ширина вычисляется
как `clamp(innerWidth − WRAP_PAD, COL_MIN, 414)` — обёртка (`colW` + 24px
padding) умещается на экране с минимальными отступами на узких экранах, на
широких дефолт остаётся 414px. Сохранённое значение по-прежнему применяется
как есть, без подгонки под окно.

### Задачи

1. **CSS `#ptrWrap`**: добавить `position: relative` (якорь для полосы).
2. **CSS `#colSplitter` (базовые правила = одноколоночный режим)** — заменить
   горизонтальные стили (`height: 6px; margin: 0 0 12px; background:
   var(--border2)`) на вертикальную полосу у правого края:
   - `position: absolute; top: 0; bottom: 0; right: 0; width: 12px;`
   - `cursor: col-resize; background: transparent; touch-action: none;`
   - `display: flex; align-items: center; justify-content: center;`
   - `::after`: `width: 4px; height: 100%; background: var(--border2);
     border-radius: 2px; transition: background .15s;` (те же декларации, что у
     `.two-col #colSplitter::after` — можно объединить селекторы).
   - Подсветка `:hover/.dragging` — объединить с существующими
     `.two-col`-правилами.
3. **CSS `.two-col #colSplitter`**: добавить `position: static` (отменяет
   абсолютное позиционирование; остальные правила — flex-item и ::after — уже
   есть и совпадают с базовыми).
4. **CSS отступ**: старая полоса давала 18px между `#cols` и `#resultSec` —
   добавить `#resultSec { margin-top: 12px }` (в две колонки перекрывается
   существующими `.two-col`-правилами).
5. **JS**: без изменений — уже реализовано: в одну колонку
   `w = 2·(clientX − innerWidth/2)` (обёртка центрирована, правый край
   отслеживает курсор 1:1), потолок `innerWidth − WRAP_PAD`, пол `COL_MIN`;
   в две колонки — `w = clientX − left` с потолком `colWMax()`;
   `endDrag → recalcLayout()` может поднять режим до двух колонок.

### Валидация

1. Одна колонка: у правого края обёртки видна вертикальная полоса; драг
   вправо/влево меняет ширину обеих секций; курсор `col-resize`; hover/драг
   подсвечивают полосу.
2. Полоса не перекрывает кликабельные элементы заметно (лежит в зоне 12px
   padding обёртки); при `colW = COL_MIN` полоса доступна для захвата.
3. Переход 1→2 колонки при расширении (драгом до порога или resize окна):
   полоса становится flex-разделителем между колонками, вид не меняется.
4. Обратный переход 2→1: полоса возвращается к правому краю, ширина `--colW`
   сохраняется.
5. Портретный телефон: полоса у края работает, ширина ограничена окном.

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
- TEMP-DEBUG prints colW/window/mode into #status for validation (remove before
  committing).
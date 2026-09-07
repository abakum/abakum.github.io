# План: ptr=N для скриншотов PTR-состояния (LunarReturns)

## Цель

Добавить в `LunarReturns/vk/screenshots.bat` две новые строки с
`--window-size=1920,1080` и URL-параметром `ptr=100`, а в
`LunarReturns/index.html` — поддержку параметра `ptr=N`: сдвиг `#ptrWrap`
на N пикселей вниз (имитация тяги Pull-To-Refresh) с гашением луны в
заголовке.

## Принятые решения (согласованы с пользователем)

1. Старые 4 строки bat (600,1200) **не трогать** — дописать 2 новые строки.
2. Новые строки: светлая база и тёмная база, обе `ptr=100`.
3. `ptr=N` включает и сдвиг, и класс `ptr-moon` на `<html>` (луна в
   заголовке гаснет, как при реальной тяге).

## Изменения

### 1. `LunarReturns/vk/screenshots.bat`

Дописать в конец файла две строки (нумерация скриншотов продолжается):

```bat
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --window-size=1920,1080 --screenshot="c:\tmp\screenshot5.png" "https://abakum.github.io/LunarReturns/?vk_app_id=1&ptr=100"
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --window-size=1920,1080 --screenshot="c:\tmp\screenshot6.png" "https://abakum.github.io/LunarReturns/?vk_app_id=1&appearance=dark&ptr=100"
```

### 2. `LunarReturns/index.html`

**2a. Ранний скрипт до первого кадра** (после существующего блока ранней
установки `--colW`, который заканчивается на строке 90, до `<style>`):
новый небольшой IIFE в том же стиле:

```js
(function () {
    var ptr = parseInt(new URLSearchParams(location.search).get("ptr"), 10);
    if (!(ptr > 0)) return;
    document.documentElement.style.setProperty("--ptrShift", ptr + "px");
    document.documentElement.classList.add("ptr-moon");
})();
```

Раннее размещение (в `<head>`, до `<style>`/контента) нужно, чтобы сдвиг и
погасшая луна были уже в первом кадре — по образцу существующего раннего
скрипта `--colW` (index.html:58-90, комментарий «до первого кадра»).
Класс `ptr-moon` на `<html>` работает и до отрисовки: CSS-селектор
`html.ptr-moon #titleH1 img { visibility: hidden; }` (index.html:281).

**2b. CSS `#ptrWrap`** (правило на index.html:164-178) — добавить строку:

```css
transform: translateY(var(--ptrShift, 0px));
```

## Почему так (контекст для исполнителя)

- Кастомный PTR на index.html:793 сдвигает `#ptrWrap` инлайновым
  `style.transform = "translateY(...)"` и при тяге ставит `ptr-moon`
  (index.html:788). Инлайновый transform во время реальной тяги
  перекрывает CSS-правило с `var(--ptrShift)` — конфликтов нет; после
  `ptrReset()` (`style.transform = ""`) правило с переменной снова
  вступает в силу — поведение консистентно.
- Блок PTR отключён на десктопе (`if (!isTouch) return;`, index.html:729),
  а headless Chrome без тача — поэтому `ptr=N` реализуется отдельной
  веткой вне isTouch-гварда (ранний скрипт в `<head>`).
- `#ptrMoon`/`#ptrStars` — fixed-дети `#ptrWrap`; при трансформации
  обёртки они «прилипают» к ней (index.html:161-163, 731-733) — небо
  уедет вместе с обёрткой, ровно как при реальной тяге. Доп. правок не нужно.
- Без параметра или с `ptr=0`/мусором (`parseInt` → NaN/0) ничего не
  меняется: гвард `!(ptr > 0)`.
- При 1920×1080 автоматически включится двухколоночный режим
  (`recalcLayout`, index.html:2826-2828) — это ожидаемый десктопный вид
  скриншота, `translateY` на него не влияет.

## Проверка

1. Открыть в браузере
   `https://abakum.github.io/LunarReturns/?vk_app_id=1&ptr=100`
   (или локально `index.html?ptr=100`): `#ptrWrap` сдвинут на 100px вниз,
   луна в заголовке скрыта, нет анимации/рывка при загрузке.
2. Та же страница без `ptr` — визуально без изменений, в DevTools у
   `--ptrShift` нет значения.
3. `?ptr=abc`, `?ptr=0`, `?ptr=-5` — игнорируются.
4. На тач-устройстве реальная тяга PTR работает как раньше (инлайн
   transform перекрывает правило; после сброса сдвиг по `ptr` возвращается).
5. На Windows запустить две новые строки bat (файл под Windows, локально
   на Linux не исполняется; `npm run build` для LunarReturns не запускать —
   запрещено AGENTS.md, сборка делает workflow деплоя).

## Затрагиваемые файлы

- `LunarReturns/vk/screenshots.bat` — +2 строки в конец.
- `LunarReturns/index.html` — ранний скрипт в `<head>` (~6 строк) + 1
  строка в правиле `#ptrWrap`.

# План: требования ВК к UX мини-аппа (VK-режим)

**Дата:** 2026-09-04
**Файл:** `LunarReturns/index.html`
**Контекст:** чек-лист ВК: картинки/иконки некликабельны; тексты не выделяются; при наведении на кнопки текст без подчёркивания; корректный Swipe Back на iOS. Всё гейтится классом `vk` на `<html>` (ставит JS при `vkminiapp`), вне ВК поведение не меняется. 
## Изменения

1. **JS, сразу после `const vkminiapp = ...` (index.html:446):**

```js
if (vkminiapp) document.documentElement.classList.add("vk");
```

2. **CSS (в блок стилей, рядом с ptr-правилами):**

```css
/* Требования ВК к мини-аппам (класс .vk ставит JS в VK-режиме):
   картинки/иконки некликабельны, тексты не выделяются, кнопки/ссылки
   без подчёркивания и без тап-подсветки. */
.vk img, .vk canvas { pointer-events: none; -webkit-touch-callout: none; }
.vk * { -webkit-user-select: none; user-select: none; }
.vk input, .vk textarea { -webkit-user-select: text; user-select: text; }
.vk button, .vk a { -webkit-tap-highlight-color: transparent; text-decoration: none; }
.vk button:hover, .vk a:hover { text-decoration: none; }
```

Обоснования:
- Исключение `input` обязательно: поля ввода должны выделяться — фолбэк копирования `copyText()` использует `ta.select()` + `execCommand("copy")` (index.html:1759), при `user-select: none` он бы сломался.
- `-webkit-touch-callout: none` гасит long-press меню (Сохранить картинку) на 🌙 и QR-коде; QR сканируется с экрана, кликабельность ему не нужна.
- Ссылки («Сообщить об ошибке», ссылки прежних версий в миграционном фолбэке) остаются кликабельными — `pointer-events: none` на них не распространяется (только img/canvas).

3. **JS, PTR-IIFE — направленный guard для iOS Swipe Back (index.html:597–613):**

`touchstart`: дополнительно запомнить `startX = e.touches[0].clientX;`.

`touchmove` перестроить:

```js
const dy = e.touches[0].clientY - startY;
const dx = e.touches[0].clientX - startX;
if (scrollY > 0) { if (pulling) ptrReset(); armed = false; return; }
if (!pulling) {
    // ждём явного вертикального намерения: горизонтальный свайп с края
    // (iOS Swipe Back) не должен съедаться preventDefault
    if (dy < 8 || dy <= Math.abs(dx)) return;
    if (e.cancelable) e.preventDefault();
    pulling = true;
    document.documentElement.classList.add("ptr-moon");
}
if (dy <= 0) { ptrReset(); armed = false; return; }
dist = dy * 0.5;
ptrSky(Math.min(dist / THRESHOLD, 1));
if (dist >= THRESHOLD && !hapticDone) { hapticDone = true; ptrHaptic(); }
ptrBody.style.transition = "none";
ptrBody.style.transform = "translateY(" + Math.round(dist) + "px)";
```

Смысл: `preventDefault` вызывается только после подтверждённого вертикального жеста (dy ≥ 8px и dy > |dx|). Горизонтальный edge-свайп на iOS оставляется нативному жесту ВК-клиента (назад/закрытие мини-аппа). Реакция PTR не меняется: сопротивление и порог прежние, лишь первый кадр тяги отложен на 8px.


## Валидация

2. VK-режим: long-press на 🌙 в заголовке и на QR — без системного меню «Сохранить/Открыть картинку»; тексты разделов не выделяются длительным тапом.
3. Поля fName/fHour/fMin — ввод и выделение работают; ⎘ (копирование) работает в обоих ветках (clipboard API и execCommand-фолбэк).
4. Кнопки при наведении (desktop web-версия ВК) — без подчёркивания и обводки-подсветки тапа; ссылки без подчёркивания.
5. iOS-клиент ВК: свайп вправо от левого края при прокрутке вверху — нативный назад/закрытие, PTR не срабатывает; вертикальная тяга — PTR работает как раньше (толчок на пороге, месяц/звёзды).
6. Вне ВК (прямой веб-хостинг): класс `vk` не ставится — выделение текстов, long-press меню картинок и ссылки как раньше.

# План: блокировка облачных кнопок на время обмена (VK + Яндекс)

**Дата:** 2026-09-03
**Файл:** `LunarReturns/index.html`

## Контекст

Облачный обмен асинхронен и долог: `vkDbPut` пишет записи в `VKWebAppStorageSet` последовательными await (index.html:2027–2028), `vkDbGet` читает 990 ключей; в Яндекс-режиме те же кнопки 📤/📥 идут через presign + fetch (index.html:2103–2119). Тапы по 📤/📥 во время незавершённой операции интерливят запросы (чтение полузаписанной базы, двойной PUT). Отзыв согласия (`vkDbClear` index.html:1799, `cloudDelete` index.html:1809) тоже пишет в облако и участвует в той же гонке.

## Изменение

1. Добавить общий сторож (рядом с `cloudPut`/`cloudGet`, ~строка 2103):

```js
// ---- Блокировка облачных операций (гонка 📤/📥/отзыв согласия) ----
let cloudBusy = false;
function cloudLock(on, spinBtn) {
    cloudBusy = on;
    for (const id of ["cloudPutBtn", "cloudGetBtn", "pdConsent"]) {
        const b = document.getElementById(id);
        if (!b) continue;
        b.disabled = on;
        if (b === spinBtn) {
            if (on) { b.dataset.label = b.textContent; b.textContent = "⟳"; b.classList.add("busy-spin"); }
        } else if (!on && b.dataset.label !== undefined) {
            b.textContent = b.dataset.label; delete b.dataset.label; b.classList.remove("busy-spin");
        }
    }
}
function cloudRun(op, spinBtn) {
    if (cloudBusy) { status("Дождитесь завершения обмена с облаком", true); return; }
    cloudLock(true, spinBtn);
    return Promise.resolve(op()).finally(() => cloudLock(false));
}
```

CSS (в блок стилей кнопок, после `button:hover`):

```css
@keyframes lrSpin { to { transform: rotate(360deg); } }
.busy-spin { display: inline-block; animation: lrSpin 1s linear infinite; }
```

2. Разметка: `onclick="cloudPut()"` → `onclick="cloudPut(this)"` и `onclick="cloudGet()"` → `onclick="cloudGet(this)"` (index.html:243–244); сигнатуры функций получают параметр `btn` и передают его в `cloudRun(op, btn)`.

3. `cloudPut()` (index.html:2103): тело обернуть в `cloudRun(async () => { ... }, btn)` — VK-ветка `vkDbPut()` получает `await`, промис-цепочка Яндекс-ветки возвращается как есть.

4. `cloudGet()` (index.html:2119): аналогично.

5. `initPdConsent` (index.html:1789–1816), ветки отзыва: `vkDbClear()` / `cloudDelete(token)` обернуть в `cloudRun(...)` (без `spinBtn` — триггер чекбокс, не кнопка; кнопки просто сереют). Дополнительный busy-контроль в обработчике не нужен: чекбокс `pdConsent` дизаблится вместе с кнопками (шаг 1), снять галочку во время обмена физически нельзя.

## Заметки

- Спиннер — инлайновый вращающийся ⟳ в нажатой кнопке (средствами страницы; у бриджа ВК нет публичного ивента глобального лоадера). Исходная иконка сохраняется в `dataset.label` и восстанавливается в `finally` — на любом исходе, включая ошибки сети.
- Кнопки и чекбокс `disabled` сереют UA-стилем — отдельный CSS не нужен; до логина/согласия кнопки и так скрыты (`display:none`).
- `confirmAuto` внутри `vkDbGet` (замена/объединение) удерживает блокировку до выбора пользователя — осознанно: слияние с приходящим PUT опаснее лишних секунд ожидания.
- Миграция/указатели версий (`vkPointerPut`, `maybeMigrateDb`) идут до UI и на старте — вне охвата.

## Валидация

1. VK: тап 📤 — в кнопке крутится ⟳, 📥 и чекбокс серые; по завершении иконка 📤 восстановлена, кнопки активны. Тап 📤 и тут же 📥 — второй тап игнорируется.
2. VK: двойной быстрый тап 📤 — второй игнорируется, записи не задваиваются.
3. Яндекс-режим: то же для presign/fetch-пути.
4. Попытка снять галочку согласия во время обмена — чекбокс серый и не реагирует; после завершения отзыв проходит штатно.
5. Ошибки сети (авиарежим): finally снимает блокировку, исходные иконки 📤/📥 восстановлены, кнопки снова активны.

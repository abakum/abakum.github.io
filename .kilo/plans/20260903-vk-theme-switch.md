# План-отчёт: переключение темы в нативном клиенте ВК (VKWebAppUpdateConfig)

**Дата:** 2026-09-03
**Проект:** LunarReturns (мини-апп ВКонтакте)
**Задача:** Не работает `VKWebAppUpdateConfig` при переключении темы в нативном клиенте VK; в браузере (vk.com) работает.

---

## 1. Итог

Причина найдена, исправление внесено в `LunarReturns/index.html` (блок темы ~303–363). Корень проблемы — **мини-апп полагался только на событие `VKWebAppUpdateConfig`**, которое в браузере VK пересылает при смене темы, а в нативных клиентах — нет. Плюс тема жёстко фиксировалась из launch-параметра, что блокировало живое обновление по `prefers-color-scheme`.

---

## 2. Диагностика (что было не так)

| # | Причина | Детали |
|---|---------|--------|
| 1 | **Нативный клиент не пересылает `VKWebAppUpdateConfig` при смене темы** | Известное поведение VK: событие шлётся при старте, но не при смене темы в уже открытом мини-аппе. Отсюда «в браузере работает, в клиенте нет». Мост (vk-bridge) при этом доступен и в вебе, и в нативном клиенте (инжектится платформой), так что дело не в нём. |
| 2 | **Жёсткий лок из launch-параметра** | `themeForced = vkAppearance` блокировал тему, а гейт `if (themeForced === null)` перед обработчиком `prefers-color-scheme` отключал живое обновление по системе. |
| 3 | **Не обрабатывалось `appearance: "system"`** | Код понимал только `"light"`/`"dark"`, игнорируя `"system"` (следовать системе). |

---

## 3. Исследование исходников VK

Проверено по официальному репозиторию [`VKCOM/vkui`](https://github.com/VKCOM/vkui) (библиотека, на которой сделаны сами мини-аппы ВКонтакте):

- **Официальное автоопределение темы — только через `prefers-color-scheme`.** Хук `useAutoDetectColorScheme.ts`:
  ```ts
  const isDark = useMediaQueryMatches('(prefers-color-scheme: dark)', {...});
  if (colorSchemeProp) return colorSchemeProp;
  return isDark ? ColorScheme.DARK : ColorScheme.LIGHT;
  ```
  Он **не использует `VKWebAppUpdateConfig`** для автоопределения темы.
- **Живое обновление — событие `change` у медиазапроса.** `useMediaQueryMatch.ts` подписывается на `matchMedia(...).addEventListener('change', ...)` → ре-рендер при смене темы. Работает и в вебе, и в нативных клиентах.
- **Официальный пример мини-аппа** `examples/vkui-vite-ts/src/useColorSchemeSwitcher.tsx` берёт базовую тему из `useColorScheme()` (слушает медиазапрос) и позволяет пользователю лишь переопределить её кнопкой.

**Вывод:** рекомендуемый и используемый самим VK механизм живого переключения темы — `prefers-color-scheme`, а не `VKWebAppUpdateConfig`. Внесённое исправление повторяет официальную схему.

---

## 4. Что изменено

Файл: `LunarReturns/index.html` (блок темы, ~303–363)

| Пункт | До | После |
|-------|----|----|
| Источник темы | Только `VKWebAppUpdateConfig` | `prefers-color-scheme` — основной живой источник |
| Разрешение темы | `themeForced ? ... : themeMql.matches` | Новый хелпер `resolveDark()`: явная `light`/`dark` от VK выигрывает, иначе — системная тема |
| Обработчик медиазапроса | Гейт `if (themeForced === null)` | Без гейта, всегда сбрасывает лок и применяет тему |
| `appearance: "system"` | Не обрабатывалось | → `null` = «следовать системе» |
| Launch-параметр | Жёсткий лок | Стартовая подсказка до первого события конфига, не блокирует live-обновление |

> Примечание: мост (vk-bridge) менять не потребовалось — он инжектится платформой VK в WebView и доступен и в вебе, и в нативном клиенте.

---

## 4а. Android-подстраховка (2026-09-03, дополнение)

Изначальный фикс (п.4) полагался на `prefers-color-scheme` как живой источник. На Android System WebView этот media query **не пересчитывается сам** при смене темы ВК — до фокуса инпута или поворота экрана. Поэтому поверх добавлены три страховки (все — в `LunarReturns/index.html`):

| Механизм | Где | Зачем |
|---|---|---|
| `VKWebAppGetConfig` после `VKWebAppInit` | вызов init (~2252) → `refreshThemeFromBridge()` | Страховка от потерянного стартового `VKWebAppUpdateConfig` (дешёвый дубль launch-подсказки + события) |
| `visibilitychange → visible` | `document.addEventListener` (~371) | При возврате в мини-апп принудительно перечитать тему |
| `VKWebAppViewRestore` | в `vkBridge.subscribe` (~383) | То же, но через мост; избыточно с visibilitychange, но безвредно |

Ключевое решение: в `refreshThemeOnReturn()` **не сбрасываем `themeForced` вслепую** — это стёрло бы явную «ручную» тему ВК при системной теме другого цвета. Вместо этого перечитываем авторитетный конфиг (`refreshThemeFromBridge()`), который сам выставит правильное значение, а `applyTheme()` уже резолвит через `resolveDark()`.

Порядок «подписка до init» уже корректен в этом файле: `vkBridge.subscribe` (строка ~344) гарантированно выполняется раньше `VKWebAppInit` (строка ~2255, тот же скрипт в конце `body`) — стартовое событие не теряется, GetConfig здесь лишь дополнительный дубль.

> eruda / dev-логирование: **намеренно не добавлено в прод**. Для диагностики на реальном устройстве достаточно временного `console.log` событий моста и `media change`, затем убрать.

### 4б. Цвет input[type=date] на Android

Отдельная Android-особенность: `input[type=date]` рисуется нативно и **игнорирует CSS `color`**, поэтому в тёмной теме текст был чёрным на тёмном фоне (`#fDate`). Исправлено тем же приёмом, что и для селектора «Место события» [`updateCitySelectColor()`](index.html) — явный inline `color` в `applyTheme()`:

```js
const fDateEl = document.getElementById("fDate");
if (fDateEl) fDateEl.style.color = dark ? "#a0a0a8" : "#555"; // = var(--muted)
```

(Светлая/тёмная тема читаются и в браузере, и в нативном клиенте.)

Итоговый код блока темы:

```js
const vkQuery = new URLSearchParams(location.search);
const vkAppearance = (vkQuery.get("appearance") || vkQuery.get("vk_theme") || "").toLowerCase();
let themeForced = (vkAppearance === "dark" || vkAppearance === "light") ? vkAppearance : null;
const themeMql = matchMedia("(prefers-color-scheme: dark)");

function resolveDark() {
    if (themeForced === "dark") return true;
    if (themeForced === "light") return false;
    return themeMql.matches; // "system"/пусто/нет данных → живая системная тема
}

function applyTheme() {
    const dark = resolveDark();
    document.documentElement.classList.toggle("theme-dark", dark);
    document.documentElement.classList.toggle("theme-light", !dark);
    // ... theme-color, VKWebAppSetViewSettings ...
}

if (typeof themeMql.addEventListener === "function") {
    themeMql.addEventListener("change", () => {
        themeForced = null; // допускаем живое обновление по системной/приложенческой теме
        applyTheme();
    });
}
if (vkminiapp && window.vkBridge && typeof vkBridge.subscribe === "function") {
    vkBridge.subscribe(ev => {
        if (ev && ev.type === "VKWebAppUpdateConfig" && ev.detail) {
            const a = String(ev.detail.appearance || "").toLowerCase();
            themeForced = (a === "dark" || a === "light") ? a : null;
            applyTheme();
        }
    });
}
applyTheme();
```

---

## 5. Ожидаемое поведение

- **Веб (vk.com):** тема обновляется и по `prefers-color-scheme`, и по событию `VKWebAppUpdateConfig` (VK его пересылает) — как раньше.
- **Нативный клиент:** тема обновляется в реальном времени через `prefers-color-scheme` (механизм, используемый самим VK).
- **`appearance: "system"` / пустое значение:** приложение следует системной/приложенческой теме.
- **Ручная тема VK** (явная `light`/`dark`): приоритетна, пока клиент её сообщает.

---

## 6. Что осталось проверить

> Невозможно воспроизвести в этой среде (нужен реальный нативный клиент VK).

- [ ] Переключение темы в нативном клиенте VK (светлая ↔ тёмная) — обновление без перезапуска мини-аппа.
- [ ] Поведение на vk.com (веб) после изменений.
- [ ] Сценарий «системная тема» (`appearance: system`).
- [ ] Сценарий «ручная тема VK» при другой системной теме.
- [ ] Побочно: пуши/хранилище в нативном клиенте.
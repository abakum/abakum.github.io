# Plan: Редирект посторонних адресов дев-версии на vk.ru/app54746591 (LunarReturns)

## Цель
Прямые заходы на stage-URL дев-версий (`stage-app54746591-*.pages.vk-apps.ru`)
из обычного браузера (в т.ч. инкогнито, по ссылке из публичных CI-логов)
перенаправлять на официальную страницу мини-аппа `https://vk.ru/app54746591`.
Приложение не опубликовано, поэтому там его видят только админы/тестировщики —
«dev версия доступна только админу» решается без гейтов и уведомлений.

## Ключевое ограничение (проверено по устройству VK)
Внутри VK страница мини-аппа грузится как раз со stage-хоста: location.hostname
в вебвью/iframe — `stage-app…`. Поэтому редирект по одному хосту создавать
нельзя (петля). Условие — по контексту запуска:

1. Есть VK launch-параметры (`vkminiapp`, т.е. `vk_app_id` в URL) → без
   редиректа, работаем на любом хосте (dev и production внутри VK).
2. Нет VK-контекста:
   - `https://abakum.github.io/LunarReturns…` → работаем (публичное PWA);
   - `localhost` / `127.0.0.1` / `file:` → работаем (локальная разработка);
   - всё остальное (любой vk-apps stage-хост в браузере, чужие зеркала) →
     `location.replace("https://vk.ru/app54746591")`.

## Изменения

### 1. `LunarReturns/index.html`
Сразу после вычисления `const vkminiapp = …` (сейчас index.html:226) добавить:

```js
const VK_APP_URL = "https://vk.ru/app54746591";
const PWA_PREFIX = "https://abakum.github.io/LunarReturns";
function isAllowedUrl() {
    if (vkminiapp) return true;                       // запуск внутри VK
    if (location.protocol === "file:") return true;   // локальная разработка
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return true;
    return location.href === PWA_PREFIX || location.href.startsWith(PWA_PREFIX + "/");
}
if (!isAllowedUrl()) location.replace(VK_APP_URL);
```

- `location.replace` — без записи в историю (кнопка «назад» не возвращает на stage).
- Граница префикса PWA: `=== PWA_PREFIX || startsWith(PWA_PREFIX + "/")`,
  чтобы не пропускать `/LunarReturnsSomething`.
- Скрипт стоит в конце body — короткая отрисовка до редиректа допустима.

### 2. `LunarReturns/README.md`
Дополнить раздел про dev/URL:
- тестирование дев-версии — только внутри VK (vk.ru/app54746591, для админов);
- прямой заход по stage-URL из браузера уводит на vk.ru/app54746591;
- поэтому публикация stage-URL в CI-логах/сводке больше не чувствительна
  (шаг «URLs in summary» в воркфлоу остаётся как есть).

### Вне скоупа (отклонено пользователем)
- Email/VK-сообщение с URL из CI.
- Клиентский гейт по списку админов (`VKWebAppGetUserInfo`).

## Порядок работ
1. index.html — блок `isAllowedUrl` + редирект.
2. README — правка раздела dev.

## Валидация
- Синтаксис инлайн-скрипта (`new Function`) — OK.
- Логика `isAllowedUrl` в vm-песочнице (как в тестах VK-хранилища): кейсы —
  `https://stage-app54746591-x.pages.vk-apps.ru/index.html` без `vk_app_id` →
  редирект; тот же URL с `?vk_app_id=…` → без; `https://abakum.github.io/LunarReturns/`
  → без; `https://abakum.github.io/LunarReturnsX` → редирект; `http://localhost:8080/`
  → без; `file:///…/index.html` → без.
- `node scripts/copy-build.js` — сборка собирается.

## Риски / допущения
- Редирект клиентский: содержимое страницы формально доступно (view-source),
  но без VK-контекста VK-хранилище всё равно не работает — приемлемо.
- Если приложение когда-нибудь опубликуют, а VK начнёт отдывать апп с
  `prod-app…` хоста вне вебвая (web-iframe на vk.ru) — там будет `vk_app_id`,
  правило №1 покрывает этот случай.
- `http://abakum.github.io/...` (не https) на GitHub Pages и так редиректит
  сервером на https — отдельно не обрабатываем.

## Результат

**Статус:** ✅ Выполнено (2026-09-01)

- `LunarReturns/index.html` — после вычисления `vkminiapp` (index.html:230)
  добавлены `VK_APP_URL`, `PWA_PREFIX`, `isAllowedUrl()` и
  `location.replace(VK_APP_URL)` для посторонних адресов (index.html:231).
- `LunarReturns/README.md` — в раздел dev добавлено: тестирование только
  внутри VK, редирект stage-URL в браузере, нечувствительность публикации
  URL в CI.
- Валидация: vm-тест логики `isAllowedUrl` — **12/12 PASS** (stage без
  `vk_app_id` → редирект; с `vk_app_id` → остаётся; `abakum.github.io/LunarReturns*`
  с проверкой границы префикса → остаётся; `/LunarReturnsX`, `/croc`, чужие
  домены → редирект; localhost/127.0.0.1/file: → остаётся) + синтаксис
  инлайн-скрипта OK; `copy-build.js` собирается.

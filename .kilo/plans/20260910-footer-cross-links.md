# План: перекрёстные ссылки версий в подвале LunarReturns

## Задача
Внизу страницы (`LunarReturns/index.html`) добавлять ссылки на другие версии приложения, создавая их из JS (в статичном HTML ссылок нет — требование модерации ВК: DOM мини-аппа не должен содержать `<a href>`).

Логика по орижину:
- **GitHub-версия** (origin `*.github.io`, фактически `abakum.github.io`): одна ссылка — текст `VK mini app` → `https://vk.ru/app54746591`.
- **VK** (мини-апп `vkminiapp === true` или хостинг `VK_WEB_HOST_RE`): ссылок не выводить.
- **Любой другой орижин** (например, Yandex Cloud): две ссылки — `VK mini app` → `https://vk.ru/app54746591` и `Yandex Cloud` → `https://abakum.github.io/LunarReturns`.
- Контекст (подтверждено пользователем): бэкенд Яндекса (Cloud Functions, `FUNCTION_URL`/`PUSH_URL`) работает через фронтенд GitHub Pages, поэтому метка «Yandex Cloud» указывает на `abakum.github.io/LunarReturns`. Логика показа ссылок этим не меняется (подтверждено).

## Изменения

В `LunarReturns/index.html`:

1. Добавить константы рядом с `VK_WEB_HOST_RE` (строка ~1945):
   ```js
   const GITHUB_HOST_RE = /(^|\.)github\.io$/;
   const VK_APP_URL = "https://vk.ru/app54746591";
   const GITHUB_APP_URL = "https://abakum.github.io/LunarReturns";
   ```
2. Добавить функцию `renderOriginLinks()`:
   - Ничего не делает, если `vkminiapp || VK_WEB_HOST_RE.test(location.hostname)` (VK-режим — модерация запрещает `<a href>`).
   - Целевой контейнер — `#swver` (подвал, где `#swverText` и `#bugLink`).
   - Собрать список ссылок:
     - не GitHub и не VK → `[["VK mini app", VK_APP_URL], ["Yandex Cloud", GITHUB_APP_URL]]`;
     - GitHub → `[["VK mini app", VK_APP_URL]]`.
   - Для каждой создать `document.createElement("a")` через JS (не innerHTML со строковыми href в разметке): `href`, `target="_blank"`, `rel="noopener"`, `style.color = "var(--muted)"`, `textContent = <текст>`; разделитель-пробел между ссылками; добавить в конец `#swver`.
   - Идемпотентность: помечать контейнер (например, `id="originLinks"` на обёртке `<span>` или проверка существующих элементов), т.к. `renderSwVersion()` вызывается несколько раз (строки 3345, 3368–3369).
3. Вызвать `renderOriginLinks()` рядом с вызовом `renderSwVersion()` (строка ~3345). Достаточно одного вызова — орижин за сессию не меняется; повторные вызовы защищены идемпотентностью.

## Ограничения / заметки
- Не добавлять ссылки в HTML-разметку страницы и не показывать их в VK (требование модерации ВК, см. комментарий к `#swver`, строки 593–594).
- Стиль ссылок — как у `#bugLink` (`color: var(--muted)`); правило `.vk a` CSS на непоказ в VK не влияет (ссылки просто не создаются).
- Существующие `bugLink`/версию (`swverText`) не трогать.

## Проверка
- Открыть страницу с `?vk_app_id=1` (имитация VK) — ссылок нет.
- Открыть на `abakum.github.io/LunarReturns` — только `VK mini app` → `https://vk.ru/app54746591`.
- Открыть с иного орижина (локальный сервер / Yandex Cloud) — `VK mini app` и `Yandex Cloud` → `https://abakum.github.io/LunarReturns`.
- Проверить, что повторные вызовы `renderSwVersion()` (controllerchange) не дублируют ссылки.

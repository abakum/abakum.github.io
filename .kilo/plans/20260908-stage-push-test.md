# План: тест VK-подписки (путь ВК → Яндекс-бакет) на stage-origin (08.09.2026)

## Итерация 2 (решена пользователем)

- **Прямой VK-хостинг-URL в браузере**: без согласий и облаков (ни ВК-,
  ни Яндекс-) — только подписки (🔔 web-push) и локальная база.
  Убрать из `pdConsentRelevant()` добавленную утром ветку `VK_HOST_URL_RE`
  (и сам const) — `applyPdConsent` сам скроет 🔑/согласия/кнопки облака;
  🔔 останется (не-VK ветка требует только https+PUSH_URL+ключ), локальная
  база в localStorage работает. Комментарий у PD_HOME_URL_RE вернуть к
  прежнему смыслу.
- **Stage-версия в клиенте ВК**: в `renderSwVersion` на stage (`vkminiapp &&
  vkBuildVersion.startsWith("stage-")`) текст версии сборки сам становится
  ссылкой на прямой VK-хостинг-URL (`location.origin + location.pathname`):
  вместо `el.textContent` собрать через `createElement("a")` с текстом
  версии и href на прямой URL (без innerHTML-конкатенации). Открыв ссылку,
  получаем ту же страницу без launch-параметров (vkminiapp=false): 🔔
  web-push, PWA-установка. На prod и в браузере рендер остаётся текстом.

## Итерация 1 (реализовано ранее): убрать `&& vkNativeApp` из гейтов

## Цель

На stage-версии мини-аппа, открытой в клиенте ВК (в т.ч. webview
`vk_platform=mobile_web`), сделать видимыми и работающими чекбокс согласия
на пуш-ПДн и кнопку 🔔 — чтобы протестировать подписку (VK-подписки
хранятся в облаке Яндекса: `push/vk_subs.json` в бакете lunarreturns).

## Причина, почему сейчас скрыто

`initPushConsent` (index.html:2262), `togglePushVk` (2864) и
`refreshPushBtn` (2950) требуют `vkPushEnabled && vkNativeApp`.
`vkNativeApp` = только `vk_platform=android|iphone` (652-656); в webview
стейдж-версии платформа `mobile_web` → всё скрыто. Гейт устарел: в
официальной доке `VKWebAppAllowNotifications` платформы — Android, iOS,
**Mobile Web, Web** (старый комментарий «в браузерных клиентах всегда
отклоняется» не соответствует текущей доке — это и проверим тестом).

## Изменения (только `LunarReturns/index.html`)

1. Убрать `&& vkNativeApp` из трёх пуш-гейтов:
   - `initPushConsent`: `if (!vkPushEnabled || !vkNativeApp) return;` →
     `if (!vkPushEnabled) return;`
   - `togglePushVk`: `if (!vkPushEnabled || !vkNativeApp || !pushConsentGiven())`
     → `if (!vkPushEnabled || !pushConsentGiven())`
   - `refreshPushBtn` (vkminiapp-ветка): убрать `!vkNativeApp`.
2. `vkNativeApp` остаётся объявленным (может использоваться темой/
   миграцией); если после правки не останется использований — удалить.
3. Комментарий у `vkNativeApp` (652-656) обновить: гейта пушей больше нет,
   событие по доке поддерживает Mobile Web/Web; фактическая поддержка
   проверяется тестом на stage.

## Риски

- До модерации приложения `VKWebAppAllowNotifications` может вернуть
  ошибку (по доке событие доступно после модерации) — тогда тест покажет
  статус «Разрешение не выдано», но UI/ветки ошибок всё равно проверены.
  Реальная доставка — после модерации.
- Если на mobile_web разрешение действительно не выдаётся (устаревший
  клиент) — вернуть `vkNativeApp` только для прод-выражения при
  финальном включении.

## Проверка

1. Открыть stage в клиенте ВК (mobile_web): чекбокс пуш-согласия и кнопка
   🔔/🔕 видны после согласия ПДн.
2. Тап 🔔 → диалог `VKWebAppAllowNotifications` → после разрешения
   `vk_subscribe` уходит, в бакете `push/vk_subs.json` появляется запись с
   `vk_user_id` и датами (проверить в консоли Object Storage).
3. Повторный тап (🔕) → `vk_unsubscribe`, запись удалена.
4. Поставить дату = сегодня → ручной вызов функции (HTTP URL без
   `httpMethod`) → лог функции: `_vk_send` вернул ok/disabled; при
   разрешённых уведомлениях — уведомление приходит.
5. Регресс: prod (без изменений кода прод-ветки — там всё скрыто до
   возврата prod-выражения), abakum.github.io web-push не затронут.
6. Прямой VK-хостинг-URL в браузере: согласий и 🔑/облачных кнопок нет,
   🔔 web-push и локальная база работают, на stage в футере — ссылка
   «веб-версия».

## Файлы

- `LunarReturns/index.html`: 3 гейта по одной строке + комментарии,
  `pdConsentRelevant` (минус VK_HOST_URL_RE), `renderSwVersion` (+ссылка).

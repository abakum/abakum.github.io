# Фикс «bad sign» ВК-пушей и молчания колокольчика (stage)

Основание — фактический код, не план-документ.

## Симптомы (stage)

- Android, клиент ВК: 🔔 → «Ошибка оповещений: bad sign» (403).
- Windows по прямому stage-URL: 🔔 → молчание.
- В бакете `lunarreturns` нет записей в `push/vk_subs.json`.

## Факты из кода

1. `_vk_subscribe`/`_vk_unsubscribe` (push.py:320-357) возвращают `403 {"error":"bad sign"}` при провале `_vk_sign_ok`.
2. `_vk_sign_ok` (push.py:277-309):
   - sign длиной 64 hex → HMAC-SHA256 от **всех** полученных params кроме `sign`, отсортированных по ключу, ключ `VK_APP_SECRET`;
   - иначе — легаси MD5 только по `vk_*` + секрет;
   - плюс проверка свежести `vk_ts` (окно `VK_TS_MAX_AGE` = 86400 c, push.py:64).
3. Клиент `vkLaunchParams()` (index.html:2906-2912) кладёт в `launch_params` **только** `vk_*` и `sign` — не-`vk_` launch-параметры выбрасываются.
4. `togglePushVk()` (index.html:2935): `await vkBridge.send("VKWebAppAllowNotifications")` без таймаута; вне клиента ВК промис не разрешается → до `status()` выполнение не доходит (молчание на Windows по URL).
5. `VK_APP_SECRET` задеплоен (иначе был бы 500 «VK_APP_SECRET not configured», а не bad sign, push.py:321-322).

## Диагноз

- **bad sign на Android**: серверная подпись (п.2, вариант HMAC) считается по полному набору launch-параметров, а клиент передаёт урезанный набор (п.3) — если ВК включил в подпись хоть один не-`vk_` параметр, HMAC не сойдётся. Дополнительно тот же 403 дают: устаревший `vk_ts` (приложение открыто >24 ч) и неверное значение `VK_APP_SECRET`.
- **Молчание на Windows по URL**: п.4.
- **Нет записей в S3**: прямое следствие 403 — до `_save_subs(VK_SUBS_KEY)` (push.py:340) выполнение не доходит.

## Задачи

### A. Клиент — `LunarReturns/index.html` (этот репо)

1. `vkLaunchParams()` (~2906): передавать **все** параметры `location.search` как есть (включая `sign` и не-`vk_`). Это в точности набор, по которому ВК вычислил подпись. Обновить комментарий: launch-параметры платформенные, без ПДн; сервер всё равно извлекает только `vk_user_id`.
2. `togglePushVk()` (~2935): таймаут на `vkBridge.send` (`Promise.race`, ~8 c → `{error:"timeout"}`). Тогда вне клиента ВК → `granted=false` → stage-ветка (`stageTest`, index.html:2943) создаст probe-подписку или покажет ошибку вместо молчания.

### B. Сервер — `/home/koka/src/LunarReturns/function/push.py`

1. `_vk_sign_ok`: для 64-hex sign принимать совпадение **любого** из двух HMAC (снимает зависимость от фактического состава подписи ВК):
   - по всем params кроме `sign` (как сейчас);
   - только по `vk_*` params кроме `sign`.
   Легаси-MD5-ветку не трогать.
2. Диагностический лог при несовпадении (без секретов и значений): ключи params, длина sign, возраст `vk_ts` — чтобы по логам функции (`yc logs`) отличить «не тот секрет» / «не тот набор параметров» / «старый vk_ts».
3. Обновить комментарий про состав данных: клиент передаёт полный launch-набор ВК (без ПДн).

### C. Развёртывание

- Функция: `./deploy.sh deploy` в `/home/koka/src/LunarReturns` (нужны `VK_APP_SECRET`/`VK_SERVICE_TOKEN`/VAPID в env или `.vapid.env`-паттерне) либо push в `abakum/LunarReturns` → workflow.
- Клиент: коммит/push `index.html` в `abakum.github.io`; stage-сборка ВК — через `.github/workflows/deploy-lunarreturns-vk.yml`. Локально `npm run build` НЕ запускать (AGENTS.md).

## Валидация

1. Android, stage в клиенте ВК: 🔔 → «Тестовая подписка создана (разрешение не выдано)»; в бакете `push/vk_subs.json` появилась запись `{vk_user_id, dates:[]}`.
2. Windows по прямому stage-URL: 🔔 → реакция ≤8 с; при свежих launch-параметрах — тестовая подписка.
3. Если bad sign остался: по диагностике в `yc logs` определить причину; при подозрении на секрет — переустановить `VK_APP_SECRET` (защищённый ключ приложения 54746591, не сервисный токен).
4. Подделка: curl `vk_subscribe` с битым sign → 403; с Origin `https://stage-app54746591-x.pages.vk-apps.ru` → не 403 по origin.
5. Регресс: веб `subscribe`/`unsubscribe` не затронуты; `vk_unsubscribe` работает с расширенным набором params.

## Вне scope

- Переключение `vkPushEnabled` (index.html:974) на prod — остаётся stage-only до модерации.
- Таймерная отправка `notifications.sendMessage` — отдельно после модерации.

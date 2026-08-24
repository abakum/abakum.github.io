# Birthday push notifications for LunarReturns PWA

## Goal
Оповещать о днях рождения из локальной базы PWA в 9:00 МСК, когда приложение закрыто.
Запуск — бесплатный timer-триггер Yandex Cloud. Облако видит только даты ДР без имён (не ПДн); имена и логика — на устройстве.

## Architecture

```
[YC timer-триггер 06:00 UTC]
        ↓ invoke
[Cloud Function lunarreturns-push] (/home/koka/src/LunarReturns/function/push.py)
        ↓ self-presigned GET/PUT (переиспользует _presign из handler.py)
        ↓ S3: push/subscriptions.json = [{endpoint, p256dh, auth, dates:["MM-DD"]}]
        ↓ py-vapid → web-push тем, у кого сегодня ДР по МСК; payload без имён
[SW LunarReturns/sw.js]
        ↓ читает копию db из IndexedDB, подставляет имена, показывает уведомление
```

Решения (согласовано):
- Даты без имён — не ПДн, вне PD-consent; отписка — отдельной кнопкой 🔔.
- Все даты по Москве; отправка в 9:00 МСК (06:00 UTC cron `0 6 * * *`).
- Push только в день ДР → каждый push видимый, бюджет браузера не горит.
- GitHub Actions исключён из цепочки полностью.

## Changes

### 1. `/home/koka/src/LunarReturns/function/push.py` (новая функция, рядом с handler.py)
- Импортировать `_presign`, `_response`, `_sign` из `handler.py` (один zip).
- `handler(event, context)`:
  - HTTP-режим (ручки для страницы, защита: проверка `Origin`/`Referer` == `https://abakum.github.io`):
    - `{action:"subscribe", subscription, dates}` → добавить/обновить по endpoint в `push/subscriptions.json` (GET по self-presign, PUT обратно).
    - `{action:"unsubscribe", endpoint}` → удалить запись.
    - Валидация: dates ⊆ `^\d{2}-\d{2}$`, не более ~200 записей.
  - Trigger-режим (`event` без `httpMethod`): сегодняшняя дата МСК → `MM-DD`; 29.02 в невисокосный год матчится и с 28.02; для каждой подписки с совпадением — `web-push` POST на endpoint (Authorization: VAPID JWT ES256, TTL 86400). Ответ 404/410 → удалить подписку и сохранить файл.
- VAPID: JWT ES256 через `cryptography` (см. requirements); env: `VAPID_PRIVATE`, `VAPID_PUBLIC`, `VAPID_SUBJECT`.
- S3-доступ — переиспользовать существующие env `S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/BUCKET` (self-presigned URL + urllib, без boto3).

### 2. `/home/koka/src/LunarReturns/function/requirements.txt`
- `cryptography` (для ES256-подписи VAPID JWT). Библиотеку `py-vapid` не тянуть — JWT собираем вручную (~30 строк), меньше зависимостей.

### 3. `/home/koka/src/LunarReturns/deploy.sh`
- Новый FN `lunarreturns-push` (entrypoint `push.handler`, 128MB / 30s — крипто+S3 могут не влезть в 10с).
- `deploy_version` второй функции: zip = handler.py + push.py + requirements.txt; env + VAPID_*.
- `PUSH_SECRET`/ключи VAPID не вращать автоматически; задаются `yc ... --environment` из локальных переменных при деплое.
- Timer-триггер (create once): `yc serverless trigger create timer --name lunarreturns-push-timer --cron-expression '0 6 * * *' --invoke-function-name lunarreturns-push --invoke-function-service-account-name lunarreturns-fn` (idempotent: проверять существование перед созданием).
- После деплоя автоматически вписывать URL push-функции в страницу: обобщить `write_page_url` до `write_page_var <VAR> <url>` (sed по `const <VAR> = "..."`, те же предохранители: ровно одно вхождение, иначе WARNING) и вызывать её для `FUNCTION_URL` и `PUSH_URL` (страница в репо abakum.github.io, путь уже вычисляется скриптом как `$PAGE`). Так же печатать URL в лог.
- Разрешения: функции нужен `serverless.functions.invoker` на саму себя для триггера — выдать SA `lunarreturns-fn` (триггер уже вызывает от его имени).

### 4. `LunarReturns/index.html` (репо abakum.github.io)
- Константа `PUSH_URL = "<url функции>"` (рядом с `FUNCTION_URL`); вписывается автоматически `deploy.sh` при деплое.
- Кнопка «🔕» рядом с 🔑 — тумблер подписки; состояние хранить не в localStorage, а выводить из самого браузера: при загрузке `pushManager.getSubscription()` → есть подписка = «🔔» (title «Отключить оповещения»), нет = «🔕» (title «Включить оповещения о днях рождения»). Так статус не рассинхронизируется, если браузер сам отозвал подписку.
  - Клик по 🔕: `Notification.requestPermission()` → `pushManager.subscribe({userVisibleOnly:true, applicationServerKey: PUSH_PUBLIC_KEY})` (VAPID public — константа в файле) → `POST PUSH_URL {action:"subscribe", subscription, dates}`; dates = `db.map(r=>r.d)` без имён → иконка становится 🔔.
  - Отказ в permission → иконка остаётся 🔕, `status("Разрешение на уведомления не выдано", true)`.
- В `saveDb()` (index.html:385): дополнительно писать db в IndexedDB (object store `kv`, ключ `db`) — localStorage SW недоступен; затем, если push-подписка есть, отправить обновлённые `dates`.
- Клик по 🔔: `subscription.unsubscribe()` + `POST {action:"unsubscribe", endpoint}` → иконка возвращается 🔕.

### 5. `LunarReturns/sw.js`
- `push`: db из IndexedDB; сегодня по МСК (`toLocaleDateString("en-CA",{timeZone:"Europe/Moscow"})` → `MM-DD`); совпали `d` (29.02 ↔ 28.02 в невисокосный) → `showNotification("День рождения", {body: имена, tag:"bd"})`; db пуста → generic-текст; иначе тихо завершиться.
- `notificationclick`: `clients.openWindow("./")`.
- Существующий cache-first не трогать.

## Edge cases
- Подписка истекла (браузер чистит): функция получает 410 и удаляет запись.
- Пользователь сменил базу между подпиской и ДР: dates обновляются при каждом saveDb.
- Push без совпадения локально (расхождение дат): SW молчит — разово допустимо, рассинхрон самоликвидируется при следующем saveDb.
- Отзыв PD-consent не трогает push-подписку (она вне PD-флоу).

## Validation
1. Ручной прогон: `yc serverless function invoke lunarreturns-push` с тестовым event → подписка с сегодняшней датой получает уведомление с именем из локальной IndexedDB.
2. Поменять дату записи на завтра → на следующий день в 9:00 МСК приходит уведомление; в обычные дни ничего.
3. Удалить подписку в DevTools → invoke → запись исчезла из `push/subscriptions.json`.
4. Оффлайн-режим PWA работает (кэш SW не сломан).

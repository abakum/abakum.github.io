# LunarReturns: страница лунных годовщин + синхронизация с Yandex Object Storage

## Контекст и решения

- Статическая страница `LunarReturns/index.html` на GitHub Pages (abakum.github.io), по образцу самодостаточных `croc/index.html` и `scan/index.html`.
- Расчёт «совпадений» предстоящих дней рождения с первым — порт `la()` из `/home/koka/src/mxbPi/LunarAnniversaries.go` на чистый JS:
  - астрономия MoonPhase (`github.com/abakum/MoonPhase` — чистая математика, файл `MoonPhase.go` в `/home/koka/go/pkg/mod/github.com/abakum/!moon!phase@v0.0.0-20230421054831-2ebc61adbf86/`) — портируются: `New()`, `fixangle`, `kepler`, фаза/долгота; `PhaseInt`, `PhaseNameLocale("ru")`, `ZodiacSignLocale("ru")`;
  - таблицы gozodiac (`GetZodiacSignLocale`, `GetChineseZodiacSignLocale` — портируются дословно);
  - `wdLocale` (день недели RU + иконка-клавиша `N\uFE0F\u20E3`), `yearLocale` (`г`), `hashTag` (`#` + lower + `_` вместо пробелов), формат строк и логика цикла `la()` — один в один.
- Пары «Имя + День рождения» хранятся в localStorage браузера (ключ `lunarreturns.db`, JSON `[{"n":"Имя","d":"YYYY-MM-DD"}]`).
- Данные не покидают РФ: страница не грузит НИКАКИХ сторонних скриптов/CDN; все сетевые запросы — только к `*.yandexcloud.net` (функция и бакет). С github.io из РФ грузится только статический код без данных (подтверждено пользователем).
- Мультиюзерская синхронизация: Яндекс ID OAuth (implicit) → Cloud Function (Python, только stdlib) → presigned URL → `PUT/GET https://lunarreturns.storage.yandexcloud.net/users/{uid}/db.json`. Разделение пользователей по префиксу `users/{uid}/`; при лимите БД ~2.9 КБ (ёмкость QR v40) бесплатной квоты 1 ГБ хватает на ~300 000 записей.
- Максимальный размер БД = ёмкость QR версии 40 в режиме byte: 2953 байта JSON. Проверяется при добавлении/импорте/вставке.

## Задачи

### 1. `LunarReturns/qr/qrcode.js` — vendored QR-библиотека

- Скачать `qrcode-generator` (kazuhikoarase, MIT) v1.4.4 единственным файлом `qrcode.js` в репозиторий. Никаких CDN. Экспортирует глобальную `qrcode` (функция `qrcode(typeNumber, errorCorrectionLevel)`), поддерживает typeNumber 0 (авто) и 40.

### 2. `LunarReturns/index.html` — страница (весь JS инлайн, без внешних скриптов)

**Константы в начале скрипта (заполнить при развёртывании):**
```js
const YANDEX_CLIENT_ID = "";  // см. шаг 5
const FUNCTION_URL = "";      // URL облачной функции, см. шаг 5
```

**Порт `la()`:**
- Портировать `MoonPhase.New(t)` на JS (Date → unix-секунды; все формулы, константы и `phaseHunt` не нужны — используются только `phase`, `longitude`). Нужны `fixangle`, `kepler`, `sin/cos/rad2deg/deg2rad`.
- `PhaseInt()`: `Math.floor((phase + 0.0625) * 8)`; массивы имён RU как в `PhaseNameLocale("ru")`, `ZodiacSignLocale("ru")` (луна по долготе, пороги `maxLongitudes`), знаки зодиака по дате и китайский зодиак `year % 12` — таблицы RU из gozodiac.
- `wdLocale`: массив `["Воскресенье","Понедельник",...]`, ISO-номер (вс→7), иконка `String.fromCodePoint(0x30+n, 0xFE0F, 0x20E3)`.
- `la(t)` — точный перенос цикла: `space = "\u2003\u2006"`, `sq = "²"` при совпадении лунного и солнечного знака, `f = текущий год − год рождения`, условия вывода `i >= f && c > 0 || c > 1 && i < 90`, остановка после первого найденного совпадения старше `f`. Прибавление года: `new Date(y+i, m, d)` — 29 февраля скатывается на 1 марта, как `AddDate` в Go.

**CRUD базы:**
- Форма «Имя» (`<input type="text">`) + «День рождения» (`<input type="date">`), кнопка «Добавить».
- Список записей: у каждой — кнопки «Изменить» (заполняет форму, кнопка становится «Сохранить»), «Удалить», клик по записи — выбрать.
- Персистентность в localStorage; после каждого изменения — проверка `JSON.stringify(db).length <= 2953`, иначе отказ с сообщением.

**Выбор записи:**
- Вычислить `la(bd)`, показать текст в `<textarea readonly>` (или `<pre>`).
- QR: `qrcode(0, 'M')` → `createSvgTag()` или отрисовка модулей на `<canvas>`.
- Кнопка «Копировать текст»: `navigator.clipboard.writeText` (https на github.io; фолбэк — `textarea.select()` + `document.execCommand('copy')`).

**QR всей базы / вставка из буфера:**
- Кнопка «Показать базу как QR»: QR из JSON всей базы.
- Кнопка «Вставить базу из буфера»: `navigator.clipboard.readText()` → JSON.parse → валидация структуры → вопрос «Заменить/объединить» → проверка лимита 2953 → сохранить.

**Яндекс-авторизация и синхронизация (кнопки скрыты до логина):**
- «Войти через Яндекс»: `location = "https://oauth.yandex.ru/authorize?response_type=token&client_id=" + YANDEX_CLIENT_ID + "&redirect_uri=" + encodeURIComponent(location.origin + location.pathname)`.
- При загрузке: если `location.hash` содержит `access_token=` — сохранить токен в памяти (сессия, не localStorage), удалить хэш через `history.replaceState`, показать блок облака.
- «Сохранить в облако»: `POST FUNCTION_URL` c JSON `{"token": "...", "action": "put"}` → ответ `{"url": "..."}` → `fetch(url, {method:"PUT", body: JSON.stringify(db), headers:{"Content-Type":"application/json"}})` → сообщение об успехе.
- «Загрузить из облака»: то же с `"action":"get"` → `fetch(url)` → текст → JSON.parse → валидация → подтвердить замену → сохранить в localStorage.
- Обработка ошибок сети/ответов — понятные сообщения на русском.

### 3. `LunarReturns/function/handler.py` — облачная функция (Python, только stdlib)

- Точка входа `handler(event, context)`; тело HTTP-запроса в `event["body"]` (JSON `{"token","action"}`).
- Проверка токена: `urllib.request` `GET https://login.yandex.ru/info` с заголовком `Authorization: OAuth <token>` → `id` (uid). Ошибка/невалид → `{"statusCode": 401}`.
- Белый список (опционально): если задан env `ALLOWED_UIDS` (через запятую) и uid отсутствует → 403. По умолчанию пуст = пускать всех.
- Presigned URL SigV4 для `s3.storage.yandexcloud.net`: вручную через `hmac`/`hashlib`/`urllib.parse` (canonical request, string-to-sign, `Authorization: AWS4-HMAC-SHA256 Credential=...`) для `PUT` или `GET` объекта `lunarreturns/users/{uid}/db.json`, expiry 600 c. Никаких pip-зависимостей.
- Ответ `{"statusCode":200, "body": json.dumps({"url": ...})}`; заголовок CORS не нужен (функцию вызывает JS через fetch с обычным JSON — добавить `Access-Control-Allow-Origin: *` в ответ на случай OPTIONS/ошибок).
- Секреты — только в env функции: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (статический ключ сервисного аккаунта с ролью `storage.editor`), `BUCKET=lunarreturns`. В репозиторий секреты не попадают.
- Регион SigV4: `ru-central1`, сервис `s3`.

### 4. Валидация

- **Расхождение с Go:** в `/home/koka/src/mxbPi` временно добавить `cmd`-программку или использовать существующую сборку, чтобы получить `la(bd)` для 3–4 дат (например, 2000-02-29, 1985-08-14, 1990-12-31), сравнить построчно с выводом страницы (открыть `LunarReturns/index.html` локально в браузере). После сверки временную программу удалить. Альтернатива — node-скрипт с копией порта для diff-теста (в репозиторий не попадает).
- Проверить QR-раундтрип: «Показать базу как QR» → декодировать телефоном/страницей `scan` → «Вставить из буфера» → БД совпадает.
- Функцию прогнать локально: `python3 -c` с моковым `event` (токен проверить реальный) до деплоя; после деплоя — `curl` с реальным токеном.

### 5. Развёртывание (инструкция в `LunarReturns/README.md`, выполняется вручную, вне кода)

1. **Приложение Яндекс OAuth**: oauth.yandex.ru → создать приложение, платформа «Веб-сервисы», Redirect URI `https://abakum.github.io/LunarReturns/`, права: `Яндекс ID → идентификатор пользователя (login:id)`. Implicit flow (token) включается именно выбором этой платформы. Полученный Client ID → в константу `YANDEX_CLIENT_ID`.
2. **Бакет**: `lunarreturns` (существует), приватный, CORS-правило: Origin `https://abakum.github.io`, Methods `GET, PUT`, Headers `*`, MaxAge 3600.
3. **Сервисный аккаунт** с ролью `storage.editor` → статический access key pair → в env функции.
4. **Cloud Function**: runtime python312, вход `handler.handler`, публичный вызов (unauthenticated), env как выше. URL функции → в константу `FUNCTION_URL`.
5. Закоммитить страницу с заполненными константами, дождаться GitHub Pages, пройти полный цикл: вход → добавление записей → QR → сохранение в облако → очистка localStorage → загрузка из облака.

## Риски / краевые случаи

- 29 февраля: `new Date(y+i,1,29)` → 1 марта невисокосного года = поведение `time.AddDate` в Go, совпадает.
- Часовой пояс: и Go, и JS используют локальное время клиента — расчёты фаз по unix-времени одинаковы.
- `clipboard.readText` требует жеста пользователя и https — вызывать только из обработчика клика.
- Presigned URL короткоживущий (10 мин) — генерируется перед каждым PUT/GET заново.
- Злоупотребление мультиюзерностью: спам uid'ами ограничивается квотой 1 ГБ и может быть закрыт `ALLOWED_UIDS`.
- Если GitHub Pages отдаёт страницу с `X-Content-Type-Options`, CORS к бакету всё равно работает — важно лишь CORS-правило бакета и функции.

## Вне объёма

- Российский хостинг статики (пользователь подтвердил: страница на GitHub).
- Шифрование db.json; имена и дни рождения в бакете хранятся открыто.
- Удаление/листинг чужих файлов — доступ строго `users/{uid}/db.json` по подписанному URL.

## Итог реализации

Реализовано. Создано:

- **`LunarReturns/index.html`** — страница: порт `la()` (MoonPhase + gozodiac) инлайн, CRUD пар «Имя + День рождения» в localStorage, выбор записи → текст + QR + копирование в буфер, база целиком как QR / вставка из буфера (с выбором заменить/объединить), вход через Яндекс ID (implicit) и кнопки сохранения/загрузки в бакет. Лимит базы 2953 байта UTF-8 (QR v40-L). Единственный внешний скрипт — локальный `qr/qrcode.js`, данные не покидают РФ.
- **`LunarReturns/qr/qrcode.js`** — vendored qrcode-generator 1.4.4 (MIT).
- **`LunarReturns/function/handler.py`** — Cloud Function (Python, stdlib): проверка токена через `login.yandex.ru/info`, опциональный белый список `ALLOWED_UIDS`, presigned URL SigV4 на `users/{uid}/db.json`.
- **`LunarReturns/README.md`** — пошаговое развёртывание (OAuth-приложение, CORS бакета, ключи, деплой функции).

Валидация:
- JS-порт `la()` (включая инлайн-копию в странице) побайтово совпадает с выводом Go на 4 фиксированных + 60 случайных дат 1920–2025 (U+2003/U+2006, ², иконки — всё точно).
- QR: roundtrip encode→jsQR с кириллицей OK; граница ёмкости проверена (2952 байта — OK, 2954 — отказ).
- Presigned URL функции побайтово идентичен boto3 `generate_presigned_url` (PUT и GET); `handler()` прогнан мок-тестами (401/400/403/OPTIONS/успех).

Для запуска осталось заполнить `YANDEX_CLIENT_ID` и `FUNCTION_URL` в `index.html` по инструкции в README (разделы 1 и 4), затем закоммитить.

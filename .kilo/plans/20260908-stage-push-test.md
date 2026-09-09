# План: тест VK-подписки (путь ВК → Яндекс-бакет) на stage-origin (08.09.2026)

## Диагностика «подписка не случилась» (08.09, вечер)

`vk_subscribe` на сервер **не отправлялся** — это ожидаемое поведение
фронта, push.py не участвует:

- `togglePushVk` (index.html:2938-2943): сначала запрашивается разрешение
  `VKWebAppAllowNotifications`; при ошибке — статус «Разрешение не выдано»
  и **выход без** `pushApi("vk_subscribe")`. Именно это и произошло:
  Android → `api_error`, Windows → `Unsupported platform (untrusted apps)`.
- Причина ошибки разрешения — окружение: по доке событие доступно только
  после модерации приложения; desktop/untrusted разрешение не выдаёт.
  push.py корректен: запрос до сервера не дошёл (в `push/vk_subs.json`
  ничего не появилось, статус «Ошибка оповещений: …» отсутствовал — был
  статус про разрешение).

Возможный дополнительный фактор (если бы запрос дошёл): `VK_TS_MAX_AGE=86400`
— протухший `vk_ts` сессии старше суток дал бы 403 «bad sign». Не проявлялся.

### Открытый вопрос: как тестировать серверный конвейер до модерации

Решение пользователя: **тест-байпас на stage** (вариант B).

## Итерация 4: тест-байпас подписки на stage (08.09.2026, к реализации)

На stage при НЕвыданном разрешении всё равно создавать подписку — с
пометкой `test: 1`: сервер хранит запись в `push/vk_subs.json` (видно в
консоли Object Storage), но таймер на неё не отправляет и не удаляет её.
Пользователь выбирает вариант: stage → байпас; prod (после возврата
prod-выражения) → без байпаса, ошибка разрешения = выход без подписки.

### Изменения

**1. Фронт, `togglePushVk` (index.html:2918-2947):**

```js
    const perm = await vkBridge.send("VKWebAppAllowNotifications")
        .catch(e => ({ error: e }));
    const granted = !!perm && perm.result === true && !perm.error;
    // TEMP(публикация): на stage до модерации разрешение недоступно —
    // тестируем конвейер: подписываемся с test:1 (сервер хранит запись,
    // но не отправляет на неё пуши). На prod байпаса нет.
    const stageTest = vkBuildVersion.startsWith("stage-");
    if (!granted && !stageTest) {
        status("Разрешение на уведомления не выдано (" + vkErr(perm && perm.error) + ")", true);
        return;
    }
    await pushApi("vk_subscribe", Object.assign(
        { launch_params: vkLaunchParams(), dates: allPushDates() },
        granted ? { } : { test: 1 }
    ));
    localStorage.setItem(VKPUSH_KEY, "1");
    status(granted ? "Оповещения включены" : "Тестовая подписка создана (разрешение не выдано)");
```

**2. Сервер, `_vk_subscribe` (push.py:335+):** принимать флаг из body и
хранить в записи:

```python
    subs = [s for s in _load_subs(VK_SUBS_KEY) if s.get("vk_user_id") != uid]
    rec = {"vk_user_id": uid, "dates": dates}
    if body.get("test"):
        rec["test"] = 1
    subs.append(rec)
```

**3. Сервер, `_run_daily_vk`:** тест-подписки исключаются из `due`
(не отправляются, не удаляются по fails/disabled — их управляет только
vk_unsubscribe):

```python
    due = [s for s in subs
           if not s.get("test")
           and (s.get("pending") or any(d in today for d in (s.get("dates") or []) if isinstance(d, str)))]
```

**4. `vk_unsubscribe`** — без изменений (удаляет по `vk_user_id`).

### Проверка

1. Stage в клиенте ВК: тап 🔕/🔔 → разрешение падает (api_error/…) →
   статус «Тестовая подписка создана», в бакете появляется запись
   `"test": 1` с `vk_user_id` и датами.
2. Повторный тап 🔕 → запись удалена из бакета.
3. Таймер (ручной вызов функции): тест-записи пропускаются, обычные
   подписки обрабатываются как раньше (см. логи функции).
4. Синтаксис index.html/py_compile push.py.

### Откат

После модерации: в `togglePushVk` удалить байпас-ветку (`stageTest` и
`test: 1`), вернуть исходный ранний return; серверные правки пп. 2-3 можно
оставить (флаг просто перестаёт приходить) или убрать.



## Итерация 3: вернуть чекбокс пуш-согласия на stage в клиенте

Ошибка итерации «согласие не требуется»: константа `VK_PUSH_CONSENT=false`
скрыла чекбокс пуш-согласия **везде**, в том числе на stage в клиенте
(гейт `initPushConsent`: `if (!vkPushEnabled || !VK_PUSH_CONSENT) return;`).
По решению пользователя: на stage в клиенте чекбокс **виден** (согласие
требуется), скрыт он только при прямом VK-URL — а там он скрыт автоматически
(`vkminiapp=false` → ранний return в `initPushConsent`), без нашей константы.

### Изменения (только `LunarReturns/index.html`)

1. Удалить константу `VK_PUSH_CONSENT` (строки ~968-970) и её TEMP-комментарий.
2. Вернуть исходные условия в трёх местах:
   - `initPushConsent`: `if (!vkPushEnabled || !VK_PUSH_CONSENT) return;` →
     `if (!vkPushEnabled) return;`
   - `togglePushVk` (~2913): `if (!vkPushEnabled || (VK_PUSH_CONSENT && !pushConsentGiven()))`
     → `if (!vkPushEnabled || !pushConsentGiven())`
   - `refreshPushBtn` (~2989): аналогично убрать `VK_PUSH_CONSENT &&`.
   - авто-подписка (~2939): `(VK_PUSH_CONSENT || pushConsentGiven())` →
     `pushConsentGiven()`.
3. TEMP-комментарий у `vkPushEnabled` сократить (упоминание VK_PUSH_CONSENT
   убрать).

Итого: чекбокс на stage в клиенте виден, согласие требуется (как в оригинале
до TEMP-правок); при прямом VK-URL — локальная база + 🔔 web-push без
согласий (автоматически, `vkminiapp=false`).

## Про ошибки `VKWebAppAllowNotifications` (вне кода)

- Android: `api_error`, Windows: `Unsupported platform. Notifications are
  not allowed for untrusted apps` — по доке событие доступно только после
  модерации; desktop/untrusted разрешение не выдаёт. Это окружение, не баг:
  статус уже показывает причину, `vk_subscribe` при ошибке разрешения не
  вызывается. Реальный E2E — после модерации.

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

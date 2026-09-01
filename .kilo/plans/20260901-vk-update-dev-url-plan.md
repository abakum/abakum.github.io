# Plan: `update_dev` — автоматическое обновление URL при dev-деплое из CI

## Цель
После dev-деплоя из GitHub Actions (`Deploy LunarReturns to VK Mini Apps`, environment=dev)
хостинг VK сам переключает URL мини-аппа на новую версию. Сейчас выкладка проходит,
версия создаётся, но URL в настройках приложения не меняется — vk.ru/app54746591
открывает старую версию, URL переключают вручную.

## Диагноз (подтверждён)
Симптом: «URL в настройках не меняется» при успешном деплое.

Сопоставление доки и исходника `@vkontakte/vk-miniapps-deploy@1.0.2`
(идентичен master; index.js, функция `run()`):
- Дока (https://dev.vk.ru/ru/mini-apps/development/hosting/ci): env
  `MINI_APPS_ENVIRONMENT=dev` — «обновить только URL для разработки», без кода
  подтверждения. Воркфлоу это уже передаёт (deploy-lunarreturns-vk.yml:49).
- Но в исходнике, кроме `environment`, в Hosting API (`apps.getGoHostingUploadServer`
  и `apps.createGoHostingTask`) передаются отдельные флаги `update_dev` / `update_prod`
  (0|1) — **только если они есть в `vk-hosting-config.json`**. Текущий конфиг их не
  содержит (решение «не заданы» из плана 20260901-vk-mini-apps-deploy-plan.md).
- Событие очереди `CODE_SKIP` (202) = версия выложена, URL не переключён;
  `CODE_DEPLOY` (201) = «URLs changed». Без `update_dev: 1` сервер не переключает
  URL приложения — отсюда симптом.
- Для dev-переключения код подтверждения не нужен (дока: «При обновлении только
  dev-адресов подтверждение не требуется») — CI остаётся полностью автоматическим.

## Изменения

### 1. `LunarReturns/vk-hosting-config.json`
```json
{
  "static_path": "build",
  "app_id": 54746591,
  "endpoints": { "mobile": "index.html", "web": "index.html", "mvk": "index.html" },
  "update_dev": 1,
  "update_prod": 0,
  "noprompt": 1
}
```
- `update_dev: 1` — после dev-выкладки VK переключает dev-URL приложения на новую
  версию (то, что видят админы/тестировщики на vk.ru/app54746591).
- `update_prod: 0` — явно фиксируем: production-URL не трогать; он обновляется
  только через production-деплой с кодом подтверждения (текущее поведение).

### 2. `LunarReturns/README.md`
Раздел про dev-деплой: URL обновляется автоматически (`update_dev: 1` в
vk-hosting-config.json), вручную ничего переключать не нужно; stage-URL из лога —
справочный.

### 3. `.github/workflows/deploy-lunarreturns-vk.yml`
Только комментарий над dev-шагом (строки 40-43): убрать «VK выдаёт … новый URL при
каждой выкладке, его нужно копировать вручную» — теперь URL переключается
автоматически. Код шагов не меняется.

### Вне скоупа
- `[TEST] Deploy LunarReturns to VK (service token…)` воркфлоу — экспериментальный,
  не трогаем.
- Кэш/сервис-воркер: sw.js в VK-сборку не входит, не при чём.

## Порядок работ
1. `vk-hosting-config.json` — добавить `update_dev: 1`, `update_prod: 0`.
2. README — правка раздела dev.
3. Воркфлоу — обновить комментарий dev-шага.

## Валидация
- `JSON.parse` конфига — OK.
- Запуск воркфлоу (environment=dev): в логе вместо CODE_SKIP ожидается блок
  «URLs changed for dev» + адреса; в настройках приложения и на vk.ru/app54746591
  (внутри VK) открывается новая версия (проверить по метке версии/даты в приложении).
- Production-деплой с кодом подтверждения — поведение не меняется (`update_prod: 0`).

## Риски
- `update_dev: 1` делает каждый dev-деплой «живым» для всех, кому доступно
  неопубликованное приложение — это и есть желаемое поведение.
- Ошибка обновления test-group URL (код 109) библиотека лишь логирует, деплой
  не падает.
- Лимиты хостинга без изменений (24 выкладки/сутки, 100 staging-версий).

## Результат

**Статус:** ✅ Выполнено (2026-09-01)

- `LunarReturns/vk-hosting-config.json` — добавлены `"update_dev": 1` и
  `"update_prod": 0`; JSON парсится, флаги на месте.
- `LunarReturns/README.md` — раздел dev переписан: URL переключается
  автоматически, stage-адрес справочный.
- `.github/workflows/deploy-lunarreturns-vk.yml` — обновлён только комментарий
  над dev-шагом; код шагов не менялся.
- Проверка в бою: запустить воркфлоу с environment=dev и убедиться, что в логе
  появился блок «URLs changed for dev», а vk.ru/app54746591 открывает новую
  версию.

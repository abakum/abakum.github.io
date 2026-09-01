# Plan: Deploy LunarReturns to VK Mini Apps (VK Hosting)

## Цель
Настроить деплой статичного PWA `LunarReturns` («Лунно-солнечные юбилеи») на официальный хостинг VK Mini Apps через GitHub Actions.

**Статус:** ✅ Выполнено (2026-09-01)

## Основание (источники)
- Официальная документация VK «Хостинг статики»: https://dev.vk.com/ru/mini-apps/development/hosting/overview
- VK «Добавление файлов на хостинг из автоматических сборок» (CI, токен, env-переменные): https://dev.vk.com/ru/mini-apps/development/hosting/ci
- VK «Файл vk-hosting-config.json»: https://dev.vk.com/ru/mini-apps/development/hosting/config-file
- Исходный код библиотеки `@vkontakte/vk-miniapps-deploy` (v1.0.2): https://github.com/VKCOM/vk-miniapps-deploy/blob/master/index.js

### Ключевые выводы из исходника `index.js`
- Деплой выполняется командой `vk-miniapps-deploy` (npm script `deploy`), которая пакует `static_path` в ZIP и выкладывает на CDN VK.
- Токен для CI передаётся через env `MINI_APPS_ACCESS_TOKEN` (сервисный ключ приложения).
- `MINI_APPS_ENVIRONMENT` управляет обновляемыми URL:
  - `dev` → завершается событием `CODE_SKIP` (env=dev), **код подтверждения не запрашивается** → деплой полностью автоматический.
  - `production` → при событии `CODE_CONFIRM_SENT_VIA_MESSAGE` (205) вызывается `prompt()` для кода из stdin с последующим вызовом `apps.confirmDeploy`.
- `noprompt` подавляет только предложение «получить новый токен», но НЕ отключает запрос кода в production.
- В GitHub Actions нет TTY, поэтому код для production подаётся в stdin через псевдо-TTY (`script -qec`).

## Область изменений
| Файл | Назначение |
|------|-----------|
| `LunarReturns/package.json` | Скрипты `build` / `predeploy` / `deploy`, devDependency `@vkontakte/vk-miniapps-deploy ^1.0.2`, `homepage: "."` |
| `LunarReturns/vk-hosting-config.json` | `static_path: build`, `app_id: 54746591`, endpoints `mobile`/`web`/`mvk` = `index.html`, `noprompt: 1` |
| `LunarReturns/scripts/copy-build.js` | Сборка статики (`index.html`, `sw.js`, `manifest.webmanifest`, `1f319.webp`, `qr/`, `icons/`) в папку `build/` |
| `.github/workflows/deploy-lunarreturns-vk.yml` | Единый `workflow_dispatch` с выбором окружения и кодом подтверждения |
| `LunarReturns/README.md` | Инструкция: сервисный ключ, secret, запуск, ограничения |
| `LunarReturns/.gitignore` | Исключены `node_modules/`, `build/`, `package-lock.json` |

## Конфигурация
`vk-hosting-config.json`:
```json
{
  "static_path": "build",
  "app_id": 54746591,
  "endpoints": { "mobile": "index.html", "web": "index.html", "mvk": "index.html" },
  "noprompt": 1
}
```

`package.json` (ключевое):
```json
{
  "homepage": ".",
  "scripts": {
    "build": "node scripts/copy-build.js",
    "predeploy": "npm run build",
    "deploy": "vk-miniapps-deploy"
  }
}
```
> `predeploy` автоматически запускает `build` перед `deploy`. `update_prod`/`update_dev` сознательно не заданы — окружением управляет `MINI_APPS_ENVIRONMENT`.

## Workflow: `.github/workflows/deploy-lunarreturns-vk.yml`
Триггер: `workflow_dispatch` с inputs:
- `environment`: `dev` (по умолчанию) | `production`
- `confirmation_code`: обязателен только для production

Шаги:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` (node 20)
3. `npm install --no-audit --no-fund` (cwd `LunarReturns`)
4. **dev** (`if environment == 'dev'`): `MINI_APPS_ACCESS_TOKEN`, `MINI_APPS_ENVIRONMENT=dev`, `CI_URLS=true` → `npm run deploy`
5. **production** (`if environment == 'production'`): проверка `confirmation_code` (иначе `::error::` и exit 1); подача кода в stdin: `printf '%s\n' "$CODE" | script -qec "npm run deploy" /dev/null`

Секрет: `secrets.MINI_APPS_ACCESS_TOKEN`.

## Порядок выполнения (выполнен)
1. Создан `LunarReturns/package.json`.
2. Создан `LunarReturns/vk-hosting-config.json`.
3. Добавлен `LunarReturns/scripts/copy-build.js`.
4. Создан `.github/workflows/deploy-lunarreturns-vk.yml`.
5. Реализован авто-dev-деплой (без кода).
6. Реализован production-деплой (проверка кода + псевдо-TTY).
7. Добавлен `LunarReturns/README.md`.
8. Добавлен `LunarReturns/.gitignore`.
9. Выполнена валидация.

## Валидация (выполнена)
- JSON-конфиги (`vk-hosting-config.json`, `package.json`) парсятся корректно (`JSON.parse` OK).
- `node --check LunarReturns/scripts/copy-build.js` — синтаксис OK.
- Реальный запуск `node LunarReturns/scripts/copy-build.js` собрал корректное содержимое `build/` (index.html, sw.js, manifest.webmanifest, 1f319.webp, icons/, qr/).
- YAML воркфлоу валиден (проверено и `python3 yaml`, и `js-yaml`).

## Решения и допущения
- `app_id = 54746591` предоставлен пользователем.
- Интеграция VK Bridge (события `VKWebAppStorage*`) **не добавлялась** — вне скоупа, решено пользователем («деплой как есть»).
- Бампа версии кэша в `sw.js` **не требуется**: sw.js в VK-сборку не входит
  (см. `scripts/copy-build.js`), в мини-аппе SW/PWA не используются. Упомянутая
  ниже в README мысль про «новый scope после каждой выкладки» относилась к
  гипотетическому деплою sw.js и в VK-сборке неприменима — убрана 2026-09-01.

## Ограничения хостинга VK (зафиксировано)
- Не более 24 загрузок в сутки на приложение.
- До 10 production- и 100 staging-версий.
- Максимальный размер ZIP — 300 Мбайт.
- Аудио/видео размещать нельзя.

## Ручные шаги перед первым запуском (вне репозитория)
1. Получить сервисный ключ мини-аппа: «Разработка → Ключи доступа → Сервисный ключ».
2. Добавить секрет `MINI_APPS_ACCESS_TOKEN` в GitHub (Settings → Secrets and variables → Actions).
3. Запустить воркфлоу, выбрав окружение (для production — ввести код подтверждения от администратора).
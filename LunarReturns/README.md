# LunarReturns — VK Mini App

«Лунно-солнечные юбилеи» — статичное PWA, разворачиваемое на официальный хостинг
VK Mini Apps через GitHub Actions.

- `app_id`: **54746591**
- Конфигурация деплоя: [`vk-hosting-config.json`](./vk-hosting-config.json)
- Workflow: [`.github/workflows/deploy-lunarreturns-vk.yml`](../.github/workflows/deploy-lunarreturns-vk.yml)

## Подготовка (один раз)

1. Получите сервисный ключ мини-аппа.
   В панели разработчика: **Разработка → Ключи доступа → Сервисный ключ**.
   Либо скопируйте ключ, который печатает `vk-miniapps-deploy` при первом ручном
   деплое (он сохраняется в
   `~/.config/configstore/@vkontakte/vk-miniapps-deploy.json`).

2. Добавьте ключ как секрет репозитория GitHub:
   **Settings → Secrets and variables → Actions → New repository secret**.
   - Name: `MINI_APPS_ACCESS_TOKEN`
   - Value: ваш сервисный ключ

## Локальная сборка и проверка

```bash
cd LunarReturns
npm install
npm run build      # соберёт статику в папку build/
```

Содержимое `build/` — то, что уйдёт на хостинг VK.

## Запуск деплоя

В GitHub: **Actions → «Deploy LunarReturns to VK Mini Apps» → Run workflow**.

| Параметр            | Значение                                                        |
|---------------------|-----------------------------------------------------------------|
| `environment`       | `dev` (по умолчанию) или `production`                           |
| `confirmation_code` | код подтверждения; **обязателен только для `production`**       |

### dev

Автоматический деплой без подтверждения. Обновляет dev-URL мини-аппа.

### production

Требует `confirmation_code` — код, который приходит главному администратору при
деплое. Порядок:

1. Запросите код у администратора (приходит в момент запуска деплоя).
2. Запустите воркфлоу с `environment: production` и вставьте код в поле
   `confirmation_code`.

Если код неверен или истёк — воркфлоу упадёт, перезапустите с новым кодом.

> Альтернатива production-деплоя — локально (там есть полноценный TTY):
> ```bash
> cd LunarReturns
> MINI_APPS_ACCESS_TOKEN=<ключ> MINI_APPS_ENVIRONMENT=production npm run deploy
> ```

## Ограничения хостинга VK

- Не более **24 загрузок** в сутки на приложение.
- Хранится до 10 production- и 100 staging-версий.
- Максимальный размер ZIP-архива — 300 Мбайт.
- Аудио/видео размещать нельзя.
- URL мини-аппа меняется после каждой выкладки — сервис-воркер
  (`sw.js`) при этом автоматически переходит на новый scope, поэтому отдельная
  инвалидация кэша не требуется.
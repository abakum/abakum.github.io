# Plan: Один деплой VK вместо двух при production-выкладке LunarReturns

## Контекст

При запуске workflow «Deploy LunarReturns to VK Mini Apps» с чекбоксом `production`
версия загружается в VK hosting **дважды**: dev-шаг загружает версию для dev,
затем prod-шаг загружает ещё одну (идентичную по содержимому) версию. Причина —
два отдельных шага `npm run deploy` (`.github/workflows/deploy-lunarreturns-vk.yml:39-67`).

`vk-miniapps-deploy` без `MINI_APPS_ENVIRONMENT` деплоит сразу обе среды одной
загруженной версией (`environment = DEV|PROD`, index.js:402-409), что подтверждено
раном https://github.com/abakum/abakum.github.io/actions/runs/33611609004:
одна версия `1788339547`, VK обновил и dev- (`vk_app_dev_url`), и prod-URL
(`iframe_secure_url`).

## Решение (выбрано пользователем)

При `production=true` — **один** запуск деплоя без `MINI_APPS_ENVIRONMENT`
(обе среды, одна версия). При `production=false` — как сейчас, только dev.

## Изменения

### 1. `.github/workflows/deploy-lunarreturns-vk.yml`

Заменить два шага деплоя (dev и production) на один шаг «Deploy to VK hosting»:

```yaml
- name: Deploy to VK hosting
  working-directory: LunarReturns
  env:
    MINI_APPS_ACCESS_TOKEN: ${{ secrets.MINI_APPS_ACCESS_TOKEN }}
    # Без значения (пусто) утилита деплоит обе среды одной версией (dev+production);
    # 'dev' — только dev-окружение. Значение, отличное от dev/production,
    # также даёт обе среды (fallback на default в environmentMapping).
    MINI_APPS_ENVIRONMENT: ${{ github.event.inputs.production == 'true' && 'all' || 'dev' }}
    CI_URLS: 'true'
  run: |
    status=0
    npm run deploy > "$RUNNER_TEMP/deploy.log" 2>&1 || status=$?
    sed -E 's#https://[^[:space:]]*#[URL скрыт]#g' "$RUNNER_TEMP/deploy.log"
    exit $status
```

Примечания:
- `environmentMapping` инструмента знает только `dev` и `production`; любое другое
  значение (взят `all`) откатывается к default `DEV|PROD` — обе среды одной версией.
- Маскировка одной регуляркой `https://…` покрывает и stage-, и prod-URL
  (superset текущих двух sed).
- Комментарии в шаге переписать: объяснить одиночный деплой для обеих сред,
  автоматическое переключение dev-URL (`update_dev: 1`) и prod-URL
  (`update_prod: 1`), отсутствие кода подтверждения для сервисного ключа.

### 2. `LunarReturns/README.md`

Обновить разделы про деплой (строки ~36-93):
- Описать, что при отмеченном чекбоксе `production` выполняется один деплой,
  обновляющий dev- и prod-URL одной версией; без чекбокса — только dev.
- Убрать/скорректировать описание раздельных шагов dev/production, сохранить
  упоминания про маскировку URL в логе и про локальную альтернативу
  (`MINI_APPS_ENVIRONMENT=production npm run deploy` — локально по-прежнему валидно).

## Валидация

1. `act` недоступен — проверить YAML синтаксически (например,
   `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy-lunarreturns-vk.yml'))"`).
2. Запустить workflow вручную без чекбокса: в логе одна загрузка версии,
   только `URLs changed for dev`.
3. Запустить с чекбоксом `production`: в логе **одна** строка `Uploaded version N!`
   и оба блока `URLs changed for dev:` + `URLs changed for production:` (как в ран 33611609004).

## Риски / заметки

- Поведение при `production=true` меняется: dev-URL теперь указывает на ту же
  единственную версию, что и prod (раньше — на вторую из двух идентичных). По
  содержимому неразличимо (один коммит, одна сборка).
- `CI_URLS: 'true'` теперь ставится и для dev-запуска — влияет только на формат
  вывода URL (`vk_app_desktop_dev_url: ...`), которые всё равно маскируются.

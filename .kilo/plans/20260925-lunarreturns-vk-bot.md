# VK-бот юбилеев LunarReturns (Node.js)

## Цель
Бот сообщества ВКонтакте в `/home/koka/src/LunarReturns` (реализован):
- читает сообщения сообщества через **Long Poll**;
- на сообщение о человеке/паре сразу отвечает списком лунно-солнечных юбилеев
  и сохраняет запись в JSON-базу на диске. Формы триггера: `Костя 19630927`,
  `Дедушка Костя 1963-09-27 14:30`, `… 12:30 (МСК+2)`, `… 12:30 (Пермь)`,
  `… 12:30 UTC+5`;
- пара `Костя+Галя 19780512` — одна запись с одной датой, в списках годовщин
  добавляются названия свадеб (`WED` из приложения);
- каждый год в день записи бот в 09:00 МСК сам отправляет в тот же диалог
  сообщение со списком юбилеев;
- процесс живёт постоянно на машине koka, без cron (systemd-юнит).

## Источник логики
Порт из `LunarReturns/index.html`: `moonNew`, `la`, `legend`, титхи/зодиаки,
`CITY_ZONE`/`ZONE_EPOCHS`/`cityDiffMin`, нормализация в МСК из
`submitRecord()`, `WED`/`ageSuffix`.

## Устройство
Один файл `lunarreturns.js` (Node ≥ 18, без зависимостей): ASTRO, ГОРОДА,
РАЗБОР, ВЫВОД, STORE (db.json: записи {n,d,h,m} в МСК + peerId + lastSeen +
lastSentYear), VK (getLongPollServer/messages.send/messages.getHistory),
Long Poll цикл, планировщик на 09:00 МСК, `test`/`probe` режимы,
`lunarreturns.service.in` + `lunarreturns-install.sh` (systemd DynamicUser,
база в /var/lib/lunarreturns, токен в /etc/lunarreturns/.env).

Этот план реализован и закрыт; новые фичи — в отдельных планах.

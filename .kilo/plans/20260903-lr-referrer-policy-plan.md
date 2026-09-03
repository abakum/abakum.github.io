# План: запрет утечки launch-параметров VK через Referer

## Контекст

`LunarReturns/index.html` — VK Mini App: launch-параметры (`vk_app_id`, `sign` и др.) находятся в `location.search` весь срок жизни страницы. При кросс-origin запросах браузер прикрепляет заголовок `Referer`; в WebView со старой политикой по умолчанию (`no-referrer-when-downgrade`) уходит полный URL вместе с параметрами. Получатель (Yandex Cloud / S3 / любой сторонний сервер) сможет подделать подпись launch-параметров.

Кросс-origin запросы в коде, куда сейчас может утекать Referer:
- `FUNCTION_URL`, `PUSH_URL` → `functions.yandexcloud.net` (index.html:266–267, fetch на 1895, 2186)
- presigned-URL'ы Yandex Object Storage: `fetch(data.url)` (index.html:1753, 2086, 2104)
- навигация на `oauth.yandex.ru` (index.html:1811)

Мета-тег `referrer` / заголовок `Referrer-Policy` в проекте отсутствует (проверено grep'ом по `LunarReturns/`). `sw.js` делает fetch только same-origin — не затрагивается.

## Изменение

1. В `<head>` файла `LunarReturns/index.html` (после `<meta name="viewport">`, строка 5) добавить:

```html
<meta name="referrer" content="no-referrer">
```

Это рекомендация из https://github.com/VKCOM/vk-apps-launch-params («Запретите передавать параметры запуска через Referer»). `no-referrer`, а не `origin`, чтобы не отдавать даже origin stage-сборок.

## Совместимость (проверено, рисков нет)

- OAuth Яндекса (`location = "https://oauth.yandex.ru/..."`) не требует Referer.
- Presigned S3-URL и Yandex Cloud Functions не требуют Referer.
- vk-bridge использует postMessage/схему приложения, не HTTP — не затрагивается.

## Валидация

1. Открыть страницу, в DevTools → Network убедиться, что запросы к `functions.yandexcloud.net` уходят без заголовка `Referer`.
2. Прогнать существующие сценарии: `cloudPut`/`cloudGet` (📥/📤), вход через Яндекс (🔑), включение пушей (🔔) — должны работать как раньше.

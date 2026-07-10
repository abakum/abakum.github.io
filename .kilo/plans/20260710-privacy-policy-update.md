# Plan: Update Privacy Policy - Data Collection

## Цель
Обновить разделы политики конфиденциальности croc/privacy-policy.html для отражения факта сбора технических данных с хранением ТОЛЬКО на устройстве пользователя без передачи кому бы то ни было.

## Область изменений
Файл: `croc/privacy-policy.html`
Языки: en-US, tr-TR, ja-JP, zh-CN, ru-RU (все 5 языков)

## Изменяемые разделы

### 1. Раздел "Data Subject Rights" (Права субъекта данных)
**Строки:** 168-172 (все языковые блоки)

**Текущий текст (en-US):**
> Because crocson does not collect, store, or process any personal data, there is no personal data about you to access, correct, delete, restrict, or port. Consequently, no rights under data-protection laws (such as the GDPR) arise in connection with this app. If you nonetheless believe that crocson has handled any data improperly, you may contact us through the channel listed below.

**Новый текст (en-US):**
> crocson does not collect, store, or process personal data. The technical data collected is stored only on your device and is not personal information. Consequently, no rights under data-protection laws (such as the GDPR) arise in connection with this app regarding personal data. If you nonetheless believe that crocson has handled any data improperly, you may contact us through the channel listed below.

**Аналогично для других языков:**
- tr-TR (строка 169)
- ja-JP (строка 170)
- zh-CN (строка 171)
- ru-RU (строка 172)

### 2. Раздел "Data Storage" (Хранение данных)
**Строки:** 117-121 (все языковые блоки)

**Текущий текст (en-US):**
> crocson does <strong>not store</strong> user data. Files that you send or receive exist only for the duration of an active transfer session and remain on your device under your control. The app does not create or maintain any persistent store of personal information.

**Новый текст (en-US):**
> crocson stores <strong>only technical data locally</strong> on your device. The technical data listed above remains on your device under your control. Files that you send or receive exist only for the duration of an active transfer session and are not stored persistently. No personal information is collected or transmitted.

**Аналогично для других языков:**
- tr-TR (строка 118)
- ja-JP (строка 119)
- zh-CN (строка 120)
- ru-RU (строка 121)

### 3. Раздел "Data Collection" (Сбор данных)
**Строки:** 104-108 (все языковые блоки)

**Текущий текст (en-US):**
> crocson does <strong>not collect</strong> any personal or usage data. The app does not gather your name, email address, phone number, device identifiers, location, contacts, or any other information about you. No analytics, crash reporting, or telemetry of any kind is built into crocson.

**Новый текст (en-US):**
> crocson collects <strong>limited technical data</strong> solely for application functionality and diagnostics. This data includes:
> - Application logs (error logs, system startup, power consumption, diagnostics)
> - Device parameters (hardware/software settings, model, screen resolution, language, country/region, software version)
> - Operating system data
> - IP address
>
> All collected data is stored <strong>only on your device</strong> and is never transmitted to the developer or any third party.

**Аналогично для других языков:**
- tr-TR (строка 105)
- ja-JP (строка 106)
- zh-CN (строка 107)
- ru-RU (строка 108)

### 4. Дата "Last updated"
**Строки:** 64, 68, 72, 76, 80 (все языковые блоки)

**Текущая дата:** June 17, 2026
**Новая дата:** July 10, 2026

## Сохраняемые разделы (без изменений)
- Introduction (строки 91-95)
- Data Transmission (строки 130-146)
- Third-Party Services (строки 155-159)
- Children (строки 181-185)
- Changes to This Policy (строки 194-198)
- Author (строки 207-211)
- Contact (строки 220-224)

## Порядок выполнения

**Важно:** Выполнять от конца файла к началу, чтобы не сбивать нумерацию строк.

1. Обновить раздел "Data Subject Rights" для всех 5 языков (строки 168-172)
2. Обновить раздел "Data Storage" для всех 5 языков (строки 117-121)
3. Обновить раздел "Data Collection" для всех 5 языков (строки 104-108)
4. Обновить дату "Last updated" во всех 5 языковых блоках (строки 64, 68, 72, 76, 80)

## Валидация

После внесения изменений:
- Убедиться, что HTML-разметка не повреждена
- Проверить, что все 5 языковых блоков обновлены согласованно
- Убедиться, что акцент на локальном хранении данных присутствует во всех измененных разделах
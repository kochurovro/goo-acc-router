# Google Account Router — план подготовки к релизу на GitHub

**Формат:** SDD (Software Design Document) + AC (Acceptance Criteria).
**Дата:** 2026-09-05. **Текущее состояние:** один каталог `google-account-router-firefox/` (MV3, 4 файла кода + иконки), без git, без тестов, без сборки, без лицензии.

Документ описывает *что* и *почему*, а не пишет код. Каждый раздел заканчивается критериями приёмки с идентификаторами `AC-x.y`, по которым можно закрывать задачи.

---

## 0. Ключевые решения (TL;DR)

| Вопрос | Решение | Почему |
|---|---|---|
| Сколько «браузеров» реально нужно поддерживать | **Два движка**: Chromium и Gecko (Firefox). Safari — отдельная история, выносится в stretch | Из «топ-10» браузеров 7 работают на Chromium и ставят расширения из Chrome Web Store; ещё 3 — форки Firefox и ставят из AMO |
| Как из одного исходника получить оба таргета | `src/` общий + `manifest/base.json` + два патча (`chromium.json`, `firefox.json`); сборка — один скрипт на Node **без npm‑зависимостей** | Код уже написан кросс‑браузерно (`browser ?? chrome`, `importScripts`), различается только `background` в манифесте |
| Бандлер / минификация | **Нет.** Файлы копируются как есть | Читаемость для аудита («параноики»), воспроизводимость сборки, простая ревизия в сторах |
| Лицензия | **MIT** | Максимально простая, совместима со сторами, не отпугивает форки |
| Тесты | 3 слоя: чистые функции в `node:test` (без браузера) → логика редиректа с фейковым `browser.*` API (без браузера) → headless Chromium через Playwright (без GUI, но с настоящим движком) | Ответ на «как тестировать браузер без браузера»: 90 % логики от браузера не зависит, если её отделить |
| CI/CD | GitHub Actions: `ci.yml` на каждый PR, `release.yml` на тег `v*` → zip'ы, подписанный `.xpi`, `SHA256SUMS`, provenance‑аттестация, GitHub Release | Стандарт; всё бесплатно для публичного репо |
| Сборка руками | `git clone` → `node scripts/build.mjs` → «Load unpacked». Сборка **детерминированная**: хеш локального zip совпадает с `SHA256SUMS` релиза | Позволяет проверить, что в сторе лежит то же, что в исходниках |

---

## 1. Установка на популярные браузеры

### 1.1 Анализ

Рыночный «топ‑10» десктопных и мобильных браузеров и что для них означает установка:

| Браузер | Движок | Канал установки | Что нужно от нас |
|---|---|---|---|
| Chrome | Chromium | Chrome Web Store (CWS) | публикация в CWS, $5 разовый взнос за аккаунт разработчика |
| Edge | Chromium | CWS (ставится напрямую) или Edge Add‑ons | ничего сверх CWS; Edge Add‑ons — опционально, бесплатно |
| Brave, Opera, Vivaldi, Arc, Yandex | Chromium | CWS | ничего сверх CWS |
| Firefox | Gecko | addons.mozilla.org (AMO) | публикация в AMO (бесплатно) или self‑hosted подписанный `.xpi` |
| Zen, LibreWolf, Waterfox, Firefox Android | Gecko | AMO / подписанный `.xpi` | ничего сверх AMO |
| Safari (macOS/iOS) | WebKit | App Store через Xcode‑обёртку | Apple Developer Program ($99/год), macOS, Xcode, отдельный App Store review |
| Samsung Internet, Chrome Android | — | расширения не поддерживаются | не делаем |

Вывод: **два артефакта покрывают всё, что технически возможно без Apple**. Safari — stretch‑цель (см. 1.4).

### 1.2 Дизайн: один исходник, два манифеста

```
src/                       # общий код, копируется в оба таргета
  background.js
  services.js
  popup.html  popup.js
  icons/
  _locales/en/messages.json   # см. 1.3 (i18n)
  _locales/ru/messages.json
manifest/
  base.json                # всё общее
  chromium.json            # { "background": { "service_worker": "background.js" } }
  firefox.json             # { "background": { "scripts": ["services.js","background.js"] },
                           #   "browser_specific_settings": { "gecko": {...} } }
scripts/build.mjs          # merge base+target → dist/<target>/ + dist/<target>.zip
dist/                      # gitignored
```

Различия таргетов, которые нужно зафиксировать:

1. **`background`.** Chrome MV3 требует `service_worker`, Firefox в стабильной ветке поддерживает только `scripts` (event page). Текущий `background.js` уже обрабатывает оба случая через `importScripts` — оставить.
2. **`browser_specific_settings`** нужен только Firefox; в Chrome даёт предупреждение при загрузке. Убрать из chromium‑манифеста.
3. **`gecko.id`.** Сейчас `google-account-router@example.com` — **это нельзя оставлять**: id фиксируется при первой подписи в AMO навсегда. Заменить на реальный домен автора или UUID **до** первого релиза.
4. **`strict_min_version: 115`** — оставить (MV3 в Firefox стабилен с 109, event pages с 115).
5. **Chrome service worker** может быть выгружен в любой момент, `recent: Map` в памяти при этом теряется. Для кулдауна в 15 с это приемлемо — задокументировать как осознанное решение в комментарии, не тащить в `storage.session`.

### 1.3 Сопутствующие изменения кода (до релиза)

Это не «фичи», а то, без чего сторы завернут или пользователи вне РФ не поймут:

- **i18n.** Название/описание в манифесте и все строки popup — через `__MSG_*__` и `browser.i18n.getMessage`. Локали `en` (default) и `ru`. CWS показывает `default_locale`; description на русском для англоязычного стора — минус на ревью.
- **Разрешения.** `"tabs"` можно убрать: `tabs.query` возвращает `url` для вкладок, покрытых `host_permissions` (`*.google.com`, `*.youtube.com`), а `tabs.update` не требует `tabs`. Меньше permissions → меньше вопросов на ревью и в предупреждении при установке. Проверить в обоих браузерах (AC‑5.6).
- **Версия.** Единственный источник истины — `manifest/base.json → version`. Тег git обязан совпадать (проверяется в CI, AC‑4.4).

### 1.4 Stretch: Safari

Конвертация через `xcrun safari-web-extension-converter dist/chromium` даёт Xcode‑проект. Технически расширение должно заработать (API совместимы), но публикация требует платного аккаунта Apple и ревью App Store. В план v1.0 не входит; в README указать «Safari: см. issue #N», чтобы не отвечать на один и тот же вопрос.

### AC‑1

- **AC‑1.1** `node scripts/build.mjs` создаёт `dist/chromium/` и `dist/firefox/`, каждый с валидным `manifest.json`, и соответствующие `.zip`.
- **AC‑1.2** `dist/chromium/manifest.json` содержит `background.service_worker` и **не** содержит `browser_specific_settings`; `dist/firefox/manifest.json` содержит `background.scripts` и `browser_specific_settings.gecko.id`, отличный от `*@example.com`.
- **AC‑1.3** Расширение из `dist/chromium` загружается через «Load unpacked» в Chrome, Edge и Brave без ошибок и предупреждений на странице `chrome://extensions`.
- **AC‑1.4** Расширение из `dist/firefox` загружается через `about:debugging → Load Temporary Add‑on`; `web-ext lint` даёт 0 errors, 0 warnings.
- **AC‑1.5** Название и описание расширения отображаются на английском в браузере с английской локалью и на русском — с русской (`_locales`).
- **AC‑1.6** В README есть таблица «браузер → способ установки» минимум для Chrome, Edge, Brave, Opera, Vivaldi, Arc, Firefox, Zen/LibreWolf, Firefox Android, с явной пометкой про Safari.
- **AC‑1.7** (после публикации) Ссылки на CWS и AMO в README ведут на живые страницы; установка одним кликом.

---

## 2. Лицензия

### 2.1 Дизайн

- **MIT** в `LICENSE` в корне репозитория. Альтернатива — Apache‑2.0 (явная патентная лицензия), но для расширения из 200 строк это избыточно и хуже читается неюристами.
- Строка `"license": "MIT"` в `package.json`; сторы (CWS/AMO) — поле «License» в листинге тоже MIT.
- Иконки: сейчас неизвестного происхождения. Либо подтвердить авторство, либо перерисовать, либо указать источник и лицензию в `ICONS.md`/README. Сторы проверяют это выборочно, но претензия по товарному знаку Google — реальный риск, если иконка похожа на логотип Google. **Не использовать «G»‑логотип и фирменные цвета Google в иконке.**
- Название. «Google Account Router» содержит товарный знак. CWS/AMO обычно пропускают формулировки вида «for Google», но могут отклонить название, начинающееся с «Google». Безопасный вариант: **«Account Router for Google»**. Решить до создания листингов (переименование после публикации — боль).
- **Privacy Policy** — обязательна для CWS (у нас `host_permissions` и `storage`). Отдельный `docs/PRIVACY.md`, опубликованный через GitHub Pages или как raw‑ссылка. Содержание: расширение не собирает и не передаёт данные; хранит только список e‑mail и настройки в `storage.sync` браузера; сетевых запросов не делает.

### AC‑2

- **AC‑2.1** `LICENSE` (MIT, текущий год, имя автора) лежит в корне; GitHub определяет лицензию автоматически (бейдж в шапке репо).
- **AC‑2.2** Все файлы `src/**/*.js` имеют SPDX‑заголовок `// SPDX-License-Identifier: MIT` (одна строка, не «шапка на 20 строк»).
- **AC‑2.3** Происхождение и лицензия иконок задокументированы; иконка не воспроизводит логотип Google.
- **AC‑2.4** `docs/PRIVACY.md` существует, доступен по публичному URL, и этот URL указан в README и в листинге CWS.
- **AC‑2.5** Решение по названию (с «Google» в начале или «…for Google») принято и зафиксировано в `manifest/base.json` и `_locales`.

---

## 3. README и сопутствующие документы

### 3.1 Структура README.md (на английском; русская версия — `README.ru.md`, ссылка в шапке)

1. Одна фраза: что делает. Скриншот popup (1 изображение, ≤ 200 KB, в `docs/img/`).
2. **How it works** — три предложения: слушает навигацию на домены Google, если для сервиса задан аккаунт по умолчанию и в URL нет `authuser`/`/u/N/`, добавляет `?authuser=email`. Пароли не хранятся, сетевых запросов нет.
3. **Install** — таблица из 1.1 + ссылки на сторы + раздел «from source» (ссылка на §6).
4. **Usage** — добавить e‑mail'ы аккаунтов, в которые уже выполнен вход; выбрать аккаунт по умолчанию для сервисов; переключатель авто‑подстановки; ручное переключение из popup.
5. **Limitations** — честно: работает только для аккаунтов, в которые уже выполнен вход в этом профиле браузера; Google иногда игнорирует `authuser` для некоторых сервисов; iframe'ы не обрабатываются; нет поддержки Safari.
6. **Privacy** — ссылка на `docs/PRIVACY.md` + список разрешений с объяснением каждого (`storage`, `webNavigation`, host permissions).
7. **Building from source / Verifying a release** — ссылка на §6.
8. **Contributing**, **License**.

### 3.2 Остальные файлы

| Файл | Зачем |
|---|---|
| `CHANGELOG.md` | Keep a Changelog; секция `[Unreleased]`; релизная заметка на GitHub копируется отсюда |
| `CONTRIBUTING.md` | Как запустить тесты, как собрать, стиль (без бандлера, без зависимостей в рантайме), что менять в `services.js` при добавлении сервиса |
| `SECURITY.md` | Куда писать об уязвимости (e‑mail), что считаем уязвимостью |
| `docs/STORE_LISTING.md` | Тексты для CWS/AMO (краткое/полное описание en+ru, обоснование каждого permission — CWS требует это в форме) |
| `docs/TESTING.md` | Ручной чек‑лист (см. §5.5) |
| `.github/ISSUE_TEMPLATE/bug.yml` | Поля: браузер+версия, сервис, URL до/после, включена ли авто‑подстановка |

### AC‑3

- **AC‑3.1** README.md содержит все 8 разделов из 3.1; человек, не видевший код, за 2 минуты понимает, что делает расширение и как его поставить в свой браузер.
- **AC‑3.2** Каждое разрешение из манифеста объяснено одной строкой в README.
- **AC‑3.3** Раздел Limitations содержит минимум 4 пункта выше.
- **AC‑3.4** Существуют `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/STORE_LISTING.md`, `docs/TESTING.md`, шаблон issue.
- **AC‑3.5** Все ссылки в README проходят проверку (`lychee` или аналог в CI — см. §4).

---

## 4. CI/CD

### 4.1 Дизайн

Два workflow + Dependabot.

**`ci.yml`** — на `push` в `main` и на каждый PR:

```
lint      → node scripts/build.mjs, web-ext lint dist/firefox, eslint src/ (только ошибки, без стилевых войн)
unit      → node --test test/unit/           (Node 20 LTS и 22)
e2e       → npx playwright test              (headless Chromium, см. §5.3)
build     → артефакты dist/*.zip прикрепляются к run (для ручной проверки PR)
links     → lychee README.md docs/          (только на PR, allow-failure)
```

**`release.yml`** — на тег `v*`:

1. Проверка: `manifest/base.json.version == ${GITHUB_REF_NAME#v}`, иначе fail.
2. Проверка: в `CHANGELOG.md` есть секция для этой версии.
3. Полный прогон `ci` (lint + unit + e2e).
4. Сборка **детерминированная** (§6.2): `google-account-router-<ver>-chromium.zip`, `google-account-router-<ver>-firefox.zip`.
5. `web-ext sign --channel unlisted` → `google-account-router-<ver>.xpi` (secrets `AMO_JWT_ISSUER`, `AMO_JWT_SECRET`). Это self‑hosted подпись, не публикация в каталог AMO; листинг в AMO делается отдельно (шаг 6).
6. *(Опционально, отдельный job с `environment: stores` и ручным approve)* публикация: `chrome-webstore-upload-cli` в CWS (secrets `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_EXTENSION_ID`) и `web-ext sign --channel listed` в AMO.
7. `sha256sum *.zip *.xpi > SHA256SUMS`.
8. `actions/attest-build-provenance` на все артефакты (SLSA‑provenance — «параноики» смогут проверить `gh attestation verify`).
9. `softprops/action-gh-release`: тело — секция из CHANGELOG, файлы — zip'ы, xpi, SHA256SUMS.

**Ограничения GitHub Actions**: `permissions: contents: write, id-token: write, attestations: write` только в release‑workflow; в `ci.yml` — `contents: read`. Все сторонние actions пиннуются по SHA, не по тегу.

**`dependabot.yml`**: `github-actions` weekly, `npm` weekly (у нас только dev‑зависимости: playwright, web-ext, eslint).

### 4.2 Стратегия веток и релизов

`main` — защищённая, только через PR с зелёным CI. Релиз = `CHANGELOG` + bump версии в `manifest/base.json` одним коммитом → тег `vX.Y.Z` (подписанный, `git tag -s`). Версии — SemVer; для манифеста используется трёхчастная форма (`1.0.0`), обе платформы её принимают.

### AC‑4

- **AC‑4.1** PR с намеренно сломанным `manifest/base.json` (например, невалидный JSON) — красный CI на job `lint`.
- **AC‑4.2** PR с падающим unit‑тестом — красный CI на job `unit`; сообщение показывает имя теста.
- **AC‑4.3** На каждом зелёном run в `main` доступны артефакты `dist-chromium.zip` и `dist-firefox.zip`.
- **AC‑4.4** Тег `v1.0.1` при `version: "1.0.0"` в манифесте — release workflow падает на первом шаге с понятным сообщением.
- **AC‑4.5** Тег `v1.0.0` при корректной версии — создаётся GitHub Release с 4 файлами: 2 zip, 1 xpi, `SHA256SUMS`, тело релиза = секция CHANGELOG.
- **AC‑4.6** `gh attestation verify google-account-router-1.0.0-chromium.zip --owner <owner>` возвращает успех.
- **AC‑4.7** `.xpi` из релиза устанавливается в стабильный Firefox без изменения `about:config` (значит, подпись валидна).
- **AC‑4.8** Все `uses:` в workflow — с SHA‑пином; Dependabot открывает PR при обновлении.
- **AC‑4.9** Секреты сторов не требуются для прохождения `ci.yml`; форк без секретов — зелёный.

---

## 5. Тестирование. «Как тестировать браузер без браузера?»

### 5.1 Ответ

Никак — и не нужно. Задача разбивается на три слоя, и только последний требует браузер, причём headless (без окна, работает на CI‑машине без дисплея):

| Слой | Что проверяет | Чем | Браузер нужен? |
|---|---|---|---|
| L1 — чистые функции | `serviceForUrl`, `urlHasAccount`, `withAccount`, `SERVICES` | `node:test` (встроен в Node, 0 зависимостей) | нет |
| L2 — логика редиректа и popup | «должны ли мы редиректить и куда» при данных settings/URL/кулдауне; сохранение настроек | `node:test` + рукописный фейк `browser.*` (in‑memory storage, tabs) | нет |
| L3 — интеграция с движком | манифест валиден, SW стартует, listener реально перехватывает навигацию, popup открывается | Playwright + headless Chromium с `--load-extension` | да, headless |
| L4 — ручной чек‑лист | реальные аккаунты Google, Firefox, Edge, мобильный Firefox | человек перед релизом | да |

Ключевое условие для L1/L2: **отделить логику от browser API**. Сейчас `background.js` — один анонимный listener, который и читает storage, и решает, и вызывает `tabs.update`. Нужен небольшой рефакторинг.

### 5.2 Рефакторинг под тестируемость (без изменения поведения)

```
src/services.js   — как есть (уже чистый, уже экспортирует через module.exports)
src/router.js     — НОВЫЙ, чистый:
    decide({ url, frameId, tabId }, settings, recentEntry, now) → { redirectTo } | { skip: reason }
    switchUrl(tabUrl, email) → url          // логика из onMessage "switch" (убрать /u/N/, поставить authuser)
src/background.js — только клей: подписки на события, чтение storage, вызов decide(), tabs.update
```

`decide()` возвращает *причину* пропуска (`not-google`, `has-account`, `disabled`, `no-default`, `unknown-account`, `cooldown`, `iframe`) — это одновременно и тестируемость, и отладка (можно логировать в dev‑сборке).

Для загрузки в трёх средах (Firefox `background.scripts`, Chrome `importScripts`, Node `require`) сохраняется текущий паттерн `if (typeof module !== "undefined") module.exports = …`. ES‑модули не вводим: в Firefox background scripts они поддерживаются с 115 через `type: module`, но это ещё одно различие манифестов ради нуля пользы.

### 5.3 Набор тестов

**L1 — `test/unit/services.test.mjs`** (таблично, ~40 кейсов):

- `mail.google.com` → gmail; `docs.google.com/spreadsheets/…` → docs; `music.youtube.com` → youtube; `www.google.com/maps/place/…` → maps.
- Отрицательные: `accounts.google.com` → null (**критично**: редирект на странице логина = петля), `www.google.com/search` → null, `google.com.evil.io` → null, `chrome://extensions` → null, `about:blank` → null, мусорная строка → null.
- `urlHasAccount`: `?authuser=0`, `?authuser=a@b.c`, `/u/1/`, `/u/12` (конец пути) → true; `/user/1` → false; `?foo=bar` → false.
- `withAccount` сохраняет существующие query/hash, кодирует `@` корректно, перезаписывает существующий `authuser` (если функция всё же вызвана).

**L2 — `test/unit/router.test.mjs`**:

- Каждая причина `skip` по одному кейсу + happy path.
- Кулдаун: два вызова с одним `tabId`/`service` в пределах 15 с → второй `skip: cooldown`; спустя 15 001 мс → редирект; другой `service` на том же tab — редирект.
- `switchUrl`: `docs.google.com/u/2/document/d/x?foo=1` + `a@b.c` → `docs.google.com/document/d/x?foo=1&authuser=a%40b.c`.

**L2 — `test/unit/popup.test.mjs`** (опционально, через `jsdom`): добавление e‑mail нормализует регистр и не дублирует; удаление аккаунта чистит `defaults`; невалидный e‑mail не сохраняется. Если не хочется тянуть jsdom — вынести `normalizeEmail`/`removeAccount(state, email)` в `src/state.js` и тестировать их как чистые функции. **Рекомендуется второй вариант.**

**L3 — `test/e2e/extension.spec.ts`** (Playwright, только Chromium, headless):

```
fixture: chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true,     // Playwright ≥1.49 поддерживает расширения в headless
  args: ['--disable-extensions-except=dist/chromium', '--load-extension=dist/chromium'] })
```

- `SW стартует`: `context.serviceWorkers()` содержит воркер расширения, в консоли нет ошибок.
- `popup рендерится`: открыть `chrome-extension://<id>/popup.html`, добавить `a@b.c`, выбрать default для Gmail, перезагрузить страницу — состояние сохранилось (проверяет `storage.sync` через реальный движок).
- `редирект происходит`: **без сети** — `context.route('**/*', r => r.abort())`, затем `page.goto('https://mail.google.com/')` (ожидаем ошибку загрузки, это нормально). Проверяем `page.url()` содержит `authuser=a%40b.c`. `onBeforeNavigate` срабатывает до сетевого запроса, поэтому тест герметичен и не зависит от Google.
- `не редиректит accounts.google.com` и `не редиректит при выключенном тумблере`.

Firefox в Playwright расширения не поддерживает. Для Gecko на CI ограничиваемся `web-ext lint` (валидация манифеста и API против схем Firefox) — это ловит 80 % проблем «в Chrome работает, в Firefox нет». Полноценный Firefox‑e2e через `geckodriver`/Selenium — stretch.

### 5.4 Что НЕ тестируем автоматически (и почему)

- Поведение Google после `authuser=` (Google может редиректить, убирать параметр, требовать re‑login). Это внешняя система, меняется без предупреждения → ручной чек‑лист.
- Синхронизацию `storage.sync` между устройствами.
- Визуальный вид popup (нет смысла в snapshot‑тестах для 100 строк CSS).

### 5.5 Ручной чек‑лист (`docs/TESTING.md`), выполняется перед тегом

Для Chrome и Firefox, с двумя реальными аккаунтами Google: (1) Gmail открывается в аккаунте по умолчанию; (2) ссылка с `/u/1/` не трогается; (3) переключение из popup работает и не зацикливается; (4) отключение тумблера прекращает редиректы; (5) удаление аккаунта убирает его из defaults; (6) Docs‑ссылка из письма открывается в нужном аккаунте; (7) YouTube; (8) Maps. Результат фиксируется в PR релиза как таблица «браузер × пункт».

### AC‑5

- **AC‑5.1** `npm test` (= `node --test`) проходит за < 5 с без установленных браузеров и без сети; покрытие `services.js` и `router.js` — 100 % строк (проверяется `node --test --experimental-test-coverage`, порог в CI).
- **AC‑5.2** `background.js` не содержит условной логики кроме подписок и вызова `decide()`; вся логика решения — в `router.js` с `module.exports`.
- **AC‑5.3** Есть unit‑тест, доказывающий, что `accounts.google.com` и `www.google.com/search` не редиректятся.
- **AC‑5.4** `npx playwright test` проходит в headless Chromium на CI (ubuntu‑latest) и локально; тесты не делают реальных сетевых запросов к Google.
- **AC‑5.5** `web-ext lint dist/firefox` — 0 errors.
- **AC‑5.6** После удаления `"tabs"` из permissions e2e‑тест popup и ручной пункт (3) проходят в Chrome и Firefox; если нет — разрешение возвращается, а причина фиксируется в `docs/STORE_LISTING.md`.
- **AC‑5.7** `docs/TESTING.md` содержит чек‑лист из 5.5; в PR релиза `v1.0.0` приложена заполненная таблица.

---

## 6. Сборка руками «для параноиков»

### 6.1 Принципы

1. **Ноль зависимостей для сборки.** `scripts/build.mjs` использует только `node:fs`, `node:path`, `node:zlib`/`node:child_process` (zip через системный `zip` или собственная минимальная реализация). `npm install` нужен только для тестов и линтера. Человек с одним Node (или даже без него — см. 6.4) собирает расширение.
2. **Никакой трансформации кода.** Файлы в `dist/` побайтово равны файлам в `src/`, кроме `manifest.json` (мердж JSON). Аудитор читает `src/`, сравнивает с `dist/` через `diff -r`.
3. **Детерминированная сборка.** Одинаковый коммит → одинаковый zip → одинаковый SHA‑256, на любой машине.
4. **Никаких удалённых ресурсов в рантайме.** CSP расширения по умолчанию запрещает inline и remote‑скрипты; мы это не ослабляем. В коде нет `fetch`, нет `<script src="http…">`.

### 6.2 Детерминированность zip

Zip недетерминирован из‑за mtime файлов и порядка обхода. Решение в `build.mjs`: отсортированный список файлов; `SOURCE_DATE_EPOCH` (берётся из `git log -1 --format=%ct` или фиксированная дата из манифеста) выставляется как mtime всех записей; без extra‑полей (`zip -X`), без каталогов‑записей, один и тот же уровень сжатия. Если zip делается через системный `zip`: `TZ=UTC find … | sort | zip -X -q -@` после `touch -d @$SOURCE_DATE_EPOCH`. CI использует **тот же скрипт**, поэтому хеш из `SHA256SUMS` релиза воспроизводим локально.

`.xpi` детерминированным быть не может (подпись Mozilla), поэтому для Firefox‑параноиков публикуется и неподписанный `firefox.zip` с инструкцией по временной установке / по Developer Edition.

### 6.3 Документ `docs/BUILD.md` (ссылка из README «Building from source»)

Секции:

1. **Что вы будете проверять** — список из 4 файлов кода и манифеста; краткое описание каждого; «весь код — ~250 строк, без минификации».
2. **Сборка**: `git clone … && git checkout v1.0.0 && node scripts/build.mjs`. Требования: Node ≥ 20. Никакого `npm install`.
3. **Проверка релиза**: `sha256sum dist/*.zip` и сравнение с `SHA256SUMS` из GitHub Release; `gh attestation verify` для provenance; `git tag -v v1.0.0` для проверки GPG‑подписи тега (публичный ключ автора — в `docs/KEY.asc` и на GitHub).
4. **Установка без сторов**:
   - Chromium: `chrome://extensions` → Developer mode → Load unpacked → `dist/chromium`. Предупредить: Chrome будет показывать баннер «Disable developer mode extensions» при каждом старте; это нормально; альтернатива — enterprise‑policy `ExtensionInstallForcelist`, для домашнего пользователя не советуем.
   - Firefox: `about:debugging#/runtime/this-firefox` → Load Temporary Add‑on → `dist/firefox/manifest.json` (слетает при перезапуске). Постоянно: Firefox Developer Edition/Nightly/ESR + `xpinstall.signatures.required=false`, или подписанный `.xpi` из релиза (подпись Mozilla — не наша; можно проверить, что распакованный `.xpi` побайтово равен `firefox.zip` минус `META-INF/`).
5. **Проверка, что в сторе лежит то же самое**: CWS — скачать `.crx` по id (crx4chrome/`chrome-extension-downloader` или напрямую из `~/Library/Application Support/Google/Chrome/Default/Extensions/<id>/<ver>/`), `diff -r` с `dist/chromium`. AMO — скачать `.xpi`, распаковать, `diff -r` с `dist/firefox` игнорируя `META-INF`.

### 6.4 Совсем без Node

Для тех, кто не доверяет даже `build.mjs`: описать в `BUILD.md` ручной путь — скопировать `src/` в папку, положить рядом нужный `manifest.json` (готовые собранные манифесты для обоих таргетов **коммитятся** в `manifest/generated/` при релизе, чтобы их можно было просто скопировать) и загрузить как unpacked. Итого 4 действия мышкой.

### AC‑6

- **AC‑6.1** На чистой машине с Node 20 и без `npm install` команда `node scripts/build.mjs` завершается успешно.
- **AC‑6.2** `diff -r src/ dist/chromium/` показывает различия только в `manifest.json` (и отсутствие `_locales`‑файлов чужого таргета, если применимо).
- **AC‑6.3** Две сборки одного коммита на разных ОС (macOS и Linux в CI) дают одинаковые SHA‑256 обоих zip.
- **AC‑6.4** Хеш локально собранного `google-account-router-1.0.0-chromium.zip` совпадает с `SHA256SUMS` в GitHub Release v1.0.0.
- **AC‑6.5** `docs/BUILD.md` содержит секции 1–5 из 6.3; инструкция по Load unpacked проверена в Chrome и Firefox.
- **AC‑6.6** `unzip -l` любого zip показывает одинаковый timestamp у всех записей и отсутствие каталогов‑записей.
- **AC‑6.7** В коде отсутствуют `fetch`, `XMLHttpRequest`, `eval`, `new Function`, `innerHTML` с пользовательскими данными (grep‑проверка в CI `lint`; текущие `innerHTML = ""` — допустимы, отметить в правиле).
- **AC‑6.8** Тег релиза подписан GPG; публичный ключ доступен в репо и на профиле GitHub.

---

## 7. Порядок работ

| Фаза | Содержание | Зависит от | Оценка |
|---|---|---|---|
| **P0 Репо и гигиена кода** | `git init`, структура из §1.2, перенос кода в `src/`, рефакторинг `router.js` (§5.2), gecko.id, i18n, решение по названию и иконке, удаление `tabs` (проверить) | — | 1 день |
| **P1 Сборка** | `scripts/build.mjs`, детерминированность, `manifest/*`, `.gitignore` | P0 | 0,5 дня |
| **P2 Тесты** | L1, L2 в `node:test`; L3 Playwright; `docs/TESTING.md` | P0, P1 | 1 день |
| **P3 Документы** | LICENSE, README (en+ru), CHANGELOG, CONTRIBUTING, SECURITY, PRIVACY, STORE_LISTING, BUILD | P0 | 0,5–1 день |
| **P4 CI** | `ci.yml`, `dependabot.yml`, branch protection | P1, P2 | 0,5 дня |
| **P5 Релиз** | AMO‑аккаунт + API‑ключи, CWS‑аккаунт ($5), `release.yml`, GPG‑ключ, тег `v1.0.0`, ручной чек‑лист, GitHub Release | P3, P4 | 0,5 дня + время ревью сторов (AMO — часы‑дни, CWS — дни) |
| **P6 Stretch** | Edge Add‑ons листинг, Firefox e2e через geckodriver, Safari‑конвертация | P5 | по желанию |

Критический путь: P0 → P1 → P2 → P4 → P5. Документы (P3) можно писать параллельно.

**Definition of Done для v1.0.0:** все AC‑1…AC‑6 закрыты, кроме помеченных «после публикации» (AC‑1.7) и stretch; GitHub Release `v1.0.0` существует с 4 артефактами; заявки в CWS и AMO поданы.

---

## 8. Открытые вопросы (решить в P0)

1. Название: «Google Account Router» или «Account Router for Google»? (влияет на §2, листинги, `_locales`).
2. Реальный `gecko.id`: домен автора (`…@kochurov.dev`‑стиль) или UUID?
3. Иконки: откуда, нужно ли перерисовывать?
4. Публиковать ли в CWS в v1.0.0 (нужен $5 и Google‑аккаунт разработчика) или сначала только AMO + GitHub Release для Chromium‑пользователей через Load unpacked?
5. Кто владелец GPG‑ключа для подписи тегов и где хранится AMO/CWS‑секрет (GitHub Environments с required reviewers?).

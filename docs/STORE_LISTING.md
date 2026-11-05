# Chrome Web Store listing — Goo Account Router

Ready-to-paste fields for the Chrome Web Store developer dashboard (also usable for AMO).
The extension name and the short description come from `_locales/*/messages.json` (`name`, `description`);
the store shows them per browser language. Keep both in sync with this file.

| Field | Value |
|---|---|
| Package | `dist/goo-account-router-<version>-chromium.zip` (`npm run build:chromium`) |
| Category | Productivity → Workflow & Planning |
| Language | English (default), Russian |
| Privacy policy URL | https://goo-account-router.web.app/privacy |
| Remote code | No |
| License | MIT |

---

## English

### Name

Goo Account Router

### Short description (≤132 characters, from `_locales/en/messages.json`)

Open each Google service in the account you choose: Gmail in your work account, YouTube in your personal one.

### Detailed description

If you are signed in to several Google accounts in one browser, Google opens every service in whichever account it considers "first". Goo Account Router fixes that: pick a default account once per service, and every link to that service opens in the right account.

How it works
• Add the email addresses of the accounts you are already signed in to.
• For each service — Gmail, Drive, Docs, Calendar, Meet, YouTube, Maps, Cloud Console, Admin, Gemini and more — choose the default account, or leave it unchanged.
• When you open a link to that service, the extension adds Google's own `authuser=` parameter so the page opens in the chosen account.
• On any Google page, the popup lets you reopen the current page in another account with one click.
• A toggle turns automatic switching off at any time.

Privacy
• No passwords, cookies or browsing history are stored. Sign-in is still handled by Google.
• Your account list and settings live in the browser's own sync storage. Only anonymous daily usage stats (browser, OS, version, number of accounts and switches as ranges — no emails, no URLs, no ID) are sent to the developer; turn them off in the popup.
• Access is limited to google.com and youtube.com pages.

Open source (MIT). Not affiliated with or endorsed by Google.

### Single purpose

Open Google services in the Google account the user has chosen as the default for that service, by adding Google's `authuser` parameter to the URL.

### Permission justifications

- **storage** — Saves the user's list of account email addresses, the default account chosen for each service, and the on/off toggle in `storage.sync`. Nothing else is stored.
- **webNavigation** — Detects when a tab starts navigating to a Google service (`onBeforeNavigate`, top frame only) so the extension can redirect it to the same URL with `authuser=<chosen account>` before the page loads. The URL is checked in memory and not stored or sent anywhere.
- **Host permissions `*://*.google.com/*`, `*://*.youtube.com/*`** — Needed to read the URL of the active tab on these sites (to show "Open <service> as …" in the popup and to switch the current page to another account) and to redirect navigations on these sites to the chosen account. These are the only domains where Google services live; the extension has no access to any other site.

### Remote code

No, I am not using remote code. All JavaScript is included in the package; there is no `eval`, no remotely loaded scripts or modules.

### Data usage disclosure

What user data is collected:
- [x] **Personally identifiable information** — email addresses of the user's Google accounts, entered by the user. Stored in the browser's `storage.sync` (kept on the device, or synced between the user's own devices by the browser's sync if the user has it enabled). Never sent to the developer or any third party.
- [ ] Health information
- [ ] Financial and payment information
- [ ] Authentication information — not collected (no passwords, cookies or tokens).
- [ ] Personal communications
- [ ] Location
- [ ] Web history — not collected: URLs on google.com / youtube.com are examined in memory to decide on a redirect and are not stored or transmitted.
- [x] **User activity** — an anonymous daily usage ping: how many times accounts were switched automatically and from the popup, failures, and the number of accounts used, all as ranges; plus the shape of the settings (number of accounts, toggles, services with exceptions) and the browser, OS and extension version. No identifier, no URLs, no emails or domains. Stored in the developer's Firebase project. Firefox: controlled by the data-collection permission.
- [ ] Website content

Certifications (all checked):
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

---

## Русский

### Название

Goo Account Router

### Краткое описание (≤132 символа, из `_locales/ru/messages.json`)

Открывает каждый сервис Google в нужном аккаунте: Gmail в рабочем, YouTube в личном.

### Подробное описание

Если в браузере открыто несколько Google-аккаунтов, Google открывает каждый сервис в том аккаунте, который считает «первым». Goo Account Router это исправляет: один раз выберите аккаунт по умолчанию для каждого сервиса — и любая ссылка на этот сервис откроется в нужном аккаунте.

Как это работает
• Добавьте e-mail'ы аккаунтов, в которые вы уже вошли в браузере.
• Для каждого сервиса — Gmail, Диск, Документы, Календарь, Meet, YouTube, Карты, Cloud Console, Admin, Gemini и других — выберите аккаунт по умолчанию или оставьте как есть.
• Когда вы открываете ссылку на сервис, расширение добавляет к ней штатный параметр Google `authuser=`, и страница открывается в выбранном аккаунте.
• На любой странице Google в меню расширения можно одним кликом переоткрыть текущую страницу в другом аккаунте.
• Автоматическую подстановку можно в любой момент выключить переключателем.

Приватность
• Пароли, cookie и история посещений не хранятся. Вход в аккаунты остаётся за Google.
• Список аккаунтов и настройки хранятся в синхронизируемом хранилище самого браузера. Разработчику отправляется только анонимная статистика раз в день (браузер, ОС, версия, число аккаунтов и переключений диапазонами — без e-mail, адресов страниц и идентификаторов), её можно выключить в попапе. Третьим лицам ничего не передаётся.
• Доступ только к страницам google.com и youtube.com.

Открытый исходный код (MIT). Расширение не связано с Google и не одобрено Google.

### Единственное назначение (single purpose)

Открывать сервисы Google в том Google-аккаунте, который пользователь выбрал по умолчанию для этого сервиса, добавляя к URL штатный параметр Google `authuser`.

### Обоснование разрешений

- **storage** — хранит в `storage.sync` список e-mail'ов аккаунтов, выбранный аккаунт по умолчанию для каждого сервиса и состояние переключателя. Больше ничего не сохраняется.
- **webNavigation** — отслеживает начало перехода вкладки на сервис Google (`onBeforeNavigate`, только основной фрейм), чтобы до загрузки страницы перенаправить её на тот же URL с `authuser=<выбранный аккаунт>`. URL проверяется в памяти и никуда не сохраняется и не отправляется.
- **Доступ к сайтам `*://*.google.com/*`, `*://*.youtube.com/*`** — нужен, чтобы видеть адрес активной вкладки на этих сайтах (пункт «Открыть <сервис> как …» в меню и переключение текущей страницы на другой аккаунт) и перенаправлять переходы на этих сайтах в выбранный аккаунт. Сервисы Google живут только на этих доменах; к другим сайтам у расширения доступа нет.

### Удалённый код

Нет. Весь JavaScript входит в пакет; нет `eval`, нет загружаемых по сети скриптов и модулей.

### Раскрытие использования данных

Какие данные пользователя собираются:
- [x] **Персональные данные (personally identifiable information)** — e-mail'ы Google-аккаунтов, введённые пользователем. Хранятся в `storage.sync` браузера (на устройстве или синхронизируются между устройствами самого пользователя средствами браузера, если синхронизация включена). Никогда не передаются разработчику или третьим лицам.
- [ ] Медицинские данные
- [ ] Финансовые и платёжные данные
- [ ] Данные аутентификации — не собираются (нет паролей, cookie, токенов).
- [ ] Личная переписка
- [ ] Местоположение
- [ ] История браузера — не собирается: URL на google.com / youtube.com проверяются в памяти для решения о перенаправлении и не сохраняются и не передаются.
- [x] **Действия пользователя** — анонимный ежедневный пинг: сколько раз аккаунт переключался автоматически и из попапа, ошибки, число использованных аккаунтов — всё диапазонами; плюс форма настроек (число аккаунтов, переключатели, сервисы с исключениями), браузер, ОС и версия расширения. Без идентификатора, URL, e-mail и доменов. Хранится в Firebase-проекте разработчика; отключается в попапе.
- [ ] Содержимое сайтов

Подтверждения (все отмечены):
- [x] Данные пользователей не продаются и не передаются третьим лицам, кроме разрешённых случаев.
- [x] Данные не используются и не передаются для целей, не связанных с единственным назначением расширения.
- [x] Данные не используются и не передаются для оценки кредитоспособности или кредитования.

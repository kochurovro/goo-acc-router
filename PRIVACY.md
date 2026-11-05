# Privacy Policy — Goo Account Router

_Last updated: 2026-11-05_

Goo Account Router is a browser extension that opens each Google service in the account you choose. It is not affiliated with or endorsed by Google.

## Your accounts and settings stay in your browser

To open a service in the right account, the extension needs to know which accounts you use. It keeps, **only inside your browser**:

- **the email addresses of your accounts** that you type into the popup;
- **your settings:** which account is the default for each service, and whether automatic switching is on.

This data is never sent to the developer or to anyone else. It lives in the browser's own extension storage (`storage.sync`). If you have browser sync turned on (Chrome Sync, Firefox Sync, etc.), your browser copies it between your own devices, the same way it syncs your bookmarks, under the browser's privacy policy; the developer has no access to it. Without sync it stays on this device.

The extension does not store passwords, cookies, or browsing history. It never signs in on your behalf: it only adds the `authuser=` parameter to Google URLs, and Google handles sign-in.

## What is sent to the developer: anonymous statistics only

Only anonymous usage statistics, on by default. Once a day (and once on install) the extension sends the developer one short message with:

- **Environment:** the event (`install` or `active`), the extension version, where it was installed from (Chrome Web Store, Edge Add-ons, Firefox Add-ons, a self-distributed build or a developer build), the browser name and major version (e.g. "Google Chrome 130"), whether it is a mobile browser, the operating system and CPU architecture (e.g. `mac`, `arm`), and the extension's interface language: the one picked in its settings, otherwise the browser UI language (e.g. `en`).
- **Shape of your settings, not their contents:** how many accounts you added, as a range (`0`, `1`, `2`, `3-5`, `6+`), and how many of them are `@gmail.com` versus other domains (the domain itself is not sent); whether automatic switching is on; whether a default account is set; how many exceptions you have and for which services (e.g. `gmail`, `youtube`); whether the extension has access to Google sites; how long ago it was installed, as a range (`0`, `1-7`, `8-30`, `31-90`, `91+` days).
- **Activity since the previous message, as ranges** (`0`, `1`, `2-5`, `6-20`, `21-100`, `101+`): how many times the extension switched a page to your default account, how many times you switched accounts from the popup, how many switches failed, and how many different accounts were used.

That is all. It contains no email addresses or their domains, no addresses or titles of pages you visit, and no identifier of you or your installation (the developer counts daily users by counting messages, not people). The messages are stored in the developer's Google Firebase (Cloud Firestore) project, which Google operates on the developer's behalf under the [Firebase terms](https://firebase.google.com/terms/data-processing-terms); as with any web request, Google's servers see the IP address the message comes from, but the extension does not store it. Nothing is sold or shared with anyone else; there is no advertising, crash reporting, or remote code.

In Firefox, sending is controlled by the extension's data-collection permission ("Technical and interaction data"): you can decline it when installing or turn it off later in the add-on's permissions (`about:addons` → Goo Account Router → Permissions). On Firefox versions without this permission (before 140) nothing is sent. In Chrome, Edge and other Chromium browsers there is no separate switch, because the messages carry nothing that identifies you; if you don't want them sent, uninstall the extension.

The extension reads the address of pages on `*.google.com` and `*.youtube.com` only in memory, to decide whether to add `authuser=`. These addresses are not stored or transmitted.

## Permissions and why they are needed

| Permission | Why |
|---|---|
| `storage` | Keep your account list and per-service defaults in the browser (`storage.sync`), and, for usage statistics, the install date, the date of the last message and the counters listed above (`storage.local`; accounts are counted by a one-way hash, not by email). None of it is sent as is. |
| `webNavigation` | Notice when a tab starts opening a Google service, so the extension can open it in your default account before the page loads. |
| Host access to `*.google.com` and `*.youtube.com` | Read the address of the current tab on these sites only (to show "Open … as" in the popup and to switch accounts) and redirect it to the same address with `authuser=`. The extension has no access to any other site. |

## Removing your data

Remove accounts in the popup, or uninstall the extension; uninstalling deletes its storage. Synced copies are removed by the browser's sync.

## Contact

Questions: contact Roman Kochurov, the developer, through the store listing's support link.

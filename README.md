# Goo Account Router

A browser extension that opens each Google service in the account you choose: Gmail in your work account, YouTube in your personal one.

Google opens every service in whichever signed-in account it considers "first". Pick a default account once per service and the extension adds Google's own `authuser=` parameter to links for that service, so they open in the right account. The popup can also reopen the current Google page in another account.

- Works in Chromium browsers (Chrome, Edge, Brave, Opera, Vivaldi, Arc) and Firefox.
- No passwords, cookies or browsing history are touched. Your account list stays in your browser's sync storage.
- Access is limited to `*.google.com` and `*.youtube.com`.
- Website and privacy policy: https://goo-account-router.web.app ([privacy](https://goo-account-router.web.app/privacy), source: [`PRIVACY.md`](PRIVACY.md)).

Not affiliated with or endorsed by Google.

## Build from source

Requires Node.js 20+. No npm dependencies: the build copies files as-is, with no bundling or minification.

```sh
npm run build            # both targets
npm run build:chromium   # dist/chromium/ + dist/goo-account-router-<version>-chromium.zip
npm run build:firefox    # dist/firefox/  + dist/goo-account-router-<version>-firefox.zip
```

Zips are deterministic (sorted entries, fixed timestamps), so you can rebuild a release and compare hashes.

Load the unpacked build:

- **Chromium:** `chrome://extensions` → Developer mode → Load unpacked → `dist/chromium`.
- **Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → `dist/firefox/manifest.json`.

## Anonymous usage stats

Builds from a fresh clone send nothing: `src/config.js` ships empty and the extension makes no network requests. Official builds set `FIREBASE_PROJECT_ID` and `FIREBASE_API_KEY` (see [`.env.example`](.env.example)) to send one anonymous daily ping (browser, OS, version, ranges of account and switch counts; no emails, no URLs, no ID). Users can turn it off in the popup. Details: [`PRIVACY.md`](PRIVACY.md); the accepted fields are enforced by [`firebase/firestore.rules`](firebase/firestore.rules).

## Layout

| Path | What |
|---|---|
| `src/` | Extension code, popup, icons, `_locales/` |
| `manifest/` | `base.json` plus per-browser patches (`chromium.json`, `firefox.json`) |
| `scripts/` | Build scripts for the extension, landing page and privacy page |
| `site/`, `firebase/` | Landing page source and Firebase Hosting/Firestore config |
| `brand/` | Logo, icons, store images |
| `docs/` | Store listing text |

## License

[MIT](LICENSE)

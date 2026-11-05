# Goo Account Router

## Website

https://goo-account-router.web.app/ is the landing page; `/privacy` is the policy; `/firefox/goo-account-router.xpi` is the signed self-distributed Firefox build the page installs.

- Landing source: `site/index.html` (a template: `__VERSION__` and `__SOURCE_*__` slots). `scripts/build-site.mjs` fills it into `firebase/public/index.html`, builds `/privacy`, and copies the logo, the promo image and `dist/signed/*-<package.json version>.xpi`. It fails if that version isn't signed yet: run `npm run sign:firefox` after a version bump.
- The source-code link appears once `package.json` has a `repository` field; until then the page shows "Source code · soon".
- Publish: `npm run deploy:site` (`deploy:privacy` is an alias). The `.xpi` is served as `application/x-xpinstall` (`firebase/firebase.json`) so Firefox offers to install it.
- The self-distributed `.xpi` has no `update_url`, so installs from the site don't auto-update.

## Privacy policy page

https://goo-account-router.web.app/privacy is the public policy: the popup footer (`src/popup.html`) and both store listings (`docs/STORE_LISTING.md`) link to it.

- Source of truth is `PRIVACY.md`. `firebase/public/privacy/index.html` is generated from it by `scripts/build-privacy.mjs`; edit the Markdown, never the HTML.
- Publish: `npm run deploy:site` (builds the whole site, then deploys hosting). Verify with `curl -s https://goo-account-router.web.app/privacy | grep -o "<h2>[^<]*</h2>"`.
- Any change to what the extension stores or sends (`src/analytics.js`, storage keys, permissions) ships together with a `PRIVACY.md` edit, a redeploy, and the matching disclosure in `docs/STORE_LISTING.md`. Write "stays in your browser" for local/sync storage and "sent to the developer" only for the stats ping: the user reads the old "What the extension stores" phrasing as server-side collection.

## Firebase

One project, `goo-account-router` (console: https://console.firebase.google.com/project/goo-account-router/overview), serves both the hosting above and the Firestore that receives usage stats.

- Access: the `firebase` CLI, logged in as kochurovro@gmail.com (`firebase login:list`). Run CLI commands from `firebase/`, which holds `firebase.json` and `.firebaserc` (default project already set).
- Stats land in the Firestore collection `pings`, one document per ping, written via the REST API by `src/analytics.js`. `firebase/firestore.rules` is create-only for clients; read the data in the console (admin bypasses rules).
- The rules whitelist every field and value bucket. Adding a field to the ping means editing the rules in the same change and deploying them before the build that sends it: `firebase deploy --only firestore:rules`. A ping the rules reject is dropped until the next day, silently.
- The extension gets the project only at build time: `FIREBASE_PROJECT_ID` and `FIREBASE_API_KEY` in `.env` (Project settings → General → Web API key). Empty means stats off and no network requests. The web API key is public by design; the rules are the protection.
- The Firestore emulator needs Java, which this machine lacks (`brew install openjdk` first).

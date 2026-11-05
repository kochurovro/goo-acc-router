# Goo Account Router

## Identity: personal, not work

This is a public repo under the personal GitHub account `kochurovro`. The machine's global git, GPG and `gh` setup belong to a work account, so every commit, push and deploy here goes through the personal identity:

- Commits: author `kochurovro@gmail.com`, SSH-signed with `~/.ssh/id_ed25519_github`. Both are set in the repo's local git config, which overrides the global work email and GPG key. Check with `git log --format='%ae %G?'`: every line reads `kochurovro@gmail.com G`.
- Push: `origin` uses SSH (`git@github.com:…`), which `~/.ssh/config` maps to the personal key. `gh` is logged in as the work account `romankochurov-ht`: before any `gh` command that writes to GitHub, switch to `kochurovro` (`gh auth login`, then `gh auth switch`).
- Firebase: the CLI is logged in as `kochurovro@gmail.com` (`firebase login:list`).

## Website and privacy policy

https://goo-account-router.web.app/ serves the landing page, `/privacy` (linked from the popup footer and both store listings in `docs/STORE_LISTING.md`), and `/firefox/goo-account-router.xpi`, the signed self-distributed Firefox build. That `.xpi` has no `update_url`, so installs from the site don't auto-update.

- `firebase/public/` is build output: `scripts/build-site.mjs` generates it from `site/index.html`, `PRIVACY.md` (via `scripts/build-privacy.mjs`) and `brand/`. Edit those sources. The landing's "Source" link comes from `package.json` `repository`.
- The signed `.xpi` lives only in `dist/signed/` (gitignored). After a version bump, run `npm run sign:firefox`; until then `build:site` warns and `--release` fails.
- Publish through `npm run deploy:site`: it rebuilds with `--release`, then deploys hosting. A plain `firebase deploy --only hosting` ships whatever stale `firebase/public/` is on disk. A `predeploy` hook can't replace the npm script: the standalone `firebase` binary puts its own `node` shim first on the hook's PATH.
- Verify the policy after a deploy: `curl -s https://goo-account-router.web.app/privacy | grep -o "<h2>[^<]*</h2>"`.

Any change to what the extension stores or sends (`src/analytics.js`, storage keys, permissions) ships together with a `PRIVACY.md` edit, a redeploy, and the matching disclosure in `docs/STORE_LISTING.md`. Write "stays in your browser" for local/sync storage and "sent to the developer" only for the stats ping: the user reads "What the extension stores" as server-side collection.

## Firebase

One project, `goo-account-router` ([console](https://console.firebase.google.com/project/goo-account-router/overview)), serves both the hosting above and the Firestore that receives usage stats. Run CLI commands from `firebase/`.

- Stats land in the Firestore collection `pings`, one document per ping, written via the REST API by `src/analytics.js`. `firebase/firestore.rules` is create-only for clients; read the data in the console (admin bypasses rules).
- The rules whitelist every field and value bucket. Adding a field to the ping means editing the rules in the same change and deploying them before the build that sends it: `firebase deploy --only firestore:rules`. A ping the rules reject is dropped until the next day, silently.
- The extension gets the project only at build time, from `FIREBASE_PROJECT_ID` and `FIREBASE_API_KEY` in `.env` (Project settings → General → Web API key). Empty means stats off and no network requests, which is what a fresh clone builds. The web API key is public by design; the rules are the protection.
- The Firestore emulator needs Java, which this machine lacks (`brew install openjdk` first).

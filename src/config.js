// Overwritten in dist/ by scripts/build.mjs from FIREBASE_PROJECT_ID / FIREBASE_API_KEY (env vars or .env).
// Empty = anonymous usage stats are off and the extension makes no network requests.
// The Firebase web API key is not a secret: access is limited by firebase/firestore.rules (create-only).
const FIREBASE = { projectId: "", apiKey: "" };
// "self" for builds distributed outside the stores (npm run sign:firefox: unlisted .xpi); empty = store build.
const BUILD_CHANNEL = "";

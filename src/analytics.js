// Anonymous usage stats: at most one ping per day (and one on install). Each ping is a new document
// in the Firestore collection "pings" (REST API, no SDK) with a random id, so pings can't be linked together.
// Sent: environment (browser, OS, version, language, install source), settings shape (account counts,
// toggles, which services have exceptions) and bucketed counters since the last ping.
// Never sent: emails or their domains, page URLs, an install ID. See PRIVACY.md and firebase/firestore.rules.
// Disabled when FIREBASE (config.js, set at build time) is empty or the user turned stats off.
// Firefox: also requires the "technicalAndInteraction" data-collection permission (opt-out in the install dialog).

const STATS_KEY = "statsLastPing";     // storage.local: "YYYY-MM-DD" (UTC) of the last ping
const INSTALL_KEY = "statsInstallDay"; // storage.local: "YYYY-MM-DD" of install (or of the first ping for older installs)
const COUNTERS_KEY = "statsCounters";  // storage.local: { redirects, manualSwitches, errors, used: [hashes] } since the last ping
const PERSONAL_DOMAINS = ["gmail.com", "googlemail.com"];

async function statsAllowed() {
  if (typeof FIREBASE !== "object" || !FIREBASE.projectId || !FIREBASE.apiKey) return false;
  const { statsEnabled = true } = await api.storage.sync.get("statsEnabled");
  if (!statsEnabled) return false;
  if (typeof browser !== "undefined" && api.runtime.getBrowserInfo) {
    // Firefox < 140 has no data_collection permissions: don't send without the user's consent.
    try { return await api.permissions.contains({ data_collection: ["technicalAndInteraction"] }); }
    catch (e) { return false; }
  }
  return true;
}

// ---- buckets: exact numbers aren't needed and would make pings more distinctive ----
const bucket = (n, edges) => { // edges [1,2,6,21,101] -> "0","1","2-5","6-20","21-100","101+"
  if (n < edges[0]) return "0";
  for (let i = 0; i < edges.length - 1; i++) {
    if (n < edges[i + 1]) return edges[i + 1] - edges[i] === 1 ? String(edges[i]) : `${edges[i]}-${edges[i + 1] - 1}`;
  }
  return `${edges[edges.length - 1]}+`;
};
const countBucket = (n) => bucket(n, [1, 2, 6, 21, 101]);   // 0 | 1 | 2-5 | 6-20 | 21-100 | 101+
const accountBucket = (n) => bucket(n, [1, 2, 3, 6]);       // 0 | 1 | 2 | 3-5 | 6+
const ageBucket = (days) => bucket(days, [1, 8, 31, 91]);  // 0 | 1-7 | 8-30 | 31-90 | 91+

// ---- local counters (only while stats are allowed) ----
let countersChain = Promise.resolve();
function updateCounters(fn) {
  countersChain = countersChain.then(async () => {
    const { [COUNTERS_KEY]: c = {} } = await api.storage.local.get(COUNTERS_KEY);
    await api.storage.local.set({ [COUNTERS_KEY]: fn({ redirects: 0, manualSwitches: 0, errors: 0, used: [], ...c }) });
  }).catch(() => {});
  return countersChain;
}
// Distinct accounts are counted by a short SHA-256 of the email, so the counters never hold an email.
async function accountKey(email) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  return [...new Uint8Array(digest).slice(0, 6)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// kind: "redirects" | "manualSwitches" | "errors"; email: account the tab was opened in, if any.
async function countStat(kind, email) {
  if (!(await statsAllowed())) return;
  const key = email ? await accountKey(email) : null;
  return updateCounters((c) => {
    c[kind]++;
    if (key && !c.used.includes(key)) c.used.push(key);
    return c;
  });
}

// Where the extension came from: cws | edge | amo | self (own build / sideload) | dev (unpacked) | admin (policy).
async function installSource() {
  let type = "normal";
  try { type = (await api.management.getSelf()).installType; } catch (e) { /* ignore */ }
  if (type === "development") return "dev";
  if (type === "admin") return "admin";
  if (api.runtime.getBrowserInfo) return BUILD_CHANNEL === "self" ? "self" : "amo"; // Firefox: AMO-signed either way, set at build time
  const updateUrl = api.runtime.getManifest().update_url || ""; // injected by the store on install
  if (updateUrl.includes("clients2.google.com")) return "cws";
  if (updateUrl.includes("edge.microsoft.com")) return "edge";
  return "self";
}

async function environment() {
  // Language the popup is shown in: the one picked in Settings (locale folder, e.g. "pt_BR"), else the browser's.
  const { lang: picked = "" } = await api.storage.sync.get("lang");
  const env = { ext: api.runtime.getManifest().version, lang: picked || api.i18n.getUILanguage().split("-")[0] };
  try { env.source = await installSource(); } catch (e) { /* ignore */ }
  try {
    const p = await api.runtime.getPlatformInfo(); // os: mac | win | linux | android | cros | openbsd | fuchsia
    env.os = p.os; env.arch = p.arch;
  } catch (e) { /* ignore */ }
  try {
    if (api.runtime.getBrowserInfo) { // Firefox
      const b = await api.runtime.getBrowserInfo();
      env.browser = b.name; env.browserVersion = b.version.split(".")[0];
    } else if (navigator.userAgentData) { // Chromium: brand list holds e.g. "Google Chrome", "Microsoft Edge", "Brave", "Opera"
      const brands = navigator.userAgentData.brands.filter((b) => !/Not.?A.?Brand|Chromium/i.test(b.brand));
      const b = brands[0] || navigator.userAgentData.brands.find((x) => x.brand === "Chromium");
      if (b) { env.browser = b.brand; env.browserVersion = b.version; }
      env.mobile = navigator.userAgentData.mobile;
    }
  } catch (e) { /* ignore */ }
  return env;
}

// Shape of the settings, never their contents: counts, toggles and service keys (e.g. "gmail").
async function settingsShape() {
  const { accounts = [], defaults = {}, defaultAll = "", enabled = true } =
    await api.storage.sync.get(["accounts", "defaults", "defaultAll", "enabled"]);
  const personal = accounts.filter((e) => PERSONAL_DOMAINS.includes(e.split("@")[1])).length;
  const exceptionServices = Object.keys(defaults).filter((k) => k in SERVICES).sort();
  let hostAccess = true;
  try { hostAccess = await api.permissions.contains({ origins: api.runtime.getManifest().host_permissions || [] }); } catch (e) { /* ignore */ }
  const { [INSTALL_KEY]: installDay } = await api.storage.local.get(INSTALL_KEY);
  const today = new Date().toISOString().slice(0, 10);
  if (!installDay) await api.storage.local.set({ [INSTALL_KEY]: today });
  const ageDays = Math.max(0, Math.round((Date.parse(today) - Date.parse(installDay || today)) / 864e5));
  return {
    accounts: accountBucket(accounts.length),
    accountsPersonal: accountBucket(personal),            // @gmail.com
    accountsWork: accountBucket(accounts.length - personal), // any other domain (Workspace etc.); the domain itself is not sent
    enabled, hasDefault: !!defaultAll && accounts.includes(defaultAll),
    exceptions: exceptionServices.length, exceptionServices,
    hostAccess,
    installAge: installDay ? ageBucket(ageDays) : "unknown",
  };
}

// Firestore REST: documents:commit with a random document id and a server-side timestamp,
// so the client clock is not trusted and nothing links two pings together.
function firestoreValue(v) {
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return { integerValue: String(Math.trunc(v)) };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(firestoreValue) } };
  return { stringValue: String(v) };
}
function firestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null) fields[k] = firestoreValue(v);
  return fields;
}

async function sendStats(event) {
  if (!(await statsAllowed())) return;
  const { [COUNTERS_KEY]: c = {} } = await api.storage.local.get(COUNTERS_KEY);
  const sent = { redirects: c.redirects || 0, manualSwitches: c.manualSwitches || 0, errors: c.errors || 0, used: c.used || [] };
  const data = {
    event, ...(await environment()), ...(await settingsShape()),
    // activity since the previous ping (≈ the last day); "accountsUsed" = distinct accounts opened by the extension
    redirects: countBucket(sent.redirects), manualSwitches: countBucket(sent.manualSwitches),
    errors: countBucket(sent.errors), accountsUsed: accountBucket(sent.used.length),
  };
  const db = `projects/${FIREBASE.projectId}/databases/(default)`;
  const body = JSON.stringify({ writes: [{
    update: { name: `${db}/documents/pings/${crypto.randomUUID()}`, fields: firestoreFields(data) },
    currentDocument: { exists: false },
    updateTransforms: [{ fieldPath: "ts", setToServerValue: "REQUEST_TIME" }],
  }] });
  let res;
  try {
    res = await fetch(`https://firestore.googleapis.com/v1/${db}/documents:commit?key=${encodeURIComponent(FIREBASE.apiKey)}`,
      { method: "POST", credentials: "omit", keepalive: true, headers: { "Content-Type": "application/json" }, body });
  } catch (e) { return false; } // offline: try again later
  if (res.ok) { // subtract what was sent, keep what was counted meanwhile
    await updateCounters((cur) => ({
      redirects: Math.max(0, cur.redirects - sent.redirects), manualSwitches: Math.max(0, cur.manualSwitches - sent.manualSwitches),
      errors: Math.max(0, cur.errors - sent.errors), used: cur.used.filter((e) => !sent.used.includes(e)),
    }));
  }
  return res.status < 500; // 4xx (e.g. rejected by rules) won't fix itself: don't retry until tomorrow
}

// Called often (startup, navigations); sends at most once per UTC day.
async function pingDaily() {
  const today = new Date().toISOString().slice(0, 10);
  const { [STATS_KEY]: last } = await api.storage.local.get(STATS_KEY);
  if (last === today) return;
  await api.storage.local.set({ [STATS_KEY]: today }); // set first so parallel calls don't double-send
  if ((await sendStats("active")) === false) await api.storage.local.remove(STATS_KEY);
}

// On install: remember the day (for installAge), then send the "install" ping.
async function statsOnInstall() {
  await api.storage.local.set({ [INSTALL_KEY]: new Date().toISOString().slice(0, 10) });
  await sendStats("install");
}

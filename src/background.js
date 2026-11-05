// Firefox MV3 (background.scripts) loads these from the manifest;
// Chrome (service_worker) loads them via importScripts.
if (typeof importScripts === "function") {
  try { importScripts("config.js", "services.js", "analytics.js"); } catch (e) { /* already loaded */ }
}

const api = typeof browser !== "undefined" ? browser : chrome;

// Loop guard: if we just redirected this tab to this service, leave it alone
// (after authuser Google often strips the parameter from the URL).
const recent = new Map(); // tabId -> { service, ts }
const COOLDOWN_MS = 15000;

async function getSettings() {
  const { accounts = [], defaults = {}, defaultAll = "", enabled = true } =
    await api.storage.sync.get(["accounts", "defaults", "defaultAll", "enabled"]);
  return { accounts, defaults, defaultAll, enabled };
}

api.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // top-level frame only, not iframes
  const service = serviceForUrl(details.url);
  if (!service) return;
  pingDaily().catch(() => {});
  if (urlHasAccount(details.url)) return;

  const settings = await getSettings();
  if (!settings.enabled) return;
  const email = accountFor(service, settings);
  if (!email) return;

  const r = recent.get(details.tabId);
  if (r && r.service === service && Date.now() - r.ts < COOLDOWN_MS) return;
  recent.set(details.tabId, { service, ts: Date.now() });

  try {
    await api.tabs.update(details.tabId, { url: withAccount(details.url, email) });
    countStat("redirects", email);
  } catch (e) {
    countStat("errors"); // usually the tab was closed meanwhile
  }
});

api.tabs.onRemoved.addListener((tabId) => recent.delete(tabId));

// Anonymous usage stats (see analytics.js). The service worker is short-lived, so also check on navigations.
api.runtime.onInstalled.addListener(({ reason }) => { if (reason === "install") statsOnInstall().then(pingDaily); else pingDaily(); });
api.runtime.onStartup.addListener(pingDaily);

// Manual switch from the popup: reopen the current tab under another account.
// tabs.query exposes tab.url only for tabs covered by host_permissions, which is all we need.
api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "switch") {
    (async () => {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !serviceForUrl(tab.url)) return sendResponse({ ok: false, reason: "not-google" });
      const url = new URL(tab.url);
      // drop /u/N/ so that authuser takes effect
      url.pathname = url.pathname.replace(/\/u\/\d+(?=\/|$)/, "");
      url.searchParams.set("authuser", msg.email);
      recent.set(tab.id, { service: serviceForUrl(tab.url), ts: Date.now() });
      await api.tabs.update(tab.id, { url: url.toString() });
      countStat("manualSwitches", msg.email);
      sendResponse({ ok: true });
    })().catch(() => { countStat("errors"); sendResponse({ ok: false }); });
    return true;
  }
});

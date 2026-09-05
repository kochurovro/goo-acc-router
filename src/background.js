// Firefox MV3 (background.scripts) подхватит services.js из манифеста;
// Chrome (service_worker) — через importScripts.
if (typeof importScripts === "function") {
  try { importScripts("services.js"); } catch (e) { /* уже загружен */ }
}

const api = typeof browser !== "undefined" ? browser : chrome;

// Защита от петли: если мы только что перенаправили эту вкладку на этот сервис,
// не трогаем её снова (Google после authuser часто убирает параметр из URL).
const recent = new Map(); // tabId -> { service, ts }
const COOLDOWN_MS = 15000;

async function getSettings() {
  const { accounts = [], defaults = {}, enabled = true } = await api.storage.sync.get(["accounts", "defaults", "enabled"]);
  return { accounts, defaults, enabled };
}

api.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // только основная вкладка, не iframe
  const service = serviceForUrl(details.url);
  if (!service) return;
  if (urlHasAccount(details.url)) return;

  const { defaults, enabled, accounts } = await getSettings();
  if (!enabled) return;
  const email = defaults[service];
  if (!email || !accounts.includes(email)) return;

  const r = recent.get(details.tabId);
  if (r && r.service === service && Date.now() - r.ts < COOLDOWN_MS) return;
  recent.set(details.tabId, { service, ts: Date.now() });

  try {
    await api.tabs.update(details.tabId, { url: withAccount(details.url, email) });
  } catch (e) {
    // вкладка могла закрыться
  }
});

api.tabs.onRemoved.addListener((tabId) => recent.delete(tabId));

// Ручное переключение из popup: открыть текущую вкладку под другим аккаунтом.
api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "switch") {
    (async () => {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !serviceForUrl(tab.url)) return sendResponse({ ok: false, reason: "not-google" });
      const url = new URL(tab.url);
      // убираем /u/N/ чтобы authuser сработал
      url.pathname = url.pathname.replace(/\/u\/\d+(?=\/|$)/, "");
      url.searchParams.set("authuser", msg.email);
      recent.set(tab.id, { service: serviceForUrl(tab.url), ts: Date.now() });
      await api.tabs.update(tab.id, { url: url.toString() });
      sendResponse({ ok: true });
    })();
    return true;
  }
});

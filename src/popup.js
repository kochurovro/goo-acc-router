const api = typeof browser !== "undefined" ? browser : chrome;
const $ = (s) => document.querySelector(s);

// Host patterns the extension needs (manifest host_permissions). They can be missing:
// Firefox MV3 < 127 and Safari don't grant them at install, and Chrome lets the user restrict site access.
const HOST_ORIGINS = api.runtime.getManifest().host_permissions || [];

function localize() {
  document.documentElement.lang = t("html_lang");
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-aria]")) {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
    if (el.classList.contains("icon")) el.title = t(el.dataset.i18nAria); // icon-only buttons get a tooltip too
  }
}

// Theme tokens (--av-0..7 in popup.html), so avatars repaint with the theme.
const PALETTE = Array.from({ length: 8 }, (_, i) => `var(--av-${i})`);
// Colour follows the email itself (hash → palette, first free slot), so removing one account
// doesn't repaint the others.
let colors = new Map();
function assignColors() {
  colors = new Map();
  const used = new Set();
  for (const email of state.accounts) {
    let h = 0;
    for (const ch of email) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    let i = h % PALETTE.length;
    for (let n = 0; n < PALETTE.length && used.has(i); n++) i = (i + 1) % PALETTE.length;
    used.add(i);
    colors.set(email, PALETTE[i]);
  }
}
const colorFor = (email) => colors.get(email) || PALETTE[0];

// Browsers cap popups at 600px. If everything doesn't fit, unassigned services fold into a "+N" chip.
const MAX_HEIGHT = 600;
let showAllServices = false;

let state = { accounts: [], defaults: {}, defaultAll: "", enabled: true };
// The active tab, if it is a known Google service: { id, key, account } (account = authuser from the URL, if any).
let here = null;

function avatar(email) {
  const i = document.createElement("i");
  i.className = "av";
  i.setAttribute("aria-hidden", "true");
  if (email === SKIP) {
    i.classList.add("skip");
  } else if (email) {
    i.style.background = colorFor(email);
    i.textContent = email[0];
  } else {
    i.classList.add("none");
  }
  return i;
}

function iconButton(cls, icon, label) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "icon " + cls;
  b.title = label;
  b.setAttribute("aria-label", label);
  b.append(svgIcon(icon));
  return b;
}

function svgIcon(icon) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(NS, "use");
  use.setAttribute("href", "#" + icon);
  svg.append(use);
  return svg;
}

async function load() {
  const [s, tabs] = await Promise.all([
    api.storage.sync.get(["accounts", "defaults", "defaultAll", "enabled"]),
    api.tabs.query({ active: true, currentWindow: true }).catch(() => []),
  ]);
  state = { accounts: s.accounts || [], defaults: s.defaults || {}, defaultAll: s.defaultAll || "", enabled: s.enabled !== false };
  const tab = tabs[0];
  const key = tab?.url ? serviceForUrl(tab.url) : null;
  if (key) {
    let account = null;
    try { account = new URL(tab.url).searchParams.get("authuser"); } catch (e) { /* ignore */ }
    here = { id: tab.id, key, account: account && account.toLowerCase() };
  }
  render();
  renderAccess();
}

async function renderAccess() {
  let granted = true;
  try { granted = await api.permissions.contains({ origins: HOST_ORIGINS }); } catch (e) { /* API unavailable: assume granted */ }
  $("#access").classList.toggle("show", !granted);
}

async function save() {
  await api.storage.sync.set(state);
  render();
}

function render() {
  $("#enabled").checked = state.enabled;
  assignColors();
  renderAccounts();
  renderServices(true);
  if (!showAllServices && document.documentElement.scrollHeight > MAX_HEIGHT) renderServices(false);
}

function renderAccounts() {
  const svcName = here && SERVICES[here.key].name;
  const sub = $("#accSub");
  sub.hidden = !(here && state.accounts.length);
  if (!sub.hidden) {
    sub.textContent = "";
    const [before, after = ""] = t("accounts_click_to_open", ["\u0000"]).split("\u0000");
    const b = document.createElement("b");
    b.textContent = svcName;
    sub.append(before, b, after);
  }
  $("#accEmpty").hidden = state.accounts.length > 0;
  // With no accounts the form is the only thing to do, so show it right away.
  if (!state.accounts.length) $("#addRow").classList.add("adding");

  const ul = $("#accounts");
  ul.textContent = "";
  for (const email of state.accounts) {
    const li = document.createElement("li");
    li.className = "acc";

    const main = document.createElement(here ? "button" : "div");
    main.className = "acc-main";
    const span = document.createElement("span");
    span.className = "email";
    span.title = email;
    const at = email.lastIndexOf("@");
    const local = document.createElement("span");
    local.className = "local";
    local.textContent = email.slice(0, at);
    const domain = document.createElement("span");
    domain.className = "domain";
    domain.textContent = email.slice(at);
    span.append(local, domain);
    main.append(avatar(email), span);

    if (here) {
      main.type = "button";
      main.setAttribute("aria-label", t("open_service_as", [svcName, email]));
      if (here.account === email) {
        // The page is already open in this account: mark it with a check, not a text badge.
        const mark = svgIcon("i-check");
        mark.classList.add("here-mark");
        main.title = t("current_hint", [svcName]);
        main.append(mark);
        main.setAttribute("aria-current", "true");
        main.setAttribute("aria-label", `${email}: ${t("current_hint", [svcName])}`);
      }
      main.onclick = () => switchTo(email);
    }
    li.append(main);

    const isDefault = state.defaultAll === email;
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "def";
    pin.textContent = t("default_account");
    pin.title = t(isDefault ? "unpin_all" : "pin_all");
    pin.setAttribute("aria-label", `${t(isDefault ? "unpin_all" : "pin_all")}: ${email}`);
    pin.setAttribute("aria-pressed", String(isDefault));
    pin.onclick = () => {
      state.defaultAll = isDefault ? "" : email;
      // An exception equal to the new default is no longer an exception.
      for (const k of Object.keys(state.defaults)) if (state.defaults[k] === state.defaultAll) delete state.defaults[k];
      save();
    };
    li.append(pin);

    const del = iconButton("del", "i-x", t("remove_account", [email]));
    del.onclick = () => removeAccount(email);
    li.append(del);
    ul.append(li);
  }
}

function renderServices(all) {
  const all_ = state.defaultAll;
  $("#svcSub").textContent = t(all_ ? "exceptions_help" : "exceptions_help_no_default");
  const box = $("#services");
  box.textContent = "";
  box.classList.toggle("off", !state.enabled || !state.accounts.length);
  let hidden = 0;
  for (const [key, svc] of Object.entries(SERVICES)) {
    // A SKIP left over from when a default existed means nothing without one: show it as "don't change".
    const exception = state.defaults[key] === SKIP && !all_ ? "" : state.defaults[key] || "";
    if (!all && !exception && here?.key !== key) { hidden++; continue; }
    const shown = exception || all_; // what the chip's avatar shows
    const chip = document.createElement("label");
    chip.className = "svc";
    chip.classList.toggle("set", !!exception);
    chip.classList.toggle("inherit", !exception && !!all_);
    chip.classList.toggle("here", here?.key === key);
    chip.title = `${svc.name}: ${
      exception === SKIP ? t("skip") : exception || (all_ ? t("inherit_default", [all_]) : t("no_default"))}`;
    const name = document.createElement("span");
    name.textContent = svc.name;

    const sel = document.createElement("select");
    sel.setAttribute("aria-label", t("account_for", [svc.name]));
    sel.append(new Option(all_ ? t("inherit_default", [all_]) : t("no_default"), ""));
    for (const e of state.accounts) if (e !== all_) sel.append(new Option(e, e));
    if (all_) sel.append(new Option(t("skip"), SKIP));
    sel.value = exception;
    sel.disabled = !state.accounts.length;
    sel.onchange = () => {
      if (sel.value) state.defaults[key] = sel.value; else delete state.defaults[key];
      save();
    };
    chip.append(avatar(shown), name, sel);
    box.append(chip);
  }
  if (hidden) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "svc more";
    more.textContent = t("more_services", [String(hidden)]);
    more.onclick = () => { showAllServices = true; renderServices(true); };
    box.append(more);
  }
}

function switchTo(email) {
  for (const b of document.querySelectorAll("button.acc-main")) b.disabled = true;
  api.runtime.sendMessage({ type: "switch", email })
    .then(() => window.close())
    .catch(() => { for (const b of document.querySelectorAll("button.acc-main")) b.disabled = false; });
}

// Remove with undo instead of a confirmation dialog.
let undoTimer = null;
function removeAccount(email) {
  const snapshot = JSON.parse(JSON.stringify(state));
  state.accounts = state.accounts.filter((e) => e !== email);
  if (state.defaultAll === email) state.defaultAll = "";
  for (const k of Object.keys(state.defaults)) if (state.defaults[k] === email) delete state.defaults[k];
  save();
  $("#toastText").textContent = t("removed", [email]);
  $("#toast").classList.add("show");
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => $("#toast").classList.remove("show"), 6000);
  $("#undoBtn").onclick = () => {
    clearTimeout(undoTimer);
    $("#toast").classList.remove("show");
    state = snapshot;
    save();
  };
}

function setAddError(msg) {
  const input = $("#newEmail");
  $("#addErr").textContent = msg || "";
  input.setAttribute("aria-invalid", msg ? "true" : "false");
}

function addAccount(e) {
  e.preventDefault();
  const input = $("#newEmail");
  const email = input.value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setAddError(t("err_email")); input.focus(); return; }
  if (state.accounts.includes(email)) { setAddError(t("err_duplicate")); input.focus(); return; }
  setAddError("");
  state.accounts.push(email);
  input.value = "";
  save();
  input.focus(); // keep the form open to add the next one
}

$("#addOpen").onclick = () => {
  $("#addRow").classList.add("adding");
  $("#newEmail").focus();
};
$("#addCancel").onclick = () => {
  setAddError("");
  $("#newEmail").value = "";
  if (state.accounts.length) $("#addRow").classList.remove("adding");
};
$("#addForm").onsubmit = addAccount;
$("#newEmail").oninput = () => setAddError("");

// permissions.request must run synchronously inside the click handler (user gesture), so no await before it.
$("#grantBtn").onclick = () => {
  api.permissions.request({ origins: HOST_ORIGINS }).then(renderAccess, renderAccess);
};
api.permissions.onAdded?.addListener(renderAccess);
api.permissions.onRemoved?.addListener(renderAccess);

$("#enabled").onchange = (e) => { state.enabled = e.target.checked; save(); };


// ---- settings: theme + language ---------------------------------------------
// storage.sync: theme = "system" | "light" | "dark", lang = "" (browser language) | locale folder name.
function applyTheme(theme) {
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  try { localStorage.setItem("theme", theme); } catch (e) { /* theme.js then follows the system until next open */ }
}

function renderLangOptions(lang) {
  const sel = $("#langSelect");
  sel.textContent = "";
  // Endonyms stay in their own language so a user lost in a foreign UI can find theirs.
  const ui = api.i18n.getUILanguage().replace("-", "_");
  const browserLang = LANGS.find(([c]) => c === ui) || LANGS.find(([c]) => c.split("_")[0] === ui.split("_")[0]);
  sel.append(new Option(browserLang ? `${t("language_auto")} · ${browserLang[1]}` : t("language_auto"), ""));
  for (const [code, name] of LANGS) sel.append(new Option(name, code));
  sel.value = lang;
}

function openSettings(open) {
  document.body.classList.toggle("in-settings", open);
  $("#settings").hidden = !open;
  $("#settingsBtn").setAttribute("aria-expanded", String(open));
  (open ? document.querySelector("#themeSeg input:checked") : $("#settingsBtn")).focus();
}
$("#settingsBtn").onclick = () => openSettings($("#settings").hidden);
$("#settingsBack").onclick = () => openSettings(false);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#settings").hidden) { e.preventDefault(); openSettings(false); }
});

for (const r of document.querySelectorAll('#themeSeg input')) {
  r.onchange = () => { applyTheme(r.value); api.storage.sync.set({ theme: r.value }); };
}
$("#langSelect").onchange = async (e) => {
  const lang = e.target.value;
  api.storage.sync.set({ lang });
  await loadLang(lang);
  localize();
  renderLangOptions(lang);
  render();
};

(async () => {
  const { theme = "system", lang = "" } = await api.storage.sync.get(["theme", "lang"]);
  applyTheme(theme); // also refreshes the localStorage mirror if another device changed it
  const radio = document.querySelector(`#themeSeg input[value="${theme}"]`) || document.querySelector('#themeSeg input[value="system"]');
  radio.checked = true;
  await loadLang(lang);
  localize();
  renderLangOptions(lang);
  load();
})();

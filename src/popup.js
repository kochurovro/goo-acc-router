const api = typeof browser !== "undefined" ? browser : chrome;
const $ = (s) => document.querySelector(s);

const PALETTE = ["#1f4099", "#c2410c", "#0f766e", "#7e22ce", "#b45309", "#be185d", "#4d7c0f", "#0e7490"];
const colorFor = (email, accounts) => PALETTE[accounts.indexOf(email) % PALETTE.length];

let state = { accounts: [], defaults: {}, enabled: true };

async function load() {
  const s = await api.storage.sync.get(["accounts", "defaults", "enabled"]);
  state = { accounts: s.accounts || [], defaults: s.defaults || {}, enabled: s.enabled !== false };
  render();
  renderCurrent();
}

async function save() {
  await api.storage.sync.set(state);
  render();
}

function render() {
  $("#enabled").checked = state.enabled;

  const ul = $("#accounts");
  ul.innerHTML = "";
  $("#accEmpty").style.display = state.accounts.length ? "none" : "block";
  for (const email of state.accounts) {
    const li = document.createElement("li");
    li.className = "acc";
    const dot = document.createElement("i");
    dot.className = "dot";
    dot.style.background = colorFor(email, state.accounts);
    const span = document.createElement("span");
    span.textContent = email;
    const del = document.createElement("button");
    del.title = "Удалить";
    del.textContent = "×";
    del.onclick = () => {
      state.accounts = state.accounts.filter((e) => e !== email);
      for (const k of Object.keys(state.defaults)) if (state.defaults[k] === email) delete state.defaults[k];
      save();
    };
    li.append(dot, span, del);
    ul.append(li);
  }

  const box = $("#services");
  box.innerHTML = "";
  for (const [key, svc] of Object.entries(SERVICES)) {
    const row = document.createElement("div");
    row.className = "svc";
    const label = document.createElement("label");
    label.textContent = svc.name;
    label.htmlFor = "svc-" + key;
    const sel = document.createElement("select");
    sel.id = "svc-" + key;
    const none = new Option("— не менять —", "");
    sel.append(none);
    for (const email of state.accounts) sel.append(new Option(email, email));
    sel.value = state.defaults[key] || "";
    sel.classList.toggle("set", !!sel.value);
    sel.onchange = () => {
      if (sel.value) state.defaults[key] = sel.value; else delete state.defaults[key];
      save();
    };
    row.append(label, sel);
    box.append(row);
  }
}

async function renderCurrent() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  const key = tab?.url ? serviceForUrl(tab.url) : null;
  const sec = $("#current");
  if (!key || !state.accounts.length) { sec.classList.remove("show"); return; }
  sec.classList.add("show");
  $("#currentTitle").textContent = `Открыть ${SERVICES[key].name} как`;
  const chips = $("#switchChips");
  chips.innerHTML = "";
  for (const email of state.accounts) {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = email;
    b.onclick = () => api.runtime.sendMessage({ type: "switch", email }).then(() => window.close());
    chips.append(b);
  }
}

function addAccount() {
  const input = $("#newEmail");
  const email = input.value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { input.focus(); return; }
  if (!state.accounts.includes(email)) state.accounts.push(email);
  input.value = "";
  save().then(renderCurrent);
}

$("#addBtn").onclick = addAccount;
$("#newEmail").onkeydown = (e) => { if (e.key === "Enter") addAccount(); };
$("#enabled").onchange = (e) => { state.enabled = e.target.checked; save(); };

load();

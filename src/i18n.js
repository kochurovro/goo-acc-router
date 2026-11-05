// Popup i18n with a user-picked language. chrome.i18n only follows the browser UI language,
// so when the user picks one we load that locale's messages.json and format it the same way.
// The manifest (name, description) keeps following the browser language: browsers don't allow overriding it.
const LANGS = [
  ["en", "English"], ["ru", "Русский"], ["uk", "Українська"], ["es", "Español"], ["pt_BR", "Português (Brasil)"],
  ["fr", "Français"], ["it", "Italiano"], ["ja", "日本語"], ["ko", "한국어"],
];
let MESSAGES = null; // null = use chrome.i18n (browser language)

async function loadLang(code) {
  MESSAGES = null;
  if (!LANGS.some(([c]) => c === code)) return;
  try { MESSAGES = await (await fetch(`_locales/${code}/messages.json`)).json(); } catch (e) { /* fall back to browser language */ }
}

// Same semantics as chrome.i18n.getMessage: $NAME$ -> placeholder content ("$1"), then $1..$9 -> substitutions.
function t(key, subs) {
  const m = MESSAGES?.[key];
  if (!m) return api.i18n.getMessage(key, subs) || key;
  const args = subs == null ? [] : [].concat(subs);
  return m.message
    .replace(/\$([A-Za-z0-9_@]+)\$/g, (all, name) => m.placeholders?.[name.toLowerCase()]?.content ?? all)
    .replace(/\$(\$|\d)/g, (_, d) => (d === "$" ? "$" : args[d - 1] ?? ""));
}

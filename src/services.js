// Список сервисов Google. key -> { name, hosts }
// Совпадение по host (точное или поддомен).
const SERVICES = {
  gmail:    { name: "Gmail",          hosts: ["mail.google.com"] },
  drive:    { name: "Google Drive",   hosts: ["drive.google.com"] },
  docs:     { name: "Docs / Sheets / Slides", hosts: ["docs.google.com"] },
  calendar: { name: "Calendar",       hosts: ["calendar.google.com"] },
  meet:     { name: "Meet",           hosts: ["meet.google.com"] },
  keep:     { name: "Keep",           hosts: ["keep.google.com"] },
  photos:   { name: "Photos",         hosts: ["photos.google.com"] },
  contacts: { name: "Contacts",       hosts: ["contacts.google.com"] },
  youtube:  { name: "YouTube",        hosts: ["youtube.com", "www.youtube.com", "studio.youtube.com", "music.youtube.com"] },
  maps:     { name: "Maps",           hosts: ["maps.google.com", "www.google.com/maps"] },
  console:  { name: "Cloud Console",  hosts: ["console.cloud.google.com"] },
  admin:    { name: "Admin Console",  hosts: ["admin.google.com"] },
  chat:     { name: "Chat",           hosts: ["chat.google.com"] },
  gemini:   { name: "Gemini",         hosts: ["gemini.google.com"] },
  play:     { name: "Play Console",   hosts: ["play.google.com"] },
  analytics:{ name: "Analytics",      hosts: ["analytics.google.com"] },
  myaccount:{ name: "Google Account", hosts: ["myaccount.google.com"] },
};

function serviceForUrl(urlString) {
  let url;
  try { url = new URL(urlString); } catch { return null; }
  if (!/^https?:$/.test(url.protocol)) return null;
  const host = url.hostname;
  const hostPath = host + url.pathname;
  for (const [key, svc] of Object.entries(SERVICES)) {
    for (const h of svc.hosts) {
      if (h.includes("/")) {
        if (hostPath.startsWith(h) || hostPath.startsWith("www." + h)) return key;
      } else if (host === h || host.endsWith("." + h)) {
        return key;
      }
    }
  }
  return null;
}

// Уже есть явное указание аккаунта в URL?
function urlHasAccount(urlString) {
  const url = new URL(urlString);
  if (url.searchParams.has("authuser")) return true;
  if (/\/u\/\d+(\/|$)/.test(url.pathname)) return true;
  return false;
}

function withAccount(urlString, email) {
  const url = new URL(urlString);
  url.searchParams.set("authuser", email);
  return url.toString();
}

if (typeof module !== "undefined") module.exports = { SERVICES, serviceForUrl, urlHasAccount, withAccount };

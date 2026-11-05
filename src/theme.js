// Runs in <head> before first paint so a forced theme doesn't flash the system one.
// storage.sync is the source of truth (async); localStorage mirrors it for this synchronous read.
try {
  const theme = localStorage.getItem("theme");
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
} catch (e) { /* storage blocked: follow the system theme */ }

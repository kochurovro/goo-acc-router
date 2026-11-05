#!/usr/bin/env node
// site/index.html -> firebase/public/ (the landing page at https://goo-account-router.web.app/).
// Also builds /privacy (scripts/build-privacy.mjs), copies the logo and promo image, and the signed
// Firefox .xpi for the current version from dist/signed/ (npm run sign:firefox) to /firefox/goo-account-router.xpi.
// The .xpi is not in git: without it the page builds for local preview but its download link is dead.
// --release (used by npm run deploy:site) refuses to build without it, so a deploy never drops the download.
// The source-code link comes from package.json "repository"; without it the page shows "coming soon".
// Deploy: npm run deploy:site (runs this with --release, then firebase deploy)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import "./build-privacy.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "firebase", "public");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const version = pkg.version;

// Signed .xpi for the current version (file names: <hash>-<version>.xpi).
const signed = join(ROOT, "dist", "signed");
const xpi = existsSync(signed) && readdirSync(signed).find((f) => f.endsWith(`-${version}.xpi`));
if (xpi) {
  mkdirSync(join(PUB, "firefox"), { recursive: true });
  copyFileSync(join(signed, xpi), join(PUB, "firefox", "goo-account-router.xpi"));
} else if (process.argv.includes("--release")) {
  console.error(`✗ no signed .xpi for ${version} in dist/signed: run npm run sign:firefox first`);
  process.exit(1);
} else {
  console.warn(`! no signed .xpi for ${version} in dist/signed: the Firefox download link will 404 (fine for preview)`);
}

copyFileSync(join(ROOT, "brand", "logo.svg"), join(PUB, "logo.svg"));
copyFileSync(join(ROOT, "brand", "promo-440x280.png"), join(PUB, "promo.png"));

const repo = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
const sourceUrl = repo?.replace(/^git\+/, "").replace(/\.git$/, "");
const codeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/></svg>';
const slots = sourceUrl
  ? {
      __SOURCE_BUTTON__: `<a class="btn btn-ghost" href="${sourceUrl}">${codeIcon}Read the source</a>`,
      __SOURCE_TEXT__: "Check exactly what it does before you install it.",
      __SOURCE_FOOTER__: `<a href="${sourceUrl}">Source</a>`,
    }
  : {
      __SOURCE_BUTTON__: `<span class="btn" aria-disabled="true">${codeIcon}Source code <span class="soon">soon</span></span>`,
      __SOURCE_TEXT__: "The repository is being prepared for publishing.",
      __SOURCE_FOOTER__: "",
    };

let html = readFileSync(join(ROOT, "site", "index.html"), "utf8").replaceAll("__VERSION__", version);
for (const [k, v] of Object.entries(slots)) html = html.replaceAll(k, v);
writeFileSync(join(PUB, "index.html"), html);
console.log(`✓ firebase/public/index.html (v${version}, xpi ${xpi || "missing"}, source ${sourceUrl ?? "soon"})`);

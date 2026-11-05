#!/usr/bin/env node
// PRIVACY.md -> firebase/public/privacy/index.html (the public privacy-policy URL the stores and the popup link to).
// Zero dependencies: a tiny Markdown subset (headings, paragraphs, lists, tables, **bold**, _em_, `code`, [links](url)).
// Deploy: npm run deploy:privacy
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(ROOT, "PRIVACY.md"), "utf8");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => {
  const code = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${code.push(esc(c)) - 1}\u0000`);
  s = esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])_([^_]+)_(?=$|[\s.,;:)])/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${code[i]}</code>`);
};

let title = "Privacy Policy";
const out = [];
const blocks = md.trim().split(/\n{2,}/);
for (const block of blocks) {
  const lines = block.split("\n");
  const h = block.match(/^(#{1,3}) (.*)$/);
  if (h && lines.length === 1) {
    if (h[1] === "#") title = h[2];
    out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
  } else if (lines.every((l) => /^- /.test(l))) {
    out.push("<ul>" + lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join("") + "</ul>");
  } else if (lines.every((l) => l.startsWith("|"))) {
    const cells = (l) => l.slice(1, -1).split("|").map((c) => c.trim());
    const [head, , ...rows] = lines;
    out.push('<div class="table"><table><thead><tr>' + cells(head).map((c) => `<th>${inline(c)}</th>`).join("") +
      "</tr></thead><tbody>" + rows.map((r) => "<tr>" + cells(r).map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") +
      "</tbody></table></div>");
  } else {
    out.push(`<p>${inline(lines.join(" "))}</p>`);
  }
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="What Goo Account Router stores and the anonymous usage statistics it sends.">
<style>
  :root {
    --ink: #151c33; --muted: #565e7a; --line: #dde1ec; --bg: #f5f6fa; --card: #ffffff; --accent: #1f4099; --code: #eef1f8;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root { --ink: #e6e9f4; --muted: #a0a7c0; --line: #2a3049; --bg: #0e1120; --card: #171b2c; --accent: #9fb3ff; --code: #20263b; color-scheme: dark; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
  main { max-width: 760px; margin: 0 auto; padding: 48px 16px 64px; }
  h1 { font-size: 30px; line-height: 1.2; letter-spacing: -0.015em; margin: 0 0 8px; text-wrap: balance; }
  h1 + p { color: var(--muted); margin-top: 0; }
  h2 { font-size: 20px; margin: 40px 0 8px; padding-top: 24px; border-top: 1px solid var(--line); }
  p, li { text-wrap: pretty; }
  ul { padding-left: 20px; }
  li { margin: 6px 0; }
  a { color: var(--accent); text-underline-offset: 2px; }
  code { font: 0.9em ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--code); padding: 1px 5px; border-radius: 4px; }
  .table { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--line); border-radius: 8px; }
  th, td { text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid var(--line); }
  th { font-size: 14px; color: var(--muted); font-weight: 600; }
  tr:last-child td { border-bottom: 0; }
  td:first-child { white-space: nowrap; }
</style>
</head>
<body>
<main>
${out.join("\n")}
</main>
</body>
</html>
`;

const dest = join(ROOT, "firebase", "public", "privacy", "index.html");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, html);
console.log("✓ firebase/public/privacy/index.html");

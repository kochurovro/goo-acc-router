#!/usr/bin/env node
// Build script: src/ + manifest/base.json + manifest/<target>.json -> dist/<target>/ and dist/<name>-<version>-<target>.zip
// Zero dependencies. Deterministic zip (sorted entries, fixed mtime from SOURCE_DATE_EPOCH or git commit time).
// Usage: node scripts/build.mjs [chromium|firefox|all] [--no-zip]
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import { join, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const MANIFEST_DIR = join(ROOT, "manifest");
const DIST = join(ROOT, "dist");
const TARGETS = ["chromium", "firefox"];

const args = process.argv.slice(2);
const noZip = args.includes("--no-zip");
const wanted = args.filter((a) => !a.startsWith("--"));
const targets = wanted.length && wanted[0] !== "all" ? wanted : TARGETS;
for (const t of targets) if (!TARGETS.includes(t)) { console.error(`Unknown target "${t}". Use: ${TARGETS.join(", ")}`); process.exit(1); }

// ---- helpers -------------------------------------------------------------
function readJson(p) { return JSON.parse(readFileSync(p, "utf8")); }
function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    if (name === ".DS_Store") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(relative(base, full).split(sep).join("/"));
  }
  return out;
}
function sourceDateEpoch() {
  if (process.env.SOURCE_DATE_EPOCH) return Number(process.env.SOURCE_DATE_EPOCH);
  try { return Number(execSync("git log -1 --format=%ct", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim()); }
  catch { return 0; }
}
// Deep merge: objects merge, everything else (arrays, scalars) is replaced by the target value.
function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])
      ? merge(base[k], v) : v;
  }
  return out;
}

// ---- minimal deterministic zip writer ------------------------------------
const CRC_TABLE = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function dosDateTime(epoch) {
  const d = new Date(Math.max(epoch, Date.UTC(1980, 0, 1) / 1000) * 1000);
  const time = (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1);
  const date = ((d.getUTCFullYear() - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate();
  return { time, date };
}
function zip(files /* [{name, data}] sorted */, epoch) {
  const { time, date } = dosDateTime(epoch);
  const locals = [], centrals = []; let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const deflated = deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); // version 2.0, UTF-8 names
    lh.writeUInt16LE(method, 8); lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(method, 10); ch.writeUInt16LE(time, 12); ch.writeUInt16LE(date, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
    locals.push(lh, nameBuf, body); centrals.push(ch, nameBuf);
    offset += lh.length + nameBuf.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16); eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, cd, eocd]);
}

// ---- build ----------------------------------------------------------------
const base = readJson(join(MANIFEST_DIR, "base.json"));
const epoch = sourceDateEpoch();
const slug = base.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
mkdirSync(DIST, { recursive: true });

for (const target of targets) {
  const manifest = merge(base, readJson(join(MANIFEST_DIR, `${target}.json`)));
  const outDir = join(DIST, target);
  rmSync(outDir, { recursive: true, force: true });
  const files = [];
  for (const rel of walk(SRC)) {
    const dest = join(outDir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(SRC, rel), dest);
    files.push({ name: rel, data: readFileSync(join(SRC, rel)) });
  }
  const manifestText = JSON.stringify(manifest, null, 2) + "\n";
  writeFileSync(join(outDir, "manifest.json"), manifestText);
  files.push({ name: "manifest.json", data: Buffer.from(manifestText) });
  files.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  console.log(`✓ dist/${target}/  (${files.length} files)`);
  if (!noZip) {
    const zipName = `${slug}-${manifest.version}-${target}.zip`;
    writeFileSync(join(DIST, zipName), zip(files, epoch));
    console.log(`✓ dist/${zipName}`);
  }
}
if (!noZip) console.log(`  mtime for zip entries: ${new Date(epoch * 1000).toISOString()} (SOURCE_DATE_EPOCH / last git commit)`);

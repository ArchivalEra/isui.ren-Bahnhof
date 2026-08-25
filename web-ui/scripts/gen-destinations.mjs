// Build-time destination discovery for the departure board.
//
// Usage:
//   node scripts/gen-destinations.mjs <deploy-checkout-dir> <blacklist-file> <out-file>
//
// Scans the heart deploy branch checkout for live page directories
// (depth 1, must contain an index.html), drops Bahnhof itself and
// everything the blacklist filters, and emits a typed module the board
// consumes. The blacklist never ships: the browser only ever sees the
// filtered result. If the deploy checkout is missing (local dev), the
// script falls back to the single known destination (heart) so builds
// never break.

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const [deployDir, blacklistFile, outFile] = process.argv.slice(2);

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
  return new RegExp(`^${escaped}$`);
}

function loadBlacklist(file) {
  if (!blacklistFile || !existsSync(blacklistFile)) return [];
  return readFileSync(blacklistFile, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map(globToRegExp);
}

function isBlocked(slug, patterns) {
  const candidates = [slug, `${slug}/*`, `isui.ren/${slug}`, `isui.ren/${slug}/*`];
  return patterns.some((p) => candidates.some((c) => p.test(c)));
}

// Nach format: last path segment, first ASCII letter capitalized.
// /blog/hub/jhi/dajwh/hfub -> Hfub ; heart -> Heart
function labelOf(slug) {
  const last = slug.split("/").filter(Boolean).pop() ?? slug;
  return /^[a-z]/.test(last) ? last[0].toUpperCase() + last.slice(1) : last;
}

let slugs;
if (deployDir && existsSync(deployDir)) {
  slugs = readdirSync(deployDir).filter((name) => {
    if (name === "Bahnhof") return false; // this station is not its own destination
    const full = path.join(deployDir, name);
    if (!statSync(full).isDirectory()) return false; // files (404.html...) are not pages
    return existsSync(path.join(full, "index.html")); // a live page has an index
  });
} else {
  console.warn("[gen-destinations] no deploy checkout given - falling back to [heart]");
  slugs = ["heart"];
}

const patterns = loadBlacklist(blacklistFile);
const destinations = slugs
  .filter((slug) => !isBlocked(slug, patterns))
  .sort((a, b) => a.localeCompare(b))
  .map((slug) => ({ slug, label: labelOf(slug), href: `/${slug}` }));

const body = `// GENERATED at build time by scripts/gen-destinations.mjs - do not edit.
// Source of truth: live page directories on the heart deploy branch,
// minus everything the build-time blacklist filters out. The blacklist
// itself never ships: the browser only ever sees this result.

export interface Destination {
  slug: string;
  label: string;
  href: string;
}

export const DESTINATIONS: Destination[] = ${JSON.stringify(destinations, null, 2)};
`;
writeFileSync(outFile, body);
console.log(`[gen-destinations] board destinations: ${destinations.map((d) => d.label).join(", ") || "(none)"}`);

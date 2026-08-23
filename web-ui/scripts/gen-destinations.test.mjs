// Tests for the pure helpers inside scripts/gen-destinations.mjs.
//
// The script performs top-level side effects (reads process.argv, scans
// directories, writes files), so it cannot be imported directly. Instead
// these tests read the source file and extract the three pure functions
// verbatim, so the suite always exercises the real shipped logic without
// modifying the script itself.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const scriptPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "gen-destinations.mjs",
);
const source = readFileSync(scriptPath, "utf8");

// Extract `function <name>(...) { ... }` from the source by brace counting.
// This relies on every "{" / "}" appearing inside string or regex literals
// of these helpers being balanced (they only contain "${...}" interpolations),
// which keeps the extractor tiny and dependency-free.
function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`function ${name} not found in gen-destinations.mjs`);
  }
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces while extracting ${name}`);
}

const helpers = new Function(
  [
    extractFunction("globToRegExp"),
    extractFunction("isBlocked"),
    extractFunction("labelOf"),
    "return { globToRegExp, isBlocked, labelOf };",
  ].join("\n"),
)();

const { globToRegExp, isBlocked, labelOf } = helpers;

test("globToRegExp: isui.ren/test/* matches direct children including the bare trailing slash", () => {
  const re = globToRegExp("isui.ren/test/*");
  assert.equal(re.test("isui.ren/test/x"), true);
  assert.equal(re.test("isui.ren/test/"), true);
});

test("globToRegExp: isui.ren/test/* does not cross directory boundaries", () => {
  const re = globToRegExp("isui.ren/test/*");
  assert.equal(re.test("isui.ren/test/x/y"), false);
});

test("globToRegExp: *.global.isui.ren matches a single label before the suffix", () => {
  const re = globToRegExp("*.global.isui.ren");
  assert.equal(re.test("a.global.isui.ren"), true);
});

test("globToRegExp: *.global.isui.ren requires the star to consume something before the dot", () => {
  const re = globToRegExp("*.global.isui.ren");
  assert.equal(re.test("global.isui.ren"), false);
  assert.equal(re.test("isui.ren"), false);
});

test("globToRegExp: regex metacharacters are escaped literally", () => {
  const re = globToRegExp("a.b");
  assert.equal(re.test("axb"), false);
  assert.equal(re.test("a.b"), true);
});

test("isBlocked: a bare slug pattern blocks exactly that slug", () => {
  const patterns = [globToRegExp("drafts")];
  assert.equal(isBlocked("drafts", patterns), true);
  assert.equal(isBlocked("heart", patterns), false);
});

test("isBlocked: an isui.ren/test/* pattern blocks the bare test slug", () => {
  const patterns = [globToRegExp("isui.ren/test/*")];
  assert.equal(isBlocked("test", patterns), true);
});

test("isBlocked: a slug/* pattern blocks the bare slug via the derived candidates", () => {
  const patterns = [globToRegExp("test/*")];
  assert.equal(isBlocked("test", patterns), true);
});

test("isBlocked: unrelated nested destinations are not blocked", () => {
  const patterns = [globToRegExp("drafts"), globToRegExp("isui.ren/test/*")];
  assert.equal(isBlocked("heart/blog", patterns), false);
});

test("labelOf: capitalizes the first letter of single-segment slugs", () => {
  assert.equal(labelOf("heart"), "Heart");
  assert.equal(labelOf("blog"), "Blog");
  assert.equal(labelOf("hfub"), "Hfub");
});

test("labelOf: uses the last path segment of multi-segment slugs", () => {
  assert.equal(labelOf("blog/hub/jhi/dajwh/hfub"), "Hfub");
});

test("labelOf: leaves slugs that do not start with a lowercase letter untouched", () => {
  assert.equal(labelOf("404"), "404");
});

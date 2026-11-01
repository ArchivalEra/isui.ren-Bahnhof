# GitRoll remediation report (2026-11-01)

Scan id `IObOlse3jAjReKQacWKO`, baseline date 2026-10-31. This report
covers every finding from that scan for this repository only.

Totals: 27 findings across 19 rules. Triage tiers used here:

- **A** mechanical, semantics-preserving: safe to change directly.
- **B** needs judgment: change, or explain why not.
- **C** generated or third-party artifact: accepted, not changed.

Two rules were already closed before this session:

- `Mark the props of the component as read-only` (2) - `3e8c575`
- `Remove this useless assignment to variable "raf"` (2) - `a0fa862`

All work happened on `main`. Nothing was pushed. The working tree is
clean; build output stays ignored by the whitelist `.gitignore`.

## Commits in this session

```
fbd282f fix(gitroll): move wave frame loop into a module helper
b33d4c8 fix(gitroll): extract feed memory prune out of refreshFuture
7f6fdb1 fix(gitroll): extract due-row sweep out of tickBoard
c1126f2 fix(gitroll): split shiftBoard refill into named helpers
06782a8 fix(gitroll): extract frame-wait helper to flatten nested callbacks
2ff2c3e fix(gitroll): replace nested row-class ternary with an if-chain
e8ff45b fix(gitroll): use output element for the empty-board status message
d7d8446 fix(gitroll): merge duplicate board-search selector into one rule
750022b fix(gitroll): collapse identical branches in shiftBoard feed prune
5ee55a6 fix(gitroll): use nullish assignment for wasm module cache
9b33519 fix(gitroll): remove void-operator marker in future refresh
0b3ae7d fix(gitroll): drop redundant element type assertion in flip effect
a73080c fix(gitroll): remove unused imports in board component
```

## A tier

| Rule | Location | Status |
|---|---|---|
| Unused import `DESTINATIONS` | `web-ui/src/Board.tsx:24` | removed (`a73080c`) |
| Unused import `ComponentChildren` | `web-ui/src/Board.tsx:27` | removed (`a73080c`) |
| Unnecessary assertion | `web-ui/src/Board.tsx:523` | removed (`0b3ae7d`) |
| `void` operator | `web-ui/src/timetable.ts:446` | removed (`9b33519`) |
| Prefer `??=` | `web-ui/src/wave-engine.ts:30` | applied (`5ee55a6`) |

Notes:

- The assertion finding was a real one. `Array.from(tbodyRef.current.children)
  as HTMLElement[]` asserted a cast that `Array.from` cannot produce, so
  the cast was masking the real typing problem. Replacing it with
  `Array.from(tbodyRef.current.rows)` gives a `HTMLTableRowElement[]`
  without any assertion, which is the correct DOM iteration for a
  `<tbody>` and keeps `.style` available on each element.
- `void keptIdx` was propping up a `Set` that nothing read. Both the
  marker and the now-dead `keptIdx` binding were removed; the surrounding
  comment that explained why destination memory is *not* pruned was kept
  because it documents an intentional asymmetry with feed memory.

## B tier

### `Extract this nested ternary operation into an independent statement` (`Board.tsx:255`, `:257`)

**Changed.** The three-deep ternary chose the row class (`gone` / `now` /
`""` / `dim`). Extracted to a named `rowClass` local built by a plain
`if` / `else if` chain. Order of precedence is unchanged and the default
(`""`) is the declared initial value, so every branch value is identical.
The nested ternary in `bahnhof_wave.js:71` is part of the C tier below.

### `Refactor this function to reduce its Cognitive Complexity from 58 to the 15 allowed` (`timetable.ts:516`, `shiftBoard`)

**Changed**, structurally. `shiftBoard` was split into three pieces, each
with a single responsibility:

- `shiftBoard` - argument guard, rewind path, forward cut, assembly.
- `pruneWindowMem` - feed/destination memory pruning for the dropped
  window.
- `refillTail` - the bounded refill loop.
- `pickNextCandidate` - the soonest-candidate selection over
  destination and feed timelines.

Two behaviour-preserving details were kept deliberately: the forward
branch still returns `changed: kept.length !== prev.length || filled.added`
(equivalent to the previous `changed` flag, which was set by either a
drop or an append), and the refill loop still fills, sorts, and records
memory in the same order. No call site changed.

### `Refactor this function to reduce its Cognitive Complexity from 51 to the 15 allowed` (`timetable.ts:309`, `tickBoard`)

**Changed**, by extraction only. The due-row sweep (remove / cancel /
depart / keep, in that precedence) moved into `sweepDueRows`, leaving
`tickBoard` with the clock update plus the refill loop. The 15 target is
**not** reached: after this split `tickBoard` is still dominated by the
two nested loops of the refill, which are behaviour-critical (unique
destination labels, the `guard` bound, and single-shot feed scheduling
all interact). Reaching 15 would require merging `tickBoard`,
`refreshFuture`, and `shiftBoard` onto one shared refill implementation,
and those three versions genuinely differ: `tickBoard` skips
already-present destination labels, `refreshFuture` additionally skips
rows beyond the horizon, `shiftBoard` skips neither. An attempted
unification was reverted after review because it changed which rows get
deduplicated. Reported as a deliberate partial fix rather than a hidden
regression risk.

### `Refactor this function to reduce its Cognitive Complexity from 51 to the 15 allowed` (`timetable.ts:405`, `refreshFuture`)

**Partially changed.** The memory-pruning block, including the
differently-named but identically-effective `droppedIdx` bookkeeping,
moved into `pruneAgedFeedMem`. The nested refill loop remains, for the
same reason and with the same risk profile as `tickBoard` above, so the
score improves but does not reach 15. Kept as-is rather than unified.

### `Refactor this code to not nest functions more than 4 levels deep` (`Board.tsx:603`)

**Changed.** `requestAnimationFrame(() => requestAnimationFrame(() => r()))`
was a three-arrow nesting inside an async function inside a method inside
a component. Replaced by a module-level `afterFrames(n)` helper, so the
call site is `await afterFrames(2)`.

### `Use <output> instead of the "status" role` (`Board.tsx:287`)

**Changed.** The empty-board message is now `<output aria-live="polite">`
instead of `<div role="status" aria-live="polite">`. Two details keep the
visual result identical: `<output>` carries an implicit `status` role, so
the announced semantics are the same, and `aria-live` is kept explicit
because some screen readers handle the implicit live semantics
inconsistently. `<output>` is inline by default, so `.board-empty` gained
`display: block` to preserve the previous full-width box geometry, padding
and centered text.

### `Unexpected duplicate selector ".board-search", first used at line 191` (`styles.css:322`)

**Changed, by merging.** The first rule declared only `margin-top: 1rem`;
the second declared the real layout (`position`, `z-index`, `grid-row`,
`width`, `margin: 0 auto`, `padding`, `transform`). The later `margin`
shorthand already overrode the earlier `margin-top`, so the first rule was
dead. It was removed and the surviving rule is now the single
`.board-search` declaration, with a comment recording the merge. No
declaration value changed; the compiled CSS still contains exactly one
`.board-search` selector.

### `Remove this conditional structure or edit its code blocks so that they're not all the same` (`timetable.ts:539`)

**Changed - this was a real defect.** The block read:

```ts
if (di >= FEED_OFFSET) {
  if (liveFeedIdx.has(di)) delete mem[di];
  else delete mem[di];
}
```

Both branches deleted the entry, so the liveness test was inert: a dropped
feed was always rescheduled, and feeds that no longer exist were already
pruned by the following loop. Collapsed to a single `delete mem[di]`
guarded by `di >= FEED_OFFSET`, with the fall-through loop untouched. The
behaviour is identical to what the code actually did before; the value is
that the false affordance ("maybe this differs when the feed is dead") is
gone. Had the intent been to *keep* memory for live feeds, the code would
have been a scheduling bug - but `refreshFuture` uses the same always-drop
policy for beyond-horizon feeds, so treating the collapse as the intended
semantics and documenting the shared policy was the safer reading.

## C tier - accepted, not changed

All nine are in `web-ui/src/wave-wasm/bahnhof_wave.js`, which
`web-wave/build.sh` regenerates with wasm-bindgen from the Rust crate in
`web-wave/src/` (alongside `bahnhof_wave_bg.wasm` and `bahnhof_wave.d.ts`).
Editing it would be undone by the next build, and it is never a
hand-authored source file.

| Rule | Line |
|---|---|
| `Unexpected var, use let or const instead` | 130, 131, 141, 142 |
| `Extract this nested ternary operation into an independent statement` | 71 |
| `Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed` | 352 |
| `Handle this exception or don't catch it at all` | 162 |
| `Function has too many parameters (10). Maximum allowed is 7` | 180 |
| `Extract the assignment of "len" from this expression` | 294 |

One sentence covers all nine: generated wasm-bindgen glue, accepted as
generated code and not patched in place. Any real change here belongs
upstream in `web-wave/src/` or in the wasm-bindgen release, not in the
artifact.

## Verification

Type check and production build, run from `web-ui/`:

```
$ npx tsc --noEmit
tsc exit=0

$ npx vite build
vite exit=0
dist/index.html                             0.52 kB
dist/assets/bahnhof_wave_bg-lWTBjq-Q.wasm  61.68 kB
dist/assets/index-CMtkvlRc.css              6.78 kB
dist/assets/bahnhof_wave-BPA53AtB.js        7.01 kB
dist/assets/index-zH9L7CDQ.js              56.26 kB
built in 60ms
```

Existing test suite:

```
$ node --test scripts/gen-destinations.test.mjs
pass 12
fail 0
```

### Behavioural equivalence for the scheduler refactors

Because `timetable.ts` carries the schedule discipline (gap spacing,
unique destination labels, single-shot feed scheduling, horizon
refreshes, window shifts), the refactors were checked with a snapshot
harness rather than by inspection alone. A bundled copy of
`timetable.ts` was driven through a deterministic scenario: a fixed clock
anchor, a three-item feed set, 240 one-second ticks, `refreshFuture` at
0h / 1h / 2h horizons, a feed-set shrink and regrow, `shiftBoard` at 0,
15, 60, 180 and 360 minutes forward, two rewinds, `forceRegenerate`, and a
`shiftBoard` run against a partially dead feed set. The digest covers all
416 produced rows plus the full scheduler memory after each call.

The pre-refactor baseline and every intermediate step produce the same
digest:

```
rows=416
labels=76
sha256=29d98b93a537dc45d146e47366d8286bd1c8082abe745f973022a1068e3e3df0
```

That hash is identical for the baseline snapshot, each of the four
`timetable.ts` commits, and the final tree. The harness lives outside the
repository and is not committed.

## Residual checks

Every A-tier and changed B-tier finding was re-grepped after the work:

```
$ grep -n "DESTINATIONS\|ComponentChildren" src/Board.tsx
(no output: zero matches)

$ grep -n "void keptIdx" src/timetable.ts
(no output: zero matches)

$ grep -n "as HTMLElement\[\]" src/Board.tsx
(no output: zero matches)

$ grep -n "if (!wasmReady)" src/wave-engine.ts
(no output: zero matches)

$ grep -c "^\.board-search {" src/styles.css
1

$ grep -rn 'role="status"' src/
(no output: zero matches)

$ grep -n "raf = requestAnimationFrame" src/wave-engine.ts
(no output: zero matches)
```

`web-ui/src/wave-wasm/bahnhof_wave.js` was not touched: its last
modifying commit is still `10c63bf` (the original engine landing).

## False positives and judgment calls

- **`Remove this conditional structure` (`timetable.ts:539`)** was not a
  false positive: it pointed at genuinely dead logic. Fixed as described
  above.
- **Cognitive Complexity 51 on `tickBoard` and `refreshFuture`** are
  accurate, not false positives, but the 15 threshold is unreachable
  without unifying three refill loops that must stay different. Partial
  extraction was applied; the residue is documented rather than forced.
- **`Use <output>`** is technically correct, and it was applied, but the
  original was not a bug: `role="status"` is the equivalent semantic.
  The change is a nudge toward the more specific element.
- **All nine C-tier findings** are artifacts of generated code. They are
  correct observations about the generated file and should be suppressed
  at scan-configuration level, not fixed at source.

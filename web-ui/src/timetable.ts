// Live departure scheduler — the board is a rolling queue driven by the
// real clock, governed by schedule DISCIPLINE rather than a fixed size:
//
//   - same-destination departures are spaced 15..40 minutes apart
//   - a destination holds at most ONE row on the board (unique NACH)
//   - the board grows and shrinks naturally as destinations come and go
//
// Destinations themselves are discovered at build time
// (destinations.generated.ts); train numbers stay fictional forever.
// Feed items (posts.json) are injected at runtime and polled for changes.
// All randomness is deterministic per slot, so the same train is always
// the same train.

import { DESTINATIONS, FEED_ITEMS as INITIAL_FEEDS } from "./destinations.generated";

export const MAX_ROWS = 12; // absolute ceiling across all destinations
export const LINGER_MS = 3000; // how long a due row holds before leaving
const MIN_GAP_MS = 15 * 60_000; // schedule discipline floor...
const MAX_GAP_MS = 40 * 60_000; // ...and ceiling between same-dest trains
export const ON_BOARD_PER_DEST = 1; // discipline: max simultaneous rows per dest (unique NACH)
const FIRST_LEAD_MIN = 13; // first train of a fresh timeline: 2..15 min out
export const REFRESH_HORIZON_MS = 60 * 60_000; // 1h: future beyond this is regenerated on feed change

export interface FeedItem {
  title: string;
  url: string;
  desc: string | null;
  slug: string;
}

const TRAINS = ["S 3", "RE 7", "IC 221", "RB 12", "RE 4", "IC 44", "S 9", "RE 2"];

const FEED_TRAINS = ["D 1", "D 2", "D 3", "D 4", "D 5", "D 6", "D 7", "D 8"];
const FEED_OFFSET = 1000; // destIdx base for feed items (non-conflicting with real destinations)

// runtime-mutable feed store (build-time INITIAL_FEEDS is the fallback)
let _feeds: FeedItem[] = INITIAL_FEEDS as FeedItem[];
const _feedMap = new Map<number, FeedItem>();

function hashStr(s: string): number {
  return Math.abs(s.split("").reduce((h: number, c: string) => (h * 31 + c.charCodeAt(0)) | 0, 0));
}

function feedDestIdxFor(url: string): number {
  // stable per-URL, far from DESTINATIONS indices (0..n)
  return FEED_OFFSET + (hashStr(url) % 100_000);
}

function rebuildFeedMap(): void {
  _feedMap.clear();
  const seenTitle = new Set<string>();
  for (const fi of _feeds) {
    const titleKey = fi.title.trim().toLowerCase();
    if (seenTitle.has(titleKey)) continue; // no duplicate NACH (user explicitly forbids)
    const di = feedDestIdxFor(fi.url);
    if (_feedMap.has(di)) continue; // destIdx collision (extremely rare)
    seenTitle.add(titleKey);
    _feedMap.set(di, fi);
  }
}
rebuildFeedMap();

export function getFeedItems(): FeedItem[] {
  return _feeds;
}

export function setFeedItems(items: FeedItem[]): void {
  _feeds = items;
  rebuildFeedMap();
}

function feedItemForDestIdx(destIdx: number): FeedItem | undefined {
  return _feedMap.get(destIdx);
}

const REMARKS = [
  "Wagenreihung",
  "Speisewagen",
  "Fahrradmitnahme",
  "Barrierefrei",
  "WLAN",
  "Kinderwagen",
];

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export interface Departure {
  id: string; // stable identity across ticks
  destIdx: number; // destination timeline this row belongs to
  time: string; // scheduled HH:MM
  departsAtMs: number;
  train: string;
  dest: string; // display label (Nach column)
  destHref: string;
  platform: string;
  /** spawn-time fate; the runtime overlays boarding/departed on top */
  state: "ontime" | "delay" | "cancelled" | "departed";
  delayMin?: number;
  remark?: string;
  /** live cancellation: the moment this train turns CANCELLED out of the
   *  blue, somewhere 30-90s before departure. Absent for healthy trains
   *  and for those already too close to depart when first scheduled. */
  cancelAtMs?: number;
  /** set when due: the moment this row should vanish */
  removalAt?: number;
}

interface Spawn {
  destIdx: number;
  slot: number; // per-destination cycle index - stable identity
  departsAtMs: number;
}

/** The scheduler's memory: where each destination's timeline currently
 *  stands. Held by the caller across ticks; rows come and go, but this
 *  keeps slot ids unique and the gap discipline honest. */
export type ScheduleMem = Record<number, { slot: number; ms: number }>;

// module-level "station clock" anchor used while spawning; kept fresh by
// initialBoard/tickBoard so cancel-failure moments are always in the future
let anchorMs = 0;

/** Gap to the NEXT departure of a destination: 15..40 minutes. */
function gapMs(destIdx: number, slot: number): number {
  const r = rand(slot * 7.77 + destIdx * 3.31);
  return MIN_GAP_MS + Math.floor(r * (MAX_GAP_MS - MIN_GAP_MS));
}

function trainFor(destIdx: number, slot: number): string {
  return TRAINS[(destIdx * 3 + slot) % TRAINS.length];
}

function destOf(destIdx: number): { label: string; href: string } {
  return (
    DESTINATIONS[destIdx % Math.max(1, DESTINATIONS.length)] ?? {
      label: "Heart",
      href: "/heart/",
    }
  );
}

function materialize(sp: Spawn): Departure {
  const isFeed = sp.destIdx >= FEED_OFFSET;
  const d = new Date(sp.departsAtMs);
  // scheduled HH:MM in the VISITOR's timezone and locale - a departure
  // at the same instant reads 17:44 in Berlin and 5:44 PM in New York,
  // each matching what their desktop clock shows
  const hhmm = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (isFeed) {
    const fi = feedItemForDestIdx(sp.destIdx);
    if (!fi) {
      // stale feed destIdx after a posts.json change — fallback to a placeholder
      return {
        id: `feed-${sp.destIdx}-${sp.slot}`,
        destIdx: sp.destIdx,
        time: hhmm,
        departsAtMs: sp.departsAtMs,
        train: FEED_TRAINS[(sp.destIdx + sp.slot) % FEED_TRAINS.length],
        dest: "UNKNOWN",
        destHref: "#",
        platform: String(1 + Math.floor(rand(sp.slot * 5.13 + sp.destIdx) * 3)),
        state: "ontime",
        remark: undefined,
        cancelAtMs: undefined,
        removalAt: undefined,
      };
    }
    return {
      id: `${fi.slug}-feed-${sp.destIdx}-${sp.slot}`,
      destIdx: sp.destIdx,
      time: hhmm,
      departsAtMs: sp.departsAtMs,
      train: FEED_TRAINS[(sp.destIdx + sp.slot) % FEED_TRAINS.length],
      dest: fi.title,
      destHref: fi.url,
      platform: String(1 + Math.floor(rand(sp.slot * 5.13 + sp.destIdx) * 3)),
      state: "ontime",
      remark: fi.desc ?? undefined,
      cancelAtMs: undefined,
      removalAt: undefined,
    };
  }

  const r = rand(sp.slot * 7.13 + sp.destIdx * 11.17);
  let state: Departure["state"] = "ontime";
  let delayMin: number | undefined;
  if (r < 0.06) {
    state = "cancelled";
  } else if (r < 0.28) {
    state = "delay";
    delayMin = 2 + Math.floor(rand(sp.slot * 3.7) * 10); // +2..+11
  }

  const remark =
    r > 0.72 ? REMARKS[Math.floor(rand(sp.slot * 11.3) * REMARKS.length)] : undefined;

  // live cancellation: healthy-looking trains can fail last-minute. The
  // failure moment is baked in per slot (deterministic) and always at
  // least 90s out from "now", so it can be witnessed happening.
  let cancelAtMs: number | undefined;
  if (
    state !== "cancelled" &&
    sp.departsAtMs - anchorMs > 90_000 &&
    rand(sp.slot * 5.31 + sp.destIdx * 1.7) < 0.05
  ) {
    cancelAtMs = sp.departsAtMs - (30_000 + Math.floor(rand(sp.slot * 9.77) * 60_000));
  }

  const dest = destOf(sp.destIdx);
  const train = trainFor(sp.destIdx, sp.slot);

  return {
    id: `${train}-${sp.destIdx}-${sp.slot}`,
    destIdx: sp.destIdx,
    time: hhmm,
    departsAtMs: sp.departsAtMs,
    train,
    dest: dest.label,
    destHref: dest.href,
    platform: String(1 + Math.floor(rand(sp.slot * 5.13 + sp.destIdx) * 3)),
    state,
    delayMin,
    remark,
    cancelAtMs,
  };
}

function nextSpawnAfter(
  memEntry: { slot: number; ms: number } | undefined,
  destIdx: number,
): Spawn {
  if (!memEntry) {
    // brand-new destination timeline: first train 2..15 minutes out
    return {
      destIdx,
      slot: 1,
      departsAtMs: anchorMs + 120_000 + Math.floor(rand(destIdx * 9.7) * FIRST_LEAD_MIN * 60_000),
    };
  }
  const slot = memEntry.slot + 1;
  return { destIdx, slot, departsAtMs: memEntry.ms + gapMs(destIdx, slot) };
}

/** Initial board: every discovered destination gets up to ONE train
 *  (unique NACH), honoring the gap discipline. Also seeds the scheduler memory.
 *  Feed items are each scheduled once at a deterministic time. */
export function initialBoard(now: Date): { rows: Departure[]; mem: ScheduleMem } {
  anchorMs = now.getTime();
  const mem: ScheduleMem = {};
  const rows: Departure[] = [];
  const feeds = getFeedItems();

  for (let di = 0; di < Math.max(1, DESTINATIONS.length); di++) {
    let spawn = nextSpawnAfter(undefined, di);
    for (let k = 0; k < ON_BOARD_PER_DEST && rows.length < MAX_ROWS; k++) {
      rows.push(materialize(spawn));
      mem[di] = { slot: spawn.slot, ms: spawn.departsAtMs };
      spawn = nextSpawnAfter(mem[di], di);
    }
  }

  // schedule feed items: each gets a deterministic departure based on
  // its URL hash, spread across 5 hours from now (stable per URL)
  for (const fi of feeds) {
    const di = feedDestIdxFor(fi.url);
    const urlHash = hashStr(fi.url);
    const ms = anchorMs + 120_000 + (urlHash % (18_000_000 - 120_000));
    // if two feed items collide on destIdx, first wins (rebuildFeedMap)
    if (mem[di] || !_feedMap.has(di)) continue;
    mem[di] = { slot: 1, ms };
    const spawn: Spawn = { destIdx: di, slot: 1, departsAtMs: ms };
    rows.push(materialize(spawn));
  }

  rows.sort((a, b) => a.departsAtMs - b.departsAtMs);

  // trains whose failure moment already passed while the page was closed
  // load as cancelled - no fake ON TIME flash on first paint
  const t = now.getTime();
  const adjusted = rows.map((r) =>
    r.cancelAtMs && r.cancelAtMs <= t && r.state !== "cancelled"
      ? { ...r, state: "cancelled" as const, delayMin: undefined }
      : r,
  );
  return { rows: adjusted, mem };
}

export interface TickResult {
  rows: Departure[];
  mem: ScheduleMem;
  changed: boolean;
}

/** One second of station time: live cancellations flip trains on the
 *  spot, due rows linger then leave, and every destination under its
 *  two-row quota gets its next train appended at the tail (each new
 *  departure is always later than everything on the board, so the
 *  timetable stays ordered). Returns the previous state untouched when
 *  nothing happened, so the caller can skip re-renders. */
export function tickBoard(
  prev: Departure[],
  now: Date,
  memIn: ScheduleMem,
): TickResult {
  const t = now.getTime();
  anchorMs = t;
  const mem: ScheduleMem = { ...memIn };
  const rows: Departure[] = [];
  let changed = false;

  for (const row of prev) {
    if (row.removalAt && t >= row.removalAt) {
      changed = true;
      continue; // left the station
    }
    if (
      !row.removalAt &&
      row.state !== "cancelled" &&
      row.cancelAtMs &&
      t >= row.cancelAtMs
    ) {
      // live failure: the train goes CANCELLED on the spot, mid-boarding
      changed = true;
      rows.push({ ...row, state: "cancelled", delayMin: undefined });
      continue;
    }
    if (!row.removalAt && t >= row.departsAtMs) {
      changed = true;
      rows.push({
        ...row,
        state: row.state === "cancelled" ? "cancelled" : "departed",
        removalAt: t + LINGER_MS,
      });
      continue;
    }
    rows.push(row);
  }

  // refill: every destination under its one-row quota gets its next
  // train; whichever destination is next-in-time across the network
  // fills the tail first (unique NACH)
  let guard = 0;
  while (rows.length < MAX_ROWS && guard++ < 50) {
    const counts = new Map<number, number>();
    for (const r of rows) {
      counts.set(r.destIdx, (counts.get(r.destIdx) ?? 0) + 1);
    }
    let chosen: { di: number; spawn: Spawn } | null = null;
    for (let di = 0; di < Math.max(1, DESTINATIONS.length); di++) {
      if ((counts.get(di) ?? 0) >= ON_BOARD_PER_DEST) continue;
      const sp = nextSpawnAfter(mem[di], di);
      if (!chosen || sp.departsAtMs < chosen.spawn.departsAtMs) chosen = { di, spawn: sp };
    }
    // feed items are single-shot: each departs exactly once, scheduled
    // deterministically from its URL hash (stable per URL). Only schedule
    // items not yet in the memory (i.e. not yet scheduled this session).
    for (const fi of getFeedItems()) {
      const di = feedDestIdxFor(fi.url);
      if (!_feedMap.has(di)) continue; // collision loser
      if (mem[di]) continue; // already scheduled
      if ((counts.get(di) ?? 0) > 0) continue; // already on the board
      const urlHash = hashStr(fi.url);
      const ms = anchorMs + 120_000 + (urlHash % (18_000_000 - 120_000));
      const sp: Spawn = { destIdx: di, slot: 1, departsAtMs: ms };
      if (!chosen || sp.departsAtMs < chosen.spawn.departsAtMs) chosen = { di, spawn: sp };
    }
    if (!chosen) break;
    rows.push(materialize(chosen.spawn));
    mem[chosen.di] = { slot: chosen.spawn.slot, ms: chosen.spawn.departsAtMs };
    changed = true;
  }

  return changed ? { rows, mem, changed } : { rows: prev, mem: memIn, changed };
}

/** Force a full rebuild from the current clock and current feed set. */
export function forceRegenerate(now: Date): { rows: Departure[]; mem: ScheduleMem } {
  return initialBoard(now);
}

/**
 * Refresh only the part of the board beyond `horizonMs` (default 1h).
 * Rows within the horizon are kept verbatim; rows beyond are dropped and
 * the tail is refilled from the current feed set and the schedule discipline.
 * This is what the posts.json watcher calls so imminent departures never jump.
 */
export function refreshFuture(
  prev: Departure[],
  now: Date,
  memIn: ScheduleMem,
  horizonMs: number = REFRESH_HORIZON_MS,
): TickResult {
  const t = now.getTime();
  anchorMs = t;
  const horizon = t + horizonMs;

  // keep imminent rows (including lingering DEPARTED/CANCELLED that still have a removalAt)
  const kept: Departure[] = prev.filter((r) => r.departsAtMs <= horizon);
  // if the board is entirely within the horizon, a refresh would be a no-op
  // — still run the refill so newly arrived feed items can fill the tail
  const dropped = prev.length - kept.length;

  // rebuild mem: keep entries for dests that still have a kept row,
  // and for dests whose last departure is still beyond horizon (so the
  // next spawn stays beyond horizon rather than jumping to 2..15min).
  // For feed items: drop mem for URLs that no longer exist in the feed set.
  const mem: ScheduleMem = { ...memIn };
  const keptIdx = new Set(kept.map((r) => r.destIdx));
  const droppedIdx = new Set(prev.filter((r) => r.departsAtMs > horizon).map((r) => r.destIdx));
  const liveFeedIdx = new Set(getFeedItems().map((fi) => feedDestIdxFor(fi.url)));

  for (const k of Object.keys(mem)) {
    const di = Number(k);
    const isFeed = di >= FEED_OFFSET;
    if (isFeed && !liveFeedIdx.has(di)) {
      delete mem[di];
      continue;
    }
    if (isFeed && droppedIdx.has(di)) {
      // feed beyond horizon was dropped — allow it to be rescheduled
      // (single-shot feeds need a new deterministic slot after the refresh)
      delete mem[di];
      continue;
    }
    // destination rows beyond horizon were dropped — keep their mem so the
    // next departure stays disciplined (15..40min after the dropped one),
    // i.e. still beyond the horizon, not snapping forward.
    void keptIdx;
  }

  // if nothing was dropped and no new feed arrived, still allow new feed
  // items (not yet in mem) to be scheduled by the refill loop
  const baseRows = kept.slice();
  // sort kept by time (they already are, but ensure)
  baseRows.sort((a, b) => a.departsAtMs - b.departsAtMs);

  // reuse tickBoard's refill logic starting from the kept rows
  // (we duplicate the loop to avoid re-running the per-second culling)
  let rows = baseRows;
  let changed = dropped > 0;
  let guard = 0;
  while (rows.length < MAX_ROWS && guard++ < 50) {
    const counts = new Map<number, number>();
    for (const r of rows) counts.set(r.destIdx, (counts.get(r.destIdx) ?? 0) + 1);
    let chosen: { di: number; spawn: Spawn } | null = null;
    for (let di = 0; di < Math.max(1, DESTINATIONS.length); di++) {
      if ((counts.get(di) ?? 0) >= ON_BOARD_PER_DEST) continue;
      const sp = nextSpawnAfter(mem[di], di);
      // don't schedule a destination whose next spawn is still beyond
      // horizon+5h without bound — but we must still fill the board,
      // so allow it; the horizon only protected the kept rows.
      if (!chosen || sp.departsAtMs < chosen.spawn.departsAtMs) chosen = { di, spawn: sp };
    }
    for (const fi of getFeedItems()) {
      const di = feedDestIdxFor(fi.url);
      if (!_feedMap.has(di)) continue;
      if (mem[di]) continue;
      if ((counts.get(di) ?? 0) > 0) continue;
      const urlHash = hashStr(fi.url);
      const ms = anchorMs + 120_000 + (urlHash % (18_000_000 - 120_000));
      const sp: Spawn = { destIdx: di, slot: 1, departsAtMs: ms };
      if (!chosen || sp.departsAtMs < chosen.spawn.departsAtMs) chosen = { di, spawn: sp };
    }
    if (!chosen) break;
    // ensure we don't duplicate a dest that is already on the kept board
    rows = [...rows, materialize(chosen.spawn)];
    rows.sort((a, b) => a.departsAtMs - b.departsAtMs);
    mem[chosen.di] = { slot: chosen.spawn.slot, ms: chosen.spawn.departsAtMs };
    changed = true;
  }

  // if we dropped something, we definitely changed; otherwise only if we added
  if (!changed) {
    // also consider feed set shrinkage (removed posts) as a change
    const prevFeedIds = new Set(prev.filter((r) => r.destIdx >= FEED_OFFSET).map((r) => r.destIdx));
    const nowFeedIds = new Set(liveFeedIdx);
    for (const id of prevFeedIds) if (!nowFeedIds.has(id)) { changed = true; break; }
  }

  return changed ? { rows, mem, changed } : { rows: prev, mem: memIn, changed: false };
}

/**
 * Shift the visible window by `deltaMs` without moving the station clock.
 * +delta = see further future (drop the soonest departures, refill tail);
 * -delta = rewind to see earlier departures (regenerate from an earlier now).
 * Departure ZEIT stays absolute — only the set of rows changes, like
 * refreshing a recommendation list.
 */
export function shiftBoard(
  prev: Departure[],
  now: Date,
  memIn: ScheduleMem,
  deltaMs: number,
): TickResult {
  const t = now.getTime();
  anchorMs = t;
  if (deltaMs === 0) return { rows: prev, mem: memIn, changed: false };

  if (deltaMs > 0) {
    // forward: drop anything that would depart within the next delta,
    // keep the rest (still absolute times), then refill the tail.
    const cutoff = t + deltaMs;
    const kept = prev.filter((r) => r.departsAtMs > cutoff);
    // keep mem for dropped dests (so next stays beyond), drop mem for
    // dropped feeds (so they can be rescheduled) — same as refreshFuture
    const mem: ScheduleMem = { ...memIn };
    const droppedIdx = new Set(prev.filter((r) => r.departsAtMs <= cutoff).map((r) => r.destIdx));
    const liveFeedIdx = new Set(getFeedItems().map((fi) => feedDestIdxFor(fi.url)));
    for (const di of droppedIdx) {
      if (di >= FEED_OFFSET) {
        // feed beyond window was dropped — allow reschedule (if still live)
        if (liveFeedIdx.has(di)) delete mem[di];
        else delete mem[di];
      }
    }
    // also drop mem for feeds that no longer exist
    for (const k of Object.keys(mem)) {
      const di = Number(k);
      if (di >= FEED_OFFSET && !liveFeedIdx.has(di)) delete mem[di];
    }
    // refill from kept
    let rows = kept.slice().sort((a, b) => a.departsAtMs - b.departsAtMs);
    let changed = kept.length !== prev.length;
    let guard = 0;
    while (rows.length < MAX_ROWS && guard++ < 50) {
      const counts = new Map<number, number>();
      for (const r of rows) counts.set(r.destIdx, (counts.get(r.destIdx) ?? 0) + 1);
      let chosen: { di: number; spawn: Spawn } | null = null;
      for (let di = 0; di < Math.max(1, DESTINATIONS.length); di++) {
        if ((counts.get(di) ?? 0) >= ON_BOARD_PER_DEST) continue;
        const sp = nextSpawnAfter(mem[di], di);
        if (!chosen || sp.departsAtMs < chosen.spawn.departsAtMs) chosen = { di, spawn: sp };
      }
      for (const fi of getFeedItems()) {
        const di = feedDestIdxFor(fi.url);
        if (!_feedMap.has(di)) continue;
        if (mem[di]) continue;
        if ((counts.get(di) ?? 0) > 0) continue;
        const h = hashStr(fi.url);
        const ms = anchorMs + 120_000 + (h % (18_000_000 - 120_000));
        const sp: Spawn = { destIdx: di, slot: 1, departsAtMs: ms };
        if (!chosen || sp.departsAtMs < chosen.spawn.departsAtMs) chosen = { di, spawn: sp };
      }
      if (!chosen) break;
      rows = [...rows, materialize(chosen.spawn)].sort((a, b) => a.departsAtMs - b.departsAtMs);
      mem[chosen.di] = { slot: chosen.spawn.slot, ms: chosen.spawn.departsAtMs };
      changed = true;
    }
    return { rows, mem, changed };
  } else {
    // rewind: show the timetable as it looked delta ago (including
    // departures that have since left). No filtering to future — the
    // user explicitly asked to rewind.
    const earlier = new Date(t + deltaMs);
    const regenerated = initialBoard(earlier);
    return { rows: regenerated.rows, mem: regenerated.mem, changed: true };
  }
}

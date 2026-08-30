// Live departure scheduler — the board is a rolling queue driven by the
// real clock, governed by schedule DISCIPLINE rather than a fixed size:
//
//   - same-destination departures are spaced 15..40 minutes apart
//   - a destination holds at most two rows on the board at once
//   - the board grows and shrinks naturally as destinations come and go
//
// Destinations themselves are discovered at build time
// (destinations.generated.ts); train numbers stay fictional forever.
// All randomness is deterministic per slot, so the same train is always
// the same train.

import { DESTINATIONS, FEED_ITEMS } from "./destinations.generated";

export const MAX_ROWS = 12; // absolute ceiling across all destinations
export const LINGER_MS = 3000; // how long a due row holds before leaving
const MIN_GAP_MS = 15 * 60_000; // schedule discipline floor...
const MAX_GAP_MS = 40 * 60_000; // ...and ceiling between same-dest trains
const ON_BOARD_PER_DEST = 2; // discipline: max simultaneous rows per dest
const FIRST_LEAD_MIN = 13; // first train of a fresh timeline: 2..15 min out

const REMARKS = [
  "Wagenreihung",
  "Speisewagen",
  "Fahrradmitnahme",
  "Barrierefrei",
  "WLAN",
  "Kinderwagen",
];

const TRAINS = ["S 3", "RE 7", "IC 221", "RB 12", "RE 4", "IC 44", "S 9", "RE 2"];

const FEED_TRAINS = ["D 1", "D 2", "D 3", "D 4", "D 5", "D 6", "D 7", "D 8"];
const FEED_OFFSET = 1000; // destIdx base for feed items (non-conflicting with real destinations)

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
    const fi = FEED_ITEMS[sp.destIdx - FEED_OFFSET];
    return {
      id: `${fi.slug}-feed-${sp.slot}`,
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

/** Initial board: every discovered destination gets up to two trains,
 *  honoring the gap discipline. Also seeds the scheduler memory.
 *  Feed items are each scheduled once at a deterministic time. */
export function initialBoard(now: Date): { rows: Departure[]; mem: ScheduleMem } {
  anchorMs = now.getTime();
  const mem: ScheduleMem = {};
  const rows: Departure[] = [];

  for (let di = 0; di < Math.max(1, DESTINATIONS.length); di++) {
    let spawn = nextSpawnAfter(undefined, di);
    for (let k = 0; k < ON_BOARD_PER_DEST && rows.length < MAX_ROWS; k++) {
      rows.push(materialize(spawn));
      mem[di] = { slot: spawn.slot, ms: spawn.departsAtMs };
      spawn = nextSpawnAfter(mem[di], di);
    }
  }

  // schedule feed items: each gets a deterministic departure based on
  // its URL hash, spread across 5 hours from now
  for (let fi = 0; fi < FEED_ITEMS.length; fi++) {
    const di = FEED_OFFSET + fi;
    // deterministic offset from now: hash of the URL
    const urlHash = Math.abs(
      FEED_ITEMS[fi].url.split("").reduce((h: number, c: string) => (h * 31 + c.charCodeAt(0)) | 0, 0),
    );
    const ms = anchorMs + 120_000 + (urlHash % (18_000_000 - 120_000));
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

  // refill: every destination under its two-row quota gets its next
  // train; whichever destination is next-in-time across the network
  // fills the tail first
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
    // deterministically from its URL hash. Only schedule items not yet
    // in the memory (i.e. not yet scheduled this session).
    for (let fi = 0; fi < FEED_ITEMS.length; fi++) {
      const di = FEED_OFFSET + fi;
      if (mem[di]) continue; // already scheduled
      if ((counts.get(di) ?? 0) > 0) continue; // already on the board
      const urlHash = Math.abs(
        FEED_ITEMS[fi].url.split("").reduce((h: number, c: string) => (h * 31 + c.charCodeAt(0)) | 0, 0),
      );
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

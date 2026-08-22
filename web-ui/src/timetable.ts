// Live departure scheduler — the board is a rolling queue driven by the
// real clock. Lines run on fixed cycles (like a real Bahn network); rows
// depart when due, linger briefly, leave, and the tail refills in strict
// time order. All randomness is deterministic per schedule slot, so the
// same train is always the same train.

export type Dest = "home" | "blog" | "song-wall";

interface Line {
  train: string;
  dest: Dest;
  platform: string;
  cycleMin: number; // minutes between departures
  offsetMin: number; // phase within the hour-grid
}

const LINES: Line[] = [
  { train: "S 3", dest: "song-wall", platform: "3", cycleMin: 20, offsetMin: 4 },
  { train: "RE 7", dest: "home", platform: "1", cycleMin: 30, offsetMin: 9 },
  { train: "IC 221", dest: "blog", platform: "2", cycleMin: 60, offsetMin: 14 },
  { train: "RB 12", dest: "blog", platform: "2", cycleMin: 30, offsetMin: 19 },
  { train: "RE 4", dest: "home", platform: "1", cycleMin: 60, offsetMin: 24 },
  { train: "IC 44", dest: "song-wall", platform: "3", cycleMin: 120, offsetMin: 31 },
  { train: "S 9", dest: "song-wall", platform: "3", cycleMin: 20, offsetMin: 46 },
  { train: "RE 2", dest: "home", platform: "1", cycleMin: 30, offsetMin: 49 },
];

const REMARKS = [
  "Wagenreihung",
  "Speisewagen",
  "Fahrradmitnahme",
  "Barrierefrei",
  "WLAN",
  "Kinderwagen",
];

const DEST_HREF: Record<Dest, string> = {
  home: "/",
  blog: "/Bahnhof/blog",
  "song-wall": "/Bahnhof/song-wall",
};

export const MAX_ROWS = 12;
/** How long a DEPARTED / due-CANCELLED row stays before it leaves. */
export const LINGER_MS = 3000;

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export interface Departure {
  id: string; // stable identity across ticks
  time: string; // scheduled HH:MM
  departsAtMs: number;
  train: string;
  dest: Dest;
  destHref: string;
  platform: string;
  /** spawn-time fate; the runtime overlays boarding/departed on top */
  state: "ontime" | "delay" | "cancelled" | "departed";
  delayMin?: number;
  remark?: string;
  /** live cancellation: the moment this train turns CANCELLED out of the
   *  blue, somewhere 30-90s before departure. Set only for trains whose
   *  fate is a last-minute failure; absent for healthy ones. */
  cancelAtMs?: number;
  /** set when due: the moment this row should vanish */
  removalAt?: number;
}

interface Spawn {
  line: Line;
  slot: number; // cycle index, stable identity for a concrete train
  departsAtMs: number;
}

/** First scheduled departure of `line` strictly after `tMs`. */
function nextSpawn(line: Line, tMs: number): Spawn {
  const cyc = line.cycleMin * 60000;
  const anchor = line.offsetMin * 60000;
  const k = Math.max(0, Math.floor((tMs - anchor) / cyc) + 1);
  return { line, slot: k, departsAtMs: anchor + k * cyc };
}

function materialize(sp: Spawn): Departure {
  const d = new Date(sp.departsAtMs);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  const r = rand(sp.slot * 7.13 + sp.line.offsetMin);
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
  // failure moment is baked in per slot (deterministic), so the same
  // train always fails at the same point of its life - it just looks
  // spontaneous to anyone watching.
  let cancelAtMs: number | undefined;
  if (state !== "cancelled" && rand(sp.slot * 5.31 + sp.line.offsetMin * 1.7) < 0.05) {
    cancelAtMs = sp.departsAtMs - (30_000 + Math.floor(rand(sp.slot * 9.77) * 60_000));
  }

  return {
    id: `${sp.line.train}-${sp.slot}`,
    time: `${hh}:${mm}`,
    departsAtMs: sp.departsAtMs,
    train: sp.line.train,
    dest: sp.line.dest,
    destHref: DEST_HREF[sp.line.dest],
    platform: sp.line.platform,
    state,
    delayMin,
    remark,
    cancelAtMs,
  };
}

/** The queue in strict time order: keep taking whichever line departs
 *  next until the page is full. */
function fillBoard(afterMs: number): Departure[] {
  const rows: Departure[] = [];
  let cursor = afterMs;
  let guard = 0;
  while (rows.length < MAX_ROWS && guard++ < 200) {
    let best: Spawn | null = null;
    for (const line of LINES) {
      const sp = nextSpawn(line, cursor);
      if (!best || sp.departsAtMs < best.departsAtMs) best = sp;
    }
    if (!best) break;
    rows.push(materialize(best));
    cursor = best.departsAtMs;
  }
  return rows;
}

export function initialBoard(now: Date): Departure[] {
  const t = now.getTime();
  // trains whose failure moment already passed while the page was closed
  // load as cancelled - no fake ON TIME flash on first paint
  return fillBoard(t).map((r) =>
    r.cancelAtMs && r.cancelAtMs <= t && r.state !== "cancelled"
      ? { ...r, state: "cancelled", delayMin: undefined }
      : r,
  );
}

export interface TickResult {
  rows: Departure[];
  changed: boolean;
}

/** One second of station time: rows that are due start lingering
 *  (DEPARTED, or CANCELLED holding its slot), lingered rows leave, and
 *  the tail refills. Returns the previous array untouched when nothing
 *  happened, so the caller can skip re-renders. */
export function tickBoard(prev: Departure[], now: Date): TickResult {
  const t = now.getTime();
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

  // refill the tail with whatever departs next, network-wide
  let cursor = rows.length ? rows[rows.length - 1].departsAtMs : t;
  let guard = 0;
  while (rows.length < MAX_ROWS && guard++ < 100) {
    let best: Spawn | null = null;
    for (const line of LINES) {
      const sp = nextSpawn(line, cursor);
      if (!best || sp.departsAtMs < best.departsAtMs) best = sp;
    }
    if (!best) break;
    rows.push(materialize(best));
    cursor = best.departsAtMs;
    changed = true;
  }

  return changed ? { rows, changed } : { rows: prev, changed };
}

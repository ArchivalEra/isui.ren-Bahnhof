// Realistic timetable generation — departures are derived from the real
// current time, never hardcoded. Each line runs on a fixed cycle (like a
// real S-Bahn/Bahn network); the generator projects the next departures
// from `now` and derives status deterministically from the schedule slot,
// so the same minute always renders the same board and rows roll forward
// naturally as time passes.

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
  { train: "S 9", dest: "song-wall", platform: "3", cycleMin: 20, offsetMin: 44 },
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

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export interface Departure {
  time: string;
  minutesAway: number;
  train: string;
  dest: Dest;
  destHref: string;
  platform: string;
  /** "boarding" | "ontime" | "delay" | "cancelled" */
  state: "boarding" | "ontime" | "delay" | "cancelled";
  delayMin?: number;
  remark?: string;
}

const DEST_HREF: Record<Dest, string> = {
  home: "/heart",
  blog: "/Bahnhof/blog",
  "song-wall": "/Bahnhof/song-wall",
};

/**
 * Build the board for `now`: for every line find its next departure at
 * least 1 minute out, project status from distance + slot hash.
 */
export function generateTimetable(now: Date, count = 10): Departure[] {
  const epochMin = Math.floor(now.getTime() / 60000);
  const out: Departure[] = [];

  for (const line of LINES) {
    // next scheduled slot strictly after the current minute
    const phase = ((epochMin - line.offsetMin) % line.cycleMin + line.cycleMin) % line.cycleMin;
    const inMin = line.cycleMin - phase; // minutes until next departure
    const slot = Math.floor((epochMin + inMin) / line.cycleMin); // stable slot id

    const dep = new Date(now.getTime() + inMin * 60000);
    const hh = String(dep.getHours()).padStart(2, "0");
    const mm = String(dep.getMinutes()).padStart(2, "0");

    const r = rand(slot * 7.13 + line.offsetMin);
    let state: Departure["state"] = "ontime";
    let delayMin: number | undefined;
    if (inMin <= 2) {
      state = "boarding";
    } else if (r < 0.06) {
      state = "cancelled";
    } else if (r < 0.28) {
      state = "delay";
      delayMin = 2 + Math.floor(rand(slot * 3.7) * 10); // +2..+11
    }

    const remark =
      r > 0.72 ? REMARKS[Math.floor(rand(slot * 11.3) * REMARKS.length)] : undefined;

    out.push({
      time: `${hh}:${mm}`,
      minutesAway: inMin,
      train: line.train,
      dest: line.dest,
      destHref: DEST_HREF[line.dest],
      platform: line.platform,
      state,
      delayMin,
      remark,
    });
  }

  return out.sort((a, b) => a.minutesAway - b.minutesAway).slice(0, count);
}

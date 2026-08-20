// PROTOTYPE mock data: free-form JSON per song (song-wall data model draft).
// English text only (repo rule: no CJK in tracked files).
export interface Song {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  duration?: string;
  why?: string;
  status: "unheard" | "listened";
  tags?: string[];
  link?: string;
  /** cover image - square; prototype uses colored placeholders */
  cover?: string;
  /** paper color for the ticket (default: randomized) */
  paper?: string;
}

// deterministic pseudo-random from index (stable across re-renders)
export function jitter(i: number, salt: number, range: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * range * 2 - range;
}

// station-paper tones: muted, ticket-like colors
export const PAPER_TONES = ["#f5f2ea", "#eef0ea", "#f1ece4", "#edf0f2", "#f4efe8", "#ecefe9"];

export function paperFor(i: number): string {
  return PAPER_TONES[Math.abs(Math.floor(jitter(i, 7, PAPER_TONES.length / 2))) % PAPER_TONES.length];
}

// cover placeholder: a soft tinted square derived from the index
export function coverFor(i: number): string {
  const hues = [210, 160, 330, 260, 90, 20, 190, 300, 45, 130];
  const h = hues[Math.abs(i) % hues.length];
  return `linear-gradient(135deg, hsl(${h} 38% 78%), hsl(${h} 45% 62%))`;
}

export const songs: Song[] = [
  { title: "Merry Christmas Mr. Lawrence", artist: "Ryuichi Sakamoto", album: "Merry Christmas Mr. Lawrence", year: 1983, duration: "4:46", why: "first film score that made me sit still", status: "listened", tags: ["piano", "soundtrack"] },
  { title: "How to Disappear Completely", artist: "Radiohead", album: "Kid A", year: 2000, duration: "5:56", why: "the strings are a slow tide", status: "unheard", tags: ["rock", "strings"] },
  { title: "On Melancholy Hill", artist: "Gorillaz", album: "Plastic Beach", year: 2010, duration: "3:53", why: "synth like a beach at dusk", status: "unheard", tags: ["synth"] },
  { title: "One Summer's Day", artist: "Joe Hisaishi", album: "Spirited Away OST", year: 2001, duration: "3:09", why: "childhood in one chord", status: "listened", tags: ["piano", "soundtrack"] },
  { title: "Feather", artist: "Nujabes", album: "Modal Soul", year: 2005, duration: "2:55", why: "the loop that never gets old", status: "unheard", tags: ["hiphop", "lo-fi"] },
  { title: "Giorgio by Moroder", artist: "Daft Punk", album: "Random Access Memories", year: 2013, duration: "9:04", why: "a whole life told in nine minutes", status: "unheard", tags: ["electronic"] },
  { title: "Sunrise", artist: "Hania Rani", album: "Home", year: 2020, duration: "6:08", why: "minimal piano, maximum room", status: "unheard", tags: ["piano"] },
  { title: "Comptine d'un autre été", artist: "Yann Tiersen", album: "Amélie OST", year: 2001, duration: "2:20", why: "the film I watched with my family", status: "listened", tags: ["piano", "soundtrack"] },
  { title: "Holocene", artist: "Bon Iver", album: "Bon Iver, Bon Iver", year: 2011, duration: "5:36", why: "and at once I knew I was not magnificent", status: "unheard", tags: ["folk"] },
  { title: "On the Nature of Daylight", artist: "Max Richter", album: "The Blue Notebooks", year: 2004, duration: "6:36", why: "for the end credits of something", status: "unheard", tags: ["strings"] },
];

export const stations = ["home", "blog", "song-wall"] as const;

export const departures = [
  { time: "08:12", train: "RE 4", dest: "home", platform: "1", note: "on time", bem: "Wagenreihung" },
  { time: "08:24", train: "IC 221", dest: "blog", platform: "2", note: "on time", bem: "" },
  { time: "08:37", train: "S 3", dest: "song-wall", platform: "3", note: "now boarding", bem: "Achtung" },
  { time: "08:41", train: "RE 7", dest: "home", platform: "1", note: "+6", bem: "verspätet" },
  { time: "08:55", train: "RB 12", dest: "blog", platform: "2", note: "on time", bem: "" },
  { time: "09:02", train: "IC 44", dest: "song-wall", platform: "3", note: "on time", bem: "Speisewagen" },
  { time: "09:15", train: "RE 2", dest: "home", platform: "1", note: "cancelled", bem: "" },
  { time: "09:28", train: "S 9", dest: "song-wall", platform: "3", note: "on time", bem: "" },
  { time: "09:31", train: "IC 81", dest: "blog", platform: "2", note: "+3", bem: "umgeleitet" },
  { time: "09:44", train: "RB 17", dest: "home", platform: "1", note: "on time", bem: "" },
  { time: "09:50", train: "RE 9", dest: "song-wall", platform: "3", note: "on time", bem: "Fahrradmitnahme" },
  { time: "09:56", train: "S 6", dest: "blog", platform: "2", note: "+11", bem: "Baustelle" },
  { time: "10:08", train: "IC 27", dest: "home", platform: "1", note: "on time", bem: "" },
  { time: "10:14", train: "RB 20", dest: "song-wall", platform: "3", note: "cancelled", bem: "" },
  { time: "10:27", train: "RE 13", dest: "blog", platform: "2", note: "on time", bem: "" },
  { time: "10:35", train: "S 12", dest: "home", platform: "1", note: "on time", bem: "" },
  { time: "10:49", train: "IC 55", dest: "song-wall", platform: "3", note: "+2", bem: "" },
  { time: "11:03", train: "RE 16", dest: "blog", platform: "2", note: "on time", bem: "Zugbildung" },
  { time: "11:11", train: "RB 23", dest: "home", platform: "1", note: "on time", bem: "" },
  { time: "11:26", train: "S 15", dest: "song-wall", platform: "3", note: "on time", bem: "" },
];

// Departure mock data — free-form JSON per song (song-wall data model draft).
// English text only (repo rule: no CJK in tracked files).

export interface Song {
  title: string;
  artist: string;
  status: "unheard" | "listened";
}

export const songs: Song[] = [
  { title: "Merry Christmas Mr. Lawrence", artist: "Ryuichi Sakamoto", status: "listened" },
  { title: "How to Disappear Completely", artist: "Radiohead", status: "unheard" },
  { title: "On Melancholy Hill", artist: "Gorillaz", status: "unheard" },
  { title: "One Summer's Day", artist: "Joe Hisaishi", status: "listened" },
  { title: "Feather", artist: "Nujabes", status: "unheard" },
  { title: "Giorgio by Moroder", artist: "Daft Punk", status: "unheard" },
  { title: "Sunrise", artist: "Hania Rani", status: "unheard" },
  { title: "Comptine d'un autre ete", artist: "Yann Tiersen", status: "listened" },
  { title: "Holocene", artist: "Bon Iver", status: "unheard" },
  { title: "On the Nature of Daylight", artist: "Max Richter", status: "unheard" },
];

export interface Departure {
  time: string;
  train: string;
  dest: "home" | "blog" | "song-wall";
  platform: string;
  note: "on time" | "now boarding" | "cancelled" | `+${number}`;
  remark?: string;
}

const DEST_PATH: Record<Departure["dest"], string> = {
  home: "/heart",
  blog: "/Bahnhof/blog",
  "song-wall": "/Bahnhof/song-wall",
};

export function destHref(dest: Departure["dest"]): string {
  return DEST_PATH[dest];
}

export const departures: Departure[] = [
  { time: "08:12", train: "RE 4", dest: "home", platform: "1", note: "on time", remark: "Wagenreihung" },
  { time: "08:24", train: "IC 221", dest: "blog", platform: "2", note: "on time" },
  { time: "08:37", train: "S 3", dest: "song-wall", platform: "3", note: "now boarding", remark: "Achtung" },
  { time: "08:41", train: "RE 7", dest: "home", platform: "1", note: "+6", remark: "verspaetet" },
  { time: "08:55", train: "RB 12", dest: "blog", platform: "2", note: "on time" },
  { time: "09:02", train: "IC 44", dest: "song-wall", platform: "3", note: "on time", remark: "Speisewagen" },
  { time: "09:15", train: "RE 2", dest: "home", platform: "1", note: "cancelled" },
  { time: "09:28", train: "S 9", dest: "song-wall", platform: "3", note: "on time" },
  { time: "09:31", train: "IC 81", dest: "blog", platform: "2", note: "+3", remark: "umgeleitet" },
  { time: "09:44", train: "RB 17", dest: "home", platform: "1", note: "on time" },
  { time: "09:50", train: "RE 9", dest: "song-wall", platform: "3", note: "on time", remark: "Fahrrad" },
  { time: "09:56", train: "S 6", dest: "blog", platform: "2", note: "+11", remark: "Baustelle" },
];

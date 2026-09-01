// Runtime feed watcher — polls each destination's posts.json and notifies
// when the merged feed set changes. No Blog/heart repo changes required:
// every fetch is a plain HTTP GET to the live deploy (same origin).
//
// Contract (heart docs/board-feed-contract.md via Blog docs):
//   GET /<slug>/posts.json -> [{ title, url, desc? }]

import { DESTINATIONS } from "./destinations.generated";
import type { FeedItem } from "./timetable";

const POLL_MS = 20_000; // faster than the 60s build chain (30+30)

async function fetchOne(href: string): Promise<FeedItem[]> {
  // href is "/Blog" or "/heart" etc. -> "/Blog/posts.json"
  const url = `${href.replace(/\/$/, "")}/posts.json`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const slug = href.replace(/^\//, "").replace(/\/$/, "") || href;
    const out: FeedItem[] = [];
    for (const item of data) {
      if (item && typeof item.title === "string" && typeof item.url === "string") {
        out.push({
          title: String(item.title),
          url: String(item.url),
          desc: item.desc != null ? String(item.desc) : null,
          slug,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const all: FeedItem[] = [];
  // fetch destinations in parallel
  const results = await Promise.all(DESTINATIONS.map((d) => fetchOne(d.href)));
  for (const arr of results) all.push(...arr);
  // also try the canonical fallback that may not be in DESTINATIONS during local dev
  // (e.g. when DESTINATIONS is empty and falls back to heart, posts.json still at /heart)
  if (DESTINATIONS.length === 0) {
    const fallback = await fetchOne("/heart");
    all.push(...fallback);
  }
  // deduplicate by URL and by NACH (title) — no duplicate NACH on board
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const deduped: FeedItem[] = [];
  for (const fi of all) {
    const titleKey = fi.title.trim().toLowerCase();
    if (seenUrl.has(fi.url) || seenTitle.has(titleKey)) continue;
    seenUrl.add(fi.url);
    seenTitle.add(titleKey);
    deduped.push(fi);
  }
  // keep Blog contract order (date desc) but ensure deterministic for hashing?
  // The feed source already sorts by date desc; we preserve that order.
  return deduped;
}

function feedsEqual(a: FeedItem[], b: FeedItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].title !== b[i].title || a[i].url !== b[i].url || (a[i].desc ?? null) !== (b[i].desc ?? null) || a[i].slug !== b[i].slug) return false;
  }
  return true;
}

export type FeedChangeHandler = (next: FeedItem[]) => void;

/**
 * Start polling posts.json across all destinations.
 * `getCurrent` reads the current feed set (from timetable's mutable store),
 * `onChange` is called only when the merged result actually changes.
 * Returns a stop function.
 */
export function startFeedWatcher(
  getCurrent: () => FeedItem[],
  onChange: FeedChangeHandler,
): () => void {
  let stopped = false;
  let inflight = false;

  async function poll() {
    if (stopped || inflight) return;
    inflight = true;
    try {
      const next = await fetchAllFeeds();
      if (stopped) return;
      const cur = getCurrent();
      if (!feedsEqual(cur, next)) {
        onChange(next);
      }
    } finally {
      inflight = false;
    }
  }

  // immediate first check (next tick so caller can finish mounting)
  const t0 = setTimeout(poll, 800);
  const id = setInterval(poll, POLL_MS);

  // also expose a manual trigger via a hidden event — the Board's
  // regen button reuses the same path, but we also listen for a
  // window event so tests / external triggers can force a poll
  const onManual = () => poll();
  window.addEventListener("bahnhof:poll-feeds", onManual as EventListener);

  return () => {
    stopped = true;
    clearTimeout(t0);
    clearInterval(id);
    window.removeEventListener("bahnhof:poll-feeds", onManual as EventListener);
  };
}

/** Imperatively trigger one immediate poll (for the manual regen button to await). */
export function triggerPoll(): void {
  window.dispatchEvent(new Event("bahnhof:poll-feeds"));
}

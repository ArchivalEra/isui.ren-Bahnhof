// Feed reader: fetches content feeds from all known sub-sites at runtime.
// The feed contract is defined in docs/board-feed-contract.md.
// Feeds are cached per session; the search box indexes into them.

export interface FeedItem {
  title: string;
  url: string;
  desc?: string;
}

let cache: Record<string, FeedItem[]> | null = null;
let loading = false;
let pending: Array<() => void> = [];

/** Fetch all feeds from the known destinations. Cached per session;
 *  subsequent calls resolve from cache synchronously. */
export async function loadFeeds(slugs: string[]): Promise<Record<string, FeedItem[]>> {
  if (cache) return cache;
  if (loading) {
    return new Promise((resolve) => pending.push(() => resolve(cache!)));
  }
  loading = true;
  const results: Record<string, FeedItem[]> = {};
  await Promise.allSettled(
    slugs.map(async (slug) => {
      try {
        const r = await fetch(`/${slug}/posts.json`);
        if (!r.ok) return;
        const items = (await r.json()) as FeedItem[];
        if (Array.isArray(items)) results[slug] = items;
      } catch {
        // feed unavailable — skip silently
      }
    }),
  );
  cache = results;
  loading = false;
  for (const cb of pending) cb();
  pending = [];
  return results;
}

/** Search across all cached feeds. Returns items whose title or desc
 *  matches the query (case-insensitive substring). */
export function searchFeeds(
  feeds: Record<string, FeedItem[]>,
  query: string,
): Array<{ slug: string } & FeedItem> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: Array<{ slug: string } & FeedItem> = [];
  for (const [slug, items] of Object.entries(feeds)) {
    for (const item of items) {
      if (
        item.title.toLowerCase().includes(q) ||
        (item.desc && item.desc.toLowerCase().includes(q))
      ) {
        out.push({ slug, ...item });
      }
    }
  }
  return out;
}
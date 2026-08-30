// Feed item, as defined by docs/board-feed-contract.md.
// Loaded at build time by gen-destinations.mjs from all sub-site
// posts.json files. Each item becomes a scheduled departure on the
// board, projected with a deterministic time derived from its URL hash.

export interface FeedItem {
  title: string;
  url: string;
  desc?: string;
  slug: string; // source sub-site, e.g. "Blog"
}
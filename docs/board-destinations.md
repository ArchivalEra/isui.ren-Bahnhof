# Board destinations

How the NACH (destination) column of the Bahnhof departure board is
populated: which pages exist as destinations, how their display labels
are derived, and the schedule discipline that governs the rows.

## Overview

Bahnhof is a timetable-style landing page (Preact + Vite + TypeScript)
deployed at `isui.ren/Bahnhof/`. Every destination on the departure
board corresponds to another live page of the isui.ren site. The list
of destinations is not maintained by hand: it is discovered at build
time from the shared deploy branch, filtered through a build-time-only
blacklist, and emitted as a typed module
(`web-ui/src/destinations.generated.ts`) that the board consumes.

Two invariants hold throughout:

- The blacklist (`web-ui/board.blacklist`) is consumed only during the
  build. Neither its rules nor its existence reach the browser bundle;
  the browser only ever sees the filtered result.
- The board's size is not fixed. Row count floats with the number of
  discovered destinations, subject to the schedule discipline below.

## Build-time discovery

CI step "Discover live destinations" in `.github/workflows/deploy.yml`:

1. Shallow-clone the `deploy` branch of
   `github.com/ArchivalEra/isui.ren-heart` (every site repo ships its
   build output into a subdirectory of that branch).
2. Run `web-ui/scripts/gen-destinations.mjs <deploy-checkout>
   board.blacklist src/destinations.generated.ts`.

The scanner walks the deploy checkout one level deep and keeps an
entry as a live page when all of the following hold:

- it is a directory (loose files such as `404.html` are skipped),
- it contains an `index.html`,
- it is not `Bahnhof` itself (the station is not its own destination).

Surviving slugs are sorted alphabetically (`localeCompare`) and written
to `web-ui/src/destinations.generated.ts` as:

```ts
export interface Destination {
  slug: string;   // e.g. "heart"
  label: string;  // e.g. "Heart" (see naming rule below)
  href: string;   // e.g. "/heart/"
}

export const DESTINATIONS: Destination[] = [ /* ... */ ];
```

The generated file carries a "do not edit" header and is gitignored;
it exists only inside the build. If the deploy checkout is missing
(local development without one), the script warns and falls back to
the single known destination `heart`, so builds never break.

## Nach naming rule

The display label is the last path segment of the slug, with its first
character capitalized when it is a lowercase ASCII letter
(`labelOf` in `gen-destinations.mjs`):

- `heart` -> `Heart`
- `/blog/hub/hfub` -> `Hfub`

Segments that do not start with a lowercase `a-z` character pass
through unchanged.

## Schedule discipline

The board is a rolling queue driven by the real clock
(`web-ui/src/timetable.ts`), governed by discipline rather than a
fixed size. All randomness is deterministic per slot, so the same
train is always the same train.

Constants:

| Constant             | Value     | Meaning                                          |
| -------------------- | --------- | ------------------------------------------------ |
| `MIN_GAP_MS`         | 15 min    | Floor for the gap between same-destination trains |
| `MAX_GAP_MS`         | 40 min    | Ceiling for that gap                             |
| `ON_BOARD_PER_DEST`  | 2         | Max simultaneous rows per destination            |
| `MAX_ROWS`           | 12        | Absolute ceiling across all destinations         |
| `LINGER_MS`          | 3 s       | How long a due row holds as DEPARTED before leaving |
| `FIRST_LEAD_MIN`     | 13        | First train of a fresh timeline lands 2..15 min out |

Behavior:

- `initialBoard` seeds every discovered destination with up to two
  trains, honoring the gap discipline, and sorts the board by
  departure time.
- `tickBoard` runs once per second: due trains become DEPARTED,
  linger `LINGER_MS`, then leave; live cancellations flip a train to
  CANCELLED on the spot 30-90 s before departure.
- After removals, the refill loop appends the next train of every
  destination still under its two-row quota, always choosing the
  earliest next departure across the network, until `MAX_ROWS`.
- Net effect: same-destination departures are always 15-40 minutes
  apart, a destination never holds more than two rows, the board never
  exceeds 12 rows, and the row count otherwise floats naturally with
  the number of destinations.

## Blacklist semantics

`web-ui/board.blacklist` holds one glob per line. Blank lines and
lines starting with `#` are ignored; a missing file means no rules.
Each glob is compiled to a regex where `*` matches any run of
non-slash characters.

A discovered slug is dropped when any pattern matches any of these
candidate strings:

- the bare slug, e.g. `drafts`
- `drafts/*`
- `isui.ren/drafts`
- `isui.ren/drafts/*`

Consequences for pattern authors:

- A bare directory name (`drafts`) hides the page.
- `isui.ren/test/*` hides the page and anything under it.
- `*.global.isui.ren` is legal today but never matches a bare-slug
  candidate; it is kept for future subdomain-shaped destinations.

The file is read once per build, before anything is generated. It is
never bundled, fetched, or otherwise visible to the browser.

## Adding a new page

1. Ship the page's build output as a top-level directory on the
   `deploy` branch of `isui.ren-heart`, with an `index.html` at the
   directory root. (This is the same branch Bahnhof itself publishes
   `Bahnhof/` into; each deploy merges, it does not wipe.)
2. Rebuild Bahnhof: push to `main` or trigger the `deploy` workflow
   via `workflow_dispatch`. Discovery runs automatically; the new page
   appears as a destination, named by the Nach naming rule.
3. To keep a page off the board instead, add a matching pattern to
   `web-ui/board.blacklist` before rebuilding. No code change is
   needed in either case.

Note: destinations are ordered alphabetically by slug, so a new page
can shift which destinations get the first rows on a freshly loaded
board.

## Local development

From the repository root:

```sh
cd web-ui
npm run gen -- <deploy-checkout-dir> board.blacklist src/destinations.generated.ts
npm run dev
```

`<deploy-checkout-dir>` is any checkout of the `deploy` branch of
`isui.ren-heart`. Without it, the generator falls back to the single
destination `heart` and still succeeds, so `npm run dev` and
`npm run build` work offline.

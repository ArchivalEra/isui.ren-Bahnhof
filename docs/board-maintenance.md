# Board maintenance rules

Who changes what, and where. This is the single source of truth for
"board content: Bahnhof repo or heart repo?" — decided once so nobody
has to guess again.

## The three layers

| Layer | Repo | What belongs here | Who commits |
|---|---|---|---|
| **Board logic & rules** | **isui.ren-Bahnhof** | `web-ui/scripts/gen-destinations.mjs` (discovery), `web-ui/board.blacklist` (what to hide), `web-ui/src/timetable.ts` (schedule discipline), `web-ui/src/Board.tsx` (rendering), `docs/board-*.md` | Humans + Bahnhof CI |
| **Edge configuration** | **isui.ren-heart (main)** | `site-root/edgeone.json` (redirects/normalization), `site-root/index.html` + `logo.*` (hop page, favicon source) | Humans, rarely |
| **Deploy artifacts** | **isui.ren-heart (deploy branch)** | Build output only: `Bahnhof/`, `Blog/`, `heart/`, root `404.html` | **Machines only** (CI pipelines). Never hand-edit. |

## The rules

1. **Board behavior changes go to the Bahnhof repo. Always.** The
   blacklist must be consumed at build time by the consumer's own
   pipeline (that is what keeps it invisible to the browser), so it
   cannot live anywhere else. Same for the generator and the schedule
   constants.
2. **A new page needs ZERO board commits.** Ship your build to
   `deploy/<Slug>/` with an `index.html` inside; the next Bahnhof build
   discovers it and it joins the departure board automatically. If it
   must be hidden, add one line to `web-ui/board.blacklist` in the
   Bahnhof repo — never a redirect trick on the edge.
3. **The heart deploy branch is machine-written.** Every site repo's
   CI carries the peers' directories across its rebuild (merge, never
   orphan-wipe; never swallow an archive failure — that once deleted
   `Bahnhof/` silently). Human edits to `deploy` will be overwritten by
   the next pipeline run.
4. **Case discipline is law.** The edge matches paths case-sensitively:
   the deploy directory name, the public URL, and every internal link
   must be byte-identical (`Blog/` ↔ `/Blog` ↔ `/Blog`). Lowercase
   aliases may exist in `edgeone.json` as a courtesy, but the repo
   itself settles on one canonical casing.
5. **Edge-wide behavior (redirects, root hop page) goes to heart main**,
   because the site root belongs to it. Page-local behavior stays in
   the page's own repo.
6. **No secrets, no timestamps, no view counters, no fallback cards
   with fake data** — standing site rules (see heart `CONTEXT.md` and
   the Bahnhof design memory).

## Worked example: the Blog 404

`deploy/Blog/` exists (capital B); someone linked lowercase `/blog`.
The edge 301'd `/blog/` → `/blog` (slash normalization) and then 404'd
(case mismatch). Fix applied: a lowercase alias in `edgeone.json`
(heart main, edge layer). The durable fix lives in the Blog repo:
canonical casing everywhere. The board needed no change at all — its
link was already `/Blog`.

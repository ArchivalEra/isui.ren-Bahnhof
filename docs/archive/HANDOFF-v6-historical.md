# HANDOFF — Bahnhof visual prototype (v6) to next agent

Date: 2026-08-15. Written by the previous agent at handover so the next
agent (whatever model) can pick up without re-deriving everything.

## TL;DR

- **Bahnhof** = isui.ren's new main station (blog + song wall + navigation).
  heart is frozen as the entry card. Full project map: `.wayfinder/map.md`
  (local markdown wayfinder tracker — read it first).
- The **visual-direction prototype** lives on branch **`prototype-visual-v1`**
  (throwaway; NOT in main). main only holds decisions + docs.
- Prototype runs: `cd web-ui && npm install && npx vite --port 5199` (dev
  server is currently already running on :5199). Open `http://localhost:5199`
  and cycle variants with the bottom bar / arrow keys (`?variant=a|b|c`).

## Design direction (settled, do not re-litigate)

- **Station-operations language**, NOT Material You anchoring. Source:
  `.wayfinder/research/station-operations-visual-language.md` (DB/BVG/Wiener
  Linien/SBB). Realism = dark rail-blue LCD board (`#0E1B33`/`#132A4A`),
  hairline grid, tabular numerals, letterspaced technical labels, signal
  colors ONLY as status codes: green `#029540` on-time / red `#E30613`
  delay+cancel (strikethrough) / amber `#FFB000` warn. Anchor blue `#0664AB`.
- **Board-on-a-wall window architecture** (user's hard requirement, re-worked
  3x): the page is a station hall (viewport-level atmosphere only), each
  board is a fixed-ratio window (`BoardWindow.tsx`) that scales as a unit
  (`clamp(viewportW/baseW, 0.6, 2.5)`), content scrolls INSIDE the window
  (edge hot-zones: mouse near bottom edge = horizontal, near right edge =
  vertical; wheel redirected). **No page-level scrollbars ever**
  (`html,body overflow:hidden`). Centerline alignment is heart's mechanism.
  Phone..8K safe by construction.
- Repo rules: **no Chinese characters** (pre-commit hook enforces), emoji
  sparingly, whitelist `.gitignore` (everything ignored; `!` exceptions).
- Stack: Preact 10 + Vite 8 + TS, `@material/material-color-utilities` as
  the invisible theme mechanism (seed = rail blue). Server-side (later,
  processing pipeline): C# / ASP.NET Core on the Oracle VPS. Data: free JSON
  per song; Cloudflare R2 primary for small data (research closed).

## Current prototype state (v6, three variants)

| variant | concept | status |
|---|---|---|
| **a** | One long platform (1200x400): BAHNHOF header + clock, full-width platform slab with `GLEIS 1` label, three direction signposts (HOME/BLOG/SONG-WALL) standing on it, track below | fixed (signpost text now in a vertical flex container — was `display:block` inside flex, fields jumbled) |
| **b** | Live departure board (1280 wide): fixed "now" row on top, 12 rows AUTO-scrolling upward (marquee, 30s loop, hover pauses, fade masks at edges so rows melt instead of being hard-cut), columns ZEIT/ZUG/NACH/GLEIS/STATUS/**BEMERKUNG**, English status words (ON TIME / +6 / CANCELLED / BOARDING), clock seconds static (user flagged blinking as a stray) | fixed; user called it the most promising |
| **c** | Continuous tear-off ticket strip (1500 wide, scrolls horizontally in-window): wide tickets 252x172, square cover 148x148, TICKET NO., title/desc/why, random paper tones (`PAPER_TONES`, `song.paper` overrides), vertical perforations between tickets, ragged roll end | fixed (was collapsing to 2px: `.v-c` had no explicit height while content was absolute) |

Mock data: `web-ui/src/prototype/data.ts` (songs, departures — free-JSON
shape per the song-wall data model ticket).

## Open decisions for the next agent (grill the owner)

1. **Which variant wins / what to steal from each** — the owner has NOT
   picked yet. B's "live board" direction was called good; A and C were
   reworked multiple times and are now stable but unpicked.
2. **C's nail-wall phase**: heard songs as punched stubs piled on a nail
   (diner-receipt circle) is a LATER phase the owner explicitly deferred
  . The strip ships first.
3. **C ticket spec**: cover (square, fixed), title, description, `TICKET NO.n`
   — needs auto-scale of text vs fixed square image. Paper colors will later
   come from config, default random.
4. **Language**: status words are English (fixed), structural labels stay
   German (ABFAHRT/GLEIS/BEMERKUNG). Confirm with the owner if uncertain.
5. **A** may or may not survive — its job (spatial navigation) may merge into
   the station map / home page later.

## Wayfinder state

- Map + 7 tickets in `.wayfinder/` (local markdown tracker — see
  `.wayfinder/README.md` for how it works).
- Closed: edgeone-subpath-binding (research), openlist-to-object-storage
  (research), web-material-you-dynamic-color (research),
  site-structure-navigation (grilling).
- Open: **bahnhof-visual-direction** (prototype — this handover feeds it;
  close it once the owner picks a direction), song-wall-data-model (grilling,
  draft recorded), processing-pipeline (grilling — C# server for Drive →
  transcode→opus → Range playback, decoupled system), heart-bahnhof-card
  (task, blocked on Bahnhof v1 output).

## Next steps suggested

1. Pull `prototype-visual-v1`, run it, screenshot all three variants
   (headless chromium if no eyes: `chromium --headless=new --screenshot=...`).
2. Grill the owner for the winner / mix-and-match; fold the winner into a
   real `web-ui/` build on main (with base `/Bahnhof/` for the eventual
   deploy-branch join — see edgeone research).
3. Capture the throwaway branch per the prototype skill; record the decision
   in the map + ticket; then move to the song-wall-data-model or
   processing-pipeline ticket.

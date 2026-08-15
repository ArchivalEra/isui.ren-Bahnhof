# MAP - Bahnhof: the new main station of isui.ren

- map id: `wayfinder:map`
- created: 2026-08-15
- repo: ArchivalEra/isui.ren-Bahnhof (local markdown tracker, see `.wayfinder/README.md`)

## Destination

Bahnhof ships as isui.ren's **new main station**: one site, multiple pages
(blog + song wall + navigation), reusing heart's stack (Preact + Vite + TS +
Rust/wasm balls) and aesthetic (white + grey tones + three colored balls).
heart is frozen as an entry card only - the heart card wall gains a "Bahnhof
station" card pointing at `isui.ren/Bahnhof`; the root domain still redirects
to `/heart`; all navigation happens inside Bahnhof from then on.

## Notes

- Domain: isui.ren site, EdgeOne Makers / Cloudflare Pages deployment,
  Rust->wasm animation, object storage data (Oracle OSS / CF R2 /
  OpenList netdisk-to-object-storage)
- Reference: `isui.ren-heart` repo (CONTEXT.md glossary, docs/ architecture,
  web-ui + web-rust code)
- Repo rules: no Chinese, emoji sparingly, whitelist .gitignore
- Skills: grilling / domain-modeling / prototype / research

## Decisions so far

- [2026-08-15 - destination] Bahnhof = new main station (blog + song wall +
  navigation); heart frozen as entry card; root domain still jumps to /heart.
- [2026-08-15 - stack] Reuse heart's stack: Preact 10 + Vite + TS (Rust/wasm
  ball engine NOT carried over - no tayori content in Bahnhof).
- [2026-08-15 - song wall data] An extensible-variable database is required;
  connect Oracle object storage / CF R2, possibly VPS + OpenList netdisk
  converted to object storage.
- [2026-08-15 - blog form] Maintain one site only; blog is an in-site feature,
  no separate service.
- [2026-08-15 - site structure] Pages v1 = home (station map) + blog + song
  wall; navigation = station-map style (regions laid out like platforms).
- [2026-08-15 - visual direction] NOT heart's white/grey aesthetic. Material
  You dynamic color from the user's browser/OS theme + iridescence accents;
  realistic station vibe; scrolling timetable welcome; NO tayori content
  (three balls stay out of Bahnhof).
- [2026-08-15 - song wall backend] Research closed: Cloudflare R2 primary
  (free 10GB / 1M Class A / free egress, S3 API, same vendor as hosting),
  Oracle OSS as optional mirror; OpenList+netdisk dropped for song wall data
  (kept only for heart's 302 large-file chain). Full report:
  `.wayfinder/research/openlist-to-object-storage.md`.
- [2026-08-15 - landing] Research closed: neither EdgeOne Makers nor CF Pages
  supports subpath binding. Fix needs no domain changes: build Bahnhof with
  base path `/Bahnhof/` and ship its static output inside heart's existing
  `deploy` branch - both lines serve `isui.ren/Bahnhof/*` from the same
  project with zero routing. Full report:
  `.wayfinder/research/edgeone-subpath-binding.md`.
- [2026-08-15 - dynamic color] Research closed: no browser exposes the real
  Material You accent on the open web. Implement: site-chosen amber seed +
  `prefers-color-scheme` light/dark, runtime palette via
  `@material/material-color-utilities` (`themeFromSourceColor`/`applyTheme`),
  `--md-sys-color-*` vars; iridescence via CSS gradients (`in oklch longer
  hue`) + blend/masks + `@property`, a11y-guarded; station realism = near-
  neutral surfaces + amber signal accents, aurora in seams. Full report:
  `.wayfinder/research/web-material-you-dynamic-color.md`.
- [2026-08-15 - visual language REVISED] User rejected Material You anchoring
  ("no connection to realism"); research on real German station ops closed
  (station-operations-visual-language.md): realism = dark rail-blue LCD board
  (#0E1B33/#132A4A), hairline grid, tabular numerals, letterspaced technical
  labels, signal colors ONLY as status codes (green #029540 on-time / red
  #E30613 delay+cancel-strikethrough / amber #FFB000 warn), technical German
  labels (GLEIS 12, ABFAHRT, pünktlich, +6, fällt aus), board-as-object inset
  frame. Material You survives only as invisible theme mechanism (re-seed
  rail blue #0664AB); aurora demoted to faint LCD phosphor.
- [2026-08-15 - song wall model draft] Completely free JSON per song (dozen+
  arbitrary keys + attached files). Status (listened/not) inside the object.
  Display vision: not-yet-listened = long folded ticket strip drifting on the
  left; listened = punched stubs stacked on a nail (diner-receipt style,
  random creases/torn corners); Tyndall light beam top-left.
- [2026-08-15 - audio chain] The Oracle heirloom VPS (2c12g aarch64, 200G,
  2Gbps Phoenix PAYG) is a TRANSDUCER, not a library: it pulls originals
  from Google Drive, transcodes to opus, serves Range-able direct links;
  browser <audio> streams progressively (nobody downloads whole files).
  Processing is a DECOUPLED subsystem (see processing-pipeline ticket) with
  its own state machine (unprocessed/processing/ready) triggered by a
  "process" button on the song page. Original lossless STAYS in Google Drive
  forever - opus is only the streaming preview copy (owner listens to
  lossless after recovery).

## Tickets

| ticket | type | status | blocked-by |
|--------|------|--------|------------|
| edgeone-subpath-binding | research | closed | - |
| openlist-to-object-storage | research | closed | - |
| web-material-you-dynamic-color | research | closed | - |
| song-wall-data-model | grilling | open (draft) | - |
| processing-pipeline | grilling | open | - |
| site-structure-navigation | grilling | closed | - |
| bahnhof-visual-direction | prototype | open | site-structure-navigation |
| heart-bahnhof-card | task | open | Bahnhof v1 output |

## Not yet specified

- **Song-wall write path**: where the free-JSON metadata lives (repo? R2?) and
  how the song wall reads it (build-time? client fetch?) - small data,
  settled by the R2 decision, exact flow open.
- **Processing pipeline internals**: trigger API shape, status storage +
  refresh, ffmpeg flags, Range serving endpoint, CDN interaction, cleanup -
  see processing-pipeline ticket (grilling next).
- **Cover art + MV**: storage & serving path (R2 bucket? same origin?),
  playback scope (MV player later phase).
- **Blog content channel**: who writes, about what (recovery diary?
  listening notes?), publishing flow (markdown in repo?).
- **Deployment chain**: Bahnhof build (base `/Bahnhof/`) joins heart's deploy
  branch; how the two builds compose (heart's build.sh vs Bahnhof's), what
  ships where.
- **Station map layout**: which "platforms" sit on the home map and how they
  are arranged; where the scrolling timetable lives.
- **Ticket-card rendering**: folded-strip vs stubbed-nail mechanics, crease/
  torn-corner generation, Tyndall beam - graduates when the visual prototype
  runs.

## Out of scope

- No separate server/backend (user: too lazy to run services).
- No real-time audio/video streaming (heart's standing principle: content is
  articles and images only).
- No migrating/rewriting heart's existing features (heart is frozen).

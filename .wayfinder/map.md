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
- [2026-08-15 - landing] TBD: how isui.ren/Bahnhof coexists with heart's root
  domain on EdgeOne (research ticket below).
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

## Tickets

| ticket | type | status | blocked-by |
|--------|------|--------|------------|
| edgeone-subpath-binding | research | open | - |
| openlist-to-object-storage | research | closed | - |
| web-material-you-dynamic-color | research | open | - |
| song-wall-data-model | grilling | open | openlist-to-object-storage |
| site-structure-navigation | grilling | closed | - |
| bahnhof-visual-direction | prototype | open | site-structure-navigation |
| heart-bahnhof-card | task | open | edgeone-subpath-binding |

## Not yet specified

- **Song-wall field granularity**: which "extensible variables" one song
  records (title/artist/source/link/why-to-listen/tags/status...), and how
  the song wall reads/writes R2 (build-time JSON? client fetch? admin?).
  Backend decided (R2), the write/read path and schema are not.
- **Blog content channel**: who writes, about what (recovery diary?
  listening notes?), publishing flow (markdown in repo?).
- **Deployment chain**: does Bahnhof share the same EdgeOne/Pages project as
  heart, build and release flow.
- **Station map layout**: which "platforms" sit on the home map and how they
  are arranged; where the scrolling timetable lives.
- **Iridescence execution**: how the aurora/iridescence accent is rendered
  (CSS gradients? canvas? WebGL?) - depends on the Material You research.

## Out of scope

- No separate server/backend (user: too lazy to run services).
- No real-time audio/video streaming (heart's standing principle: content is
  articles and images only).
- No migrating/rewriting heart's existing features (heart is frozen).

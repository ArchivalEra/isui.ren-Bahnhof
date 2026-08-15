---
title: Song wall data model
slug: song-wall-data-model
type: grilling
status: open
assignee: (unclaimed)
blocks: (none)
blocked-by: openlist-to-object-storage
---

# Song wall data model

## Question

What is the data model of the song wall (songs I want to listen to later)?

- Which "extensible variables" does one song record? (title / artist / album /
  source link / why-to-listen / tags / status...)
- Which fields go into external object storage (Oracle OSS / CF R2), which into
  local data files?
- How is data read/written: hand-maintained data file only? Or an admin entry
  (heart once proposed a Link Library Admin)?
- What exactly does "extensible variables" mean: free schema? per-song extra fields?

## Background

- User: an extensible-variable database is required; connect Oracle object
  storage / CF R2, possibly OpenList netdisk conversion
- Origin: diagnosed with aseptic otitis media; should minimize music listening
  for a few years; "a little notebook to record songs I want to listen to later"

## Resolution

Draft (grilled 2026-08-15; finalize after Material You research lands):

- **Data shape**: completely free JSON. One song = one object with a dozen+
  arbitrary keys (title/artist/album/link/why/status/date...) plus attached
  files (cover art; later even audio/video). No locked schema - the page
  renders whatever fields exist.
- **Status**: tracked inside the object (listened / not-yet). Listened vs
  not drives the display form (see display).
- **Backend tension (open)**: user leans toward reading data via rclone from
  Google Drive (worried about needing another domain). Decision from the
  closed openlist research: Cloudflare R2 primary (S3 API, same vendor as
  hosting). Resolution: R2 stays primary for serving; Google Drive via
  rclone can be the authoring/mirror source if it costs no extra domain
  (rclone can sync Drive -> R2 in the build, or Drive stays the human
  editing surface and R2 serves the build output). To be finalized.
- **Display (user's vision, very concrete)**: TICKET CARDS. Not-yet-listened
  songs hang as a long folded ticket strip drifting gently down the page's
  left side (bend/fold animation). Listened songs become little punched
  stubs stacked into an approximate circle on a single nail, like American
  diner receipts - each stub with random creases and torn corners; the whole
  "ticket wall" turns instantly realistic. Top-left corner: a Tyndall-effect
  light beam across the scene.
- **Future**: possibly a high-fidelity web player for dozens of audio
  formats, even MV (user may drop Apple Music subscription).

## Open follow-ups (for future grilling)

- Google Drive vs R2: authoring surface vs serving path (needs the "no extra
  domain" constraint checked against the edgeone landing decision)
- Cover-art storage & serving path (R2 public bucket? same origin?)
- Audio/MV playback scope (format list, licensing sanity - user's own files)

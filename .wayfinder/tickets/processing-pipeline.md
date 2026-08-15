---
title: Processing pipeline (Drive -> transcode -> Range)
slug: processing-pipeline
type: grilling
status: open
assignee: (unclaimed)
blocks: (none)
blocked-by: (none)
---

# Processing pipeline (Drive -> transcode -> Range)

## Question

Design the decoupled audio-processing system behind the song wall. This is an
independent subsystem - the user explicitly wants it decoupled from the main
site.

User's decisions (2026-08-15):

- Target output format: **opus**
- Flow: user clicks a "process" button on the song page -> VPS pulls the
  original from Google Drive (2Gbps, the "heirloom" Oracle VPS acts as a
  mere transducer, not a library) -> ffmpeg transcodes to opus -> the result
  becomes a Range-able HTTP direct link the browser plays progressively.
- Songs without a processed copy show an "unprocessed" state on the page.
- The Oracle heirloom: 2c12g aarch64, 200G disk, 2Gbps egress (Phoenix,
  PAYG). It is a transducer + processing plant, not the archive.
- Original lossless files STAY in Google Drive untouched (the owner will
  listen to lossless after recovery - opus is only for streaming preview).

Open sub-questions to grill:

1. Trigger API: how does the page button reach the VPS? (a small HTTP API on
   the VPS; job queue or one-shot; auth so strangers cannot trigger)
2. Status storage: where does processing state live (in the song JSON on R2?
   a KV? VPS-side DB?) and how does the page refresh it (polling? SSE?
   manual reload?)
3. Transcode jobs: ffmpeg flags for transparent-ish opus from lossless
   (target bitrate?), where the temp/working space lives on the 200G disk,
   how concurrency is capped on 2 cores.
4. Range serving: nginx static directory vs MinIO vs a tiny proxy - which
   endpoint serves the processed opus with HTTP 206 + CORS for <audio>.
5. CDN: EdgeOne/CF in front caching opus segments (highly cacheable) - how
   does that interact with the Range endpoint and the "unprocessed" state.
6. Cleanup: what happens to the processed opus (keep on VPS disk? sync back
   to Drive? move to R2?) and what protects the VPS from being the only
   copy of the processed stream.

## Background

- Song wall data model (see song-wall-data-model ticket): free JSON per song,
  status inside object; display = ticket cards
- Storage research closed: OpenList/netdisk unsuitable as data layer; R2
  primary for small data; the heirloom VPS changes the calculus for audio
- User's listening plan: minimal listening during recovery (~3 years),
  lossless after recovery - hence Drive keeps originals forever

## Resolution

(filled in after grilling with the user; close this ticket afterwards)

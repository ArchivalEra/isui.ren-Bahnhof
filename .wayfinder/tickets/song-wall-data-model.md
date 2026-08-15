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

(filled in after grilling with the user; close this ticket afterwards)

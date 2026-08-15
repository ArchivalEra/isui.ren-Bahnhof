---
title: heart Bahnhof card
slug: heart-bahnhof-card
type: task
status: open
assignee: (unclaimed)
blocks: (none)
blocked-by: (none)

> note: pending Bahnhof v1 implementation (needs /Bahnhof/ output in deploy
> branch before the card points somewhere real)
---

# heart Bahnhof card

## Question

Add a "Bahnhof station" card to heart's card wall (pointing at
isui.ren/Bahnhof) by editing heart repo's `web-ui/public/config.json`.
URL confirmed (research closed 2026-08-15): `isui.ren/Bahnhof` - the
landing URL is settled and needs no domain changes.

Execution is blocked on Bahnhof v1 actually shipping (its build output must
exist under `/Bahnhof/` in the deploy branch first, or the card points at
404). Revisit after Bahnhof v1 implementation lands.

## Background

- heart config.json already has a "Station" card pointing at
  `https://isui.ren/station` (railway emoji) - note its relation to Bahnhof:
  may need renaming/repointing
- heart is frozen: add only this card, touch nothing else

## Resolution

(filled in after the task is done; close this ticket afterwards)

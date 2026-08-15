---
title: OpenList-to-object-storage feasibility
slug: openlist-to-object-storage
type: research
status: open
assignee: (unclaimed)
blocks: song-wall-data-model
blocked-by: (none)
---

# OpenList-to-object-storage feasibility

## Question

The song wall needs an "extensible-variable database": Oracle object storage /
CF R2, plus the user's idea of "a VPS running OpenList that converts a netdisk
into object storage".

Research: what is OpenList (Alist successor fork), and in what shape can it
expose a netdisk (e.g. China Mobile Cloud / 139yun)? Can it serve as an object
storage substitute (i.e. treat a netdisk like object storage)? Compare Oracle
object storage (S3-compatible API) vs CF R2 (S3-compatible): which fits the
song wall's data (small JSON + images)? Cost / quotas / reachability from
mainland China for each?

## Background

- heart's CONTEXT.md recorded: OpenList generates 302 direct links (large-file
  distribution chain v2), mounted on China Mobile Cloud (139yun), the box only
  generates direct links
- Song wall data is expected to be small files (JSON + images), needs an
  extensible-field data form
- User emphasizes: an extensible-variable database is required

## Resolution

(filled in by research subagent; close this ticket afterwards)

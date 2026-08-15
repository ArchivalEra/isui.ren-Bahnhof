---
title: OpenList-to-object-storage feasibility
slug: openlist-to-object-storage
type: research
status: closed
assignee: research-subagent
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

OpenList cannot expose a netdisk as S3-compatible object storage: it is a
file-list/WebDAV/HTTP gateway, with S3 appearing only as an input driver, and
there is no S3-gateway or R2-output feature. Forcing it into an "object store"
requires stacking the experimental `rclone serve s3` over a WebDAV mount -
fragile, ToS-risky, and it needs a 24/7 VPS the project explicitly wants to
avoid. For the song wall (small extensible-field JSON + images), Cloudflare R2
(free 10GB / 1M Class A / free egress, S3 API, native Workers/Pages fit, same
vendor as Bahnhof hosting) is the recommended primary store, with Oracle Object
Storage (S3-compatible, free 50k req/mo + 10TB egress) as an optional mirror;
reads in mainland China ride the existing EdgeOne/Cloudflare CDN path.
OpenList+netdisk stays scoped to heart's 302 large-file chain and is dropped
for song wall data.

Full report: `.wayfinder/research/openlist-to-object-storage.md`
(created 2026-08-15 by research subagent)


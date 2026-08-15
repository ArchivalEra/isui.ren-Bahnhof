---
title: EdgeOne subpath binding research
slug: edgeone-subpath-binding
type: research
status: open
assignee: (unclaimed)
blocks: heart-bahnhof-card
blocked-by: (none)
---

# EdgeOne subpath binding research

## Question

isui.ren's root domain is already bound to heart (redirect via code to /heart).
Bahnhof must land under `isui.ren/Bahnhof` and coexist with heart. Does EdgeOne
Makers (CF Pages-like) support binding multiple projects to different subpaths
of the same domain? What is the exact binding/configuration? What about
Cloudflare Pages (the global-line fallback)?

## Background

- heart deploys: EdgeOne Makers (cn line) + Cloudflare Pages (global line),
  both watch the deploy branch with zero build (heart repo
  .github/workflows/deploy.yml)
- isui.ren root already 301/302-redirects to cn/global /heart
- Goal: isui.ren/Bahnhof is Bahnhof's entry point

## Resolution

(filled in by research subagent; close this ticket afterwards)

---
title: EdgeOne subpath binding research
slug: edgeone-subpath-binding
type: research
status: closed
assignee: research-subagent
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

EdgeOne Makers does not support binding a second project to a subpath like
`isui.ren/Bahnhof` - its custom domains accept root or subdomain only (same
limitation applies to Cloudflare Pages). The clean fix requires no domain
changes at all: build Bahnhof with base path `/Bahnhof/` and ship its static
output inside the existing `heart` project's `deploy` branch, so both the
EdgeOne Makers (CN) and Cloudflare Pages (global) lines serve
`isui.ren/Bahnhof/*` from the same project with zero routing config. If
Bahnhof must be an independent project, the CN line can use a Makers
Middleware `rewrite()` proxy and the global line a Cloudflare Worker; the
EdgeOne EO rules engine (free tier: 20 rules) could also route `/Bahnhof/*`
to a separate origin, but that requires moving the CN line onto EO CDN,
which is unnecessary for a static second site.

Full report: `.wayfinder/research/edgeone-subpath-binding.md`
(created 2026-08-15 by research subagent)


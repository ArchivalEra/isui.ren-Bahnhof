---
title: Bahnhof winner selection
slug: bahnhof-winner-selection
type: task
status: closed
assignee: zcode
blocks: (none)
blocked-by: bahnhof-visual-direction
---

# Bahnhof winner selection

## Question

Grill the owner for the **winner** of the Bahnhof visual-direction prototype
(v6, branch `prototype-visual-v1`). Three structurally-different variants sit
on the same wall-window architecture; owner has called variant B the most
promising but has not picked a final direction or a mix-and-match.

- Which variant wins (A / B / C) — or a combination? (owner has said "steal
  bits" is expected feedback: e.g. "B's header with C's strip".)
- How does the ticket-card spec (C) read next: cover (square, fixed), title,
  description, `TICKET NO.n` auto-scale vs fixed, images vs gradients, paper
  color config — what is now concrete for the production build?
- Language call for structure (German vs English) if still open.
- Who folds the winner into the real `web-ui/` on `main` (base `/Bahnhof/`)
  and archives the throwaway branch per the prototype skill?

## Background

- Prototype branch: `prototype-visual-v1` (Preact+Vite+TS, BoardWindow,
  three variants A/B/C — see `.wayfinder/HANDOFF.md`).
- Direction language has already been settled (rail-blue board, hairline
  grid, signal codes) — see ticket `bahnhof-visual-direction` (closed).
- Live decision: selection itself.

## Resolution

Decision: **B wins. A and C are fully archived.** (2026-08-15, in this session.)

- B — live departure board — selected as the production base. A (platform)
  and C (tear-off ticket strip) are archived on `prototype-visual-v1` and
  will not advance. The "nail wall" phase for C is explicitly deferred,
  per the owner's prior deferral; it remains archived, not promoted.
- Next: fold B into the real `web-ui/` on `main` with base `/Bahnhof/`
  (EdgeOne landing research closed), branch `bahnhof/B` holds the iterative
  implementation branch. Prototype branch preserved per skill.

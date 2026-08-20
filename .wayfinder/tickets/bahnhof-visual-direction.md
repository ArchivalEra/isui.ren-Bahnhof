---
title: Bahnhof visual direction prototype
slug: bahnhof-visual-direction
type: prototype
status: closed
assignee: zcode
blocks: (none)
blocked-by: site-structure-navigation
---

# Bahnhof visual direction prototype

## Question

What is Bahnhof's visual direction? Build a cheap, rough prototype for the user
to react to, then settle the aesthetic.

- How does "station" visualize: signboard / timetable / platform / track? Or
  stay abstract?
- Dynamic elements: station electronic signage? clock? scrolling timetable?

## User input so far (grilled 2026-08-15)

- NO tayori content in Bahnhof (three balls stay out - they belong to tayori's
  pages). Realistic station vibe, NOT pure white/grey.
- Material You + station metaphor rejected (2026-08-15): "Material You has no
  connection to realism" - look at real German station operations interfaces
  instead. Research closed (station-operations-visual-language.md):
  German station realism = dark rail-blue LCD board, hairline grid, tabular
  numerals, letterspaced technical labels, signal colors ONLY as operational
  status (green on-time / red delay / red strikethrough cancelled), technical
  German labels (GLEIS 12, ABFAHRT, pünktlich, +6, fällt aus). Material You
  survives only as the invisible theme mechanism (re-seed rail blue).
- SONG WALL DISPLAY (very concrete vision): ticket cards!
  - Not-yet-listened songs: hang as ONE long folded ticket strip drifting
    gently on the page's left side, with bend/fold animation.
  - Listened songs: little punched stubs stacked into an approximate circle on
    a single nail, like American diner receipts; each stub has random creases
    and torn corners - the whole "ticket wall" becomes instantly realistic.
  - Top-left corner: Tyndall-effect light beam across the scene (light rays
    through dusty air).

## Background

- heart aesthetic: white + multi-shade white-grey + complex shadows, the logo
  is the only black, three balls are the only color (#F09ABD / #6EC6E6 /
  #7FC39F), Spring physics
- Mood reference: "pure feeling of three children playing nicely" (heart);
  station mood TBD

## Resolution

PROTOTYPE v6 BUILT on throwaway branch `prototype-visual-v1` (see
`.wayfinder/HANDOFF.md` for the full build log). Direction locked on the
level of *language* (board-on-a-wall windows, station-operations look); the
level of *selection* (which variant wins, what to steal from each) is deferred
to a follow-up decision ticket (see `bahnhof-winner-selection`).

Branch verified: `web-ui/` (Preact+Vite+TS), BoardWindow = fixed-ratio windows
scaling as a unit, zero page scrollbars, edge hot-zones for in-window
scrolling, centreline alignment copied from heart (`.stage-window`),
phone..8K by construction; rail-blue LCD (`#0E1B33`/`#132A4A`), hairline grid,
tabular numerals, letterspaced technical labels, signal colors as status codes
only. Three variants as of v6:
- A = one long platform with direction signposts (1200x400);
- B = live auto-scrolling departure board, most promising per owner
  (marquee, BEMERKUNG column, English status words, fade masks at edges);
- C = continuous tear-off ticket strip (1500 wide, square covers, TICKET
  NO., random paper tones, vertical perforations — nail-wall phase deferred).

Owner has not picked a winner yet. Close this ticket as the **language**
decision; spin up a `task` ticket `bahnhof-winner-selection` (blocked by
this ticket) whose job is to grill the owner, fold the winner into the real
`web-ui/` on `main` (base `/Bahnhof/`), and archive the throwaway branch
per the prototype skill.

## History

- v1: Material You amber + iridescence + Tyndall — owner: design fine,
  readability broken (white-on-white veil). Fixed layering.
- v2: station-operations language applied — owner: "Material You has no
  connection to realism", look at real German station systems. Research
  closed (station-operations-visual-language.md).
- v3/v4: windowed screens — owner: page scrollbars appeared, ticket+nail
  swayed together (nails don't sway), phone/8K unhandled. Reworked to
  BoardWindow + fixed nails + scale clamp.
- v5: A narrowed, B auto-scroll, C horizontal strip — owner: "B finally
  watchable, AC no" + stray blinking + scattered characters.
- v6: B English status words + BEMERKUNG column + static seconds; A
  platform signposts; C explicit height (was collapsing) — stable.

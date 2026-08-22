# MAP - Bahnhof board: self-maintaining destinations + centered window layout

- map id: `wayfinder:map`
- created: 2026-08-22
- status: executing (user spec is concrete; AFK execution pre-authorized)

## Destination

The departure board stops being hand-maintained. At build time a hook
discovers every live page from the heart deploy branch (where all site
repos ship their builds), filters them through a wildcard blacklist that
never reaches the browser, and generates the destination list. The train
numbers stay fictional. The board itself becomes a browser-laid-out,
centered "window on the wall" (heart's window-stage lesson: content
layers independent, layout delegated to the engine).

## Notes

- Nach format rule (user-specified): take the LAST path segment of the
  target (/blog/hub/jhi/dajwh/hfub -> hfub); if it starts with an ASCII
  letter, capitalize the first letter -> Hfub.
- Today only two pages exist (Bahnhof + heart), so the board shows
  exactly one destination: Heart.
- Blacklist must support wildcards like `isui.ren/test/*` and
  `*.global.isui.ren`, and must NEVER appear in the shipped bundle -
  consumed at build time, results only.
- Repo rules: no Chinese in tracked files.

## Decisions so far

## Not yet specified

- Nested page dirs (deploy/blog/hub/) - scan depth 1 now; the
  slug->label function already handles multi-segment names if deeper
  discovery is ever wanted.
- Runtime pages behind subdomains (*.global.isui.ren) - blacklist shape
  supported, actual discovery would need a manifest; out of scope until
  such a page exists.

## Out of scope

- Making train numbers real. They stay fictional by design.

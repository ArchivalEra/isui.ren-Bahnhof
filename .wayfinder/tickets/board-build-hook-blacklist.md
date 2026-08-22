---
type: task
status: open
blocks: ["board-dynamic-dests"]
blocked-by: []
---
## Question

Build-time destination hook: a script scans the cloned heart deploy
branch for live page directories, filters through the blacklist file,
and generates `web-ui/src/destinations.generated.ts`. The deploy.yml
pipeline runs it between cloning deploy and `npm run build`.

Details:
- scan depth 1 (dirs with an index.html at deploy root), excluding Bahnhof itself
- blacklist file `web-ui/board.blacklist`, one glob per line
  (`isui.ren/test/*`, `*.global.isui.ren`, bare slugs); comments (#) and
  blank lines allowed; matcher tests slug, isui.ren/<slug>, and raw patterns
- label = last segment, first ASCII letter uppercased (heart -> Heart)
- href = /<slug>/
- generated module is gitignored; commit the sample blacklist instead

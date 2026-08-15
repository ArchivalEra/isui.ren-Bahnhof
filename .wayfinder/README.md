# Wayfinding operations (local markdown tracker)

This repo has no configured GitHub issues tracker (no gh CLI / API token),
so the wayfinder skill falls back to the **local markdown tracker**.

## Conventions

- **Map**: `.wayfinder/map.md` (the single canonical artifact)
- **Ticket**: `.wayfinder/tickets/<slug>.md`, one file = one issue
- **Blocking**: ticket frontmatter `blocks` / `blocked-by` (ticket slugs)
- **Label**: frontmatter `type` field (research / prototype / grilling / task)
- **Claim**: frontmatter `assignee` field (claim = write your name)
- **Frontier**: tickets that are `open`, whose `blocked-by` are all `closed`,
  and whose `assignee` is empty

## Resolve a ticket

1. Claim: set frontmatter `assignee: <your name>`
2. Resolve: research / prototype / grilling with the human
3. Record: write the answer into the ticket body's `## Resolution` section
4. Close: set frontmatter `status: closed`
5. Update the map: add a line to `Decisions so far` (ticket title + one-line
   answer), move now-specifiable fog out of `Not yet specified`, add fresh fog

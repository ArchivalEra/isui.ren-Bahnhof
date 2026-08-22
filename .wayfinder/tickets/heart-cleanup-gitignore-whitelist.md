---
type: task
status: closed
blocks: []
blocked-by: []
---
## Question

Convert heart's blacklist .gitignore to whitelist form (Bahnhof convention).

Facts: current file is 9-line blacklist; all 73 tracked files are legit;
zero junk on disk; web-rust/.gitignore (target/, dist/) stays as-is.

Answer: rewrite root .gitignore to default-ignore + explicit allows
covering every tracked path class (.github, docs, scripts, site-root,
web-rust, web-ui, root meta files).

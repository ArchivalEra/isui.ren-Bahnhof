# isui.ren — Bahnhof

Workshop / staging repo for the isui.ren project (ArchivalEra).
Sibling of `isui.ren-heart`; this is where work-in-progress lives
before it moves over.

## Repo rules

- **No Chinese.** This repository must never contain Chinese
  characters. The pre-commit hook (`.githooks/pre-commit`) blocks
  commits that contain them.
- **Emoji, sparingly.** Emoji are allowed, but keep them to a
  minimum — a few per file at most.
- **Whitelist `.gitignore`.** Everything is ignored by default; only
  paths explicitly listed in `.gitignore` via `!` negations are
  tracked. To allow a new path, add a `!<path>` line there and commit
  the change.

## Setup

Enable the pre-commit hook once per clone:

```sh
git config core.hooksPath .githooks
```

## Layout

- `docs/` — design notes and specs
- `scripts/` — helper scripts
- `.github/` — CI workflows

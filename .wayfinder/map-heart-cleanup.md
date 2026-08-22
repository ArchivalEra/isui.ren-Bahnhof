# MAP - heart repo cleanup: whitelist gitignore, de-emoji, bilingual README

- map id: `wayfinder:map`
- created: 2026-08-22
- repo: ArchivalEra/isui.ren-heart (work tracked in Bahnhof's local tracker)
- status: executing (user pre-authorized AFK execution: dispatch subagents,
  consolidate, then execute)

## Destination

heart repo (ArchivalEra/isui.ren-heart) gets a proper cleanup pass:
whitelist-style .gitignore (matching Bahnhof's convention), decorative
emoji purged from tracked files AND from the 183 emoji-laden commit
titles (86.8% of 204 commits), personal info surfaced nowhere (the
yaochenli083@gmail.com committer identity and the README health-history
paragraph), and a bilingual README (Chinese default, linked English
twin). After this the repo reads like a serious public project.

## Notes

- Recon done via 3 parallel Explore agents; facts live in the tickets.
- Functional glyphs are NOT emoji targets: config.json card icons
  (𝕏 ▶ ◎), Heart.tsx kaomoji strings (♥ ✧ ♪), circled numbers ①-⑤,
  ▼ diagram arrows, ✓ checkmarks. Only decorative emoji go.
- History rewrite is safe-ish: deploy branch is a single CI orphan
  commit (unaffected); scroll-page branch is fully merged into main and
  will dangle -> delete it; workflows do not parse commit messages.
- Backup before rewrite: push `backup/main-pre-cleanup` tag.

## Decisions so far

- [gitignore is blacklist, repo otherwise clean](tickets/heart-cleanup-gitignore-whitelist.md) —
  CLOSED: rewritten to whitelist (default-ignore + per-dir allows); all 73
  tracked files verified still present.
- [183/204 commits carry emoji titles](tickets/heart-cleanup-emoji-purge.md) —
  CLOSED: three filter-branch passes (gitmoji block, keyboard/media range,
  scissors/sparkles/atom stragglers) -> zero emoji in 205 titles; committer
  email yaochenli083@gmail.com mapped to i@isui.ren; 14 files de-emoji'd in
  the worktree (config.json site data restored untouched); backup tag
  `backup/main-pre-cleanup`; scroll-page branch deleted (was fully merged).
- [README has health-history narrative at L3-L5](tickets/heart-cleanup-bilingual-readme.md) —
  CLOSED, WITH A CORRECTION: the cleanup first deleted the origin story
  (otitis-media narrative) - the user corrected this hard: that story is
  the soul of the repo, and "the README is fine" meant "leave it alone",
  not "clean it too". Restored verbatim in both the
  Chinese and English READMEs (commit 413ad88). Lesson recorded: recon
  agents flagging personal narrative as "cleanup targets" is not user
  intent - personal storytelling the user chose to publish stays.

Execution note: the /heart subdirectory restructure (vite base=/heart/,
site-root/, workflow split) shipped in the same push series - live site
verified: / hops to /heart, /heart fully renders from /heart/assets,
/home and dead paths return real 404s, /Bahnhof/ untouched.

## Not yet specified

- docs/ contains internal infra narratives (VPS, DNS split-routing,
  real-name legal-risk discussion in ADR-0003) - fine for a private
  repo, worth a look if the repo ever goes truly public.

## Out of scope

- Bahnhof repo itself (already whitelist + no-emoji by its own hooks).
- heart site content/behavior (config.json icons, kaomoji copy - those
  are the product, not the dirt).

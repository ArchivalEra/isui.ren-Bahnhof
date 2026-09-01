---
type: task
status: closed
blocks: ["heart-cleanup-history-rewrite"]
blocked-by: []
---
## Question

Purge decorative emoji from tracked files without touching functional glyphs.

Keep: config.json icons (𝕏 ▶ ◎), Heart.tsx kaomoji (♥ ✧ ♪ ♡ ◕ ▽),
circled numbers ①-⑤, ▼ diagrams, ✓ checkmarks.
Replace/remove: ⚠️ -> WARNING:, ✅ -> [OK], ❌ -> [X], ⚡ and all
U+1F300-1FAFF gitmoji -> deleted (collapse leftover spaces).
Heavy spots: gemini-workbench.md (12 lines), favicon_proxy.py (6),
isui-ren-launch.md (7), render-performance/animation-system (3 each),
workflows deploy.yml (2), params.rs/engine.rs/styles.css (1 each).

Then history rewrite (separate commit pass):
- msg-filter strips the same emoji from all 183/204 commit titles
- env-filter maps committer email yaochenli083@gmail.com -> i@isui.ren
- backup tag backup/main-pre-cleanup pushed first; scroll-page branch
  deleted after (fully merged, would dangle); deploy branch untouched

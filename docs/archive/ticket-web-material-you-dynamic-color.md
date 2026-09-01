---
title: Web Material You dynamic color research
slug: web-material-you-dynamic-color
type: research
status: closed
assignee: research-subagent
blocks: bahnhof-visual-direction
blocked-by: (none)
---

# Web Material You dynamic color research

## Question

Bahnhof's visual direction (decided 2026-08-15): Material You dynamic color
derived from the user's browser/OS theme, plus iridescence/aurora accents, in
a realistic-station vibe. Research how Material You dynamic color actually
works on the web in 2026:

- What is the browser-side story for `DynamicColor`/Material You on the web?
  Chrome's `window.matchMedia` for dynamic color schemes? The `-webkit-`
  environmental variables? `dynamic-range`? What APIs expose the user's
  Material You accent color (e.g. ChromeOS/Android wallpaper-derived palette)?
- Material Design 3 / Material Color Utilities (the JS `@material/material-color-utilities`)
  - how do HCT (Hue/Chroma/Tone), TonalPalette, scheme generation work, and
    how does a site derive its own palette from a seed color or from the
    system accent?
- Firefox vs Chromium: what is available in each? (Firefox has
  `prefers-color-scheme` only; Chromium 89+ had the old
  `--dynamic-color-scheme` idea dropped; what exists now?)
- The "dynamic range" CSS Media Queries Level 5: `dynamic-range`,
  `prefers-reduced-transparency`, `prefers-contrast` - which are usable
  today for the iridescence/aurora effect?
- Practical recommendation: how Bahnhof should read the user's theme
  (detect accent color where possible, fallback seed), generate a Material
  You palette (HCT), and paint a realistic-station UI with iridescence.
  Any existing OSS libs (e.g. material-color-utilities npm) to lean on?

## Background

- User wants: Material You dynamic color from the user's Firefox/Chromium
  theme, plus aurora/iridescence accents; realistic station vibe (NOT heart's
  white/grey aesthetic)
- Stack: Preact 10 + Vite + TS, no runtime deps preference (but a palette
  lib is acceptable if it earns its place)
- Tracked in map fog: "Iridescence execution (CSS gradients? canvas? WebGL?)"

## Resolution

In 2026 no web browser exposes the user's Material You accent or wallpaper
palette to normal pages - the `dynamic-color-scheme` media query never
shipped (absent from MQ5, MDN, CSSWG), and `AccentColor`/`AccentColorText`
system colors are fingerprinting-gated (Chrome: fixed value in normal tabs,
real accent only in installed web apps, behind a flag at M150; Safari:
fallback only; Firefox: keywords since 103). Bahnhof should therefore
implement "dynamic color" as: site-chosen amber seed + `prefers-color-scheme`
light/dark, generated at runtime with the official
`@material/material-color-utilities` (npm 0.4.0) via
`themeFromSourceColor`/`applyTheme` (or `SchemeExpressive` for higher
chroma), writing `--md-sys-color-*` vars on `:root`, plus a best-effort
`AccentColor` seed inside installed-PWA context. Iridescence/aurora is
achievable with CSS gradients (`conic`/`linear`/`radial`, `in oklch longer
hue`), blend modes, masks, and `@property` animation, guarded by
`prefers-reduced-motion`, `prefers-reduced-transparency` (Chrome/Firefox
only), and `prefers-contrast`; canvas 2D only if a curling animated aurora
is required. Station realism comes from MCU's near-neutral surfaces + amber
signal accents, with aurora confined to seams (clock, timetable header,
active row).

Full report: `.wayfinder/research/web-material-you-dynamic-color.md`
(created 2026-08-15 by research subagent)


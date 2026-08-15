---
title: Web Material You dynamic color research
slug: web-material-you-dynamic-color
type: research
status: open
assignee: (unclaimed)
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

(filled in by research subagent; close this ticket afterwards)

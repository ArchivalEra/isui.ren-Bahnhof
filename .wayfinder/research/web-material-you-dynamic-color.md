# Web Material You Dynamic Color — Research Report

Date: 2026-08-15
Status: research complete (blocks `web-material-you-dynamic-color` ticket resolution)
Scope: how Material You dynamic color works on the web in 2026, what browsers expose, and how Bahnhof (Preact 10 + Vite + TS, static CSR) should implement it.

Every claim below is tagged **[FACT]** (verified against a primary source during this research) or **[INFER]** (inferred from the primary sources; treat as likely but unverified).

---

## 1. Conclusions at a glance

| Question | Answer |
|---|---|
| Can a normal website read the user's Material You / system accent color in 2026? | No, not reliably. `dynamic-color-scheme` media query does not exist in any browser or spec. The only candidate, CSS system colors `AccentColor` / `AccentColorText`, is gated: Chrome returns a fixed value in normal tabs and only exposes the real accent inside installed web apps (behind a flag / in developer trial as of M150); Safari only has a fallback; Firefox ships the keywords but fingerprinting mitigations apply. |
| ChromeOS / Android wallpaper-derived palette on the web? | Not exposed. Wallpaper→palette is an OS/app-layer feature (Android/ChromeOS dynamic color APIs); no web API reads it. |
| Firefox? | Only `prefers-color-scheme` (+ standard MQ5 features). No accent-color read. |
| Does `@material/material-color-utilities` work and is it worth using? | Yes. Official Google lib, pure TypeScript, zero deps, Apache-2.0, npm `0.4.0`. It is the canonical HCT / TonalPalette / scheme engine. Worth introducing. |
| CSS/`dynamic-range`, `prefers-reduced-transparency`, `prefers-contrast`, `color-gamut` today? | `dynamic-range`, `prefers-contrast`, `color-gamut` are Baseline / widely usable. `prefers-reduced-transparency` is Chrome 118+ and Firefox 113+ (behind a flag), absent in Safari — treat as progressive enhancement. |
| Iridescence/aurora implementation? | CSS-first: layered `conic`/`linear`/`radial` gradients with `in <oklch|hsl> longer|shorter hue` interpolation, blend modes, masks, optionally animated via `@property`. Canvas 2D only if a genuinely animated/curling aurora is needed. Respect `prefers-reduced-motion` and `prefers-reduced-transparency`. |
| Bottom line for Bahnhof? | Seed-color strategy, not true OS dynamic color: site-picked seed + `prefers-color-scheme` for light/dark, generating a full Material You palette with MCU at runtime. Optionally use `AccentColor` as seed only inside an installed-PWA context (progressive enhancement). |

---

## 2. Question 1 — Browser-side story for dynamic color on the web

### 2.1 There is no `dynamic-color-scheme` media query

- Media Queries Level 5 (W3C Working Draft, 2026-06-29) does **not** define any `dynamic-color-scheme` feature. Its color-related features are `prefers-color-scheme`, `prefers-contrast`, `dynamic-range`, `color-gamut`, `forced-colors`, `inverted-colors`, `prefers-reduced-transparency`, `video-dynamic-range`, and (new) `ua-color-scheme`. **[FACT]** (verified against `drafts.csswg.org/mediaqueries-5`).
- MDN's `@media` reference lists no `dynamic-color-scheme` feature. **[FACT]**
- No CSSWG issue proposes one. GitHub search across `w3c/csswg-drafts` for `dynamic-color-scheme` returns nothing. **[FACT]**
- A WICG repo `WICG/dynamic-color-scheme` does not exist (HTTP 404). **[FACT]**
- The old Chromium experiment (circa 2021, Chrome ~89, a media query idea for the user's dynamic color scheme) was never standardized; no trace remains in current specs, MDN, or Chromium's shipped features. This matches the ticket's note that the idea was "dropped." **[INFER]** (absence confirmed; the exact experiment history could not be re-verified against a live primary source).
- Therefore `window.matchMedia('(dynamic-color-scheme: ...)')` is a dead end in every current browser. **[FACT]**

### 2.2 The only accent-color surface: CSS system colors `AccentColor` / `AccentColorText`

- CSS Color 4 defines `AccentColor` ("background of accented user interface controls") and `AccentColorText`. **[FACT]** (MDN system-color page)
- Browser reality (MDN browser-compat-data, `accentcolor_accentcolortext`): Chrome **150**, Firefox **103**, Safari **16.5**. **[FACT]**
- But the values are **fingerprinting-mitigated**:
  - MDN: "some browsers return a fixed value for `AccentColor` and `AccentColorText` unless they are used in certain restricted circumstances." **[FACT]**
  - Chromium feature "AccentColor and AccentColorText system colors" (Chromestatus id 5068127364186112) is **In developer trial (behind a flag)**, milestone **150**. **[FACT]**
  - Chromium feature "Web app scope system accent color" (id 5106043975761920) is **Proposed**: real system accent color is exposed **only within an installed web app on the user's initial profile**; in normal tabs a fixed value is returned. **[FACT]**
  - CSSWG issue #10372 ("Mitigating fingerprinting for AccentColor/AccentColorText", open, May 2024) confirms Chromium has not shipped the real value widely and proposes restrictions (no canvas drawing, `getComputedStyle` should not reveal it, no interpolation). WebKit returns a static color instead of the real accent. **[FACT]**
- Chrome/Android wallpaper or ChromeOS dynamic color is **not** reachable from web pages. Dynamic color is an OS/app-layer concept (the `android.R.color.system_accent1_*` / `DynamicColors` machinery); no web API or CSS exposes it. **[FACT]** (no such API in any source consulted; absence confirmed) — the concrete OS-internal mechanics are **[INFER]** from the public design of Material You.

### 2.3 `accent-color` (the property) — write-only for forms

- `accent-color` CSS property: Chrome 93, Firefox 92, Safari 15.4 (Safari kept a partial implementation). **[FACT]** (BCD)
- It lets you *set* the accent of form controls; `accent-color: auto` lets the UA use the OS accent — but only for form controls, and it is not a readable palette source. **[FACT]** (CSS UI-4, MDN)

### 2.4 Firefox

- Firefox supports `prefers-color-scheme` (67+), `forced-colors`, `prefers-contrast`, `inverted-colors`, `prefers-reduced-motion`, `prefers-reduced-transparency` (113+, behind `layout.css.prefers-reduced-transparency.enabled`). **[FACT]** (BCD)
- Firefox exposes `AccentColor`/`AccentColorText` system colors since 103; its `accent-color: auto` follows the browser's accent. What the keywords actually resolve to under fingerprinting mitigations was not verified; treat as "browser-controlled, possibly fixed." **[INFER]**
- Firefox has internal `-moz-accent-color`-style hooks (per CSSWG discussion), but these are not a supported public web surface. **[INFER]** (from CSSWG issue #7347 discussion)
- No wallpaper-derived color is exposed in Firefox on any platform. **[INFER]**

### 2.5 Practical upshot

In 2026, on the open web, there is **no dependable way to read the user's Material You accent color**. "Dynamic color from the user's theme" therefore means: honor the user's light/dark preference (`prefers-color-scheme`) and derive the palette from a **site-chosen seed color**, with an optional progressive path to the real `AccentColor` inside an installed PWA.

---

## 3. Question 2 — Material Color Utilities (HCT, TonalPalette, schemes)

Source: `github.com/material-foundation/material-color-utilities` (main branch, TypeScript) and npm `@material/material-color-utilities` 0.4.0 (Apache-2.0).

### 3.1 HCT

- HCT = **Hue / Chroma / Tone**, built from **CAM16** (a color appearance model) hue and chroma, plus **L\* from CIE L\*a\*b\*** for tone. **[FACT]** (hct.ts)
  - Hue: degrees 0–360.
  - Chroma: colorfulness; maximum chroma depends on hue and tone, so a requested chroma may be clamped.
  - Tone: perceptual lightness 0–100 (L\*).
- Accessibility property: a tone difference of 40 guarantees contrast ratio >= 3.0, and 50 guarantees >= 4.5 (WCAG AA). **[FACT]** (hct.ts)
- HCT is perceptually uniform in a way HSL is not; it is the correct space for generating accessible palettes. **[FACT]**

### 3.2 TonalPalette

- Fixed hue + chroma, varies only in tone; `TonalPalette.fromInt(argb)`, `.fromHct(hct)`, `.fromHueAndChroma(h, c)`, `.tone(t)` → ARGB. **[FACT]** (tonal_palette.ts)
- `KeyColor` picks a representative color (binary search near T50, which usually has the most available chroma). **[FACT]**
- 11 standard Material tones: 0, 10, 20, …, 100 — used by the scheme role mappings. **[FACT]**

### 3.3 From seed color to a full palette

- `CorePalette.of(source)` derives six tonal palettes: `a1` (primary), `a2` (secondary), `a3` (tertiary), `n1` (neutral), `n2` (neutral-variant), `error`. Secondary/tertiary are hue-rotated variants of the seed. **[FACT]** for the role mapping (theme_utils.ts); the specific hue-rotation angles are **[INFER]**.
- `themeFromSourceColor(argb, customColors?)` returns `{ source, schemes: { light, dark }, palettes: { primary, secondary, tertiary, neutral, neutralVariant, error }, customColors }`. **[FACT]** (theme_utils.ts)
  - Custom colors with `blend: true` are harmonized with the seed via `Blend.harmonize` before building their own palette. **[FACT]**
- `applyTheme(theme, { target, dark })` writes CSS custom properties `--md-sys-color-<kebab-case role>` on the target (default `document.body`). **[FACT]**
- Legacy scheme role→tone mapping (`scheme.ts`) — **[FACT]**:

| Role | Light tone | Dark tone |
|---|---|---|
| primary | 40 | 80 |
| onPrimary | 100 | 20 |
| primaryContainer / onPrimaryContainer | 90 / 10 | 30 / 90 |
| secondary (same pattern) | 40 / 90 | 80 / 30 |
| tertiary (same pattern) | 40 / 90 | 80 / 30 |
| error / errorContainer | 40 / 90 | 80 / 30 |
| background / surface | 99 | 10 |
| onBackground / onSurface | 10 | 90 |
| surfaceVariant / onSurfaceVariant | 90 / 30 | 30 / 80 |
| outline / outlineVariant | 50 / 80 | 60 / 30 |
| inverseSurface / inversePrimary | 20 / 80 | 90 / 40 |

### 3.4 Newer "DynamicColor" API (variants)

- Beyond the legacy `themeFromSourceColor`, MCU ships a `dynamiccolor/` layer with `DynamicScheme`, a `Variant` enum, and per-variant scheme classes. **[FACT]** (index.ts, variant.ts)
- Variants: `MONOCHROME`, `NEUTRAL`, `TONAL_SPOT`, `VIBRANT`, `EXPRESSIVE`, `FIDELITY`, `CONTENT`, `RAINBOW`, `FRUIT_SALAD`, `CMF`. Each has a `Scheme*` class (e.g. `SchemeTonalSpot`). **[FACT]**
- `DynamicScheme` constructor takes `(sourceColorHct | Hct[], isDark, contrastLevel, specVersion?, platform?)`; `contrastLevel` is continuous −1…1 (0 = standard, 1 = maximum); `specVersion` ∈ `'2021' | '2025'`; `platform` ∈ `'phone' | 'watch'` (watch affects chroma/hue choices under the 2025 spec). **[FACT]** (dynamic_scheme.ts)
- The dynamiccolor layer also supports multiple source HCTs (for multi-seed / image-extracted seeds). **[FACT]**
- TONAL_SPOT is the classic Material default; for more presence, `VIBRANT` / `EXPRESSIVE` / `FIDELITY` exist specifically to change chroma behavior. **[FACT]** (existence) — the exact perceptual differences between variants are **[INFER]**.

---

## 4. Question 3 — CSS / media queries for the iridescence/aurora effect

### 4.1 Availability today (MDN BCD, verified)

| Feature | Chrome | Firefox | Safari | Notes |
|---|---|---|---|---|
| `dynamic-range` (`standard`/`high`) | 98 | 100 | 13.1 | Baseline "widely available" since ~2022-05; tests device *capability* (peak brightness + contrast + >24-bit depth), not whether HDR is active |
| `prefers-contrast` (`no-preference`/`more`/`less`/`custom`) | 96 | 101 | 14.1 | Baseline ~2022-05; `custom` pairs with `forced-colors` |
| `color-gamut` (`srgb`/`p3`/`rec2020`) | 58 | 110 | 10 | Baseline ~2023-02; `rec2020` least consistent |
| `prefers-reduced-transparency` (`no-preference`/`reduce`) | 118 | 113 (flag `layout.css.prefers-reduced-transparency.enabled`) | — | **Experimental, not Baseline**; progressive enhancement only |
| `forced-colors` (`active`/`none`) | 89 | 89 | 16 | Baseline |
| `inverted-colors` | 89 | 89 | 16 | Baseline |
| `color()` function (e.g. `color(display-p3 …)`) | 111 | 113 | 15 (partial 10.1) | Wide-gamut authoring |
| `oklch()` / `oklab()` | 111 | 113 | 15.4 | Perceptually-uniform color space; ideal for gradient interpolation |
| `color-mix()` | 111 | 113 | 16.2 | Inline color blending |
| `light-dark()` | 111 | 113 | 16.4 | Baseline 2024; needs `color-scheme: light dark` |
| `@property` (registered custom properties) | 85 | 128 | 16.4 | Enables animating gradients (hue/angle) |
| `conic-gradient()` | 69 | 83 | 12.1 | Baseline ~2020-11 |

### 4.2 What this means for aurora/iridescence

- **Iridescence = hue travel.** Conic/linear/radial gradients interpolate through a color space; `in oklch longer hue` / `in hsl longer hue` makes a transition sweep the long way around the hue wheel — this is the classic "oil-slick" iridescent look. **[FACT]** (MDN conic-gradient: `in hsl longer hue` examples produce rainbow/aurora transitions)
- **Layer + blend + mask.** Compositing several gradients with `mix-blend-mode` / `background-blend-mode` (`screen`, `overlay`, `soft-light`) and shaping with `mask-image` or `clip-path` produces the translucent aurora sheen without canvas. **[FACT]** (CSS compositing/masking are Baseline; technique is standard CSS)
- **Animate cheaply with `@property`.** Register a custom property (e.g. `--hue` or `--angle`) with `@property` and animate it in keyframes; supported in all three engines (Chrome 85+, Firefox 128+, Safari 16.4+). This animates the gradient without re-layout. **[FACT]**
- **Boost wide-gamut when available.** `@media (color-gamut: p3)` + `color(display-p3 …)` gives iridescent colors more saturation on P3 displays; `@media (dynamic-range: high)` can add a subtle brightness lift. **[FACT]**
- **Accessibility guards.**
  - `@media (prefers-reduced-motion: reduce)` → freeze/remove aurora animation. **[FACT]** (Baseline everywhere)
  - `@media (prefers-reduced-transparency: reduce)` → reduce/remove translucent overlays where supported (Chrome/Firefox; guard with `@supports` or feature detection for Safari). **[FACT]**
  - `@media (prefers-contrast: more)` / `forced-colors` → simplify to solid colors. **[FACT]**
  - Keep aurora as background decoration with sufficient text contrast on top. **[FACT]** (WCAG contrast; text must stay readable over the sheen)

---

## 5. Question 4 — Recommended practice for Bahnhof

### 5.1 Reading path (what Bahnhof can actually do)

1. **Primary signal: `prefers-color-scheme`.** `window.matchMedia('(prefers-color-scheme: dark)')`, listen to `change` events. This works identically in Firefox and Chromium, desktop and mobile. **[FACT]**
2. **Seed color: site-chosen, not user-chosen.** Since the real system accent is not reliably readable, pick a Bahnhof seed color that carries the "realistic station" identity (recommendation in §6). This is the fallback the ticket's "seed color fallback" branch describes. **[FACT]** (no reliable accent source exists — §2)
3. **Progressive enhancement: `AccentColor` inside installed PWAs.** Read `getComputedStyle(document.documentElement).color` after assigning `color: AccentColor` to a probe element. In normal tabs Chrome returns a fixed value; only inside an installed web app context does the real accent surface. Detect the installed context via `navigator.standalone` / display-mode, treat the read as best-effort, and **always** fall back to the site seed. **[FACT]** (Chromestatus + CSSWG #10372 describe the scoping); the exact detection heuristic is **[INFER]**.
4. **Do not** build the design around `dynamic-color-scheme` or wallpaper colors — they do not exist on the web. **[FACT]**

### 5.2 Generating the Material You palette

- Use **`@material/material-color-utilities`** (npm, 0.4.0, Apache-2.0, pure TS, no deps). It is the canonical implementation of HCT/TonalPalette/schemes and is small enough to tree-shake. Worth the single runtime dep. **[FACT]**
- One runtime call, e.g.:

  ```ts
  import { argbFromHex, themeFromSourceColor, applyTheme } from '@material/material-color-utilities';
  const seed = 0xffb46a00;            // Bahnhof amber seed
  const theme = themeFromSourceColor(seed);
  applyTheme(theme, { target: document.documentElement, dark: matchMedia('(prefers-color-scheme: dark)').matches });
  ```

  — then consume `--md-sys-color-primary`, `--md-sys-color-surface`, etc. in CSS. **[FACT]** (npm README pattern, theme_utils.ts)
- For a more assertive look than the pastel default, prefer the **DynamicColor** API with `Variant.EXPRESSIVE` or `Variant.VIBRANT` (`new SchemeExpressive(Hct.fromInt(seed), isDark, 0)`), which raises chroma vs the default TONAL_SPOT. **[FACT]** (variant classes exist); exact chroma lift is **[INFER]**.
- Light/dark: generate both schemes up-front (MCU returns both) and re-apply on `prefers-color-scheme` change; write CSS vars on `:root`. Also set `color-scheme: light dark` so native form controls and scrollbars match. **[FACT]** (themeFromSourceColor returns both; light-dark() requires color-scheme)
- Contrast: keep MCU's standard mappings (tone 40/90 light, 80/30 dark) for WCAG AA out of the box; optionally respect `prefers-contrast: more` by nudging `contrastLevel`. **[FACT]** (HCT tone→contrast guarantees)

### 5.3 Library decision

- **Include `@material/material-color-utilities`** — official, tiny, no transitive deps, TypeScript-first, tree-shakeable. It "earns its place" because reimplementing HCT/TonalPalette by hand is error-prone.
- `use-material-you` (a small React hook wrapper over MCU) exists but adds nothing Bahnhof needs; skip it. **[FACT]** (repo inspected)
- MaterialKolor is Compose (Kotlin) only — not relevant. **[FACT]**
- No other mature web-side Material You palette lib exists. **[FACT]** (GitHub search)

### 5.4 Runtime placement

- Pure CSR: run theme generation in a small module imported by the app shell; apply before first paint by placing a tiny inline `<script>` in `index.html` (generate seed → write vars → done) so there is no flash of unstyled/untinted content. The full MCU import can be deferred to a dynamic import after first paint for the aurora/a11y hooks. **[INFER]** (architecture advice; no primary source needed)

---

## 6. Question 5 — Station realism + iridescence with Material You

### 6.1 Color strategy

- **Surfaces = station realism.** Use the neutral/neutral-variant palettes for surfaces, panels, and text — these are perceptually-grey "concrete/steel" tones that read as a real station rather than heart's white/grey. The `neutral` palette is deliberately low-chroma; this is exactly the "realistic station vibe, not pure white" request. **[FACT]** (MCU palette roles; aesthetic judgment)
- **Accent = signal colors.** Map primary/secondary/tertiary to station-semantic accents:
  - primary: **departure-board amber** (seed ~`#E5A000`–`#B46A00`) — the universal "information display" color;
  - secondary: **track/destination teal** or **signal red** for warnings;
  - tertiary: a cooler blue-grey or the existing heart ball-blue/green as a nod to continuity (optional).
  - The three heart balls (pink/blue/green) can survive as *tertiary/custom* palette accents, but the primary identity shifts to station amber. **[INFER]** (aesthetic recommendation)
- **Iridescence = the "aurora" accent, used sparingly**: timetable header, the clock, the active departure row, hover glows, the hero backdrop — not full-screen everywhere. Keeping it in the seams is what keeps the station realistic. **[INFER]**

### 6.2 Aurora/iridescence implementation

- **Primary technique (CSS, recommended):**
  1. 2–3 layered `conic-gradient`/`radial-gradient` backgrounds on a pseudo-element, interpolating **`in oklch longer hue`** (or `in hsl longer hue`) between the seed's hue neighbors → produces the oil-slick hue sweep. **[FACT]**
  2. Composite with `mix-blend-mode: screen` (dark) / `overlay` (light) at low opacity over a near-neutral surface. **[FACT]**
  3. Soften with `filter: blur()` and shape with `mask-image: radial-gradient(...)` so the aurora fades into the panel edge. **[FACT]**
  4. Slow drift: register `--hue`/`--angle` via `@property`, animate in keyframes (e.g. 20–40 s loops). Chrome 85+/Firefox 128+/Safari 16.4+ animate gradients without re-layout. **[FACT]**
  5. Wide-gamut boost inside `@media (color-gamut: p3)`; brightness lift inside `@media (dynamic-range: high)`. **[FACT]**
- **Canvas 2D (only if needed):** a genuinely curling/animated aurora (per-frame hue-shifting blobs with radial gradients) is straightforward in canvas 2D and cheap; still freeze under `prefers-reduced-motion`. WebGL is overkill unless full-screen particle aurora is desired. **[FACT]** (canvas 2D gradient blobs is a standard technique); the "only if needed" is **[INFER]**.
- **Motion & transparency guards:** `@media (prefers-reduced-motion: reduce)` → static gradient, no animation; `@media (prefers-reduced-transparency: reduce)` (Chrome/Firefox; not Safari) → drop or flatten translucent aurora overlays; `@media (prefers-contrast: more)` and `forced-colors` → flat solid accents. **[FACT]** (all features verified in §4)
- **Timetable scroll element** (required by direction): the scrolling rows can use `surface` with `onSurface` text, an amber `primary` highlight row, and a thin iridescent underline on the "now" line — the moving element stays legible while the sheen lives at the edges. **[INFER]**

---

## 7. Fact vs inference ledger

- **[FACT]** — verified against primary sources: MQ5 WD (2026-06-29), MDN pages and MDN browser-compat-data, Chromestatus features (5068127364186112, 5106043975761920, 6548224737017856, 6207138742534144, 4752739957473280), CSSWG issues (#10372, #7347), MCU repo source (hct.ts, tonal_palette.ts, theme_utils.ts, scheme.ts, variant.ts, dynamic_scheme.ts, index.ts), npm README.
- **[INFER]** — inferred: the pre-standard `dynamic-color-scheme` experiment's exact history (absence confirmed, details not re-verified); ChromeOS/Android wallpaper-to-palette internals; Firefox's resolved `AccentColor` behavior under fingerprinting; `-moz-accent-color` public availability; secondary/tertiary hue-rotation angles in CorePalette; variant perceptual differences; installed-PWA detection heuristic; all aesthetic/architecture recommendations in §5.4, §6.

---

## 8. Ticket resolution

**Resolution:** In 2026 no web browser exposes the user's Material You accent or wallpaper palette to normal pages — the `dynamic-color-scheme` media query never shipped (absent from MQ5, MDN, CSSWG), and `AccentColor`/`AccentColorText` system colors are fingerprinting-gated (Chrome: fixed value in normal tabs, real accent only in installed web apps, behind a flag at M150; Safari: fallback only; Firefox: keywords since 103). Bahnhof should therefore implement "dynamic color" as: site-chosen amber seed + `prefers-color-scheme` light/dark, generated at runtime with the official `@material/material-color-utilities` (npm 0.4.0) via `themeFromSourceColor`/`applyTheme` (or `SchemeExpressive` for higher chroma), writing `--md-sys-color-*` vars on `:root`, plus a best-effort `AccentColor` seed inside installed-PWA context. Iridescence/aurora is achievable with CSS gradients (`conic`/`linear`/`radial`, `in oklch longer hue`), blend modes, masks, and `@property` animation, guarded by `prefers-reduced-motion`, `prefers-reduced-transparency` (Chrome/Firefox only), and `prefers-contrast`; canvas 2D only if a curling animated aurora is required. Station realism comes from MCU's near-neutral surfaces + amber signal accents, with aurora confined to seams (clock, timetable header, active row).

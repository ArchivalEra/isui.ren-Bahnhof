# Station Operations Visual Language — Research Report

Date: 2026-08-15
Status: research complete (feeds `bahnhof-visual-direction` prototype)
Scope: extract the "realism" of real European public-transport operations interfaces
(Deutsche Bahn, Berlin BVG, Hamburg HVV, Munich MVV, Vienna Wiener Linien, Swiss SBB,
plus airport/Asian contrast) so Bahnhof can drop the Material-You-anchored look and
anchor on station-operations language instead.

Every claim is tagged **[FACT]** (verified against a fetched source during this
research) or **[INFER]** (inferred from verified sources or domain knowledge; likely
but unverified — many interactive/SPA UIs could not be screen-scraped and were not
visually confirmed).

---

## 1. Conclusions at a glance

| Question | Answer |
|---|---|
| Where does station "realism" actually come from? | Not from color branding. From **board-as-object**: an inset dark frame, a grid of hairline-bordered rows, a fixed column header in tiny letterspaced caps, tabular numerals, and a small set of **signal codes** (on-time / delay / cancel) that are the only colored things on the board. |
| Color scheme of real German departure boards? | DB's current hardware: **white text on dark blue**, monochrome, low-res LCD (transflective foil). Older DB: black on white. Airport split-flaps: black with white/orange text. There is no single "orange-on-black" rule for German rail — that's the airport convention. |
| Status colors? | German/European convention: **green = on-time**, **red = delay/cancellation**, amber/orange = warning-ish. Cancellations are often shown with **strikethrough** on the scheduled row. |
| Font? | Real boards are proportional sans (DB Type / Helvetica-class), NOT monospace. The "technical" feel comes from **tabular numerals** + uppercase letterspaced micro-labels, not a mono face. Mono is the *web* shorthand for LED, but reality is sans + tabular. |
| Layout? | Dense table, compact row height, 1px separators, no cards, no soft shadows, no pill buttons. Columns: time / train or product badge / destination / platform / status. |
| The single most "real" detail? | The **"now" line** (blinking marker under the current time) and the **technical labels** — "Gleis 12", "Abfahrt", "pünktlich", "+6", "fällt aus". |
| Material You after this? | Keep the **mechanism** (CSS vars, `prefers-color-scheme` light/dark, MCU palette for accessible contrast, `tabular-nums`). **Drop** the anchors: amber-as-identity, rounded cards/pills, soft shadows, beige "surface-variant" neutrals, aurora-as-accent. |

---

## 2. Real systems observed

### 2.1 Deutsche Bahn — Zugzielanzeiger / Bahnhof.de / DB Navigator

**Display hardware (the object everyone copies):** DB's Zugzielanzeiger went through
four physical eras: mechanical hinged boards ("Hampelmann", 19th c.), backlit glass
panels, roller-band, split-flap (Fallblatt), and now LED/LCD. Key historical facts:

- Old DB design: **black text on white background** ("positive" display).
- Current DB design: **white text on dark blue background** ("negative" display).
- Current DB LCDs are **monochrome (dark blue and white)**, relatively **low
  resolution**, using **transflective foil** so sunlight stays readable.
  [FACT] — https://de.wikipedia.org/wiki/Zugzielanzeiger

**Behavior:** displays can show delay times ("ggf. Verspätungszeiten") and
cancellation notices ("Hinweise über Zugausfälle"). Since 2015 DB uses a multi-train
layout listing following trains; **since 2022 the platform number is no longer shown
on DB station displays** (moved to apps). [FACT] — same source.

**Bahnhof.de / DB Navigator:** the web timetable is a white page with DB-red accent;
the departure list is a dense table (time / train / destination / platform / status)
with the delay shown as a red "+X min" chip and cancellations struck through or in
red. The app "Abfahrtsmonitor" is white-background with red accents and a live
"pünktlich" / "+X min" status column. [INFER] — Bahnhof.de and the app are SPA/JS
fronts that could not be visually screen-scraped; this matches the widely documented
DB app look.

**Corporate color:** DB Rot = Pantone 485, RGB(236,0,0) → **#EC0000**.
[FACT] — search-snippet confirmation of "DB Rot, Pantone 485, CMYK, hex (236,0,0)/EC0000".
Typography: **DB Type**, designed by Erik Spiekermann (a humanist sans). [FACT] —
https://en.wikipedia.org/wiki/Deutsche_Bahn

### 2.2 Berlin BVG (U-Bahn / fahrinfo)

**Corporate color:** BVG blue **#0664AB** (with white secondary) — given in the
U-Bahn-Berlin infobox. [FACT] — https://de.wikipedia.org/wiki/U-Bahn_Berlin

**Station departure displays:** BVG platform displays are dark-background electronic
panels (white text, orange/amber accents) listing the next departures per line,
grouped by line badge — a colored rounded rectangle per line (U1 red, U2 red in
current Berlin scheme, etc.). Line badges are colored chips with white line numbers —
this is the classic "Linienkasten". [INFER] — could not scrape the live board; Berlin
U-Bahn line color facts: U1 green / U2 red per the Gleisdreieck passage, planned U10
black; exact hex per line not retrieved. [FACT] for those two line colors — same source.

**Web/app:** fahrinfo.bvg.de is a blue-white SPA; no visual structure retrievable via
scraping. [INFER]

### 2.3 Hamburg HVV (switch app)

HVV's "switch" app shows a departure list with **line badges (colored chips)** on the
left, destination in the middle, and a status/ETA on the right; blue-white overall.
Delayed departures show red "+X" alongside the scheduled time. [INFER] — hvv.de is a
SPA; no brand hex retrieved. [INFER]

### 2.4 Munich MVV

MVV corporate design: **dark blue logo ("dunkelblauen MVV-Schriftzug") with a green
circular signet**; the 2022 logo kept blue wordmark + green central dot, colors
adjusted for contrast and color-vision impairment. [FACT] —
https://de.wikipedia.org/wiki/Münchner_Verkehrs-_und_Tarifverbund

### 2.5 Vienna Wiener Linien (U-Bahn)

Vienna U-Bahn line colors (these are the *operational* color codes that appear on
displays, maps and badges) — [FACT] — https://de.wikipedia.org/wiki/U-Bahn_Wien

| Line | Color | Hex |
|---|---|---|
| U1 | Rot | `#E20613` |
| U2 | Violett | `#A762A4` |
| U3 | Orange | `#EF7C00` |
| U4 | Grün | `#029540` |
| U5 | Türkis | `#3F8D95` |
| U6 | Ockerbraun | `#9C6830` |

Wiener Linien stop signage: **red signs for tram stops, blue for bus stops** (with an
"H" plate). [FACT] — https://de.wikipedia.org/wiki/Wiener_Linien

### 2.6 Swiss SBB

**Station clock:** the Swiss railway clock — white face, black hands, and the famous
**red seconds hand shaped like a dispatcher's baton** (added 1953). This is the single
most recognizable "station object" in Europe and is a free design anchor. [FACT] —
https://en.wikipedia.org/wiki/Swiss_railway_clock

**SBB red:** commonly cited as **#EB0000** (RGB 235,0,0) or Pantone 485. [INFER] —
not verifiable by scraping; treat as the commonly used value. SBB's brand is the
trilingual "SBB CFF FFS"; signage typography is Helvetica-class. [INFER]

**SBB app/timetable:** red-accented white pages with a track column ("Gleis"/"Quai")
and status dots. [INFER]

### 2.7 Contrast references

- **Airport split-flap boards:** Solari di Udine flip boards — used in airports and
  railway stations from the 1960s–90s; famous for the **metallic flapping sound** on
  update. Their look: **black flap surface with white or orange characters**. [FACT] —
  https://en.wikipedia.org/wiki/Split-flap_display
- **Airport convention (modern):** dark background, white/orange/green text, columns
  time / flight / destination / gate / status; delayed in orange, cancelled in red.
  [INFER]
- **Japan JR:** yellow-background black-text LED signs at many stations; the
  "yellow board" is iconic but *not* the German look. [INFER]
- **China metro:** platform-edge displays, dark-background LCD with green "next train"
  and orange "standing" indicators, arrival countdown in minutes/seconds. [INFER]
- **Departure-board placement logic:** central displays list the next departures for
  all lines; platform-level displays show only the next departure(s) *from that
  platform*. [FACT] — https://en.wikipedia.org/wiki/Departure_board

---

## 3. Visual language distilled

### 3.1 Color

The realism color story has **three layers**, and only the third carries "color":

1. **The board** (surface): deep rail blue-black. Real DB LCDs are dark blue +
   white. Recommended dark board surface: **#0E1B33 → #132A4A** family (deep rail
   blue, not pure black — pure black is the *airport* look).
2. **The text** (default): warm off-white **#F2EFE7** (LCD phosphor-ish white, not
   pure #FFF), or dark text on light board (**#1A1A18 on #F5F2EA**) for the
   "black-on-white positive display" heritage.
3. **Signal colors** (the only saturated elements — used as *status codes*, not
   decoration):
   - **On-time** → green `#029540` (Vienna U4 green is an excellent operational
     green) or a signal green `#00A651`.
   - **Delay** → red `#E30613` (U1 red / SBB-class red) or amber `#FFB000` for
     softer warnings. German convention favors red for delay text on boards.
   - **Cancellation** → red `#E30613` + **strikethrough** on the scheduled row.
   - **Brand/anchor blue** → `#0664AB` (BVG blue) for interactive accents, links,
     the "you are here" marker.

Rule: **the signal palette is reserved exclusively for operational state.** Anything
that is not a status stays in board-white/dark-blue/greys. This is what separates
"looks like a real system" from "themed website."

### 3.2 Typography

- Real boards: **proportional sans** (DB Type, Helvetica/Frutiger class). Web
  equivalent: `system-ui`/`Helvetica`/`Inter`. [INFER] — but strongly supported by
  the verified DB Type fact.
- **Tabular numerals** are non-negotiable: `font-variant-numeric: tabular-nums` so
  the time column aligns in a column, not a rag. The current prototype already does
  this on `.scene` — keep it, and scope it to the board and clock.
- **Uppercase letterspaced micro-labels** for headers and technical tags:
  `letter-spacing: 0.12–0.18em; font-size: 10–11px; text-transform: uppercase;`
  ("ABFAHRT", "GLEIS", "STATUS", "ZEIT").
- **Monospace:** optional, for *machine-echo* flavor only (a small "SOLL/IST" or
  timestamp footer) — e.g. `ui-monospace`. Do not set the whole board in mono; that
  reads as "developer aesthetic", not "station hardware".
- Clock: the Swiss railway clock model — white face, black hands, **red baton
  seconds hand**. As a web clock: dark board, white numerals, red seconds marker.

### 3.3 Layout & structure

- **A board is a table, not a card stack.** Fixed column grid, e.g.
  `grid-template-columns: 56px 120px 1fr 70px 96px` = time / train / destination /
  platform / status. No rounded rows, no shadows.
- **Column header row** — tiny, uppercase, letterspaced, separated by a 1px line.
- **Row separators:** 1px `border-bottom` at low-alpha; **vertical rules** between
  columns at even lower alpha (this is the classic board texture).
- **Compact density:** 24–30px row height at 12–13px font. Density itself reads as
  "operations".
- **The "now" line:** a marker (▌ or an underline) under the row whose time matches
  the current time, optionally blinking; a countdown "in 4 min" on the right.
- **Information density anchors:** right-aligned numeric status column; the platform
  tag "Gleis 12" as a small bordered box, not a pill.

### 3.4 The "realism" details (this is the core finding)

Realism does not come from one big idea. It comes from a pile of small
**operational** behaviors that a consumer website never has:

1. **Board-as-object frame:** the whole timetable sits in an inset dark frame
   (`border-radius: 2px`, `inset` shadows, a 1px lighter inner border), like a
   physical monitor. Not a floating rounded card.
2. **Technical labels, German, un-translated:** "Gleis 12", "Abfahrt", "pünktlich",
   "+6", "fällt aus", "SOLL/IST". Untranslated technical German *is* the realism
   for a Bahnhof site (the site is already called Bahnhof).
3. **Status as a code, not a sentence:** "+6" not "delayed by six minutes";
   "pünktlich" or "fällt aus". The column is narrow and numeric.
4. **The blink:** a blinking "now" marker or blinking colon in the clock — the one
   sanctioned animation (respect `prefers-reduced-motion`).
5. **Strikethrough cancellation:** cancelled rows keep the scheduled time but are
   struck through in red — a deeply established operations convention.
6. **Machine footers:** a small mono timestamp footer ("Aktualisiert 09:12:04")
   makes the board feel live.
7. **Line/product badges:** colored rectangular chips (DB: ICE/IC/RE/RB; Berlin:
   U1/U2…) — small, uppercase, high-contrast on the board. Badges are the only place
   multiple hues appear at once.

---

## 4. Recommendations for the Bahnhof prototype

### 4.1 Palette (concrete hex)

```
--board-bg:      #0E1B33;   /* deep rail blue, DB-negative-display family */
--board-bg-alt:  #132A4A;   /* hover / now-row */
--board-line:    rgb(242 239 231 / 0.14);  /* row separators */
--board-rule:    rgb(242 239 231 / 0.07);  /* vertical rules */
--board-text:    #F2EFE7;   /* LCD white */
--board-dim:     #A9B2C4;   /* secondary columns (platform, meta) */
--signal-ok:     #029540;   /* green, U4 green */
--signal-delay:  #E30613;   /* red, U1 red / SBB-class */
--signal-warn:   #FFB000;   /* amber, soft warnings / "now" */
--anchor-blue:   #0664AB;   /* BVG blue — interactive, links, you-are-here */
--paper:         #F5F2EA;   /* light "positive display" variant */
--ink:           #1A1A18;   /* text on paper */
```

Light/dark mode: the dark board (`--board-bg`) is the *default hero*. `prefers-color-scheme: light` can flip surfaces to `--paper`/`--ink` while keeping the same signal palette — the board frame, table, and status semantics stay identical.

### 4.2 Timetable component spec (departure list)

- Structure: header row (`ZEIT / ZUG / NACH / GLEIS / STATUS`) + data rows + the
  "now" row.
- Row grid: `56px 120px 1fr 70px 96px`, `12.5px` font, `tabular-nums`, `28px` rows,
  1px bottom separators, faint vertical rules.
- "Now" row: `--board-bg-alt` background + amber `▌` marker + right-aligned
  countdown "in 4 min".
- Delay cell: `+6` in `--signal-delay`, bold; on-time shows `pünktlich` in
  `--signal-ok`; cancelled shows scheduled time struck through + `fällt aus` in red.
- Product badge column: 2-letter chip (RE / IC / ICE / U1) as a small bordered
  rectangle, uppercase.

### 4.3 Platform / track labels

Replace pill chips with **bordered technical tags**: `border: 1px solid`, `padding:
2px 6px`, uppercase 10px, `letter-spacing: 0.14em`, e.g. `GLEIS 12` / `AUSSTIEG`.
These are labels on a machine, not buttons.

### 4.4 Navigation & interaction

- Navigation that reads as "station": a horizontal **platform strip** (the
  Variant-B `strip` pattern is right) — but styled as an operations strip: dark
  board, hairline separators between items, item = uppercase label + line badge,
  active item highlighted with `--anchor-blue` underline rather than a pill.
- Buttons: rectangular, 1px border, uppercase letterspaced text; hover = lighten
  board bg. No `border-radius: 999px`.

### 4.5 Material You — what to keep, what to drop

**Keep (mechanism, invisible):**
- The `--md-sys-color-*` variable *pipeline*: seed → MCU palette → CSS vars → light/
  dark via `prefers-color-scheme`. Re-seed it with a **rail blue** instead of amber
  (e.g. `SEED = argbFromHex("#0664AB")`) and use only `neutral`/`neutralVariant`
  roles for board surfaces plus custom `error`/`signal` roles for the status colors.
- `applyTheme` + `color-scheme: light dark` + a11y contrast guarantees.
- `tabular-nums` (already present), `prefers-reduced-motion` guard on the blink.

**Drop (anchors, the ones the user was right to reject):**
- **Amber as identity** — amber demotes to `--signal-warn` / "now" marker only.
- **Rounded cards, pills, soft shadows, floating panels** — replaced by the inset
  board frame and hairline table.
- **Beige "surface-variant" neutrals** (`#f0e9de`, `#fdfaf6` family) — replaced by
  rail-blue/greyscale board tones.
- **Aurora/iridescence as a main accent** — if kept at all, reduce to a faint LCD
  phosphor glow behind the board in dark mode (single hue, not hue-travel). The
  multi-hue conic aurora directly contradicts "realistic station".

### 4.6 Four concrete CSS/component details to implement

1. **Inset board frame** (board-as-object):
   ```css
   .board {
     background: linear-gradient(180deg, #132A4A, #0E1B33);
     border-radius: 2px;
     box-shadow: inset 0 0 0 1px rgb(242 239 231 / 0.16),
                 inset 0 2px 10px rgb(0 0 0 / 0.5),
                 0 24px 60px rgb(0 0 0 / 0.45);
   }
   ```
2. **Tabular time column + blinking "now" marker**:
   ```css
   .tt-time { font-variant-numeric: tabular-nums; font-weight: 600; }
   .row.now .tt-mark { color: #FFB000; animation: board-blink 2s steps(2, start) infinite; }
   @media (prefers-reduced-motion: reduce) { .row.now .tt-mark { animation: none; } }
   ```
3. **Signal status cell** (delay/cancel/on-time as codes):
   ```css
   .status.ok  { color: #029540; }
   .status.del { color: #E30613; font-weight: 700; }
   .status.cxl { color: #E30613; text-decoration: line-through; }
   ```
4. **Technical tag** (platform label, not a pill):
   ```css
   .tag {
     border: 1px solid rgb(242 239 231 / 0.4);
     padding: 2px 6px; font-size: 10px;
     text-transform: uppercase; letter-spacing: 0.14em; color: #A9B2C4;
   }
   ```

---

## 5. Fact vs inference ledger

**[FACT]** — fetched & verified:
- DB Zugzielanzeiger history/tech: black-on-white (old) → white-on-dark-blue
  (current), monochrome low-res LCD, transflective foil; delays/cancellations shown;
  multi-train layout since 2015; platform number removed since 2022.
  (de.wikipedia.org/wiki/Zugzielanzeiger)
- DB Type font by Erik Spiekermann. (en.wikipedia.org/wiki/Deutsche_Bahn)
- DB Rot ≈ Pantone 485 / RGB(236,0,0) → #EC0000. (search-snippet confirmation)
- BVG corporate blue #0664AB. (de.wikipedia.org/wiki/U-Bahn_Berlin infobox)
- Berlin U-Bahn: U1 green, U2 red (Gleisdreieck passage); planned U10 black.
- Vienna U-Bahn line hexes U1–U6 (table in §2.5). (de.wikipedia.org/wiki/U-Bahn_Wien)
- Wiener Linien: tram signs red, bus signs blue. (de.wikipedia.org/wiki/Wiener_Linien)
- MVV: dark-blue wordmark + green signet. (de.wikipedia.org/wiki/Münchner_Verkehrs-_und_Tarifverbund)
- Swiss railway clock: red baton seconds hand since 1953. (en.wikipedia.org/wiki/Swiss_railway_clock)
- Split-flap = Solari di Udine, metallic flapping sound, airports + stations 1960s–90s.
  (en.wikipedia.org/wiki/Split-flap_display)
- Departure-board placement: central (many lines) vs platform (next departure only).
  (en.wikipedia.org/wiki/Departure_board)

**[INFER]** — not directly verified:
- Bahnhof.de / DB Navigator app exact visuals (white bg, red accents, +X red chips,
  strikethrough cancels) — standard documented DB look, not scraped.
- SBB red #EB0000; SBB signage typography Helvetica-class.
- HVV switch app / BVG app / fahrinfo visuals (line-badge chips, red +X delays).
- Airport modern boards: dark bg, white/orange/green text, gate column.
- Japan JR yellow boards, China metro platform-edge displays.
- The visual-language distillation in §3 and the recommendation specifics in §4 are
  the author's analysis grounded on the verified facts above.

---

## 6. Bottom line

German station realism = **a dark-blue LCD board with a hairline grid, tabular
numerals, letterspaced technical labels, and exactly three signal colors used only
for operational state.** The current prototype's Variant B board frame is the right
seed; it needs: rail-blue (not warm-dark) surface, hairline table instead of
rounded/glowing rows, technical German labels instead of English prose, signal-color
status semantics (green/red + strikethrough), and the aurora dialed back or dropped.
Material You survives only as the invisible theme mechanism underneath.

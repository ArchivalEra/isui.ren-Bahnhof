# MAP - Bahnhof wave engine: Rust->wasm WebGL theme transition

- map id: `wayfinder:map`
- created: 2026-08-23
- status: executing (user directive: rust->wasm, no compromise, full
  refresh rate on any machine)

## Destination

Theme switching stops being a DOM/CSS-filter animation (10fps on weak
machines; the SVG displacement filter rasterizes the whole viewport on
the CPU every frame) and becomes a WebGL2 engine driven by Rust->wasm:
both theme scenes are snapshotted to textures once, then a fragment
shader performs the radial reveal, the wobbled water rim (noise
displacement), the convex-lens refraction, and the rim highlight - all
per-pixel on the GPU at native refresh rate. CSS three-scene stack is
kept as the automatic fallback when WebGL2 is unavailable.

## Notes

- The "thousands of frames" ask physically means "always at the
  display's refresh rate" (60/120/144Hz); the engine target is
  frame-time headroom, not literal thousands.
- Snapshot path: SVG foreignObject rasterization of the live scene
  (from = current DOM; to = clone with the target's CSS vars swapped
  in). All styles inlined from document.styleSheets. Same-origin
  assets only - true for this site.
- The old CSS path stays as fallback; the engine is chosen at
  switch-time (WebGL2 probe), never at load.
- heart's toolchain conventions reused: wasm-bindgen pinned, prebuilt
  cli download in CI, build.sh one-shot.

## Decisions so far

- [Engine architecture locked](tickets/) — WebGL2 + foreignObject scene
  snapshots; fragment shader owns reveal/wobble/lens/crest; CPU advances
  one float per frame. CSS three-scene stack stays as the automatic
  fallback (WebGL2 probe at switch time).
- [Artifacts committed, CI stays Rust-free](tickets/) — generated wasm
  (web-ui/src/wave-wasm/) is committed to the repo so the deploy
  pipeline needs no Rust toolchain; rebuild locally via
  `web-wave/build.sh` when the crate changes.
- [Research landed](https://developer.chrome.com/blog/viewport-resize-behavior) —
  keyboard-float recipe from the VisualViewport study: universal JS path
  (layout bottom - visible bottom), rAF throttle, rotation debounce,
  pinch guard; interactive-widget and dvh rejected with reasons.

## Not yet specified

- WebGPU upgrade path (compute-based refraction) - only if WebGL2 ever
  proves insufficient.

## Out of scope

- Rewriting the whole page render in canvas. The board stays DOM;
  only the transition is engine-driven.

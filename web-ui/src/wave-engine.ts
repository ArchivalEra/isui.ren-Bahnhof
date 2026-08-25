// GPU theme-transition glue.
//
// Snapshot both theme scenes into canvases (SVG foreignObject
// rasterization - all live stylesheets are inlined so the snapshots
// render identically to the page), hand them to the wasm WebGL2 engine,
// and drive one eased reveal. The caller swaps the real DOM underneath
// right after start(): the fullscreen canvas covers the swap, so it is
// invisible. If anything is unavailable (no WebGL2, engine init
// failure) this reports null and the caller keeps its CSS path.
//
// The blacklist lesson applies here too: none of this machinery loads
// until the first theme switch - zero cost on initial page load.

export interface WaveRun {
  /** resolves when the animation finished and the canvas is removed */
  done: Promise<void>;
}

export function webgl2Available(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

let wasmReady: Promise<unknown> | null = null;
function ensureWasm(): Promise<unknown> {
  if (!wasmReady) wasmReady = import("./wave-wasm/bahnhof_wave.js").then((m) => m.default());
  return wasmReady;
}

function collectStyles(): string {
  let out = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      out += Array.from(sheet.cssRules).map((r) => r.cssText).join("\n") + "\n";
    } catch {
      /* cross-origin sheet - skip */
    }
  }
  return out;
}

/** Rasterize `node` into a viewport-sized canvas with `vars` applied as
 *  its inline custom properties (that is how themes are carried). */
async function rasterize(
  node: Element,
  vars: Record<string, string>,
  w: number,
  h: number,
): Promise<HTMLCanvasElement> {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.removeAttribute("class");
  clone.style.margin = "0";
  clone.style.width = `${w}px`;
  clone.style.height = `${h}px`;
  for (const [k, v] of Object.entries(vars)) clone.style.setProperty(k, v);

  const wrap = document.createElement("div");
  wrap.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const styleEl = document.createElement("style");
  styleEl.textContent = collectStyles();
  wrap.appendChild(styleEl);
  wrap.appendChild(clone);

  const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
  fo.setAttribute("width", "100%");
  fo.setAttribute("height", "100%");
  fo.appendChild(wrap);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.appendChild(fo);

  const img = new Image();
  img.src =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(new XMLSerializer().serializeToString(svg));
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

export async function waveEngineStart(opts: {
  stageNode: Element;
  fromVars: Record<string, string>;
  toVars: Record<string, string>;
  orb: { x: number; y: number };
  durationMs: number;
}): Promise<WaveRun | null> {
  if (!webgl2Available()) return null;
  try {
    await ensureWasm();
    const { WaveEngine } = await import("./wave-wasm/bahnhof_wave.js");

    const w = window.innerWidth;
    const h = window.innerHeight;
    const fromCanvas = await rasterize(opts.stageNode, opts.fromVars, w, h);
    const toCanvas = await rasterize(opts.stageNode, opts.toVars, w, h);

    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      zIndex: "90",
      pointerEvents: "none",
    } as CSSStyleDeclaration);

    // mount FIRST: the engine sizes its framebuffer from clientWidth/
    // clientHeight, which are zero for an unattached canvas - an invisible
    // engine is exactly the "no animation" bug this order once caused
    document.body.appendChild(canvas);
    const engine = WaveEngine.new(canvas, fromCanvas, toCanvas, opts.orb.x, opts.orb.y, 240);

    const maxR = engine.max_radius(opts.orb.x, opts.orb.y) * 1.02;
    const start = performance.now();

    let raf = 0;
    const done = new Promise<void>((resolve) => {
      const frame = () => {
        const t = Math.min(1, (performance.now() - start) / opts.durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        engine.frame(eased * maxR, (performance.now() - start) / 1000);
        if (t < 1) raf = requestAnimationFrame(frame);
        else {
          canvas.remove();
          resolve();
        }
      };
      raf = requestAnimationFrame(frame);
    });
    return { done };
  } catch (err) {
    console.warn("[wave-engine] unavailable, falling back to CSS transition:", err);
    return null;
  }
}

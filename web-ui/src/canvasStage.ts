// Progressive enhancement for the HTML-in-Canvas API (WICG/html-in-canvas,
// Chromium flag: chrome://flags/#canvas-draw-element).
//
// When supported, the board DOM becomes a `layoutsubtree` child of a
// <canvas>: each frame a `paint` event fires, we drawElementImage() the
// live DOM into the canvas and layer station effects (wave transitions,
// light beam) on top with real canvas compositing. Without support we
// render plain DOM - same markup, no canvas.

export interface HtmlInCanvasSupport {
  supported: boolean;
  reason?: string;
}

export function detectHtmlInCanvas(): HtmlInCanvasSupport {
  try {
    const c = document.createElement("canvas");
    if (!("layoutsubtree" in HTMLCanvasElement.prototype)) {
      return { supported: false, reason: "layoutsubtree attribute missing" };
    }
    const ctx = c.getContext("2d");
    if (!ctx || typeof (ctx as unknown as Record<string, unknown>).drawElementImage !== "function") {
      return { supported: false, reason: "drawElementImage missing on 2d context" };
    }
    return { supported: true };
  } catch (e) {
    return { supported: false, reason: String(e) };
  }
}

/** Experimental-API surface we rely on, typed locally. */
export interface ElementSnapshot {
  drawImageLike(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void;
}

type CanvasWithApi = HTMLCanvasElement & {
  layoutsubtree: boolean;
  requestPaint?(): void;
  captureElementImage?(el: HTMLElement): Promise<ElementSnapshot>;
};

export function asCanvasWithApi(c: HTMLCanvasElement): CanvasWithApi | null {
  if (!detectHtmlInCanvas().supported) return null;
  return c as CanvasWithApi;
}

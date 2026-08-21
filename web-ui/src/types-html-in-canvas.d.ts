// Ambient types for the HTML-in-Canvas API (WICG/html-in-canvas).
// Implemented behind chrome://flags/#canvas-draw-element; not yet in
// lib.dom, so we declare the surface we rely on.

interface ElementSnapshot {
  drawImageLike(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void;
}

interface CanvasRenderingContext2D {
  drawElementImage(
    el: Element,
    x?: number,
    y?: number,
    w?: number,
    h?: number
  ): void;
}

interface HTMLCanvasElement {
  layoutsubtree: boolean;
  requestPaint(): void;
  captureElementImage(el: Element): Promise<ElementSnapshot>;
}

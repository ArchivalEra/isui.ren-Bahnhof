/* tslint:disable */
/* eslint-disable */

/**
 * Handle handed back to JS: keep it alive for the duration of one theme
 * switch, call [`WaveEngine::frame`] each animation tick, then `drop()` it.
 */
export class WaveEngine {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * One frame. `r` is the eased reveal radius in px, `time_s` seconds
     * since switch start (drives the shimmer drift).
     */
    frame(r: number, time_s: number): void;
    /**
     * Max reveal radius for this viewport (corner distance from the orb),
     * so JS can ease t against a geometry-correct value.
     */
    max_radius(orb_x: number, orb_y: number): number;
    /**
     * Prepares GL state on the given canvas and uploads both snapshots.
     * Both snapshot sources must be plain canvases (the JS side
     * rasterizes its scene snapshots into canvases before calling).
     */
    static new(canvas: HTMLCanvasElement, from_source: HTMLCanvasElement, to_source: HTMLCanvasElement, orb_x: number, orb_y: number, band_px: number): WaveEngine;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_waveengine_free: (a: number, b: number) => void;
    readonly waveengine_frame: (a: number, b: number, c: number) => void;
    readonly waveengine_max_radius: (a: number, b: number, c: number) => number;
    readonly waveengine_new: (a: any, b: any, c: any, d: number, e: number, f: number) => [number, number, number];
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

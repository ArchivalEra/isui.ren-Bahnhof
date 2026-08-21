// Bahnhof — live departure board.
// Timetable is generated from the real clock (timetable.ts); a native
// <table> lays out the columns. Theme switching rides a WATER WAVE:
//
// - HTML-in-Canvas mode (flag on): the board DOM lives in a layoutsubtree
//   canvas; during the sweep the old frame stays as base, the recolored
//   live element is re-drawn in vertical strips behind the wave front with
//   sinusoidal displacement + magnification - text refracts like it is
//   seen through a convex water surface.
// - Fallback: a full-height band with backdrop-filter (SVG turbulence +
//   displacement) sweeps the page, wobbling the real content under it.
import { useEffect, useRef, useState } from "preact/hooks";
import { signal } from "@preact/signals";
import { profiles, currentId, currentProfile, setProfile } from "./theme";
import { generateTimetable, type Departure } from "./timetable";
import {
  detectHtmlInCanvas,
  asCanvasWithApi,
  type ElementSnapshot,
} from "./canvasStage";

const paused = signal(false);


/** Isolated live clock: re-renders itself every second, nothing else. */
function Clock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hm = t.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const sec = String(t.getSeconds()).padStart(2, "0");
  return (
    <span class="clock" aria-label={`Current time ${hm}:${sec}`}>
      {hm}
      <span class="sec" aria-hidden="true">
        :{sec}
      </span>
    </span>
  );
}

let wobbleDefsReady = false;
/** Inject (once) the turbulence+displacement filter used for the float. */
function ensureWobbleFilter(): string {
  const id = "bahnhof-float";
  if (wobbleDefsReady || document.getElementById(id)) {
    wobbleDefsReady = true;
    return `url(#${id})`;
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.innerHTML = `
    <filter id="${id}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.011 0.017" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap id="${id}-dm" in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
  document.body.appendChild(svg);
  wobbleDefsReady = true;
  return `url(#${id})`;
}

function StatusCell({ d }: { d: Departure }) {
  if (d.state === "boarding")
    return (
      <span class="status board">
        <span class="mark" aria-hidden="true">▌ </span>BOARDING
      </span>
    );
  if (d.state === "cancelled") return <span class="status cxl">CANCELLED</span>;
  if (d.state === "delay")
    return <span class="status del">+{d.delayMin}</span>;
  return <span class="status ok">ON TIME</span>;
}

export default function Board() {
  // board re-renders only when the minute rolls - the per-second clock is
  // isolated in <Clock/> so switching never triggers a full-board repaint
  const [minuteDate, setMinuteDate] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setMinuteDate((prev) => (prev.getMinutes() === d.getMinutes() ? prev : d));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const [support] = useState(detectHtmlInCanvas);

  // ?demo-wave=1: auto-trigger one theme wave after load (demo/test hook)
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("demo-wave")) return;
    const id = setTimeout(() => runThemeSwitch(), 400);
    return () => clearTimeout(id);
  }, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const domRef = useRef<HTMLDivElement>(null);
  const floodRef = useRef<HTMLCanvasElement>(null);
  const switching = useRef(false);

  // --- canvas paint loop (HTML-in-Canvas mode) ---
  useEffect(() => {
    if (!support.supported) return;
    const cv = canvasRef.current;
    const el = domRef.current;
    if (!cv || !el) return;
    const api = asCanvasWithApi(cv);
    if (!api) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.round(rect.width * dpr));
      cv.height = Math.max(1, Math.round((el.offsetHeight || rect.height) * dpr));
      api.requestPaint?.();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const onPaint = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cv.width / dpr, cv.height / dpr);
      ctx.drawElementImage(el);
      ctx.restore();
      api.requestPaint?.();
    };

    cv.addEventListener("paint", onPaint);
    api.requestPaint?.();
    return () => {
      cv.removeEventListener("paint", onPaint);
      ro.disconnect();
    };
  }, [support.supported]);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /**
   * Radial theme flood from an origin point: the page underneath flips to
   * the next profile immediately; a fixed overlay painted with the OLD
   * surface color gets an expanding destination-out hole cut from the
   * origin, so the new theme is revealed as a circular wave. The rim
   * carries the target color with a wobbled water lip.
   */
  async function runThemeSwitch(origin?: { x: number; y: number }): Promise<void> {
    if (switching.current) return;
    switching.current = true;
    try {
      const idx = profiles.findIndex((p) => p.id === currentId.value);
      const oldProfile = profiles[idx];
      const nextProfile = profiles[(idx + 1) % profiles.length];

      const reducedMotion =
        window.matchMedia("(prefers-color-scheme: reduce)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        setProfile(nextProfile.id);
        return;
      }

      const ov = floodRef.current;
      const ctx = ov?.getContext("2d");
      if (!ov || !ctx) {
        setProfile(nextProfile.id);
        return;
      }

      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? window.innerHeight / 2;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth;
      const H = window.innerHeight;
      ov.width = Math.round(W * dpr);
      ov.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ov.style.display = "block";

      // flip tokens first: the page under the overlay is already the target
      setProfile(nextProfile.id);

      // float: content wobbles through the water while the wave expands,
      // then settles crisp exactly when the flood covers the viewport
      const filterRef = ensureWobbleFilter();
      setWobble(true);
      const dm = document.querySelector(`#bahnhof-float-dm`);
      const wobbleStart = performance.now();
      const wobbleFrame = () => {
        if (!wobble) return;
        const dt = performance.now() - wobbleStart;
        (dm as SVGElement | null)?.setAttribute(
          "scale",
          String(Math.sin(Math.min(1, dt / EXPAND) * Math.PI) * 34)
        );
        if (dt < EXPAND) requestAnimationFrame(wobbleFrame);
      };
      requestAnimationFrame(wobbleFrame);

      const oldSurface = oldProfile.tokens["--surface"];
      const newSurface = nextProfile.tokens["--surface"];
      const maxR = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) * 1.06;
      const EXPAND = 700;
      const HOLD = 140;
      const FADE = 240;
      const start = performance.now();

      await new Promise<void>((resolve) => {
        const frame = () => {
          const total = performance.now() - start;
          ctx.clearRect(0, 0, W, H);

          if (total < EXPAND) {
            const t = total / EXPAND;
            const eased = 1 - Math.pow(1 - t, 3);
            const R = Math.max(1, eased * maxR);
            // old surface blanket
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = oldSurface;
            ctx.fillRect(0, 0, W, H);
            // expanding hole (soft lip)
            ctx.globalCompositeOperation = "destination-out";
            const hole = ctx.createRadialGradient(x, y, R * 0.88, x, y, R);
            hole.addColorStop(0, "rgba(0,0,0,1)");
            hole.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = hole;
            ctx.beginPath();
            ctx.arc(x, y, R, 0, Math.PI * 2);
            ctx.fill();

            // water lip in the TARGET color riding the rim, radius wobbling
            ctx.globalCompositeOperation = "source-over";
            const seg = 64;
            ctx.lineWidth = 22;
            ctx.lineCap = "round";
            ctx.strokeStyle = newSurface;
            ctx.beginPath();
            for (let i = 0; i <= seg; i++) {
              const th = (i / seg) * Math.PI * 2;
              const wob =
                1 +
                0.018 * Math.sin(th * 6 + total * 0.02) +
                0.01 * Math.sin(th * 11 - total * 0.03);
              const rr = R * wob;
              const px = x + Math.cos(th) * rr;
              const py = y + Math.sin(th) * rr;
              i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(255,255,255,0.55)";
            ctx.stroke();
            requestAnimationFrame(frame);
          } else if (total < EXPAND + HOLD + FADE) {
            if (wobble) {
              (dm as SVGElement | null)?.setAttribute("scale", "0");
              setWobble(false);
            }
            const t = (total - EXPAND) / (HOLD + FADE);
            // fully covered in target color, then fade out to show it for real
            ctx.globalAlpha = t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6;
            ctx.fillStyle = newSurface;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            requestAnimationFrame(frame);
          } else {
            ctx.clearRect(0, 0, W, H);
            ov.style.display = "none";
            resolve();
          }
        };
        requestAnimationFrame(frame);
      });
    } finally {
      switching.current = false;
    }
  }

  function ThemeOrb() {
    const cur = currentProfile();
    return (
      <button
        type="button"
        class="theme-orb"
        style={{ background: cur.tokens["--surface"] }}
        aria-label={`Switch theme (current: ${cur.label})`}
        title={`Switch theme (current: ${cur.label})`}
        onClick={(e) => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  runThemeSwitch({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
                }}
      >
        <span class="orb-half" aria-hidden="true" />
      </button>
    );
  }

  const updated = minuteDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const rows = generateTimetable(minuteDate);
  const [wobble, setWobble] = useState(false);

  const inner = (
    <>
      <header class="head">
        <h1>ISUI.REN — HAUPTBAHNHOF</h1>
        <div class="controls">
          <ThemeOrb />
          <Clock />
          <button
            type="button"
            class="toggle"
            aria-pressed={paused.value}
            aria-label={paused.value ? "Resume scrolling" : "Pause scrolling"}
            onClick={() => (paused.value = !paused.value)}
          >
            {paused.value ? "▶" : "⏸"}
          </button>
        </div>
      </header>

      <table class="board">
        <thead>
          <tr>
            <th scope="col">ZEIT</th>
            <th scope="col">ZUG</th>
            <th scope="col">NACH</th>
            <th scope="col">GLEIS</th>
            <th scope="col">STATUS</th>
            <th scope="col" class="remark-col">BEMERKUNG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={`${d.time}-${d.train}`} class={d.state === "boarding" ? "now" : ""}>
              <td class={d.state === "cancelled" ? "cxl" : ""}>{d.time}</td>
              <td>
                <span class={"badge b-" + d.train.replace(/\s+/g, "-").toLowerCase()}>
                  {d.train}
                </span>
              </td>
              <td>
                <a href={d.destHref}>{d.dest}</a>
              </td>
              <td>{d.platform}</td>
              <td><StatusCell d={d} /></td>
              <td class="remark-col">{d.remark ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer class="foot">AKTUALISIERT {updated} · SOLL/IST · LIVE</footer>
    </>
  );

  return (
    <>
      <canvas ref={floodRef} class="theme-flood" aria-hidden="true" />
      {support.supported ? (
        <canvas
          ref={canvasRef}
          {...({ layoutsubtree: true } as object)}
          class="stage-canvas"
        >
          <div ref={domRef} class={"wrap" + (wobble ? " wobbling" : "")}>
            {inner}
          </div>
        </canvas>
      ) : (
        <div class={"wrap" + (wobble ? " wobbling" : "")}>{inner}</div>
      )}
    </>
  );
}

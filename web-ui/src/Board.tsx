// Bahnhof — live departure board.
// The timetable is generated from the real clock (see timetable.ts) and
// rolls forward every minute; a native <table> lays out the columns.
//
// Theme switching: circular orb button. With the HTML-in-Canvas flag the
// switch paints a radial wave - the old frame is captured via
// captureElementImage(), tokens flip, then the live (recolored) board is
// circle-revealed from the click point on top of it. Without the flag we
// use the View Transitions API when present, else an instant switch.
import { useEffect, useRef, useState } from "preact/hooks";
import { signal, computed } from "@preact/signals";
import { profiles, currentId, currentProfile, setProfile } from "./theme";
import { generateTimetable, type Departure } from "./timetable";
import {
  detectHtmlInCanvas,
  asCanvasWithApi,
  type ElementSnapshot,
} from "./canvasStage";

const paused = signal(false);
const now = signal(new Date());

setInterval(() => {
  now.value = new Date();
}, 1000);

const timetable = computed(() => generateTimetable(now.value));
const clockHM = computed(() =>
  now.value.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
);

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

interface Wave {
  start: number;
  x: number;
  y: number;
  oldFrame: ElementSnapshot;
}

const DURATION = 650;

export default function Board() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const [support] = useState(detectHtmlInCanvas);

  // ?demo-flood=<profileId>: auto-trigger one flood after load (demo/test hook)
  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get("demo-flood");
    if (!target || !profiles.some((p) => p.id === target)) return;
    const id = setTimeout(() => {
      const prof = profiles.find((x) => x.id === target)!;
      startFlood(
        window.innerWidth / 2,
        window.innerHeight / 3,
        prof.tokens["--surface"]
      );
      setProfile(target);
    }, 400);
    return () => clearTimeout(id);
  }, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const domRef = useRef<HTMLDivElement>(null);
  const wave = useRef<Wave | null>(null);
  const floodRef = useRef<HTMLCanvasElement>(null);

  // --- canvas paint loop (only when HTML-in-Canvas is available) ---
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
      const W = cv.width / dpr;
      const H = cv.height / dpr;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);
      const w = wave.current;
      if (w && w.oldFrame) {
        // wave in progress: old frame everywhere, new frame circle-revealed
        try {
          w.oldFrame.drawImageLike(ctx, 0, 0, W, H);
        } catch {
          /* snapshot unusable - fall through to live draw */
          ctx.drawElementImage(el as never);
        }
        const t = Math.min(1, (performance.now() - w.start) / DURATION);
        const eased = 1 - Math.pow(1 - t, 3); // cubic out
        const maxR = Math.hypot(W, H) * 1.05;
        const R = Math.max(0.01, eased * maxR);
        ctx.save();
        ctx.beginPath();
        ctx.arc(w.x, w.y, R, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawElementImage(el as never);
        ctx.restore();
        // feathered leading edge of the wave
        const g = ctx.createRadialGradient(w.x, w.y, R * 0.86, w.x, w.y, R * 1.02);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.55, "rgba(255,255,255,0.28)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(w.x, w.y, R * 1.02, 0, Math.PI * 2);
        ctx.fill();
        if (t >= 1) wave.current = null;
      } else {
        ctx.drawElementImage(el as never);
      }
      ctx.restore();
      if (wave.current) api.requestPaint?.();
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

  async function cycleTheme(ev: MouseEvent) {
    const idx = profiles.findIndex((p) => p.id === currentId.value);
    const nextId = profiles[(idx + 1) % profiles.length].id;
    const next = profiles.find((p) => p.id === nextId)!;
    const x = ev.clientX || window.innerWidth / 2;
    const y = ev.clientY || window.innerHeight / 2;

    // full-page flood: overlay canvas washes the new surface color out
    // from the click point across the whole viewport while tokens flip
    // underneath. Works everywhere - no flag needed.
    if (!reducedMotion) startFlood(x, y, next.tokens["--surface"]);

    // board-local old-frame reveal stays as a bonus when the flag is on
    if (!reducedMotion && support.supported) {
      const cv = canvasRef.current;
      const el = domRef.current;
      const api = cv ? asCanvasWithApi(cv) : null;
      if (cv && el && api?.captureElementImage) {
        try {
          const oldFrame = await api.captureElementImage(el);
          wave.current = { start: performance.now(), x, y, oldFrame };
          setProfile(nextId);
          api.requestPaint?.();
          return;
        } catch {
          /* fall through */
        }
      }
    }
    setProfile(nextId);
  }

  function startFlood(x: number, y: number, color: string): void {
    const cv = floodRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv.style.display = "block";

    const maxR = Math.hypot(
      Math.max(x, W - x),
      Math.max(y, H - y)
    ) * 1.08;
    const start = performance.now();
    const D1 = 620; // flood expand
    const D2 = 260; // hold + fade

    const frame = () => {
      const total = performance.now() - start;
      ctx.clearRect(0, 0, W, H);
      if (total < D1) {
        const t = total / D1;
        const eased = 1 - Math.pow(1 - t, 3);
        const R = Math.max(0.01, eased * maxR);
        const g = ctx.createRadialGradient(x, y, R * 0.82, x, y, R);
        g.addColorStop(0, color);
        g.addColorStop(0.92, color);
        g.addColorStop(1, color + "00");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fill();
        requestAnimationFrame(frame);
      } else if (total < D1 + D2) {
        // fully covered: solid wash, then quick fade to reveal recolored UI
        const t = (total - D1) / D2;
        ctx.globalAlpha = t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W, H);
        cv.style.display = "none";
      }
    };
    requestAnimationFrame(frame);
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
        onClick={(e) => cycleTheme(e as unknown as MouseEvent)}
      >
        <span class="orb-half" aria-hidden="true" />
      </button>
    );
  }

  const hm = clockHM.value;
  const sec = String(now.value.getSeconds()).padStart(2, "0");
  const updated = now.value.toLocaleTimeString("de-DE");
  const rows = timetable.value;

  const inner = (
    <>
      <header class="head">
        <h1>ISUI.REN — HAUPTBAHNHOF</h1>
        <div class="controls">
          <ThemeOrb />
          <span class="clock" aria-label={`Current time ${hm}:${sec}`}>
            {hm}
            <span class="sec" aria-hidden="true">
              :{sec}
            </span>
          </span>
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

  const tree = (
    <>
      <canvas ref={floodRef} class="flood" aria-hidden="true" />
      {support.supported ? (
        <canvas
          ref={canvasRef}
          {...({ layoutsubtree: true } as object)}
          class="stage-canvas"
        >
          <div ref={domRef} class="wrap">
            {inner}
          </div>
        </canvas>
      ) : (
        <div class="wrap">{inner}</div>
      )}
    </>
  );
  return tree;
}

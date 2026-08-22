// Bahnhof — live departure board.
// Timetable is generated from the real clock (timetable.ts); a native
// <table> lays out the columns.
//
// Theme switching is a RADIAL WATER WAVE from the orb. Three stacked
// copies of the board are mounted for ~1s:
//   base  - old theme, everything outside the wave
//   band  - target colors + SVG displacement filter: text passing through
//           the rim refracts like it is under a convex water surface
//   inner - target colors, revealed inside the growing circle
// clip-path circles expand from the click point via rAF (refs only - no
// re-renders during the animation). When the wave covers the viewport the
// profile is committed and the extra layers collapse seamlessly: the
// remaining layer is pixel-identical to the single-page render.
import { useEffect, useRef, useState } from "preact/hooks";
import { signal } from "@preact/signals";
import { profiles, currentProfile, setProfile, type Profile } from "./theme";
import { generateTimetable, type Departure } from "./timetable";

const paused = signal(false);

const BAND_W = 220; // rim water width, px
const WAVE_MS = 950;

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
/** Inject (once) the turbulence+displacement filter used by the band. */
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
      <feDisplacementMap in="SourceGraphic" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G"/>
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

function varsOf(p: Profile): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.tokens)) o[k] = v;
  return o;
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

  const orbRef = useRef<HTMLButtonElement>(null);
  const toLayerRef = useRef<HTMLDivElement>(null);
  const bandLayerRef = useRef<HTMLDivElement>(null);
  const [switchAnim, setSwitchAnim] = useState<null | {
    from: Profile;
    to: Profile;
    cx: number;
    cy: number;
  }>(null);
  const switching = useRef(false);

  // ?demo-wave=1: auto-trigger one theme wave after load (demo/test hook)
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("demo-wave")) return;
    const id = setTimeout(() => runThemeSwitch(), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function orbOrigin(): { x: number; y: number } {
    const r = orbRef.current?.getBoundingClientRect();
    if (r) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  async function runThemeSwitch(): Promise<void> {
    if (switching.current) return;
    switching.current = true;
    try {
      const from = currentProfile();
      const idx = profiles.findIndex((p) => p.id === from.id);
      const to = profiles[(idx + 1) % profiles.length];
      const { x: cx, y: cy } = orbOrigin();

      if (reducedMotion) {
        setProfile(to.id);
        return;
      }

      ensureWobbleFilter();
      setSwitchAnim({ from, to, cx, cy });

      // wait for the three layers to mount
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );

      const maxR =
        Math.hypot(
          Math.max(cx, window.innerWidth - cx),
          Math.max(cy, window.innerHeight - cy)
        ) * 1.06;
      const start = performance.now();

      await new Promise<void>((resolve) => {
        const frame = () => {
          const t = Math.min(1, (performance.now() - start) / WAVE_MS);
          const eased = 1 - Math.pow(1 - t, 3);
          const R = Math.max(1, eased * maxR);
          const cpNew = `circle(${R}px at ${cx}px ${cy}px)`;
          const cpBand = `circle(${R + BAND_W}px at ${cx}px ${cy}px)`;
          if (toLayerRef.current) toLayerRef.current.style.clipPath = cpNew;
          if (bandLayerRef.current) bandLayerRef.current.style.clipPath = cpBand;
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });

      // commit: :root tokens + orb + storage; collapse is same-color
      setProfile(to.id);
      setSwitchAnim(null);
    } finally {
      switching.current = false;
    }
  }

  function ThemeOrb() {
    const cur = currentProfile();
    return (
      <button
        ref={orbRef}
        type="button"
        class="theme-orb"
        style={{ background: cur.tokens["--surface"] }}
        aria-label={`Switch theme (current: ${cur.label})`}
        title={`Switch theme (current: ${cur.label})`}
        onClick={() => runThemeSwitch()}
      >
        <span class="orb-half" aria-hidden="true" />
      </button>
    );
  }

  const updated = minuteDate.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const rows = generateTimetable(minuteDate);
  const cur = currentProfile();

  const content = (
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

  // --- switch animation: three stacked full-viewport layers ---
  if (switchAnim) {
    const { from, to, cx, cy } = switchAnim;
    const at = `at ${cx}px ${cy}px`;
    return (
      <div class="switch-stage">
        <div class="layer layer-from" style={varsOf(from)} aria-hidden="true">
          <div class="wrap">{content}</div>
        </div>
        <div
          class="layer layer-band"
          ref={bandLayerRef}
          style={{
            ...varsOf(to),
            clipPath: `circle(0px ${at})`,
            filter: "url(#bahnhof-float)",
          }}
          aria-hidden="true"
        >
          <div class="wrap">{content}</div>
        </div>
        <div
          class="layer layer-to"
          ref={toLayerRef}
          style={{ ...varsOf(to), clipPath: `circle(0px ${at})` }}
        >
          <div class="wrap">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div class="wrap" style={varsOf(cur)}>
      {content}
    </div>
  );
}

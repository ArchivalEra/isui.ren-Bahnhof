// Bahnhof — live departure board.
// Timetable is generated from the real clock (timetable.ts); a native
// <table> lays out the columns.
//
// Theme switching floods the WHOLE PAGE: the station hall (walls, floor,
// furniture) plus the board are one "scene". During a switch three stacked
// full-page scenes are mounted - old theme base, target colors riding the
// wobbled rim (SVG displacement), target colors revealed inside the
// growing circle from the orb. Everything crosses the arc together.
import { useEffect, useRef, useState, useLayoutEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import { profiles, currentProfile, setProfile, type Profile } from "./theme";
import { initialBoard, tickBoard, type Departure } from "./timetable";
import type { ComponentChildren } from "preact";

const paused = signal(false);

const BAND_W = 240; // rim water width, px
// ?wavespeed=ms overrides sweep duration - demo/test hook
const speedParam =
  typeof window !== "undefined"
    ? Number(new URLSearchParams(window.location.search).get("wavespeed"))
    : NaN;
const WAVE_MS = Number.isFinite(speedParam) && speedParam >= 200 ? speedParam : 1000;

// ?clock=seconds or ?clock=HH:MM[:SS] shifts station time - test hook
// for watching departures without waiting for the real schedule
const clockRaw =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("clock")
    : null;
const CLOCK_OFFSET = (() => {
  if (!clockRaw) return 0;
  if (clockRaw.includes(":")) {
    const parts = clockRaw.split(":").map(Number);
    const [h, m, s = 0] = parts;
    const base = new Date();
    const target = new Date(base);
    target.setHours(h, m, s, 0);
    return target.getTime() - base.getTime();
  }
  const secs = Number(clockRaw);
  return Number.isFinite(secs) && secs !== 0 ? secs * 1000 : 0;
})();
function stationNow(): Date {
  return new Date(Date.now() + CLOCK_OFFSET);
}

/** Isolated live clock: re-renders itself every second, nothing else. */
function Clock() {
  const [t, setT] = useState(stationNow);
  useEffect(() => {
    const id = setInterval(() => setT(stationNow()), 1000);
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
let wobbleMap: SVGFEDisplacementMapElement | null = null;
/** Inject (once) the turbulence+displacement filter used by the rim. */
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
    <filter id="${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.011 0.017" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="30" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
  document.body.appendChild(svg);
  wobbleMap = svg.querySelector("feDisplacementMap");
  wobbleDefsReady = true;
  return `url(#${id})`;
}

const WOBBLE_SCALE = 30;
/** The flood calms down as it reaches the far edges: displacement fades
 *  to zero over the last stretch so no frayed pixels can survive there. */
function wobbleScaleAt(t: number): number {
  const fadeStart = 0.78;
  if (t <= fadeStart) return WOBBLE_SCALE;
  return Math.max(0, WOBBLE_SCALE * (1 - (t - fadeStart) / (1 - fadeStart)));
}

function StatusCell({ d, boarding }: { d: Departure; boarding: boolean }) {
  if (d.state === "departed")
    return (
      <span class="status dep">
        <span class="mark" aria-hidden="true">▶ </span>DEPARTED
      </span>
    );
  if (d.state === "cancelled") return <span class="status cxl">CANCELLED</span>;
  if (boarding)
    return (
      <span class="status board">
        <span class="mark" aria-hidden="true">▌ </span>BOARDING
      </span>
    );
  if (d.state === "delay")
    return <span class="status del">+{d.delayMin}</span>;
  return <span class="status ok">ON TIME</span>;
}

function varsOf(p: Profile): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.tokens)) o[k] = v;
  return o;
}

/** Annulus as one nonzero-winding path: outer loop clockwise, inner loop
 *  counter-clockwise, so the middle winds to zero and clips away. */
function ringPath(cx: number, cy: number, rIn: number, rOut: number): string {
  const loop = (r: number, sweep: number) =>
    `M ${cx + r} ${cy} A ${r} ${r} 0 1 ${sweep} ${cx - r} ${cy} A ${r} ${r} 0 1 ${sweep} ${cx + r} ${cy} Z`;
  return `${loop(rOut, 1)} ${loop(Math.max(1, rIn), 0)}`;
}

interface SwitchAnim {
  from: Profile;
  to: Profile;
  cx: number;
  cy: number;
}

export default function Board() {
  // station time ticks every second; the queue advances with it
  const [now, setNow] = useState(stationNow);
  const [board, setBoard] = useState<Departure[]>(() => initialBoard(stationNow()));
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const prevIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      const t = stationNow();
      setNow(t);
      setBoard((prev) => tickBoard(prev, t).rows);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // FLIP: when leading rows leave, hold the survivors at their old
  // position for one frame, then glide them up into place
  useLayoutEffect(() => {
    const ids = board.map((d) => d.id);
    const prev = prevIdsRef.current;
    prevIdsRef.current = ids;
    if (!prev.length || !tbodyRef.current) return;

    let cut = 0;
    while (cut < prev.length && !ids.includes(prev[cut])) cut++;
    if (!cut) return;

    const kids = Array.from(tbodyRef.current.children) as HTMLElement[];
    const step = (kids[0]?.getBoundingClientRect().height ?? 41) * cut;
    for (const el of kids) {
      el.style.transition = "none";
      el.style.transform = `translateY(${step}px)`;
    }
    requestAnimationFrame(() => {
      for (const el of kids) {
        el.style.transition = "transform 420ms cubic-bezier(0.22, 0.9, 0.36, 1)";
        el.style.transform = "";
      }
    });
  }, [board]);

  const orbRef = useRef<HTMLButtonElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const [anim, setAnim] = useState<SwitchAnim | null>(null);
  const running = useRef(false);

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
    if (running.current) return;
    running.current = true;
    try {
      const from = currentProfile();
      const idx = profiles.findIndex((p) => p.id === from.id);
      const to = profiles[(idx + 1) % profiles.length];

      if (reducedMotion) {
        setProfile(to.id);
        return;
      }

      ensureWobbleFilter();
      const { x: cx, y: cy } = orbOrigin();
      setAnim({ from, to, cx, cy });

      // let the three scenes mount before driving the radius
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );

      const maxR =
        Math.hypot(
          Math.max(cx, window.innerWidth - cx),
          Math.max(cy, window.innerHeight - cy)
        ) * 1.06;
      const start = performance.now();

      // failsafe: whatever happens to the rAF loop, the wave always
      // completes and the layers always collapse - a stuck mid-state is
      // the one failure mode this UI must never show
      const commit = () => {
        setProfile(to.id);
        setAnim(null);
      };
      const failsafe = setTimeout(commit, WAVE_MS + 900);

      try {
        await new Promise<void>((resolve) => {
          const frame = () => {
          const t = Math.min(1, (performance.now() - start) / WAVE_MS);
          const eased = 1 - Math.pow(1 - t, 3);
          const R = Math.max(1, eased * maxR);
          const cpTo = `circle(${R}px at ${cx}px ${cy}px)`;
          // inner radius sits below the reveal edge so displacement can
          // never open a gap between the water ring and the revealed disc
          const cpBand = `path("${ringPath(cx, cy, R - 24, R + BAND_W)}")`;
          if (toRef.current) toRef.current.style.clipPath = cpTo;
          if (bandRef.current) bandRef.current.style.clipPath = cpBand;
          wobbleMap?.setAttribute("scale", String(wobbleScaleAt(t)));
            if (t < 1) requestAnimationFrame(frame);
            else resolve();
          };
          requestAnimationFrame(frame);
        });
      } finally {
        clearTimeout(failsafe);
      }

      commit();
    } finally {
      running.current = false;
    }
  }

  function ThemeOrb({ profile }: { profile: Profile }) {
    return (
      <button
        ref={orbRef}
        type="button"
        class="theme-orb"
        style={{ background: "var(--surface)" }}
        aria-label={`Switch theme (current: ${profile.label})`}
        title={`Switch theme (current: ${profile.label})`}
        onClick={() => runThemeSwitch()}
      >
        <span class="orb-half" aria-hidden="true" />
      </button>
    );
  }

  const updated = now.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  // boarding is a display state: only the front row, and only when it
  // genuinely departs within the next two minutes
  const front = board[0];
  const frontBoards =
    !!front &&
    front.state !== "cancelled" &&
    front.state !== "departed" &&
    front.departsAtMs - now.getTime() <= 120_000;
  const cur = currentProfile();

  /** One complete page: hall + furniture + board. */
  function Scene({ profile }: { profile: Profile }) {
    return (
      <div class="scene-body" style={varsOf(profile)}>
        <div class="hall">
          {/* floor */}
          <div class="decor-floor" />
          {/* waiting bench */}
          <svg class="decor decor-bench" viewBox="0 0 220 110" width="220" height="110">
            <rect x="18" y="8" width="184" height="7" rx="3" fill="var(--on-surface-variant)" opacity=".55" />
            <rect x="26" y="4" width="8" height="52" rx="3" fill="var(--outline)" />
            <rect x="186" y="4" width="8" height="52" rx="3" fill="var(--outline)" />
            <rect x="10" y="52" width="200" height="12" rx="5" fill="var(--surface-container)" />
            <rect x="30" y="64" width="9" height="42" rx="3" fill="var(--outline)" />
            <rect x="181" y="64" width="9" height="42" rx="3" fill="var(--outline)" />
            <rect x="24" y="98" width="21" height="5" rx="2" fill="var(--outline)" opacity=".6" />
            <rect x="175" y="98" width="21" height="5" rx="2" fill="var(--outline)" opacity=".6" />
          </svg>
          {/* tall plant right */}
          <svg class="decor decor-plant-r" viewBox="0 0 120 170" width="120" height="170">
            <ellipse cx="60" cy="34" rx="14" ry="30" fill="var(--signal-ok)" transform="rotate(-18 60 34)" />
            <ellipse cx="44" cy="46" rx="11" ry="26" fill="var(--signal-ok)" transform="rotate(-38 44 46)" opacity=".85" />
            <ellipse cx="78" cy="44" rx="11" ry="27" fill="var(--signal-ok)" transform="rotate(16 78 44)" opacity=".9" />
            <ellipse cx="60" cy="28" rx="9" ry="26" fill="var(--signal-ok)" opacity=".75" />
            <path d="M60 58 C58 84 56 96 50 112 L70 112 C64 96 62 84 60 58 Z" fill="var(--signal-ok)" opacity=".55" />
            <path d="M40 112 H80 L74 158 Q60 164 46 158 Z" fill="var(--signal-warn)" />
            <rect x="37" y="108" width="46" height="9" rx="3" fill="var(--signal-warn)" />
          </svg>
          {/* small plant left */}
          <svg class="decor decor-plant-l" viewBox="0 0 90 120" width="90" height="120">
            <ellipse cx="45" cy="34" rx="11" ry="24" fill="var(--signal-ok)" transform="rotate(-14 45 34)" />
            <ellipse cx="32" cy="46" rx="9" ry="20" fill="var(--signal-ok)" transform="rotate(-36 32 46)" opacity=".85" />
            <ellipse cx="59" cy="44" rx="9" ry="21" fill="var(--signal-ok)" transform="rotate(15 59 44)" opacity=".9" />
            <path d="M45 60 C43 76 42 84 38 94 L52 94 C48 84 47 76 45 60 Z" fill="var(--signal-ok)" opacity=".55" />
            <path d="M31 94 H59 L54 116 Q45 121 36 116 Z" fill="var(--signal-warn)" />
            <rect x="29" y="91" width="32" height="7" rx="3" fill="var(--signal-warn)" />
          </svg>
        </div>
        <div class="wrap">
          <header class="head">
            <h1>ISUI.REN — HAUPTBAHNHOF</h1>
            <div class="controls">
              <ThemeOrb profile={profile} />
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
            <tbody ref={tbodyRef}>
              {board.map((d, i) => {
                const boarding = i === 0 && frontBoards;
                const leaving =
                  d.state === "departed" ||
                  (d.state === "cancelled" && !!d.removalAt);
                return (
                  <tr
                    key={d.id}
                    class={leaving ? "gone" : boarding ? "now" : ""}
                  >
                    <td class={d.state === "cancelled" ? "cxl" : ""}>
                      <span>{d.time}</span>
                    </td>
                    <td>
                      <span class={"badge b-" + d.train.replace(/\s+/g, "-").toLowerCase()}>
                        {d.train}
                      </span>
                    </td>
                    <td>
                      <a href={d.destHref}>{d.dest}</a>
                    </td>
                    <td>
                      <span>{d.platform}</span>
                    </td>
                    <td><StatusCell d={d} boarding={boarding} /></td>
                    <td class="remark-col">
                      <span>{d.remark ?? ""}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <footer class="foot">AKTUALISIERT {updated} · SOLL/IST · LIVE</footer>
        </div>
      </div>
    );
  }

  // --- switch: three stacked full-page scenes ---
  if (anim) {
    const at = `at ${anim.cx}px ${anim.cy}px`;
    return (
      <>
        <div class="scene scene-from" style={varsOf(anim.from)} aria-hidden="true">
          <Scene profile={anim.from} />
        </div>
        {/* filter lives on the wrapper so it displaces the ALREADY clipped
            ring - both rim edges come out wobbled, not compass-drawn */}
        <div class="scene scene-band" style={varsOf(anim.to)} aria-hidden="true">
          <div
            class="band-clip"
            ref={bandRef}
            style={{ clipPath: `circle(0px ${at})` }}
          >
            <Scene profile={anim.to} />
          </div>
        </div>
        <div
          class="scene scene-to"
          ref={toRef}
          style={{ ...varsOf(anim.to), clipPath: `circle(0px ${at})` }}
        >
          <Scene profile={anim.to} />
        </div>
      </>
    );
  }

  return <Scene profile={cur} />;
}

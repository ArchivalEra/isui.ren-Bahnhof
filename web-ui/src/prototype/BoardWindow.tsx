// BoardWindow — the board-on-a-wall window. This is the architecture the
// user demanded after rejecting v3: NO page-level scrollbars ever; the
// page is a station hall, and each board is a WINDOW whose content scrolls
// INSIDE the window. Edge hot-zones steer scrolling: mouse near the bottom
// edge = horizontal scroll, near the right edge = vertical scroll.
//
// Scales to fit any screen (phone .. 8K): s = clamp(availW/baseW, 0.6, 2.5).
// Below 1 the window may be wider than the viewport on phones — it docks
// left and scrolls horizontally inside the window. Above 1 (big screens)
// content scales up crisply.
//
// Scroll math: .bw-scroll scrolls a .bw-fill that occupies the VISUAL
// dimensions (baseW*s x contentH*s), while .bw-stage holds the design-size
// content and transform: scale(s). Scrollbar range == visual range.
import { useEffect, useRef, useState } from "preact/hooks";

interface BoardWindowProps {
  baseW: number;
  label?: string;
  children: preact.ComponentChildren;
}

export default function BoardWindow({ baseW, label, children }: BoardWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(1);
  const [contentH, setContentH] = useState(0);
  const [canH, setCanH] = useState(false);
  const [canV, setCanV] = useState(false);
  const [winH, setWinH] = useState(320);

  // scale to fit viewport width, with sane phone floor and big-screen cap
  useEffect(() => {
    const fit = () => {
      const avail = Math.max(280, window.innerWidth - 48);
      setS(Math.min(Math.max(avail / baseW, 0.6), 2.5));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [baseW]);

  // measure design content height, track overflow flags, clamp window height
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stageRef.current) return;
    const measure = () => {
      setContentH(stageRef.current!.offsetHeight);
      setWinH(Math.min(stageRef.current!.offsetHeight * s + 2, window.innerHeight * 0.92));
      setCanH(el.scrollWidth > el.clientWidth + 2);
      setCanV(el.scrollHeight > el.clientHeight + 2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stageRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [s]);

  // edge hot-zones: wheel redirected to the zone's axis (non-passive)
  const drag = useRef<{ axis: "x" | "y"; sx: number; sy: number; sl: number; st: number } | null>(null);

  useEffect(() => {
    const zones = document.querySelectorAll<HTMLElement>("[data-bw-zone]");
    const onWheel = (e: WheelEvent) => {
      const zone = (e.currentTarget as HTMLElement).dataset.bwZone as "x" | "y";
      const el = scrollRef.current;
      if (!el) return;
      if (zone === "x") el.scrollLeft += e.deltaY + e.deltaX;
      else el.scrollTop += e.deltaY;
    };
    const opts = { passive: false } as AddEventListenerOptions;
    zones.forEach((z) => z.addEventListener("wheel", onWheel, opts));
    return () => zones.forEach((z) => z.removeEventListener("wheel", onWheel));
  }, [canH, canV]);

  const zoneDown = (axis: "x" | "y") => (e: MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { axis, sx: e.clientX, sy: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
  };
  const zoneMove = (e: MouseEvent) => {
    const d = drag.current;
    const el = scrollRef.current;
    if (!d || !el) return;
    if (d.axis === "x") el.scrollLeft = d.sl - (e.clientX - d.sx);
    else el.scrollTop = d.st - (e.clientY - d.sy);
  };
  const zoneUp = () => {
    drag.current = null;
  };

  return (
    <div className="bw" style={{ width: baseW * s }}>
      <div className="bw-wrap" style={{ width: baseW * s, height: winH }}>
        <div
          ref={scrollRef}
          className="bw-scroll"
          style={{ width: baseW * s, height: winH }}
          onMouseUp={zoneUp}
          onMouseLeave={zoneUp}
        >
          <div className="bw-fill" style={{ width: baseW * s, height: contentH * s }}>
            <div ref={stageRef} className="bw-stage" style={{ transform: `scale(${s})`, width: baseW }}>
              {children}
            </div>
          </div>
        </div>

        {canH && (
          <div
            className="bw-zone bw-zone-bottom"
            data-bw-zone="x"
            onMouseDown={zoneDown("x")}
            onMouseMove={zoneMove}
          >
            <span className="bw-arrows">◄ ►</span>
          </div>
        )}
        {canV && (
          <div
            className="bw-zone bw-zone-right"
            data-bw-zone="y"
            onMouseDown={zoneDown("y")}
            onMouseMove={zoneMove}
          >
            <span className="bw-arrows">▲ ▼</span>
          </div>
        )}
      </div>
      {label && <div className="bw-label">{label}</div>}
    </div>
  );
}

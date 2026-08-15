// PROTOTYPE switcher: floating bottom bar, ?variant= URL param, arrow keys.
// Hidden in production builds (the bar must never ship).
import { useEffect } from "preact/hooks";

const VARIANTS = [
  { key: "a", name: "Platform map" },
  { key: "b", name: "Departure board" },
  { key: "c", name: "Ticket wall" },
] as const;

export default function PrototypeSwitcher({
  current,
  onSwitch,
}: {
  current: string;
  onSwitch: (v: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const idx = VARIANTS.findIndex((v) => v.key === current);
      const next = e.key === "ArrowRight" ? (idx + 1) % VARIANTS.length : (idx - 1 + VARIANTS.length) % VARIANTS.length;
      onSwitch(VARIANTS[next].key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, onSwitch]);

  const idx = VARIANTS.findIndex((v) => v.key === current);
  const label = VARIANTS[idx];

  return (
    <div className="proto-bar" role="navigation" aria-label="prototype variants">
      <button onClick={() => onSwitch(VARIANTS[(idx - 1 + VARIANTS.length) % VARIANTS.length].key)} aria-label="previous variant">←</button>
      <span className="proto-label">
        {label ? `${label.key.toUpperCase()} — ${label.name}` : current} <em>· prototype</em>
      </span>
      <button onClick={() => onSwitch(VARIANTS[(idx + 1) % VARIANTS.length].key)} aria-label="next variant">→</button>
    </div>
  );
}

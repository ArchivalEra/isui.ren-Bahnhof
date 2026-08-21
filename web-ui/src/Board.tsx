// Bahnhof — live departure board.
// The timetable is generated from the real clock (see timetable.ts) and
// rolls forward every minute; a native <table> lays out the columns.
import { useEffect, useState } from "preact/hooks";
import { signal, computed } from "@preact/signals";
import { profiles, currentId, currentProfile, setProfile } from "./theme";
import { generateTimetable } from "./timetable";

const paused = signal(false);
const now = signal(new Date());

setInterval(() => {
  now.value = new Date();
}, 1000);

const timetable = computed(() => generateTimetable(now.value));
const clockHM = computed(() =>
  now.value.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
);

function ThemePicker() {
  return (
    <select
      class="theme-picker"
      aria-label="Theme profile"
      value={currentId.value}
      onChange={(e) => setProfile((e.target as HTMLSelectElement).value)}
    >
      {profiles.map((p) => (
        <option key={p.id} value={p.id}>
          {p.label}
        </option>
      ))}
    </select>
  );
}

function StatusCell({ d }: { d: ReturnType<typeof generateTimetable>[number] }) {
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
  const [, setTick] = useState(0);
  // keep seconds display alive (signals cover minute-level changes)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const hm = clockHM.value;
  const sec = String(now.value.getSeconds()).padStart(2, "0");
  const updated = now.value.toLocaleTimeString("de-DE");
  const rows = timetable.value;

  return (
    <div class="wrap">
      <header class="head">
        <h1>ISUI.REN — HAUPTBAHNHOF</h1>
        <div class="controls">
          <ThemePicker />
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
    </div>
  );
}

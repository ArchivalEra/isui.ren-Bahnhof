// Bahnhof — live departure board.
// Native <table>: browsers lay out columns natively, no flex/grid fights.
import { useEffect, useState } from "preact/hooks";
import { signal, computed } from "@preact/signals";
import { profiles, currentId, currentProfile, setProfile } from "./theme";
import { departures, destHref, songs } from "./data";

const paused = signal(false);
const now = signal(new Date());

setInterval(() => {
  now.value = new Date();
}, 1000);

const clockHM = computed(() =>
  now.value.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
);

function statusText(note: string): string {
  if (note === "on time") return "ON TIME";
  if (note === "cancelled") return "CANCELLED";
  if (note === "now boarding") return "BOARDING";
  return note; // "+6" style codes pass through
}

function statusClass(note: string): string {
  if (note === "cancelled") return "cxl";
  if (note.startsWith("+")) return "del";
  if (note === "now boarding") return "board";
  return "ok";
}

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

export default function Board() {
  const [, tick] = useState(0);
  // re-render once per second via the shared interval
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const hm = clockHM.value;
  const sec = String(now.value.getSeconds()).padStart(2, "0");
  const updated = now.value.toLocaleTimeString("de-DE");
  const heard = songs.filter((s) => s.status === "listened").length;
  const profile = currentProfile();

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

      <table class="board" data-profile={profile.id}>
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
        <tbody class={paused.value ? "paused" : ""}>
          {departures.map((d) => (
            <tr key={d.time + d.train} class={d.note === "now boarding" ? "now" : ""}>
              <td class={d.note === "cancelled" ? "cxl" : ""}>{d.time}</td>
              <td>
                <span class={"badge b-" + d.train.replace(/\s+/g, "-").toLowerCase()}>{d.train}</span>
              </td>
              <td>
                <a href={destHref(d.dest)}>{d.dest}</a>
              </td>
              <td>{d.platform}</td>
              <td class={"status " + statusClass(d.note)}>
                {d.note === "now boarding" && <span class="mark" aria-hidden="true">▌ </span>}
                {statusText(d.note)}
              </td>
              <td class="remark-col">{d.remark ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer class="foot">
        AKTUALISIERT {updated} · SOLL/IST · {songs.length} LIEDER · {heard} GEHOERT
      </footer>
    </div>
  );
}

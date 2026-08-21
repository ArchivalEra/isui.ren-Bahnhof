// Bahnhof — live departure board (winner: B). A single board-on-a-wall:
// BoardShell handles the window layout; Board renders the departure board.
import { useEffect, useState } from "preact/hooks";
import BoardShell from "../components/BoardShell";
import ProfileSwitcher from "../theme/Switcher";
import { departures, songs, stations } from "./data";

function statusClass(note: string): string {
  if (note === "cancelled") return "cxl";
  if (note.startsWith("+")) return "del";
  return "ok";
}

function statusText(note: string): string {
  if (note === "on time") return "ON TIME";
  if (note === "cancelled") return "CANCELLED";
  if (note === "now boarding") return "BOARDING";
  return note; // "+6" style short codes pass through
}

function Row({ d, now }: { d: (typeof departures)[number]; now?: boolean }) {
  return (
    <div className={"v-b row" + (now ? " now" : "")} role="row">
      <span className={"v-b time" + (statusClass(d.note) === "cxl" ? " cxl" : "")} role="cell">{d.time}</span>
      <span className={"v-b badge " + d.train.replace(/\s+/g, "-").toLowerCase()} role="cell">{d.train}</span>
      <span className="v-b dest" role="cell">{d.dest}</span>
      <span className="v-b plat" role="cell">{d.platform}</span>
      <span className={"v-b status " + statusClass(d.note)} role="cell">
        {now && <span className="v-b mark" aria-hidden="true">▌</span>}
        {statusText(d.note)}
      </span>
      <span className="v-b bem" role="cell">{d.bem}</span>
    </div>
  );
}

const SCROLL_ROWS = departures.slice(0, 12);

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Board() {
  const heard = songs.filter((s) => s.status === "listened").length;
  const next = departures[0];
  const now = useNow();
  const clockHM = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const clockSec = String(now.getSeconds()).padStart(2, "0");
  const updatedAt = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <BoardShell baseW={1280} label="ZUGANZEIGER · GLEIS 1–3">
      <div className="v-b">
        <div className="v-b board" role="table" aria-label="Departure board">
          <div className="v-b board-title">
            <span className="v-b brand">ISUI.REN — HAUPTBAHNHOF</span>
            <ProfileSwitcher />
            <span className="v-b clock" aria-live="off">
              {clockHM}
              <span className="v-b clock-sec">:{clockSec}</span>
            </span>
          </div>
          <div className="v-b board-cols" role="row">
            <span role="columnheader">ZEIT</span>
            <span role="columnheader">ZUG</span>
            <span role="columnheader">NACH</span>
            <span role="columnheader">GLEIS</span>
            <span role="columnheader">STATUS</span>
            <span role="columnheader">BEMERKUNG</span>
          </div>

          <div className="v-b now-bar" aria-label="Next departure">
            <Row d={next} now />
          </div>

          <div
            className="v-b marquee"
            tabIndex={0}
            aria-label="Upcoming departures, auto-scrolling. Hover or focus to pause"
          >
            <div className="v-b marquee-inner">
              {[...SCROLL_ROWS, ...SCROLL_ROWS].map((d, i) => (
                <Row d={d} key={d.time + i} />
              ))}
            </div>
          </div>

          <div className="v-b foot">AKTUALISIERT {updatedAt} · SOLL/IST · {stations.length} BAHNSTEIGE · {songs.length} LIEDER · {heard} GEHÖRT</div>
        </div>
      </div>
    </BoardShell>
  );
}

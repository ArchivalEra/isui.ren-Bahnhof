// Bahnhof — live departure board (winner: B). A single board-on-a-wall:
// fixed-ratio window (BoardWindow) inside a station hall, no page scrollbars.
import BoardWindow from "./BoardWindow";
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
    <div className={"v-b row" + (now ? " now" : "")}>
      <span className={"v-b time" + (statusClass(d.note) === "cxl" ? " cxl" : "")}>{d.time}</span>
      <span className={"v-b badge " + d.train.replace(/\s+/g, "-").toLowerCase()}>{d.train}</span>
      <span className="v-b dest">{d.dest}</span>
      <span className="v-b plat">{d.platform}</span>
      <span className={"v-b status " + statusClass(d.note)}>
        {now && <span className="v-b mark">▌</span>}
        {statusText(d.note)}
      </span>
      <span className="v-b bem">{d.bem}</span>
    </div>
  );
}

const SCROLL_ROWS = departures.slice(0, 12);

export default function Board() {
  const heard = songs.filter((s) => s.status === "listened").length;
  const next = departures[0]; // the next departure highlights the now row
  return (
    <BoardWindow baseW={1280} label="ZUGANZEIGER · GLEIS 1–3">
      <div className="v-b" style={{ width: 1280 }}>
        <div className="v-b board">
          <div className="v-b board-title">
            <span className="v-b brand">ISUI.REN — HAUPTBAHNHOF</span>
            <span className="v-b clock">
              09:12<span className="v-b clock-sec">:04</span>
            </span>
          </div>
          <div className="v-b board-cols">
            <span>ZEIT</span>
            <span>ZUG</span>
            <span>NACH</span>
            <span>GLEIS</span>
            <span>STATUS</span>
            <span>BEMERKUNG</span>
          </div>

          {/* fixed "now" row: the next departure, always visible */}
          <div className="v-b now-bar">
            <Row d={next} now />
          </div>

          {/* auto-scrolling rows (two copies, seamless marquee) */}
          <div className="v-b marquee">
            <div className="v-b marquee-inner">
              {[...SCROLL_ROWS, ...SCROLL_ROWS].map((d, i) => (
                <Row d={d} key={d.time + i} />
              ))}
            </div>
          </div>

          <div className="v-b foot">AKTUALISIERT 09:12:04 · SOLL/IST · {stations.length} BAHNSTEIGE · {songs.length} LIEDER · {heard} GEHÖRT</div>
        </div>
      </div>
    </BoardWindow>
  );
}

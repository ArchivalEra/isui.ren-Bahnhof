// Variant A — "Platform": the home page is a real platform, end to end.
// One long narrow window (1200x400): a departure-board-style header, a
// platform edge running across, three direction signs (HOME/BLOG/
// SONG-WALL) standing on the platform like real station exit signs, and
// the track below. No card stack — a physical place.
import BoardWindow from "./BoardWindow";

const SIGNS = [
  { name: "HOME", sub: "DER ANFANG", dir: "←", pos: 120, w: 180 },
  { name: "BLOG", sub: "DIE NOTIZEN", dir: "→", pos: 480, w: 180 },
  { name: "SONG-WALL", sub: "DIE LIEDER", dir: "→", pos: 850, w: 230 },
] as const;

export default function VariantA() {
  return (
    <BoardWindow baseW={1200} label="BAHNSTEIG 1 · HAUPTBAHNHOF">
      <div className="v-a" style={{ width: 1200 }}>
        <div className="v-a head">
          <div className="v-a sign">
            <span className="v-a sign-name">BAHNHOF</span>
            <span className="v-a sign-sub">ISUI.REN · HAUPTBAHNHOF</span>
          </div>
          <div className="v-a clock">
            <span className="v-a clock-time">09:12</span>
            <span className="v-a clock-mark">●</span>
          </div>
        </div>

        {/* the platform edge, running the full width */}
        <div className="v-a platform">
          <div className="v-a platform-edge" aria-hidden="true">
            <span className="v-a platform-num">GLEIS 1</span>
            <span className="v-a platform-line" />
          </div>

          {/* direction signs standing on the platform */}
          {SIGNS.map((s) => (
            <button className="v-a signpost" key={s.name} style={{ left: s.pos, width: s.w }}>
              <span className="v-a signpost-dir">{s.dir}</span>
              <span className="v-a signpost-text">
                <span className="v-a signpost-name">{s.name}</span>
                <span className="v-a signpost-sub">{s.sub}</span>
              </span>
            </button>
          ))}
        </div>

        {/* the track below the platform */}
        <div className="v-a track" aria-hidden="true">
          <span className="v-a track-line" />
        </div>
      </div>
    </BoardWindow>
  );
}

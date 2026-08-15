// Variant C — "Ticket strip" (LIEDERWAND): one continuous strip of wide
// tickets, like a roll of tear-off tickets. Each ticket: square cover,
// title/description, TICKET NO. on top; tickets connect via a vertical
// perforation column, papers colored at random (configurable later). The
// strip overflows the window to the right -> horizontal scroll inside.
import BoardWindow from "./BoardWindow";
import { songs, coverFor, paperFor, type Song } from "./data";

function Ticket({ song, no }: { song: Song; no: number }) {
  const paper = song.paper ?? paperFor(no);
  return (
    <article className="v-c ticket" style={{ background: paper }}>
      <div className="v-c t-cover" style={{ background: coverFor(no) }} aria-hidden="true" />
      <div className="v-c t-body">
        <span className="v-c t-no">TICKET NO.{String(no).padStart(3, "0")}</span>
        <span className="v-c t-title">{song.title}</span>
        <span className="v-c t-desc">
          {song.artist} · {song.album} · {song.year}
        </span>
        <span className="v-c t-why">"{song.why}"</span>
      </div>
      {/* vertical perforation: the tear-off line between tickets */}
      <div className="v-c t-perf" aria-hidden="true" />
    </article>
  );
}

export default function VariantC() {
  return (
    <BoardWindow baseW={1500} label="LIEDERWAND · FAHRKARTENSTREIFEN">
      <div className="v-c" style={{ width: 1500 }}>
        <header className="v-c head">
          <span className="v-c head-name">LIEDERWAND</span>
          <span className="v-c head-sub">FAHRKARTEN ZUM HÖREN</span>
        </header>
        <div className="v-c strip-track" aria-hidden="true" />
        <div className="v-c strip">
          {songs.map((s, i) => (
            <Ticket key={s.title} song={s} no={i + 1} />
          ))}
          {/* the torn end of the roll */}
          <div className="v-c roll-end" aria-hidden="true" />
        </div>
      </div>
    </BoardWindow>
  );
}

// Bahnhof — live departure board (winner: B).
// Single-page board-on-a-wall: one fixed-ratio window (BoardWindow) inside
// a station hall. No route switching, no A/C variants on this page.
import { render } from "preact";
import "./board/styles.css";
import { initTheme } from "./theme";
import Board from "./board/Board";

initTheme();

function App() {
  return (
    <>
      <div className="hall" aria-hidden="true">
        <div className="hall-wall" />
        <div className="hall-phosphor" />
        <div className="hall-beam" />
      </div>
      <Board />
    </>
  );
}

render(<App />, document.getElementById("app")!);

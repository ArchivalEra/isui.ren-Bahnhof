// Bahnhof — live departure board. Entry point.
import { render } from "preact";
import "./styles.css";
import { initTheme } from "./theme";
import { HallDecor } from "./HallDecor";
import Board from "./Board";

initTheme();

function App() {
  return (
    <>
      <div class="hall" aria-hidden="true">
        <HallDecor />
      </div>
      <Board />
    </>
  );
}

render(<App />, document.getElementById("app")!);

// Bahnhof — live departure board. Entry point.
import { render } from "preact";
import "./styles.css";
import { initTheme } from "./theme";
import Board from "./Board";

initTheme();
render(<Board />, document.getElementById("app")!);

// PROTOTYPE — Bahnhof visual direction. Throwaway route, not production.
// Question: what should Bahnhof's "realistic station" look like?
// 3 structurally-different variants, switchable via ?variant=a|b|c
// (floating bottom bar + arrow keys). v3: each variant is a FIXED-RATIO
// physical screen (WindowStage) hanging on a station-hall wall — the
// heart-school fix for the responsiveness hell.
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import "./prototype/styles.css";
import { initTheme } from "./theme";
import VariantA from "./prototype/VariantA";
import VariantB from "./prototype/VariantB";
import VariantC from "./prototype/VariantC";
import PrototypeSwitcher from "./prototype/Switcher";

initTheme();

function useVariant(): [string, (v: string) => void] {
  const [variant, setVariant] = useState(
    () => new URLSearchParams(window.location.search).get("variant") ?? "a"
  );
  const navigate = useCallback((v: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", v);
    window.history.replaceState(null, "", url);
    setVariant(v);
  }, []);
  return [variant, navigate];
}

function App() {
  const [variant, navigate] = useVariant();
  return (
    <>
      <div className="hall" aria-hidden="true">
        <div className="hall-wall" />
        <div className="hall-phosphor" />
        <div className="hall-beam" />
      </div>
      {variant === "a" && <VariantA />}
      {variant === "b" && <VariantB />}
      {variant === "c" && <VariantC />}
      <PrototypeSwitcher current={variant} onSwitch={navigate} />
    </>
  );
}

render(<App />, document.getElementById("app")!);

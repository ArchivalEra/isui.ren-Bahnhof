// PROTOTYPE theme: Material You palette as the invisible mechanism only.
// Visual anchor = station operations language (see station-operations
// visual research): rail-blue board surfaces, signal-color status codes.
// MCU generates accessible light/dark palettes; the seed is BVG rail blue.
import { argbFromHex, themeFromSourceColor, applyTheme } from "@material/material-color-utilities";

// BVG rail blue — the anchor hue, not amber anymore.
export const SEED = argbFromHex("#0664AB");

export function initTheme(): void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    const theme = themeFromSourceColor(SEED);
    applyTheme(theme, { target: document.documentElement, dark: mq.matches });
    document.documentElement.style.colorScheme = mq.matches ? "dark" : "light";
  };
  apply();
  mq.addEventListener("change", apply);
}

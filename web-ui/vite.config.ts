import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// Production: built with base "/Bahnhof/" so EdgeOne's zero-config
// serves isui.ren/Bahnhof/* from the deploy branch without routing.
// Dev server ignores base and serves at "/".
export default defineConfig({
  base: "/Bahnhof/",
  plugins: [preact()],
  build: {
    outDir: "dist",
    target: "es2020",
    assetsInlineLimit: 0,
  },
});

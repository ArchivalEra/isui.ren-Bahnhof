import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// PROTOTYPE phase: plain CSR static build (zero server). Final Bahnhof build
// will set base: "/Bahnhof/" when it joins heart's deploy branch.
export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: "dist",
    target: "es2020",
    assetsInlineLimit: 0,
  },
});

import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";

/**
 * Electron shell for the web app. Vite still emits a tiny static `dist/` so the
 * linked Vercel project (spaltertech-site-desktop) has a valid Output Directory
 * — previously the build only produced JS assets with no index.html and failed CI.
 */
export default defineConfig({
  build: {
    rollupOptions: {
      input: path.join(__dirname, "index.html"),
    },
  },
  plugins: [
    electron({
      main: {
        entry: "electron/main.ts",
      },
      preload: {
        input: path.join(__dirname, "electron/preload.ts"),
      },
    }),
  ],
  server: {
    allowedHosts: true,
  },
});

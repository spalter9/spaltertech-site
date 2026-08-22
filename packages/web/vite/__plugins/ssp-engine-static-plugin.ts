import type { Plugin } from "vite";

/** Serve the standalone SSP Engine suite at /ssp-engine/ (directory index). */
export default function sspEngineStaticPlugin(): Plugin {
  return {
    name: "ssp-engine-static",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url?.split("?")[0];
        if (url === "/ssp-engine" || url === "/ssp-engine/") {
          req.url = "/ssp-engine/index.html";
        }
        next();
      });
    },
  };
}

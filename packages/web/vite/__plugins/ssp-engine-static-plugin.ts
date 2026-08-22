import type { Connect, Plugin } from "vite";

const SSP_ENGINE_BASE = "/ssp-engine";

/** Serve the standalone SSP Engine suite at /ssp-engine/ (directory index). */
function sspEngineMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const [pathname, search = ""] = (req.url ?? "").split("?");
    const query = search ? `?${search}` : "";

    if (pathname === SSP_ENGINE_BASE) {
      res.statusCode = 308;
      res.setHeader("Location", `${SSP_ENGINE_BASE}/${query}`);
      res.end();
      return;
    }

    if (pathname === `${SSP_ENGINE_BASE}/`) {
      req.url = `${SSP_ENGINE_BASE}/index.html${query}`;
    }

    next();
  };
}

export default function sspEngineStaticPlugin(): Plugin {
  const attach = (server: { middlewares: Connect.Server }) => {
    server.middlewares.use(sspEngineMiddleware());
  };

  return {
    name: "ssp-engine-static",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

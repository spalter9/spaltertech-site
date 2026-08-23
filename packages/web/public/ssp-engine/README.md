# Surreal Engine — local launch

Do **not** open `index.html` with Safari via File → Open. AudioWorklet requires HTTP.

## One command (from repo root)

```bash
bun run preview:ssp-engine
```

Then open in Safari / Chrome:

- http://127.0.0.1:8790/
- or http://localhost:8790/ssp-engine/

Passcode: `8888` (also `SPALTER`, `SSP2026`)

## Files in this folder

| File | Purpose |
|------|---------|
| `index.html` | Passcode gate + deck UI |
| `style.css` | Cyan-on-dark theme |
| `app.js` | Audio graph + visualizer |
| `surrealProcessor.js` | AudioWorklet M/S processor |

## Custom port

```bash
SSP_ENGINE_PORT=9000 bun run preview:ssp-engine
```

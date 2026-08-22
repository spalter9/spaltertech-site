"use strict";

/** Valid passcodes — aligned with root app gateway */
const VALID_CODES = new Set(["8888", "SPALTER", "SSP2026"]);

/** DOM refs */
const gate = document.getElementById("passcode-gate");
const passcodeForm = document.getElementById("passcode-form");
const passcodeInput = document.getElementById("passcode-input");
const passcodeError = document.getElementById("passcode-error");
const app = document.getElementById("app");
const deckStatus = document.getElementById("deck-status");
const modeDisplay = document.getElementById("mode-display");
const vizCanvas = document.getElementById("viz-canvas");
const vizFps = document.getElementById("viz-fps");
const btnInit = document.getElementById("btn-init");
const btnHalt = document.getElementById("btn-halt");
const masterGainSlider = document.getElementById("master-gain");
const gainValue = document.getElementById("gain-value");

const ctx2d = vizCanvas.getContext("2d");

/** Web Audio graph */
let audioCtx = null;
let masterGain = null;
let analyser = null;
let sourceNodes = [];
let rafId = null;
let engineRunning = false;
let frameCount = 0;
let lastFpsTime = performance.now();

// ── Passcode gate ──────────────────────────────────────────────

function unlockApp() {
  gate.style.pointerEvents = "none";
  gate.classList.add("gate-unlock");
  gate.setAttribute("aria-hidden", "true");
  app.hidden = false;
  modeDisplay.textContent = "Standby";
  window.setTimeout(() => {
    gate.hidden = true;
  }, 480);
}

passcodeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = passcodeInput.value.trim();
  const normalized = raw.toUpperCase();
  const ok = VALID_CODES.has(normalized) || raw === "8888";

  if (!ok) {
    passcodeError.hidden = false;
    passcodeInput.classList.add("gate-shake");
    passcodeInput.value = "";
    setTimeout(() => passcodeInput.classList.remove("gate-shake"), 450);
    passcodeInput.focus();
    return;
  }

  passcodeError.hidden = true;
  unlockApp();
});

passcodeInput.addEventListener("input", () => {
  passcodeError.hidden = true;
});

// ── Status helpers ─────────────────────────────────────────────

function setDeckStatus(online) {
  deckStatus.textContent = online ? "Online" : "Offline";
  deckStatus.classList.toggle("status-online", online);
  deckStatus.classList.toggle("status-offline", !online);
}

function setMode(mode) {
  modeDisplay.textContent = mode;
}

// ── Visualizer ─────────────────────────────────────────────────

function drawVisualizer() {
  if (!analyser) {
    rafId = requestAnimationFrame(drawVisualizer);
    return;
  }

  const bufferLength = analyser.frequencyBinCount;
  const data = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(data);

  const w = vizCanvas.width;
  const h = vizCanvas.height;

  ctx2d.fillStyle = "#0B0B0B";
  ctx2d.fillRect(0, 0, w, h);

  const barWidth = (w / bufferLength) * 2.4;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = data[i] / 255;
    const barHeight = v * h * 0.92;

    const grad = ctx2d.createLinearGradient(0, h, 0, h - barHeight);
    grad.addColorStop(0, "#8A6D34");
    grad.addColorStop(0.5, "#C5A059");
    grad.addColorStop(1, "#E4C989");

    ctx2d.fillStyle = grad;
    ctx2d.fillRect(x, h - barHeight, barWidth - 1, barHeight);

    x += barWidth;
    if (x > w) break;
  }

  // Hairline grid
  ctx2d.strokeStyle = "rgba(197,160,89,0.08)";
  ctx2d.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = (h / 4) * i;
    ctx2d.beginPath();
    ctx2d.moveTo(0, y);
    ctx2d.lineTo(w, y);
    ctx2d.stroke();
  }

  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    vizFps.textContent = `${frameCount} fps`;
    frameCount = 0;
    lastFpsTime = now;
  }

  rafId = requestAnimationFrame(drawVisualizer);
}

function startVisualizer() {
  if (rafId) cancelAnimationFrame(rafId);
  frameCount = 0;
  lastFpsTime = performance.now();
  drawVisualizer();
}

function stopVisualizerIdle() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  ctx2d.fillStyle = "#0B0B0B";
  ctx2d.fillRect(0, 0, vizCanvas.width, vizCanvas.height);
  ctx2d.strokeStyle = "rgba(197,160,89,0.15)";
  ctx2d.lineWidth = 1;
  ctx2d.strokeRect(0.5, 0.5, vizCanvas.width - 1, vizCanvas.height - 1);
  vizFps.textContent = "— fps";
}

// ── DSP chain ──────────────────────────────────────────────────

function buildDemoSources(ctx, destination) {
  const nodes = [];

  // Sub bass
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = 55;
  const g1 = ctx.createGain();
  g1.gain.value = 0.35;
  osc1.connect(g1);
  g1.connect(destination);
  osc1.start();
  nodes.push(osc1);

  // Mid harmonic
  const osc2 = ctx.createOscillator();
  osc2.type = "triangle";
  osc2.frequency.value = 220;
  const g2 = ctx.createGain();
  g2.gain.value = 0.12;
  osc2.connect(g2);
  g2.connect(destination);
  osc2.start();
  nodes.push(osc2);

  // High shimmer via filtered noise
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 3200;
  bandpass.Q.value = 1.2;

  const g3 = ctx.createGain();
  g3.gain.value = 0.06;

  noise.connect(bandpass);
  bandpass.connect(g3);
  g3.connect(destination);
  noise.start();
  nodes.push(noise);

  // LFO modulating a peaking EQ for movement
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.25;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 800;
  const peaking = ctx.createBiquadFilter();
  peaking.type = "peaking";
  peaking.frequency.value = 1200;
  peaking.gain.value = 6;
  peaking.Q.value = 2;

  lfo.connect(lfoGain);
  lfoGain.connect(peaking.frequency);
  lfo.start();

  osc2.disconnect();
  osc2.connect(peaking);
  peaking.connect(g2);

  return nodes;
}

async function initEngine() {
  if (engineRunning) return;

  btnInit.disabled = true;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = parseFloat(masterGainSlider.value);

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.82;

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;

    sourceNodes = buildDemoSources(audioCtx, compressor);
    compressor.connect(analyser);
    analyser.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    engineRunning = true;
    setDeckStatus(true);
    setMode("Master DSP Active");
    btnHalt.disabled = false;
    btnInit.disabled = true;
    startVisualizer();
  } catch (err) {
    console.error("[Surreal Engine] init failed:", err);
    setMode("Init Error");
    btnInit.disabled = false;
    haltEngine();
  }
}

function haltEngine() {
  sourceNodes.forEach((node) => {
    try {
      node.stop();
      node.disconnect();
    } catch {
      /* already stopped */
    }
  });
  sourceNodes = [];

  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }

  masterGain = null;
  analyser = null;
  engineRunning = false;

  setDeckStatus(false);
  setMode("Halted");
  btnInit.disabled = false;
  btnHalt.disabled = true;
  stopVisualizerIdle();
}

btnInit.addEventListener("click", initEngine);
btnHalt.addEventListener("click", haltEngine);

masterGainSlider.addEventListener("input", () => {
  const val = parseFloat(masterGainSlider.value);
  gainValue.textContent = val.toFixed(2);
  if (masterGain) {
    masterGain.gain.setTargetAtTime(val, audioCtx.currentTime, 0.02);
  }
});

// Idle canvas on load (behind gate)
stopVisualizerIdle();

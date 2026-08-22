"use strict";

const VALID_CODES = new Set(["8888", "SPALTER", "SSP2026"]);
const WORKLET_MODULE = "surrealProcessor.js";
const WORKLET_PROCESSOR = "surreal-master-processor";

const authGate = document.getElementById("auth-gate");
const mainApp = document.getElementById("main-app");
const passcodeForm = document.getElementById("passcode-form");
const passcodeInput = document.getElementById("passcode-input");
const errorMsg = document.getElementById("error-msg");
const statusIndicator = document.getElementById("status-indicator");
const modeDisplay = document.getElementById("mode-display");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const masterGainInput = document.getElementById("masterGain");
const masterGainValue = document.getElementById("masterGainValue");
const audioFileInput = document.getElementById("audioFile");
const canvas = document.getElementById("dspCanvas");
const ctx = canvas.getContext("2d");

let audioCtx = null;
let masterGain = null;
let analyser = null;
let surrealProcessor = null;
let sourceNodes = [];
let oscillators = [];
let uploadedBuffer = null;
let animationId = null;
let running = false;

function resizeCanvas() {
  const box = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(box.clientWidth * dpr);
  canvas.height = Math.floor(box.clientHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function showError(show) {
  errorMsg.classList.toggle("error-hidden", !show);
  errorMsg.classList.toggle("error-visible", show);
}

function setStatus(online, mode) {
  statusIndicator.textContent = online ? "Online" : "Offline";
  statusIndicator.className = online ? "status-online" : "status-offline";
  modeDisplay.textContent = mode;
}

function updateMasterGainLabel() {
  if (masterGainValue) {
    masterGainValue.textContent = `${Math.round(Number(masterGainInput.value) * 100)}%`;
  }
}

function drawIdleFrame() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
}

function drawVisualizer() {
  if (!analyser || !running) return;

  const bufferLength = analyser.frequencyBinCount;
  const data = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(data);

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const barWidth = w / bufferLength;
  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (data[i] / 255) * h;
    const intensity = data[i] / 255;
    const g = Math.floor(180 + intensity * 75);
    ctx.fillStyle = `rgb(0, ${g}, 255)`;
    ctx.fillRect(i * barWidth, h - barHeight, Math.max(barWidth - 1, 1), barHeight);
  }

  animationId = requestAnimationFrame(drawVisualizer);
}

function connectStereoDemoSource(merger) {
  const leftFreqs = [55, 220];
  const rightFreqs = [82.5, 330];
  const total = leftFreqs.length + rightFreqs.length;
  const level = 0.12 / total;

  leftFreqs.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = i % 2 === 0 ? "sine" : "triangle";
    osc.frequency.value = freq;
    gain.gain.value = level;
    osc.connect(gain);
    gain.connect(merger, 0, 0);
    osc.start();
    oscillators.push({ osc, gain });
  });

  rightFreqs.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = i % 2 === 0 ? "triangle" : "sine";
    osc.frequency.value = freq;
    gain.gain.value = level;
    osc.connect(gain);
    gain.connect(merger, 0, 1);
    osc.start();
    oscillators.push({ osc, gain });
  });
}

function connectUploadedSource() {
  const source = audioCtx.createBufferSource();
  source.buffer = uploadedBuffer;
  source.loop = true;

  if (uploadedBuffer.numberOfChannels === 1) {
    const merger = audioCtx.createChannelMerger(2);
    source.connect(merger, 0, 0);
    source.connect(merger, 0, 1);
    merger.connect(surrealProcessor);
  } else {
    source.connect(surrealProcessor);
  }

  source.start();
  sourceNodes.push(source);
}

function teardownAudio() {
  oscillators.forEach(({ osc, gain }) => {
    try {
      if (audioCtx) gain.gain.setValueAtTime(0, audioCtx.currentTime);
      osc.stop();
    } catch {
      /* already stopped */
    }
  });
  oscillators = [];

  sourceNodes.forEach((source) => {
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
  });
  sourceNodes = [];

  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }

  masterGain = null;
  analyser = null;
  surrealProcessor = null;
}

async function buildDspChain() {
  if (audioCtx) return;

  audioCtx = new AudioContext();

  try {
    await audioCtx.audioWorklet.addModule(WORKLET_MODULE);
  } catch (err) {
    await audioCtx.close();
    audioCtx = null;
    throw new Error(`AudioWorklet module failed to load (${WORKLET_MODULE}): ${err.message}`);
  }

  surrealProcessor = new AudioWorkletNode(audioCtx, WORKLET_PROCESSOR, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  });

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.75;

  masterGain = audioCtx.createGain();
  masterGain.gain.value = Number(masterGainInput.value);

  // Routing: WorkletNode -> Analyser -> MasterGain -> Destination
  surrealProcessor.connect(analyser);
  analyser.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  if (uploadedBuffer) {
    connectUploadedSource();
  } else {
    const merger = audioCtx.createChannelMerger(2);
    connectStereoDemoSource(merger);
    merger.connect(surrealProcessor);
  }
}

async function startEngine() {
  playBtn.disabled = true;

  try {
    await buildDspChain();
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    running = true;
    stopBtn.disabled = false;
    audioFileInput.disabled = true;

    const sourceLabel = uploadedBuffer ? "File Upload" : "Stereo Demo";
    setStatus(true, `DSP Chain: Active — M/S Artifact Cleaner (${sourceLabel})`);

    cancelAnimationFrame(animationId);
    drawVisualizer();
  } catch (err) {
    teardownAudio();
    running = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    audioFileInput.disabled = false;
    setStatus(false, "DSP Chain: Worklet load failed");
    drawIdleFrame();
    throw err;
  }
}

function haltEngine() {
  running = false;
  cancelAnimationFrame(animationId);
  teardownAudio();

  playBtn.disabled = false;
  stopBtn.disabled = true;
  audioFileInput.disabled = false;
  setStatus(false, "DSP Chain: Standby");
  drawIdleFrame();
}

passcodeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = passcodeInput.value.trim();
  const code = raw.toUpperCase();
  const ok = VALID_CODES.has(code);

  if (!ok) {
    showError(true);
    passcodeInput.value = "";
    passcodeInput.focus();
    return;
  }

  showError(false);
  authGate.classList.add("hidden");
  mainApp.classList.remove("hidden");
  resizeCanvas();
  drawIdleFrame();
});

playBtn.addEventListener("click", () => {
  startEngine().catch((err) => console.error(err));
});

stopBtn.addEventListener("click", haltEngine);

masterGainInput.addEventListener("input", () => {
  updateMasterGainLabel();
  if (masterGain) {
    masterGain.gain.value = Number(masterGainInput.value);
  }
});

audioFileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) {
    uploadedBuffer = null;
    setStatus(false, "DSP Chain: Standby");
    return;
  }

  if (running) {
    audioFileInput.value = "";
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const tempCtx = new AudioContext();
    uploadedBuffer = await tempCtx.decodeAudioData(arrayBuffer);
    await tempCtx.close();
    setStatus(false, `Source loaded: ${file.name}`);
  } catch (err) {
    console.error(err);
    uploadedBuffer = null;
    audioFileInput.value = "";
    setStatus(false, "Source load failed — using stereo demo");
  }
});

window.addEventListener("resize", () => {
  resizeCanvas();
  if (!running) drawIdleFrame();
});

passcodeInput.focus();
updateMasterGainLabel();
resizeCanvas();
drawIdleFrame();

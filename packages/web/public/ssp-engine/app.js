"use strict";

const VALID_CODES = new Set(["8888", "SPALTER", "SSP2026"]);

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
const canvas = document.getElementById("dspCanvas");
const ctx = canvas.getContext("2d");

let audioCtx = null;
let masterGain = null;
let analyser = null;
let oscillators = [];
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

passcodeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = passcodeInput.value.trim();
  const code = raw.toUpperCase();
  const ok = VALID_CODES.has(code) || raw === "8888";

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

function setStatus(online, mode) {
  statusIndicator.textContent = online ? "Online" : "Offline";
  statusIndicator.className = online ? "status-online" : "status-offline";
  modeDisplay.textContent = mode;
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
    const r = Math.floor(intensity * 0);
    const g = Math.floor(180 + intensity * 75);
    const b = 255;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(i * barWidth, h - barHeight, Math.max(barWidth - 1, 1), barHeight);
  }

  animationId = requestAnimationFrame(drawVisualizer);
}

function buildDspChain() {
  if (audioCtx) return;

  audioCtx = new AudioContext();
  masterGain = audioCtx.createGain();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  masterGain.gain.value = Number(masterGainInput.value);
  masterGain.connect(analyser);
  analyser.connect(audioCtx.destination);

  const freqs = [55, 110, 220, 440];
  freqs.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = i % 2 === 0 ? "sine" : "triangle";
    osc.frequency.value = freq;
    gain.gain.value = 0.08 / freqs.length;
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    oscillators.push({ osc, gain });
  });
}

async function startEngine() {
  buildDspChain();
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  running = true;
  playBtn.disabled = true;
  stopBtn.disabled = false;
  setStatus(true, "DSP Chain: Active");
  cancelAnimationFrame(animationId);
  drawVisualizer();
}

function haltEngine() {
  running = false;
  cancelAnimationFrame(animationId);

  oscillators.forEach(({ osc, gain }) => {
    try {
      if (audioCtx) gain.gain.setValueAtTime(0, audioCtx.currentTime);
      osc.stop();
    } catch {
      /* already stopped */
    }
  });
  oscillators = [];

  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
    masterGain = null;
    analyser = null;
  }

  playBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus(false, "DSP Chain: Standby");
  drawIdleFrame();
}

playBtn.addEventListener("click", () => {
  startEngine().catch(console.error);
});
stopBtn.addEventListener("click", haltEngine);

masterGainInput.addEventListener("input", () => {
  if (masterGain) {
    masterGain.gain.value = Number(masterGainInput.value);
  }
});

window.addEventListener("resize", () => {
  resizeCanvas();
  if (!running) drawIdleFrame();
});

passcodeInput.focus();
resizeCanvas();
drawIdleFrame();

// Runs in the hidden recorder window. Captures mono mic audio while the
// hotkey is held, then encodes it to 16 kHz PCM16 WAV and hands the bytes
// to the main process.
//
// The MediaStream is opened once and kept alive so recording starts
// instantly on keydown (Windows shows the mic-in-use indicator while the
// app runs — that's the honest tradeoff for sub-100ms start).

import { encodeWav } from '../core/wavEncoder.js';

const MIN_DURATION_S = 0.3; // shorter taps are accidental presses
const MAX_DURATION_S = 60;  // PRD scopes utterances to <30s; hard-stop at 60

let audioContext = null;
let sourceNode = null;
let processorNode = null;
let chunks = [];
let recording = false;
let startedAt = 0;

async function ensureStream() {
  if (audioContext) return;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  audioContext = new AudioContext();
  sourceNode = audioContext.createMediaStreamSource(stream);
  // ScriptProcessorNode is deprecated but dependency-free and fine for v1.
  processorNode = audioContext.createScriptProcessor(4096, 1, 1);
  processorNode.onaudioprocess = (e) => {
    if (!recording) return;
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    if ((chunks.length * 4096) / audioContext.sampleRate > MAX_DURATION_S) {
      recording = false; // stuck hotkey guard; finish on the real keyup
    }
  };
  sourceNode.connect(processorNode);
  processorNode.connect(audioContext.destination);
}

window.miniflow.onStart(async () => {
  try {
    await ensureStream();
    await audioContext.resume();
    chunks = [];
    recording = true;
    startedAt = performance.now();
  } catch (err) {
    recording = false;
    window.miniflow.sendWav(new ArrayBuffer(0), `Microphone error: ${err.message}`);
  }
});

window.miniflow.onStop(() => {
  recording = false;
  const duration = (performance.now() - startedAt) / 1000;
  if (!audioContext || duration < MIN_DURATION_S || chunks.length === 0) {
    chunks = [];
    window.miniflow.sendWav(new ArrayBuffer(0), null); // nothing useful
    return;
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const samples = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    samples.set(c, offset);
    offset += c.length;
  }
  chunks = [];
  const wav = encodeWav(samples, audioContext.sampleRate, 16_000);
  window.miniflow.sendWav(wav, null);
});

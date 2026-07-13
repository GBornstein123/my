// Encodes captured Float32 PCM into a 16 kHz mono 16-bit WAV — exactly what
// whisper.cpp expects and small enough that cloud upload stays fast
// (~32 KB/s: a 30s utterance is under 1 MB).
//
// Pure functions, no Node/browser APIs, so they run in the renderer (live
// capture) and in tests unchanged.

/** Average-pool resample. Fine for speech; not for music. */
export function downsample(samples, fromRate, toRate) {
  if (fromRate === toRate) return Float32Array.from(samples);
  if (fromRate < toRate) {
    throw new Error(`Cannot upsample ${fromRate} -> ${toRate}`);
  }
  const ratio = fromRate / toRate;
  const outLength = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), samples.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += samples[j];
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

export function floatTo16BitPCM(samples) {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/**
 * @param {Float32Array} samples mono PCM in [-1, 1]
 * @param {number} sampleRate of `samples`
 * @param {number} targetRate WAV output rate (default 16 kHz)
 * @returns {ArrayBuffer} complete RIFF/WAVE file
 */
export function encodeWav(samples, sampleRate, targetRate = 16_000) {
  const resampled = downsample(samples, sampleRate, targetRate);
  const pcm = floatTo16BitPCM(resampled);
  const dataSize = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);            // PCM chunk size
  view.setUint16(20, 1, true);             // audio format: linear PCM
  view.setUint16(22, 1, true);             // channels: mono
  view.setUint32(24, targetRate, true);    // sample rate
  view.setUint32(28, targetRate * 2, true); // byte rate
  view.setUint16(32, 2, true);             // block align
  view.setUint16(34, 16, true);            // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < pcm.length; i++) {
    view.setInt16(44 + i * 2, pcm[i], true);
  }
  return buffer;
}

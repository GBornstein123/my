import { describe, it, expect } from 'vitest';
import { encodeWav, downsample, floatTo16BitPCM } from '../src/core/wavEncoder.js';

describe('wav encoder (what the recorder hands to whisper)', () => {
  it('produces a valid 16kHz mono PCM16 RIFF header', () => {
    const oneSecond = new Float32Array(48_000).fill(0.5);
    const wav = new DataView(encodeWav(oneSecond, 48_000, 16_000));

    const tag = (o) => String.fromCharCode(
      wav.getUint8(o), wav.getUint8(o + 1), wav.getUint8(o + 2), wav.getUint8(o + 3));
    expect(tag(0)).toBe('RIFF');
    expect(tag(8)).toBe('WAVE');
    expect(wav.getUint16(20, true)).toBe(1);       // linear PCM
    expect(wav.getUint16(22, true)).toBe(1);       // mono
    expect(wav.getUint32(24, true)).toBe(16_000);  // sample rate
    expect(wav.getUint16(34, true)).toBe(16);      // bits per sample
    // 1s at 48k downsampled to 16k -> 16k samples -> 32k bytes of data
    expect(wav.getUint32(40, true)).toBe(32_000);
    expect(wav.byteLength).toBe(44 + 32_000);
  });

  it('downsamples 3:1 by averaging', () => {
    const out = downsample(Float32Array.from([0, 0.3, 0.6, 1, 1, 1]), 48_000, 16_000);
    expect(out.length).toBe(2);
    expect(out[0]).toBeCloseTo(0.3, 5);
    expect(out[1]).toBeCloseTo(1, 5);
  });

  it('passes audio through when rates match', () => {
    const input = Float32Array.from([0.1, -0.2, 0.3]);
    expect(Array.from(downsample(input, 16_000, 16_000))).toEqual([
      expect.closeTo(0.1, 5), expect.closeTo(-0.2, 5), expect.closeTo(0.3, 5),
    ]);
  });

  it('refuses to upsample', () => {
    expect(() => downsample(new Float32Array(4), 8_000, 16_000)).toThrow(/upsample/);
  });

  it('clamps float samples outside [-1, 1]', () => {
    const pcm = floatTo16BitPCM(Float32Array.from([2, -2, 0, 1, -1]));
    expect(pcm[0]).toBe(0x7fff);
    expect(pcm[1]).toBe(-0x8000);
    expect(pcm[2]).toBe(0);
    expect(pcm[3]).toBe(0x7fff);
    expect(pcm[4]).toBe(-0x8000);
  });
});

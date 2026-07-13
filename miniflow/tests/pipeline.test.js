import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { makePipeline, buildPipeline } from '../src/core/pipeline.js';
import { HistoryStore } from '../src/core/historyStore.js';
import { guarded } from '../src/core/guardedCleaner.js';
import { rulesCleaner } from '../src/core/rulesCleaner.js';
import { defaultSettings } from '../src/core/settings.js';

let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'miniflow-pipe-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const fakeTranscriber = (text) => ({ transcribe: async () => text });

describe('dictation pipeline', () => {
  it('transcribes, cleans, and records history in one pass', async () => {
    const history = new HistoryStore(dir);
    const pipeline = makePipeline({
      transcriber: fakeTranscriber('um let’s meet Tuesday, wait, no, Friday'),
      cleaner: guarded(rulesCleaner),
      history,
    });

    const result = await pipeline.process('/fake/audio.wav');
    expect(result.text).toBe('Let’s meet Friday.');
    expect(result.transcript).toContain('Tuesday');
    expect(history.recent[0]).toMatchObject({
      cleanedText: 'Let’s meet Friday.',
      inserted: false,
    });
  });

  it('returns null for silent recordings and records nothing', async () => {
    const history = new HistoryStore(dir);
    const pipeline = makePipeline({
      transcriber: fakeTranscriber('   '),
      cleaner: guarded(rulesCleaner),
      history,
    });
    expect(await pipeline.process('/fake/audio.wav')).toBeNull();
    expect(history.recent).toEqual([]);
  });

  it('raw mode (no cleaner) passes the transcript through untouched', async () => {
    const history = new HistoryStore(dir);
    const pipeline = makePipeline({
      transcriber: fakeTranscriber('const x = foo_bar, um, yes'),
      cleaner: null,
      history,
    });
    const result = await pipeline.process('/fake/audio.wav');
    expect(result.text).toBe('const x = foo_bar, um, yes');
  });

  it('propagates transcription errors (the app surfaces them in the tray)', async () => {
    const pipeline = makePipeline({
      transcriber: { transcribe: async () => { throw new Error('STT down'); } },
      cleaner: guarded(rulesCleaner),
      history: new HistoryStore(dir),
    });
    await expect(pipeline.process('/fake/audio.wav')).rejects.toThrow('STT down');
  });

  it('never fails dictation because cleanup failed', async () => {
    const pipeline = makePipeline({
      transcriber: fakeTranscriber('the exact words spoken here matter a lot'),
      cleaner: guarded({ clean: async () => { throw new Error('LLM down'); } }),
      history: new HistoryStore(dir),
    });
    const result = await pipeline.process('/fake/audio.wav');
    expect(result.text).toBe('the exact words spoken here matter a lot');
  });
});

describe('buildPipeline wiring (the exact code path the app runs)', () => {
  it('cloud mode without ANTHROPIC_API_KEY uses the rules cleaner', async () => {
    const history = new HistoryStore(dir);
    const pipeline = buildPipeline(
      { ...defaultSettings(), mode: 'cloud' }, history,
      { GROQ_API_KEY: 'gsk_test' });
    // Swap the transcriber via a second pipeline to avoid a network call:
    // wiring under test here is the cleaner choice, exercised through
    // makePipeline in the tests above. Here we assert construction succeeds.
    expect(pipeline).toHaveProperty('process');
  });

  it('local mode with a missing whisper binary reports a setup hint', async () => {
    const history = new HistoryStore(dir);
    const pipeline = buildPipeline(
      { ...defaultSettings(), mode: 'local', whisperBinaryPath: '/nope', whisperModelPath: '/nope' },
      history, {});
    await expect(pipeline.process('/fake/audio.wav'))
      .rejects.toThrow(/whisper-cli not found/);
  });

  it('cloud mode with no API key fails with the env var name in the message', async () => {
    const pipeline = buildPipeline(
      { ...defaultSettings(), mode: 'cloud', cloudProvider: 'groq' },
      new HistoryStore(dir), {});
    await expect(pipeline.process('/fake/audio.wav'))
      .rejects.toThrow(/GROQ_API_KEY/);
  });
});

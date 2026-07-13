import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { HistoryStore } from '../src/core/historyStore.js';
import { SettingsStore, defaultSettings, effectiveLLMCleanup } from '../src/core/settings.js';

let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'miniflow-test-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const entry = (text) => ({ transcript: `raw ${text}`, cleanedText: text, inserted: true });

describe('history store (PRD: last 10, local JSON, recovery net)', () => {
  it('returns entries newest first', () => {
    const store = new HistoryStore(dir);
    store.add(entry('first'));
    store.add(entry('second'));
    expect(store.recent.map((e) => e.cleanedText)).toEqual(['second', 'first']);
  });

  it('caps at capacity, dropping the oldest', () => {
    const store = new HistoryStore(dir, 10);
    for (let i = 1; i <= 15; i++) store.add(entry(`utterance ${i}`));
    const texts = store.recent.map((e) => e.cleanedText);
    expect(texts).toHaveLength(10);
    expect(texts[0]).toBe('utterance 15');
    expect(texts[9]).toBe('utterance 6');
  });

  it('persists across reload', () => {
    new HistoryStore(dir).add(entry('survives restart'));
    const reloaded = new HistoryStore(dir);
    expect(reloaded.recent.map((e) => e.cleanedText)).toEqual(['survives restart']);
  });

  it('markInserted updates and persists', () => {
    const store = new HistoryStore(dir);
    const e = store.add({ transcript: 't', cleanedText: 'c', inserted: false });
    store.markInserted(e.id, true);
    expect(new HistoryStore(dir).recent[0].inserted).toBe(true);
  });

  it('falls back to empty on a corrupt file instead of crashing', () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'history.json'), 'not json{{{');
    expect(new HistoryStore(dir).recent).toEqual([]);
  });

  it('clear empties memory and disk', () => {
    const store = new HistoryStore(dir);
    store.add(entry('gone'));
    store.clear();
    expect(new HistoryStore(dir).recent).toEqual([]);
  });
});

describe('settings store', () => {
  it('starts with PRD defaults: cloud mode, groq, cleanup on', () => {
    const s = new SettingsStore(dir).settings;
    expect(s.mode).toBe('cloud');
    expect(s.cloudProvider).toBe('groq');
    expect(s.rawMode).toBe(false);
    expect(s.llmCleanup).toBe(true);
    expect(s.historyCapacity).toBe(10);
    expect(s.onboardingCompleted).toBe(false);
  });

  it('flips local/cloud with a single toggle and persists (PRD G4)', () => {
    const store = new SettingsStore(dir);
    store.update({ mode: 'local' });
    expect(new SettingsStore(dir).settings.mode).toBe('local');
  });

  it('forces LLM cleanup off in local mode (privacy invariant)', () => {
    expect(effectiveLLMCleanup({ ...defaultSettings(), mode: 'local', llmCleanup: true }))
      .toBe(false);
    expect(effectiveLLMCleanup({ ...defaultSettings(), mode: 'cloud', llmCleanup: true }))
      .toBe(true);
  });

  it('round-trips every field', () => {
    const store = new SettingsStore(dir);
    store.update({
      mode: 'local',
      cloudProvider: 'openai',
      hotkey: 'f9',
      rawMode: true,
      vocabularyHint: ['Anthropic', 'whisper.cpp', 'Greg'],
      whisperBinaryPath: 'C:\\miniflow\\whisper-cli.exe',
      whisperModelPath: 'C:\\miniflow\\ggml-base.en.bin',
      onboardingCompleted: true,
    });
    expect(new SettingsStore(dir).settings).toEqual(store.settings);
  });

  it('merges defaults into settings written by older versions', () => {
    writeFileSync(join(dir, 'settings.json'), JSON.stringify({ mode: 'local' }));
    const s = new SettingsStore(dir).settings;
    expect(s.mode).toBe('local');
    expect(s.hotkey).toBe('rightCtrl'); // new field got its default
  });

  it('falls back to defaults on a corrupt file', () => {
    writeFileSync(join(dir, 'settings.json'), '{broken');
    expect(new SettingsStore(dir).settings).toEqual(defaultSettings());
  });

  it('never writes API keys into settings.json', () => {
    const store = new SettingsStore(dir);
    store.update({ mode: 'cloud' });
    const contents = readFileSync(store.filePath, 'utf8');
    expect(contents).not.toMatch(/api[_-]?key/i);
    expect(contents).not.toContain('sk-');
  });
});

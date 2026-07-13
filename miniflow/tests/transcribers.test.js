import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cloudTranscriber, PROVIDERS } from '../src/core/cloudTranscriber.js';
import { parseWhisperOutput } from '../src/core/localTranscriber.js';
import { parseClaudeResponse, claudeCleaner, SYSTEM_PROMPT } from '../src/core/claudeCleaner.js';

describe('cloud transcriber', () => {
  it('sends a well-formed multipart request and parses the text', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'miniflow-stt-'));
    const wavPath = join(dir, 'clip.wav');
    writeFileSync(wavPath, Buffer.from('RIFFfakewav'));

    let captured;
    const fetchImpl = async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ text: '  hello world  ' }), { status: 200 });
    };

    const stt = cloudTranscriber({
      provider: 'groq',
      apiKey: 'gsk_test',
      vocabularyHint: ['Anthropic', 'Greg'],
      fetchImpl,
    });
    const text = await stt.transcribe(wavPath);

    expect(text).toBe('hello world');
    expect(captured.url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(captured.options.headers.Authorization).toBe('Bearer gsk_test');
    const form = captured.options.body;
    expect(form.get('model')).toBe('whisper-large-v3');
    expect(form.get('language')).toBe('en');
    expect(form.get('prompt')).toBe('Anthropic, Greg');
    expect(form.get('file')).toBeInstanceOf(Blob);
  });

  it('fails fast with the env var name when the key is missing', async () => {
    const stt = cloudTranscriber({ provider: 'openai', apiKey: '' });
    await expect(stt.transcribe('/fake.wav')).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it('surfaces HTTP errors with provider and status', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'miniflow-stt-'));
    const wavPath = join(dir, 'clip.wav');
    writeFileSync(wavPath, Buffer.from('RIFF'));
    const stt = cloudTranscriber({
      provider: 'groq',
      apiKey: 'gsk_test',
      fetchImpl: async () => new Response('rate limited', { status: 429 }),
    });
    await expect(stt.transcribe(wavPath)).rejects.toThrow(/groq STT error 429/);
  });

  it('knows both providers of PRD Open Question #3', () => {
    expect(PROVIDERS.groq.model).toBe('whisper-large-v3');
    expect(PROVIDERS.openai.model).toBe('whisper-1');
  });
});

describe('local transcriber output parsing', () => {
  it('joins whisper-cli stdout lines into one transcript', () => {
    expect(parseWhisperOutput('  hello there\n\n  general kenobi  \n'))
      .toBe('hello there general kenobi');
  });
});

describe('claude cleaner', () => {
  it('parses the first text block of a Messages API response', () => {
    expect(parseClaudeResponse({
      content: [{ type: 'text', text: '  Cleaned.  ' }],
    })).toBe('Cleaned.');
  });

  it('throws on malformed responses (guard falls back upstream)', () => {
    expect(() => parseClaudeResponse({ content: [] })).toThrow(/Malformed/);
  });

  it('calls the Messages API at temperature 0 with the tight prompt', async () => {
    let captured;
    const cleaner = claudeCleaner({
      apiKey: 'sk-ant-test',
      fetchImpl: async (url, options) => {
        captured = { url, body: JSON.parse(options.body), headers: options.headers };
        return new Response(JSON.stringify({
          content: [{ type: 'text', text: 'Cleaned text.' }],
        }), { status: 200 });
      },
    });
    const out = await cleaner.clean('raw text');
    expect(out).toBe('Cleaned text.');
    expect(captured.url).toBe('https://api.anthropic.com/v1/messages');
    expect(captured.headers['x-api-key']).toBe('sk-ant-test');
    expect(captured.body.temperature).toBe(0);
    expect(captured.body.system).toBe(SYSTEM_PROMPT);
    expect(captured.body.messages[0].content).toContain('<transcript>');
  });
});

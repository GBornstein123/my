import { cloudTranscriber, PROVIDERS } from './cloudTranscriber.js';
import { localTranscriber } from './localTranscriber.js';
import { claudeCleaner } from './claudeCleaner.js';
import { rulesCleaner } from './rulesCleaner.js';
import { guarded } from './guardedCleaner.js';
import { effectiveLLMCleanup } from './settings.js';

// End-to-end: audio file -> transcript -> guarded cleanup -> history entry.
// The app layer owns recording and insertion; everything between lives here
// so it can be tested off-Windows.

/**
 * Builds the pipeline the way the app does at each hotkey release, from
 * current settings + environment. Kept here so tests can exercise the exact
 * wiring the app uses.
 */
export function buildPipeline(settings, history, env = process.env) {
  const transcriber = settings.mode === 'cloud'
    ? cloudTranscriber({
        provider: settings.cloudProvider,
        apiKey: env[PROVIDERS[settings.cloudProvider].apiKeyEnvVar] ?? '',
        vocabularyHint: settings.vocabularyHint,
      })
    : localTranscriber({
        binaryPath: settings.whisperBinaryPath,
        modelPath: settings.whisperModelPath,
        vocabularyHint: settings.vocabularyHint,
      });

  let cleaner = null; // raw mode: transcript goes straight through
  if (!settings.rawMode) {
    const useClaude = effectiveLLMCleanup(settings) && env.ANTHROPIC_API_KEY;
    cleaner = guarded(
      useClaude ? claudeCleaner({ apiKey: env.ANTHROPIC_API_KEY }) : rulesCleaner);
  }

  return makePipeline({ transcriber, cleaner, history });
}

export function makePipeline({ transcriber, cleaner, history }) {
  return {
    /**
     * Returns null for empty/silent recordings (nothing to insert).
     * Transcription errors propagate — the app surfaces them in the tray;
     * cleanup errors never propagate (the guard falls back to the raw
     * transcript).
     */
    async process(audioFilePath) {
      const transcript = (await transcriber.transcribe(audioFilePath)).trim();
      if (!transcript) return null;

      const text = cleaner ? await cleaner.clean(transcript) : transcript;
      const entry = history.add({ transcript, cleanedText: text, inserted: false });
      return { transcript, text, historyId: entry.id };
    },
  };
}

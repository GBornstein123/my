import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

// User settings, persisted as JSON next to the history file.
// API keys deliberately live in the environment / a .env file, never in
// this object, so settings.json is always safe to share in a bug report.

export const HOTKEYS = {
  // Hold right Ctrl — rarely used alone, comfortable to hold. Default.
  rightCtrl: { displayName: 'Hold Right Ctrl' },
  // Hold F9 — for keyboards where right Ctrl is awkward (60% boards).
  f9: { displayName: 'Hold F9' },
  // Hold Scroll Lock — the "nothing else uses it" option.
  scrollLock: { displayName: 'Hold Scroll Lock' },
};

export function defaultSettings() {
  return {
    mode: 'cloud',            // 'cloud' (faster) | 'local' (private) — PRD G4
    cloudProvider: 'groq',    // 'groq' | 'openai'
    hotkey: 'rightCtrl',
    rawMode: false,           // skip cleanup — code, exact strings
    llmCleanup: true,         // Claude Haiku when ANTHROPIC_API_KEY is set
    vocabularyHint: [],       // static word list passed as an STT hint
    whisperBinaryPath: '',    // filled in by setup-local-mode script
    whisperModelPath: '',
    historyCapacity: 10,
    onboardingCompleted: false,
  };
}

// Privacy invariant (PRD user story #4): in local mode nothing — audio or
// text — may leave the machine, so cloud LLM cleanup is forced off
// regardless of the toggle.
export function effectiveLLMCleanup(settings) {
  return settings.mode === 'cloud' && settings.llmCleanup;
}

export class SettingsStore {
  constructor(directory) {
    mkdirSync(directory, { recursive: true });
    this.filePath = join(directory, 'settings.json');
    this.settings = defaultSettings();
    try {
      const loaded = JSON.parse(readFileSync(this.filePath, 'utf8'));
      // Merge so new fields added in updates get their defaults.
      this.settings = { ...this.settings, ...loaded };
    } catch {
      // Missing or corrupt file: defaults, not a crash at launch.
    }
  }

  update(patch) {
    this.settings = { ...this.settings, ...patch };
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.settings, null, 2));
    renameSync(tmp, this.filePath);
    return this.settings;
  }
}

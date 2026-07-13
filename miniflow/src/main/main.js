import { app, Tray, BrowserWindow } from 'electron';
import { readFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SettingsStore } from '../core/settings.js';
import { HistoryStore } from '../core/historyStore.js';
import { buildPipeline } from '../core/pipeline.js';
import { HotkeyListener } from './hotkey.js';
import { TextInserter } from './inserter.js';
import { RecorderWindow } from './recorderWindow.js';
import { buildTrayMenu, TRAY_ICONS } from './tray.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// API keys come from the environment or a .env file next to the app
// (never from settings.json). Load .env before anything reads process.env.
function loadDotEnv() {
  for (const dir of [app.getPath('userData'), join(__dirname, '../..')]) {
    try {
      const lines = readFileSync(join(dir, '.env'), 'utf8').split('\n');
      for (const line of lines) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
        if (m && !(m[1] in process.env)) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // no .env in this location — fine
    }
  }
}

class MiniFlow {
  constructor() {
    const dataDir = app.getPath('userData');
    this.settingsStore = new SettingsStore(dataDir);
    this.history = new HistoryStore(
      dataDir, this.settingsStore.settings.historyCapacity);
    this.inserter = new TextInserter();
    this.recorder = new RecorderWindow();
    this.hotkey = null;
    this.tray = null;
    this.status = 'idle'; // idle | recording | processing
    this.error = null;
    this.onboardingWindow = null;
  }

  async start() {
    await this.recorder.create();
    this.inserter.warmUp();
    this.tray = new Tray(TRAY_ICONS.idle());
    this.tray.setToolTip('MiniFlow — voice dictation');
    this.refreshTray();
    await this.restartHotkey();

    if (!this.settingsStore.settings.onboardingCompleted) {
      this.showOnboarding();
    }
  }

  async restartHotkey() {
    this.hotkey?.stop();
    this.hotkey = new HotkeyListener({
      hotkey: this.settingsStore.settings.hotkey,
      onPress: () => this.hotkeyPressed(),
      onRelease: () => this.hotkeyReleased(),
    });
    try {
      await this.hotkey.start();
      this.error = null;
    } catch (err) {
      this.error = `Hotkey listener failed: ${err.message}`;
    }
    this.refreshTray();
  }

  hotkeyPressed() {
    if (this.status !== 'idle' && this.status !== 'error') return;
    this.setStatus('recording');
    this.recorder.start();
  }

  async hotkeyReleased() {
    if (this.status !== 'recording') return;
    this.setStatus('processing');
    let audioPath = null;
    try {
      audioPath = await this.recorder.stop();
      if (!audioPath) {
        this.setStatus('idle');
        return;
      }
      const pipeline = buildPipeline(this.settingsStore.settings, this.history);
      const result = await pipeline.process(audioPath);
      if (result) {
        const inserted = await this.inserter.insert(result.text);
        this.history.markInserted(result.historyId, inserted);
      }
      this.error = null;
    } catch (err) {
      this.error = err.message;
    } finally {
      if (audioPath) {
        try { unlinkSync(audioPath); } catch { /* already gone */ }
      }
      this.setStatus('idle');
    }
  }

  setStatus(status) {
    this.status = status;
    this.refreshTray();
  }

  refreshTray() {
    if (!this.tray) return;
    const icon = this.error ? TRAY_ICONS.error() : TRAY_ICONS[this.status]();
    this.tray.setImage(icon);
    this.tray.setContextMenu(buildTrayMenu({
      state: { status: this.status, error: this.error },
      settingsStore: this.settingsStore,
      history: this.history,
      onSettingsChanged: async (patch) => {
        const before = this.settingsStore.settings.hotkey;
        this.settingsStore.update(patch);
        if (patch.hotkey && patch.hotkey !== before) {
          await this.restartHotkey();
        }
        this.refreshTray();
      },
      onShowOnboarding: () => this.showOnboarding(),
      onQuit: () => app.quit(),
    }));
  }

  showOnboarding() {
    if (this.onboardingWindow) {
      this.onboardingWindow.focus();
      return;
    }
    this.onboardingWindow = new BrowserWindow({
      width: 560,
      height: 640,
      resizable: false,
      title: 'Welcome to MiniFlow',
    });
    this.onboardingWindow.setMenu(null);
    this.onboardingWindow.loadFile(
      join(__dirname, '../renderer/onboarding.html'));
    this.onboardingWindow.on('closed', () => {
      this.onboardingWindow = null;
      this.settingsStore.update({ onboardingCompleted: true });
    });
  }

  dispose() {
    this.hotkey?.stop();
    this.inserter.dispose();
    this.recorder.destroy();
  }
}

// Single instance — a second launch just exits.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let miniflow = null;

  app.whenReady().then(async () => {
    loadDotEnv();
    miniflow = new MiniFlow();
    await miniflow.start();
  });

  // Tray app: keep running with no windows open.
  app.on('window-all-closed', () => {});

  app.on('before-quit', () => miniflow?.dispose());
}

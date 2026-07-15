import { BrowserWindow, ipcMain } from 'electron';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { log, logError } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Node has no microphone API, so audio capture lives in a hidden renderer
// window using getUserMedia. The window is created once at launch and kept
// alive: the mic pipeline is already warm when the hotkey goes down, which
// is most of how we hit the 2-second-startup / 3-second-latency goals.

export class RecorderWindow {
  constructor() {
    this.window = null;
    this.pendingStop = null;
  }

  async create() {
    this.window = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: join(__dirname, 'recorderPreload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Forward everything the hidden window says/breaks into the main log —
    // otherwise renderer errors are invisible.
    const wc = this.window.webContents;
    wc.on('console-message', (_e, level, message, line, sourceId) => {
      log('recorder-console:', message, `(${sourceId}:${line})`);
    });
    wc.on('render-process-gone', (_e, details) => {
      logError('recorder render-process-gone', JSON.stringify(details));
    });
    wc.on('preload-error', (_e, preloadPath, err) => {
      logError(`recorder preload-error ${preloadPath}`, err);
    });
    wc.on('did-fail-load', (_e, code, desc) => {
      logError('recorder did-fail-load', `${code} ${desc}`);
    });

    await this.window.loadFile(join(__dirname, '../renderer/recorder.html'));
    log('Recorder window loaded');

    ipcMain.on('recorder:wav', async (_event, arrayBuffer, errorMessage) => {
      const pending = this.pendingStop;
      this.pendingStop = null;
      if (!pending) return;
      if (errorMessage) {
        pending.reject(new Error(errorMessage));
        return;
      }
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        pending.resolve(null); // nothing useful captured
        return;
      }
      try {
        const dir = join(tmpdir(), 'miniflow');
        await mkdir(dir, { recursive: true });
        const path = join(dir, `rec-${randomUUID()}.wav`);
        await writeFile(path, Buffer.from(arrayBuffer));
        pending.resolve(path);
      } catch (err) {
        pending.reject(err);
      }
    });
  }

  start() {
    this.window.webContents.send('recorder:start');
  }

  /**
   * @returns {Promise<string|null>} path to the finished WAV, or null when
   *   nothing useful was captured (taps shorter than ~0.3s are accidental).
   */
  stop() {
    return new Promise((resolve, reject) => {
      this.pendingStop = { resolve, reject };
      this.window.webContents.send('recorder:stop');
      // A renderer that never answers must not wedge dictation forever.
      setTimeout(() => {
        if (this.pendingStop) {
          this.pendingStop = null;
          reject(new Error('Recorder did not respond'));
        }
      }, 10_000);
    }).then((path) => path || null);
  }

  destroy() {
    this.window?.destroy();
    this.window = null;
  }
}

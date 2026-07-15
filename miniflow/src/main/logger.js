import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Dead-simple file logger. Everything the app does — and every error it
// hits — lands in one file the user can send back verbatim. Debugging a
// GUI app on someone else's machine is impossible without this.

let logPath = null;

export function initLogger(dir) {
  try {
    mkdirSync(dir, { recursive: true });
    logPath = join(dir, 'miniflow.log');
    // Fresh log each launch so it only shows the current run.
    appendFileSync(logPath, `\n===== MiniFlow start ${new Date().toISOString()} =====\n`);
  } catch (err) {
    // If we can't even open the log, at least console still works.
    console.error('Logger init failed:', err);
  }
}

export function log(...parts) {
  const line = `[${new Date().toISOString()}] ${parts.map(fmt).join(' ')}`;
  console.log(line);
  if (logPath) {
    try { appendFileSync(logPath, line + '\n'); } catch { /* ignore */ }
  }
}

export function logError(context, err) {
  const detail = err instanceof Error ? (err.stack || err.message) : String(err);
  log('ERROR', context, '::', detail);
}

export function getLogPath() {
  return logPath;
}

function fmt(p) {
  if (typeof p === 'string') return p;
  try { return JSON.stringify(p); } catch { return String(p); }
}

import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// Last-N transcription history persisted to a local JSON file
// (PRD: "local SQLite/JSON, menu bar UI" — JSON, no DB needed at this
// scale). The history view is the recovery net when insertion fails.

export class HistoryStore {
  /**
   * @param {string} directory storage directory; created if missing.
   * @param {number} capacity how many entries to keep (PRD: last 10 shown;
   *   we keep exactly what we show so nothing lingers on disk).
   */
  constructor(directory, capacity = 10) {
    this.capacity = capacity;
    mkdirSync(directory, { recursive: true });
    this.filePath = join(directory, 'history.json');
    this.entries = [];
    try {
      const loaded = JSON.parse(readFileSync(this.filePath, 'utf8'));
      if (Array.isArray(loaded)) this.entries = loaded.slice(-capacity);
    } catch {
      // Missing or corrupt file: start empty rather than crash at launch.
    }
  }

  /** Newest first, for the tray menu. */
  get recent() {
    return [...this.entries].reverse();
  }

  add({ transcript, cleanedText, inserted = false }) {
    const entry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      transcript,
      cleanedText,
      inserted,
    };
    this.entries.push(entry);
    if (this.entries.length > this.capacity) {
      this.entries.splice(0, this.entries.length - this.capacity);
    }
    this.#persist();
    return entry;
  }

  markInserted(id, inserted) {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return;
    entry.inserted = inserted;
    this.#persist();
  }

  clear() {
    this.entries = [];
    this.#persist();
  }

  #persist() {
    // Write-then-rename so a crash mid-write can't corrupt the file.
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.entries, null, 2));
    renameSync(tmp, this.filePath);
  }
}

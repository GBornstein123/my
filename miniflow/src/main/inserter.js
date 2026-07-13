import { clipboard, nativeImage } from 'electron';
import { spawn } from 'node:child_process';

// Inserts text at the cursor of the frontmost app.
//
// Primary: clipboard swap + simulated Ctrl+V (PRD: "Paste, don't type" —
// the most reliable cross-app method). The user's clipboard, including
// images and rich content, is snapshotted before and restored after.
//
// The paste keystroke is sent by a PowerShell worker process that is
// started once and kept warm — SendKeys itself is instant; it's PowerShell
// startup (~1s) that would blow the 3-second latency budget if paid per
// dictation.

const PASTE_SETTLE_MS = 300;

export class TextInserter {
  constructor() {
    this.worker = null;
  }

  /** Start the keystroke worker ahead of time (called at app launch). */
  warmUp() {
    if (process.platform !== 'win32' || this.worker) return;
    this.worker = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', '-'],
      { windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] });
    this.worker.on('exit', () => { this.worker = null; });
    this.worker.stdin.write(
      'Add-Type -AssemblyName System.Windows.Forms\n');
  }

  async sendPaste() {
    if (process.platform === 'win32') {
      this.warmUp();
      this.worker.stdin.write(
        "[System.Windows.Forms.SendKeys]::SendWait('^v')\n");
      return true;
    }
    if (process.platform === 'darwin') {
      // Bonus: keeps the app usable on a Mac too.
      return new Promise((resolve) => {
        const child = spawn('osascript', [
          '-e', 'tell application "System Events" to keystroke "v" using command down',
        ]);
        child.on('exit', (code) => resolve(code === 0));
        child.on('error', () => resolve(false));
      });
    }
    if (process.platform === 'linux') {
      return new Promise((resolve) => {
        const child = spawn('xdotool', ['key', '--clearmodifiers', 'ctrl+v']);
        child.on('exit', (code) => resolve(code === 0));
        child.on('error', () => resolve(false));
      });
    }
    return false;
  }

  /**
   * Returns true when insertion is believed to have succeeded. On false,
   * the tray history is the recovery net (PRD user story #3) — the text is
   * also left on the clipboard so a manual Ctrl+V recovers it.
   */
  async insert(text) {
    if (!text) return false;

    const snapshot = snapshotClipboard();
    clipboard.writeText(text);

    const pasted = await this.sendPaste();
    if (!pasted) {
      // Leave the dictation on the clipboard as the recovery path.
      return false;
    }

    // Restore after the target app has consumed the paste. Too short a
    // delay and the paste grabs the restored (old) clipboard instead.
    await new Promise((r) => setTimeout(r, PASTE_SETTLE_MS));
    restoreClipboard(snapshot);
    return true;
  }

  dispose() {
    if (this.worker) {
      this.worker.stdin.end('exit\n');
      this.worker = null;
    }
  }
}

// Clipboard snapshot/restore across text, HTML, RTF, and images
// (PRD success criterion #5: copy an image before dictating; it must
// survive).
export function snapshotClipboard() {
  const image = clipboard.readImage();
  return {
    text: clipboard.readText(),
    html: clipboard.readHTML(),
    rtf: clipboard.readRTF(),
    image: image.isEmpty() ? null : image.toDataURL(),
  };
}

export function restoreClipboard(snapshot) {
  const data = {};
  if (snapshot.text) data.text = snapshot.text;
  if (snapshot.html) data.html = snapshot.html;
  if (snapshot.rtf) data.rtf = snapshot.rtf;
  if (snapshot.image) data.image = nativeImage.createFromDataURL(snapshot.image);
  if (Object.keys(data).length === 0) {
    clipboard.clear();
  } else {
    clipboard.write(data);
  }
}

import { spawn } from 'node:child_process';
import { GlobalKeyboardListener } from 'node-global-key-listener';

// Global push-to-talk listener. Electron's globalShortcut can't see key-up
// events, so push-to-talk needs to watch the key itself. Two backends:
//
// 1. node-global-key-listener — a low-level keyboard hook via its bundled
//    WinKeyServer.exe. Lowest latency, but the exe is unsigned and antivirus
//    software sometimes blocks it ("spawn UNKNOWN").
// 2. PowerShell GetAsyncKeyState polling — nothing but built-in Windows
//    binaries, so nothing to block. ~25ms poll interval, imperceptible for
//    push-to-talk.
//
// createHotkeyListener() tries #1 and falls back to #2 automatically.

// Maps our settings values to node-global-key-listener key names.
export const HOTKEY_KEY_NAMES = {
  rightCtrl: 'RIGHT CTRL',
  f9: 'F9',
  scrollLock: 'SCROLL LOCK',
};

// Same keys as Win32 virtual-key codes, for the polling backend.
export const HOTKEY_VK_CODES = {
  rightCtrl: 0xa3, // VK_RCONTROL
  f9: 0x78,        // VK_F9
  scrollLock: 0x91, // VK_SCROLL
};

export class HotkeyListener {
  /**
   * @param {object} opts
   * @param {string} opts.hotkey settings hotkey id (see HOTKEY_KEY_NAMES)
   * @param {() => void} opts.onPress
   * @param {() => void} opts.onRelease
   */
  constructor({ hotkey, onPress, onRelease }) {
    this.keyName = HOTKEY_KEY_NAMES[hotkey] ?? HOTKEY_KEY_NAMES.rightCtrl;
    this.onPress = onPress;
    this.onRelease = onRelease;
    this.pressed = false;
    this.listener = null;
  }

  async start() {
    this.listener = new GlobalKeyboardListener();
    this.handler = (e) => {
      if (e.name !== this.keyName) return;
      if (e.state === 'DOWN' && !this.pressed) {
        this.pressed = true;
        this.onPress();
      } else if (e.state === 'UP' && this.pressed) {
        this.pressed = false;
        this.onRelease();
      }
    };
    await this.listener.addListener(this.handler);
  }

  stop() {
    if (this.listener && this.handler) {
      this.listener.removeListener(this.handler);
      this.listener.kill();
    }
    this.listener = null;
    this.pressed = false;
  }
}

/**
 * Antivirus-proof fallback: a persistent PowerShell process polls
 * GetAsyncKeyState and prints DOWN/UP transitions, one per line.
 */
export class PollingHotkeyListener {
  constructor({ hotkey, onPress, onRelease }) {
    this.vk = HOTKEY_VK_CODES[hotkey] ?? HOTKEY_VK_CODES.rightCtrl;
    this.onPress = onPress;
    this.onRelease = onRelease;
    this.child = null;
  }

  async start() {
    const script = [
      "Add-Type -Namespace MiniFlow -Name Keys -MemberDefinition '[DllImport(\"user32.dll\")] public static extern short GetAsyncKeyState(int vKey);'",
      `$vk = ${this.vk}`,
      '$down = $false',
      'while ($true) {',
      '  $pressed = ([MiniFlow.Keys]::GetAsyncKeyState($vk) -band 0x8000) -ne 0',
      "  if ($pressed -and -not $down) { $down = $true; [Console]::Out.WriteLine('DOWN'); [Console]::Out.Flush() }",
      "  elseif (-not $pressed -and $down) { $down = $false; [Console]::Out.WriteLine('UP'); [Console]::Out.Flush() }",
      '  Start-Sleep -Milliseconds 25',
      '}',
    ].join('\n');

    this.child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

    let buffer = '';
    this.child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line === 'DOWN') this.onPress();
        else if (line === 'UP') this.onRelease();
      }
    });

    // Fail start() if PowerShell dies immediately (bad script, missing PS).
    await new Promise((resolve, reject) => {
      const bail = (err) => reject(err ?? new Error('PowerShell poller exited'));
      this.child.once('error', bail);
      this.child.once('exit', bail);
      setTimeout(() => {
        this.child?.removeListener('error', bail);
        this.child?.removeListener('exit', bail);
        resolve();
      }, 700);
    });
  }

  stop() {
    this.child?.kill();
    this.child = null;
  }
}

/**
 * Starts the hook-based listener; if that fails (typically antivirus
 * blocking WinKeyServer.exe), transparently falls back to polling on
 * Windows. Returns the started listener; throws only if every backend
 * failed.
 */
export async function createHotkeyListener(opts) {
  const hook = new HotkeyListener(opts);
  try {
    await hook.start();
    return hook;
  } catch (hookError) {
    hook.stop();
    if (process.platform !== 'win32') throw hookError;
    const poller = new PollingHotkeyListener(opts);
    try {
      await poller.start();
      return poller;
    } catch (pollError) {
      poller.stop();
      throw new Error(
        `keyboard hook failed (${hookError.message}) and PowerShell ` +
        `fallback failed (${pollError.message})`);
    }
  }
}

import { describe, it, expect } from 'vitest';
import { HOTKEY_KEY_NAMES, HOTKEY_VK_CODES, PollingHotkeyListener } from '../src/main/hotkey.js';
import { HOTKEYS } from '../src/core/settings.js';

describe('hotkey backends', () => {
  it('both backends cover every hotkey offered in settings', () => {
    for (const id of Object.keys(HOTKEYS)) {
      expect(HOTKEY_KEY_NAMES[id], `key name for ${id}`).toBeTruthy();
      expect(HOTKEY_VK_CODES[id], `VK code for ${id}`).toBeTruthy();
    }
  });

  it('uses the documented Win32 virtual-key codes', () => {
    expect(HOTKEY_VK_CODES.rightCtrl).toBe(0xa3); // VK_RCONTROL
    expect(HOTKEY_VK_CODES.f9).toBe(0x78);        // VK_F9
    expect(HOTKEY_VK_CODES.scrollLock).toBe(0x91); // VK_SCROLL
  });

  it('polling listener translates DOWN/UP lines into press/release calls', () => {
    const calls = [];
    const poller = new PollingHotkeyListener({
      hotkey: 'rightCtrl',
      onPress: () => calls.push('press'),
      onRelease: () => calls.push('release'),
    });
    // Drive the same line-splitting logic start() wires to stdout, without
    // spawning PowerShell (not available off-Windows).
    let buffer = '';
    const onData = (chunk) => {
      buffer += chunk.toString();
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line === 'DOWN') poller.onPress();
        else if (line === 'UP') poller.onRelease();
      }
    };
    onData('DOW');
    onData('N\r\nUP\r\nDOWN\r\n');
    expect(calls).toEqual(['press', 'release', 'press']);
  });
});

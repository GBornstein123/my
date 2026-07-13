import { GlobalKeyboardListener } from 'node-global-key-listener';

// Global push-to-talk listener. Electron's globalShortcut can't see key-up
// events, so push-to-talk needs a low-level keyboard hook —
// node-global-key-listener ships a signed WinKeyServer.exe that provides
// DOWN/UP for every key without stealing it from other apps.

// Maps our settings values to node-global-key-listener key names.
export const HOTKEY_KEY_NAMES = {
  rightCtrl: 'RIGHT CTRL',
  f9: 'F9',
  scrollLock: 'SCROLL LOCK',
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

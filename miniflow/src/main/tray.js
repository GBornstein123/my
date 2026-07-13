import { Menu, clipboard, nativeImage } from 'electron';
import { HOTKEYS, effectiveLLMCleanup } from '../core/settings.js';

// System tray: status at a glance, the last-10 history (click to copy —
// the recovery net when insertion fails), and the handful of v1 settings.

const STATUS_LABELS = {
  idle: (hotkey) => `Ready — hold ${HOTKEYS[hotkey].displayName.replace('Hold ', '')} and speak`,
  recording: () => 'Recording…',
  processing: () => 'Transcribing…',
};

// 16x16 tray icons drawn as data URLs so no binary assets need shipping.
// Solid circle: gray = idle, red = recording, amber = processing/error.
function circleIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">`
    + `<circle cx="8" cy="8" r="6" fill="${color}"/></svg>`;
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

export const TRAY_ICONS = {
  idle: () => circleIcon('#8e8e93'),
  recording: () => circleIcon('#e03e3e'),
  processing: () => circleIcon('#e0a03e'),
  error: () => circleIcon('#b06060'),
};

export function buildTrayMenu({ state, settingsStore, history, onSettingsChanged, onShowOnboarding, onQuit }) {
  const settings = settingsStore.settings;
  const statusLabel = state.error
    ? `⚠ ${state.error}`
    : STATUS_LABELS[state.status](settings.hotkey);

  const historyItems = history.recent.length === 0
    ? [{ label: 'Nothing yet — hold the hotkey and speak', enabled: false }]
    : history.recent.map((entry) => ({
        label: (entry.inserted ? '' : '⚠ ')
          + (entry.cleanedText.length > 48
            ? `${entry.cleanedText.slice(0, 48)}…`
            : entry.cleanedText),
        toolTip: 'Click to copy',
        click: () => clipboard.writeText(entry.cleanedText),
      }));

  return Menu.buildFromTemplate([
    { label: statusLabel, enabled: false },
    { type: 'separator' },
    { label: 'Recent dictations (click to copy)', enabled: false },
    ...historyItems,
    { type: 'separator' },
    {
      label: 'Transcription',
      submenu: [
        {
          label: 'Cloud (faster)',
          type: 'radio',
          checked: settings.mode === 'cloud',
          click: () => onSettingsChanged({ mode: 'cloud' }),
        },
        {
          label: 'Local (private — whisper.cpp)',
          type: 'radio',
          checked: settings.mode === 'local',
          click: () => onSettingsChanged({ mode: 'local' }),
        },
        { type: 'separator' },
        {
          label: 'Cloud provider: Groq',
          type: 'radio',
          checked: settings.cloudProvider === 'groq',
          click: () => onSettingsChanged({ cloudProvider: 'groq' }),
        },
        {
          label: 'Cloud provider: OpenAI',
          type: 'radio',
          checked: settings.cloudProvider === 'openai',
          click: () => onSettingsChanged({ cloudProvider: 'openai' }),
        },
      ],
    },
    {
      label: 'Hotkey',
      submenu: Object.entries(HOTKEYS).map(([id, { displayName }]) => ({
        label: displayName,
        type: 'radio',
        checked: settings.hotkey === id,
        click: () => onSettingsChanged({ hotkey: id }),
      })),
    },
    {
      label: 'Raw mode (skip cleanup — code, exact strings)',
      type: 'checkbox',
      checked: settings.rawMode,
      click: () => onSettingsChanged({ rawMode: !settings.rawMode }),
    },
    {
      label: `Cleanup: ${settings.rawMode ? 'off (raw mode)'
        : effectiveLLMCleanup(settings) && process.env.ANTHROPIC_API_KEY
          ? 'Claude Haiku' : 'local rules'}`,
      enabled: false,
    },
    { type: 'separator' },
    { label: 'Setup guide', click: onShowOnboarding },
    { label: 'Quit MiniFlow', click: onQuit },
  ]);
}

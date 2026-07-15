import { Menu, clipboard, nativeImage } from 'electron';
import { HOTKEYS, effectiveLLMCleanup } from '../core/settings.js';

// System tray: status at a glance, the last-10 history (click to copy —
// the recovery net when insertion fails), and the handful of v1 settings.

const STATUS_LABELS = {
  idle: (hotkey) => `Ready — hold ${HOTKEYS[hotkey].displayName.replace('Hold ', '')} and speak`,
  recording: () => 'Recording…',
  processing: () => 'Transcribing…',
};

// 16x16 tray icons embedded as PNG data URLs so no binary assets need
// shipping. Solid circle: gray = idle, red = recording, amber = processing,
// dull red = error. PNG, not SVG — nativeImage.createFromDataURL only
// decodes PNG/JPEG, and an empty image makes `new Tray()` throw on Windows.
const ICON_PNGS = {
  idle:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAbElEQVR42q2TwQ3AIAhFvbof27DDv7CBM3Jv0wSSxkijhcO7SP6LAjZAWoao0AEhQNggO9sSPAEF5JpQq30KxiI4MyIBb4QdngU9uHaEek9cQAdhh94C/iHgUkH6CekmpsdYskglq1zymY64AY2gM2/rHrGAAAAAAElFTkSuQmCC',
  recording:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAbElEQVR42q2TwQ3AIAhFvbrUn4Jt2MbJGIJ7myaQNEYaLRzeRfJfFLAJ0DJEhS4ACcAG2dmW4AmoANeEWu1TMBbBmREJeCPs8CzowbUj1HviAjoIO/QW8A8BlwrST0g3MT3GkkUqWeWSz3TEDWlI4GDZrX+mAAAAAElFTkSuQmCC',
  processing:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAbUlEQVR42q2TwQnAMAhFc81STuE2LiOZzCG8txQiFIklqR7eJfIfiZomDC1DVOjCgMJAE5xnW4InoMJwOXTWPgVjEfSMSEAbYYO8oAfXjlDriQnwIGzgW0A/BFQqSD8h3cT0GEsWqWSVSz7TETe18UJv9JHQSQAAAABJRU5ErkJggg==',
  error:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAbElEQVR42q2TwQ3AIAhFvbofA/w92MYJGI57myaQNEYaLRzeRfJfFLAJ0DJEhS4ACcAG2dmW4AmoANeEWu1TMBbBmREJeCPs8CzowbUj1HviAjoIO/QW8A8BlwrST0g3MT3GkkUqWeWSz7TEDcOg9GApY4CqAAAAAElFTkSuQmCC',
};

export const TRAY_ICONS = {
  idle: () => nativeImage.createFromDataURL(ICON_PNGS.idle),
  recording: () => nativeImage.createFromDataURL(ICON_PNGS.recording),
  processing: () => nativeImage.createFromDataURL(ICON_PNGS.processing),
  error: () => nativeImage.createFromDataURL(ICON_PNGS.error),
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

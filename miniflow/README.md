# MiniFlow — minimal system-wide voice dictation for Windows

Hold a key, speak, release — polished text appears wherever your cursor is.
Implements [PRD.md](../PRD.md) (originally macOS-scoped; retargeted to
Windows per owner decision — see the PRD addendum). Uses the PRD's named
fallback stack: **Electron + node-global-key-listener**.

```
[Hold Right Ctrl]──▶ mic capture (hidden renderer, 16kHz WAV)
[Release]─────────▶ transcribe ──▶ cloud: Groq / OpenAI Whisper
                        │          local: whisper.cpp (offline)
                        ▼
                    cleanup: Claude Haiku (or offline rules engine)
                        │   · fillers out · punctuation · self-corrections
                        │   · divergence guardrail (no hallucinated additions)
                        ▼
                    clipboard-swap paste (Ctrl+V) at cursor, clipboard restored
                        ▼
                    tray history (last 10, click to copy — recovery net)
```

## Run it (Windows)

```powershell
git clone <this repo> ; cd my/miniflow
npm install
copy .env.example .env   # add GROQ_API_KEY (and optionally ANTHROPIC_API_KEY)
npm start
```

A gray circle appears in the system tray. Hold **Right Ctrl**, speak,
release. First use triggers the Windows microphone permission prompt.

Build a distributable installer + portable exe: `npm run dist` (on the PC).

### Auto-start on login, no terminal window

Once it's working, make it always-on and silent (tray dot only, no
PowerShell window):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-autostart.ps1
```

This adds a Startup shortcut that launches Electron hidden via
`scripts\miniflow-hidden-launch.vbs`, and starts it immediately. Undo with
`scripts\uninstall-autostart.ps1`. (You can also just double-click the
`.vbs` any time to start MiniFlow silently.)

### Local mode (nothing leaves the machine)

```powershell
.\scripts\setup-local-mode.ps1     # downloads whisper.cpp + base.en model
```

Then tray → Transcription → **Local (private)**. In local mode the cloud
cleanup is forced off automatically; the offline rules cleaner runs instead.

### Settings

Everything lives in the tray menu: cloud/local toggle, Groq/OpenAI provider,
hotkey (Right Ctrl / F9 / Scroll Lock), raw mode (skip cleanup for code and
exact strings). Files: `%APPDATA%\miniflow\settings.json` and
`history.json`. API keys only ever live in `.env` / environment variables.

## What's verified where

CI-verifiable logic is tested on any OS with `npm test` (60 tests):
divergence guardrail (including the PRD-example fix — see
`src/core/divergenceGuard.js`), rules cleaner (fillers, self-corrections,
casing), the PRD's 20-utterance script, history capacity/persistence,
settings round-trip and privacy invariant, cloud/local transcriber clients
against mocks, WAV encoder output format, and the full pipeline wiring.

On-PC checklist (PRD §9 — needs ears, a mic, and a stopwatch):

1. **Latency** — ten 10–20s utterances in cloud mode; median key-release →
   text-inserted ≤ 3.0s (≤ 6.0s local).
2. **Cleanliness** — read `tests/testScript.test.js`'s 20 utterances aloud;
   ≥16/20 need zero edits; all 3 corrections resolve.
3. **Universality** — one dictation each into Slack, Gmail (Chrome),
   Notepad, VS Code, WhatsApp Desktop.
4. **Footprint** — Task Manager < 150MB after 1h idle; dictation-ready
   within 2s of launch. (Electron makes 150MB tight: measure the sum of the
   MiniFlow processes; if over, the PRD's Tauri alternative is the next
   move.)
5. **Clipboard safety** — copy an image, dictate, paste manually: the image
   is back.
6. **Privacy** — local mode + `Resource Monitor → Network` during 5
   dictations: zero outbound traffic from MiniFlow.
7. **Crash-free** — 50 consecutive dictations, no crash or missed insertion.

## Layout

```
src/core/      platform-independent engine (fully unit-tested)
src/main/      Electron main: tray, global hotkey, paste, recorder window
src/renderer/  hidden mic-capture page + onboarding page
tests/         vitest suite (runs on Linux CI and on the PC)
scripts/       setup-local-mode.ps1 (whisper.cpp installer)
```

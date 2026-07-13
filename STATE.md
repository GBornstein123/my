# MiniFlow — build state

Working log per milestone: what passed, what failed, rules worth remembering.
App lives in `miniflow/`. Spec: `PRD.md` (note the Windows addendum at the top).

## Status snapshot (2026-07-12)

- **Platform:** Windows PC (owner pivot mid-build; original PRD said macOS).
- **Stack:** Electron + node-global-key-listener (the PRD's own fallback stack), vitest.
- **Tests:** 60/60 passing (`cd miniflow && npm test`) on Linux CI container.
- **Not yet verified:** anything needing a real PC — mic capture, global
  hotkey, paste into real apps, latency, RAM footprint. Mapped to a 7-point
  on-PC checklist in `miniflow/README.md`.

## Milestone log

### M0 — Platform pivot (unplanned)
- Started per PRD as Swift/SwiftUI macOS app; owner said "I need it for PC".
- Discarded the Swift skeleton (nothing was committed), rebuilt as Electron.
- **Rule:** the PRD's §7 "alternative if Swift is a blocker" line did real
  work — a spec that names its own fallback makes a pivot a restart-free
  decision.

### M1 — Capture and transcribe ✅ (code + tests; on-PC pending)
- Hidden renderer window captures mic via getUserMedia, kept warm so
  recording starts instantly on keydown; encodes 16 kHz mono PCM16 WAV
  in-renderer (`wavEncoder.js`, unit-tested against the RIFF spec).
- Push-to-talk via node-global-key-listener (Electron's globalShortcut has
  no key-up events — that's why the dependency exists). Right Ctrl default;
  F9 / Scroll Lock options.
- Cloud STT: one OpenAI-compatible client covers Groq + OpenAI; provider is
  a settings enum (PRD open question #3 stays a runtime toggle).
- **Failed along the way:** Swift Linux toolchain download (proxy policy
  denies download.swift.org) — moot after the pivot; Electron binary
  download also proxy-blocked → `ELECTRON_SKIP_BINARY_DOWNLOAD=1` for CI
  installs (binary is only needed where the app actually runs).

### M2 — Insert at cursor ✅ (code; on-PC pending)
- Clipboard swap (text/html/rtf/image snapshot + restore) + SendKeys Ctrl+V.
- **Rule:** PowerShell startup (~1s) would eat a third of the 3s latency
  budget — keep one PowerShell worker warm from launch and reuse it.
- On paste failure the dictation is deliberately LEFT on the clipboard and
  flagged ⚠ in tray history: manual Ctrl+V is the recovery, per PRD.

### M3 — Cleanup pass ✅ (verified by tests)
- Claude Haiku (temperature 0, tight system prompt, transcript wrapped in
  tags and framed as data-not-command) behind a guard that falls back to
  the raw transcript on any error or divergence.
- Offline rules cleaner (fillers, self-corrections, punctuation/casing) —
  the no-API-key default, the local-mode default, and the guard's baseline.
- PRD's 20-utterance script encoded as an executable test: 20/20 zero-edit
  on the rules path, all 3 self-corrections resolve to the corrected word.
- **Spec bug found by tests:** the PRD's literal guardrail (reject <0.5x)
  rejects the PRD's own example — "let's meet Tuesday, wait, no, Friday" →
  "Let's meet Friday." is 0.43x. Fix: judge growth against the raw
  transcript, shrinkage against a deterministic rules-cleaned baseline.
  **Rule:** when a spec's rule contradicts the spec's example, the example
  is what the author meant; encode the contradiction as a test and document
  the deviation (see `divergenceGuard.js`).

### M4 — Local mode + polish ✅ (code; on-PC pending)
- `scripts/setup-local-mode.ps1` installs whisper.cpp + ggml-base.en and
  wires settings; local transcriber shells out per-dictation (process exits
  between uses → idle RAM stays flat).
- Privacy invariant enforced in code, not UI copy: local mode forces LLM
  cleanup off (`effectiveLLMCleanup`), tested.
- Tray: status, last-10 click-to-copy history, mode/provider/hotkey/raw-mode
  toggles, onboarding page (permissions + keys, stated plainly).
- History/settings: JSON with write-then-rename atomicity; corrupt files
  fall back to empty/defaults instead of crashing at launch (tested).
- API keys live only in `.env`/environment; test asserts settings.json can
  never contain them.

## Success criteria for this build session (all met)

1. `npm test` green: 60/60 covering guardrail, cleaner, 20-utterance script,
   stores, transcriber clients (mocked), WAV encoder, pipeline wiring. ✅
2. Every main/renderer file parses (`node --check`) and the hotkey module
   loads its native-listener dependency. ✅
3. Repo deliverables pushed to `claude/miniflow-voice-dictation-kfuhd1`:
   PRD.md (+ Windows addendum), STATE.md, complete `miniflow/` app with
   README build/run instructions and the on-PC verification checklist. ✅

## Rules worth remembering (accumulated)

- A guard that can discard good output needs its thresholds tested against
  the spec's own examples, not just synthetic extremes.
- Never let the cleanup stage fail a dictation: wrap it so every error path
  degrades to the raw transcript.
- Warm the slow things at launch (mic stream, PowerShell worker), not on
  first use — latency budgets are spent at keyup, not at startup.
- Keep secrets out of anything the app persists; make a test assert it.
- In this CI container: download.swift.org is proxy-blocked, GitHub is not;
  `ELECTRON_SKIP_BINARY_DOWNLOAD=1` for installs; parent-repo PostCSS leaks
  into vitest unless the subproject pins `css.postcss` in its own config.

## Next actions (need the PC)

1. `npm install && npm start` on Windows; run the 7-point checklist in
   `miniflow/README.md`.
2. Decide Groq vs OpenAI on measured latency (PRD open question #3).
3. If RAM > 150MB idle (likely tight under Electron), evaluate the Tauri
   rewrite of `src/main/` — `src/core/` and its tests carry over unchanged.

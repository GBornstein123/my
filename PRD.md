# PRD: "MiniFlow" — Minimal System-Wide Voice Dictation for macOS

**Version:** 0.1
**Owner:** Greg
**Status:** Draft

> **Addendum (2026-07-12, owner decision): target platform is Windows PC, not macOS.**
> The original document below is kept verbatim for the product rationale, goals,
> guardrails, and success criteria — all of which carry over. What changes:
>
> | PRD (macOS) | v0.1 as built (Windows) |
> |---|---|
> | Swift + SwiftUI menu bar app | Electron system-tray app (the PRD §7 fallback stack: Electron + node-global-key-listener) |
> | AVFoundation capture | getUserMedia in a hidden renderer → 16 kHz WAV |
> | ⌘V paste via CGEvent + Accessibility permission | Ctrl+V via SendKeys (warm PowerShell worker); no accessibility permission exists or is needed on Windows |
> | Hotkey: Fn / ⌥Space | Hotkey: hold Right Ctrl (also F9, Scroll Lock) |
> | Signed .dmg | NSIS installer + portable .exe (`npm run dist`) |
>
> Everything else — push-to-talk only, transcribe-on-release, Groq/OpenAI whisper,
> whisper.cpp local mode, Claude Haiku cleanup with the divergence guardrail,
> clipboard save/restore, last-10 JSON history, no accounts/sync/telemetry —
> is implemented as specified. See `miniflow/README.md`.
**Constraints chosen:** Solo builder, ~2 weekends of effort, macOS only, no accounts, no mobile, no sync. Ship something usable by one person (you) before generalizing.

---

## 1. Background: What Wispr Flow Actually Is

Wispr Flow is a system-wide dictation layer. The core loop: press and hold a hotkey, speak, release, and polished text appears wherever your cursor is — in any app with a text field. What separates it from built-in OS dictation is not transcription; it's the post-processing layer:

1. **Capture** — global hotkey (push-to-talk or hands-free toggle), background audio capture
2. **Transcribe** — cloud ASR (speech-to-text) models
3. **Clean up** — a proprietary LLM layer that removes filler words, applies punctuation, formats lists, and resolves self-corrections ("5pm, actually 6pm" becomes "6pm")
4. **Context** — reads the frontmost app (via accessibility permissions) to adapt tone and formatting; learns a personal dictionary of names and jargon
5. **Insert** — types/pastes the result at the cursor position in the active app

Extras in the full product: Command Mode (voice-edit selected text), snippets/voice shortcuts, 100+ languages, whisper detection, tone styles per app, team dictionaries, cross-device sync.

Known weaknesses worth avoiding in a clone: heavy resource use (~800MB RAM idle), slow startup, cloud-only processing that raises privacy concerns, and early backlash over unclear accessibility-permission data collection.

## 2. Problem Statement

Typing is the bottleneck between thought and text. Built-in macOS dictation transcribes raw speech verbatim — filler words, false starts, and corrections included — so the output requires editing that erases the speed gain. A minimal tool that captures speech via hotkey, transcribes it, runs one cleanup pass, and inserts polished text at the cursor would deliver 80% of Wispr Flow's value with a fraction of its surface area.

## 3. Goals

1. **G1:** Hold a hotkey anywhere in macOS, speak, release, and see cleaned-up text appear at the cursor within 3 seconds of release for utterances under 30 seconds.
2. **G2:** Output requires zero manual edits for at least 8 out of 10 typical utterances (conversational sentences, short emails, chat messages).
3. **G3:** The app runs as a menu bar utility using under 150MB RAM idle and starts in under 2 seconds.
4. **G4:** User can choose between local transcription (whisper.cpp, private, slower) and cloud transcription (API, faster) via a single settings toggle.

## 4. Non-Goals

Explicitly out of scope for v1. Each of these is where scope creep goes to breed:

- **Windows, iOS, Android** — macOS only
- **Command Mode / voice editing of selected text**
- **Per-app tone styles or context awareness** (no accessibility-API reading of the frontmost app's content)
- **Snippets / voice shortcuts**
- **Personal dictionary learning** (v1 allows a static user-editable word list passed as a transcription hint; no automatic learning)
- **Accounts, sync, teams, billing**
- **Real-time streaming transcription** (v1 transcribes on hotkey release, not word-by-word)
- **Languages beyond English**
- **Whisper-volume speech detection, noise robustness tuning**

## 5. User Stories

- As a user, I press and hold `Fn` (configurable), speak a sentence, release, and the text appears where my cursor is — in Slack, Gmail, Notion, VS Code, anywhere.
- As a user, when I say "let's meet Tuesday, wait, no, Friday," the inserted text says "Let's meet Friday."
- As a user, I can open the menu bar icon to see my last 10 transcriptions and copy any of them (recovery when insertion fails).
- As a privacy-conscious user, I can flip to local-only mode and confirm no audio leaves my machine.

## 6. Architecture

```
[Global hotkey listener]
        │ keydown → start recording (AVFoundation / mic)
        │ keyup   → stop, hand off audio buffer
        ▼
[Transcription engine]  ← settings toggle
   ├─ Local: whisper.cpp (small.en or base.en model)
   └─ Cloud: OpenAI Whisper API / groq whisper-large-v3
        ▼
[Cleanup pass] — single LLM call (Claude Haiku or local rules fallback)
   Prompt: remove fillers, fix punctuation/casing,
   resolve self-corrections, preserve meaning, no additions
        ▼
[Insertion]
   Primary: write to clipboard → simulate ⌘V (CGEvent)
   → restore prior clipboard contents after paste
   Fallback: keystroke simulation for apps that block paste
        ▼
[History store] — last N transcriptions, local SQLite/JSON, menu bar UI
```

**Key design decisions:**

- **Push-to-talk only.** Hands-free toggle adds VAD (voice activity detection) complexity for marginal v1 value.
- **Transcribe-on-release, not streaming.** Streaming halves perceived latency but triples complexity. For utterances under 30s, batch is fine.
- **Paste, don't type.** Simulating ⌘V with clipboard swap is the most reliable cross-app insertion method. Save/restore the user's clipboard.
- **Cleanup is one LLM call with a tight prompt**, temperature 0, with a hard rule: if the LLM output diverges wildly in length from the transcript (>1.5x or <0.5x), fall back to the raw transcript. This prevents hallucinated additions.
- **Permissions needed:** Microphone + Accessibility (for the paste keystroke). Nothing else. State this plainly in onboarding — this is exactly where Wispr got burned.

## 7. Stack

| Layer | Choice | Why |
|---|---|---|
| App shell | Swift + SwiftUI menu bar app | Native hotkey/mic/CGEvent access, small footprint. (Alternative if Swift is a blocker: Tauri or Electron + node-global-key-listener, at a RAM cost) |
| Audio capture | AVFoundation | Native, low-latency |
| Local STT | whisper.cpp with `base.en` (upgrade path to `small.en`) | Runs on Apple Silicon fast, fully offline |
| Cloud STT | Groq whisper-large-v3 or OpenAI Whisper API | Sub-second for short clips |
| Cleanup LLM | Claude Haiku via API | Fast, cheap, good instruction-following |
| Storage | Local JSON file (history + settings) | No DB needed at this scale |
| Distribution | Signed .dmg, manual install | No App Store review cycle for v1 |

## 8. Milestones

**M1 — Capture and transcribe (Weekend 1, Day 1)**
Menu bar app runs; hold hotkey records audio; release triggers transcription (cloud path first); result prints to a debug window.

**M2 — Insert at cursor (Weekend 1, Day 2)**
Clipboard-swap paste works in Slack, Chrome text fields, Notes, and VS Code. Prior clipboard restored. End-to-end loop functional.

**M3 — Cleanup pass (Weekend 2, Day 1)**
LLM cleanup integrated with divergence guardrail. Filler removal, punctuation, self-correction resolution verified against a 20-utterance test script.

**M4 — Local mode + polish (Weekend 2, Day 2)**
whisper.cpp path working behind settings toggle. History view (last 10). Configurable hotkey. Onboarding screen explaining the two permissions. Signed build.

## 9. Success Criteria (all verifiable yourself, no instrumentation needed)

1. **Latency:** Dictate ten 10–20 second utterances in cloud mode; time from key-release to text-inserted. Median must be ≤ 3.0s (≤ 6.0s in local mode). Use a stopwatch or screen recording.
2. **Accuracy/cleanliness:** Read a fixed 20-utterance test script (include 3 with deliberate self-corrections and 3 with "um/uh" fillers). At least 16 of 20 outputs require zero edits before you'd send them; all 3 self-corrections resolve to the corrected version only.
3. **Universality:** Insertion works in all of: Slack, Gmail (Chrome), Apple Notes, VS Code, Messages. Test each with one dictation.
4. **Footprint:** Activity Monitor shows < 150MB RAM after 1 hour idle; app is usable within 2s of launch (stopwatch from click to first successful dictation-ready state).
5. **Clipboard safety:** Copy an image and a text snippet before dictating; after dictation, paste manually and confirm the original clipboard content is intact.
6. **Privacy check:** In local mode, run Little Snitch (or `nettop`) during 5 dictations and confirm zero outbound audio traffic.
7. **Crash-free session:** 50 consecutive dictations in one session without a crash or a missed insertion (history view is the recovery net for any misses).

## 10. Open Questions

- Is `Fn` interceptable as a hold-key on all keyboards, or default to `⌥ + Space`?
- Should the cleanup pass be skippable via a modifier (raw mode) for dictating code or exact strings?
- Groq vs OpenAI for cloud STT — decide on latency test in M1, not on spec sheets.

## 11. Future (explicitly deferred)

Streaming transcription, per-app context styles, Command Mode, personal dictionary learning, Windows port, multi-language. None of these enter scope until v1 passes all seven success criteria for two weeks of daily use.

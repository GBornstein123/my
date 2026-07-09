# readrrr — focus reader

A mobile-first RSVP (Rapid Serial Visual Presentation) speed reader, inspired by
[Readrrr – Focus Reader](https://apps.apple.com/us/app/readrrr-focus-reader/id6757683148).
Words stream one at a time at a fixed focus point, so your eyes never move —
your brain skips the mechanics of reading and just absorbs meaning.

## Features

- **RSVP reading** with ORP (optimal recognition point) highlighting — the anchor
  letter is tinted so your eye locks onto the same spot for every word
- **Adjustable speed** from 100 to 1200 wpm, with smart pauses on punctuation,
  paragraph breaks, long words, and numbers
- **Import anything** — paste text, or import `.txt`, `.md`, and PDF files
  (PDF extraction runs fully in-browser via pdf.js)
- **Library with progress** — every document remembers where you left off
- **Stats** — words read, time in focus, average/top speed, sessions, finished
  documents, and a daily reading streak
- **Controls** — tap to play/pause, rewind one sentence, scrub anywhere,
  keyboard shortcuts on desktop (space, arrows)
- **Light & dark themes**, offline-capable PWA, installable to the home screen
- **No accounts, no server** — everything lives in `localStorage` on your device

## Run it

It's a static site — no build step:

```
cd readrrr
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Use it on your phone

Host the folder anywhere static (GitHub Pages, Vercel, Netlify, …), open the URL
in Safari, then **Share → Add to Home Screen**. It launches full-screen like a
native app and works offline after the first visit.

For GitHub Pages: enable Pages for this repo (Settings → Pages → deploy from
branch), and the app will be served at `https://<user>.github.io/<repo>/readrrr/`.

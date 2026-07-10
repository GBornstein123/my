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
- **Import anything** — paste text, or import `.txt`, `.md`, `.html`, and PDF files
  (PDF extraction runs fully in-browser via pdf.js)
- **Paid newsletters (Substack etc.)** — save the email as `.eml` (Gmail desktop:
  open the email → ⋮ → "Download message") and import it; the reader decodes the
  MIME message, finds the article body, and strips subscribe buttons, upsells,
  and footers
- **Direct Gmail import** — connect your Gmail (read-only, entirely in-browser;
  no server ever sees your mail) and pull newsletters into the library with one
  tap. See [Google setup](#gmail-setup) below
- **Google Drive import** — same one-time Google connection; lists your Docs,
  PDFs, EPUBs, and text files, one tap imports (Docs are exported as plain text)
- **From a link** — paste any public article URL (fetched and cleaned via the
  r.jina.ai reader), or a Substack publication / RSS feed URL to browse and
  import recent posts
- **Share to the app** — opening the app with `#url=<encoded url>` or
  `#text=<encoded text>` imports immediately; the PWA manifest also registers
  it as an Android share target. On iOS, make a two-step Shortcut (Share Sheet
  → *Open URL* `https://<your-origin>/#url=[URL-encoded shortcut input]`); on
  desktop, use a bookmarklet:

  ```
  javascript:(function(){var s=getSelection().toString();location.href='https://<your-origin>/#'+(s?'text='+encodeURIComponent(s):'url='+encodeURIComponent(location.href))})()
  ```
- **Clipboard one-tap** — "Paste from clipboard & start" reads the clipboard
  and begins the stream
- **EPUB books** — full spine-ordered chapter extraction with a dependency-free
  zip reader (browser-native `DecompressionStream`). Kindle purchases
  (`.azw`/`.kfx`) are DRM-locked by Amazon and cannot be imported; use DRM-free
  EPUBs
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

GitHub Pages deployment is automated: `.github/workflows/deploy-pages.yml`
publishes this folder as the Pages site on every push (the repo must be
public, or on a paid plan, for Pages to activate). The app is served at
`https://<user>.github.io/<repo>/`.

## Gmail setup

The "Import from Gmail" and "Import from Google Drive" buttons talk to
Google's APIs straight from your browser with read-only scopes — there is no
backend, and the access token never leaves the page. Google requires the app
to present its own OAuth credential, so a one-time setup (~10 minutes, free)
is needed:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and
   create a project (any name)
2. **APIs & Services → Library** → enable both the **Gmail API** and the
   **Google Drive API**
3. **APIs & Services → OAuth consent screen** → External → fill in the app
   name and your email → under **Test users**, add your own Gmail address
   (the app can stay in "Testing" mode forever for personal use)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   Application type **Web application** → under **Authorized JavaScript
   origins** add the origin you open the app from, e.g.
   `https://<user>.github.io` (and `http://localhost:8000` for local testing)
5. In the app: **+ → Import from Gmail** → paste the client ID → Connect

Then sign in with Google when prompted; the app lists your newsletter emails
(default search `from:substack.com`, editable — any Gmail search works) and a
tap imports the cleaned article. Note the Gmail button needs the app to be
served from an origin you whitelisted — it won't work from `file://` or from
the claude.ai artifact preview (its sandbox blocks requests to Google).

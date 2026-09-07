# Jay Abraham transcript pipeline

Tooling to build a local, searchable transcript corpus from his **publicly
posted** material. Nothing has been run yet — see "Why nothing ran here".

## Why nothing ran here

This container has no outbound network. Every egress attempt is refused by the
proxy at CONNECT (`403 connect_rejected`) — verified against youtube.com,
abraham.com, asbn.com, substack.com, podnews.net and feeds.megaphone.fm. There
is also no `yt-dlp` and no `ffmpeg` installed. So the extraction has to run on
your machine; what's here is the pipeline to do it.

## Setup

```bash
pip install yt-dlp requests faster-whisper
# ffmpeg: brew install ffmpeg | apt install ffmpeg
```

## Use

```bash
# YouTube — captions only, no video bytes. Fast and cheap.
./pull_youtube.sh https://www.youtube.com/channel/UC545lneSsqkjNtd_LZIW43g
python3 vtt_to_txt.py transcripts/youtube

# Podcasts — inspect first, it's the expensive path
python3 pull_podcasts.py --apple-id 980277991 --list
python3 pull_podcasts.py --apple-id 980277991 --transcribe --since 2025-09-01
python3 pull_podcasts.py --apple-id 1677943587 --transcribe --limit 20
```

Both tools are resumable: `pull_youtube.sh` keeps a `--download-archive`, and
`pull_podcasts.py` skips episodes whose `.txt` already exists. Re-run to top up.

Output is one timestamped `.txt` per item, so the corpus greps cleanly:

```
[00:04:12] the biggest opportunity in your business is hidden in plain sight
```

## Cost, realistically

YouTube captions are minutes of work — they already exist, you're just fetching
them. Podcasts are not: no transcripts published, so it's download + local ASR
at roughly 1x realtime on CPU (much faster on GPU). The Ultimate Entrepreneur
alone is ~326 episodes; at ~45min each that's ~240 hours of audio. Start with
`--since` or `--limit`, confirm the output is usable, then widen.

## Scope

Two things worth being deliberate about:

**"Everything ever said" isn't reachable.** He's been working since the 1970s.
Seminars, mastermind rooms, consulting calls, and most of the pre-2010 catalogue
were never posted publicly or exist only as paid product. What's actually
retrievable is the public media layer — podcasts, YouTube, ASBN, newsletters.
That's a real corpus, but it's a slice, not the whole.

**This targets free, publicly posted material only.** `sources.yaml`
deliberately excludes Abraham University / Small Moves course content, the
mastermind material, and the paid jAI tier — those are the products he sells.
Pulling public captions and free podcast feeds for personal research and
analysis is ordinary; systematically ripping paywalled courses is not, and this
pipeline isn't pointed at them. Keep the output local and don't republish it.

## Files

| File | Purpose |
|---|---|
| `sources.yaml` | Source manifest — channels, Apple IDs, web sources |
| `pull_youtube.sh` | yt-dlp caption fetch, no media download |
| `pull_podcasts.py` | RSS resolve → list / download / ASR transcribe |
| `vtt_to_txt.py` | VTT → timestamped text, rolling-window dedupe |

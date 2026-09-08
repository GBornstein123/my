#!/usr/bin/env python3
"""Resolve a podcast RSS feed, list/download episodes, and transcribe them.

Podcasts almost never ship transcripts, so this is the expensive path: download
audio, run local ASR. Budget roughly 1x realtime on CPU with faster-whisper
`base`, far less on GPU.

  # 1. see what's there (no downloads)
  python3 pull_podcasts.py --apple-id 980277991 --list

  # 2. fetch + transcribe
  python3 pull_podcasts.py --apple-id 980277991 --transcribe --limit 25

Deps: pip install requests faster-whisper   (plus ffmpeg on PATH)
"""
import argparse
import json
import re
import shutil
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

UA = {"User-Agent": "Mozilla/5.0 (transcript-archiver; personal research)"}


def get(url, timeout=60):
    return urllib.request.urlopen(
        urllib.request.Request(url, headers=UA), timeout=timeout
    ).read()


def download(url, dest, timeout=600):
    """Stream to a .part file, then rename.

    Episodes run to hundreds of MB, so this never buffers a whole one in
    memory; the rename means an interrupted run leaves no truncated audio
    that the next run would mistake for a finished download.
    """
    part = dest.with_name(dest.name + ".part")
    with urllib.request.urlopen(
        urllib.request.Request(url, headers=UA), timeout=timeout
    ) as r, part.open("wb") as f:
        shutil.copyfileobj(r, f, 1 << 20)
    part.replace(dest)


def feed_from_apple_id(apple_id):
    """Apple's public lookup API returns the real RSS URL — avoids guessing."""
    data = json.loads(get(f"https://itunes.apple.com/lookup?id={apple_id}&entity=podcast"))
    results = data.get("results") or []
    if not results or not results[0].get("feedUrl"):
        sys.exit(f"no feedUrl for Apple ID {apple_id}")
    return results[0]["feedUrl"], results[0].get("collectionName", "")


def parse_feed(feed_url):
    root = ET.fromstring(get(feed_url))
    episodes = []
    for item in root.iter("item"):
        def text(tag):
            el = item.find(tag)
            return (el.text or "").strip() if el is not None and el.text else ""

        enc = item.find("enclosure")
        audio = enc.get("url") if enc is not None else ""
        if not audio:
            continue

        pub, raw = "", text("pubDate")
        if raw:
            try:
                pub = parsedate_to_datetime(raw).strftime("%Y-%m-%d")
            except (TypeError, ValueError):
                pub = raw[:16]

        episodes.append({"date": pub, "title": text("title"), "audio": audio})
    return episodes


def slug(s, n=120):
    """Filesystem-safe stem, truncated to `n` *bytes*.

    Character-based truncation overflowed the 255-byte name limit on titles
    with accented or CJK text once the date prefix and extension were added.
    """
    s = re.sub(r"[^\w\s-]", "", s).strip()
    s = re.sub(r"[\s_-]+", "-", s)
    return s.encode()[:n].decode(errors="ignore").rstrip("-") or "untitled"


def hms(seconds):
    """Offset into the audio as H:MM:SS -- not a wall-clock time."""
    s = int(seconds)
    return f"{s // 3600:02d}:{s // 60 % 60:02d}:{s % 60:02d}"


def transcribe(audio_path, out_path, model):
    """Write via a .part file so a mid-run ASR failure leaves no partial
    transcript -- one would otherwise be treated as done on the next run."""
    segments, _ = model.transcribe(str(audio_path), vad_filter=True)
    part = out_path.with_name(out_path.name + ".part")
    with part.open("w", encoding="utf-8") as f:
        f.write(f"# source: {audio_path.name}\n\n")
        for seg in segments:
            f.write(f"[{hms(seg.start)}] {seg.text.strip()}\n")
    part.replace(out_path)


def main():
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--apple-id", help="Apple Podcasts collection ID")
    src.add_argument("--feed", help="direct RSS URL")
    ap.add_argument("--out", default="transcripts/podcasts")
    ap.add_argument("--limit", type=int, help="only the N most recent episodes")
    ap.add_argument("--since", help="skip episodes before YYYY-MM-DD")
    ap.add_argument("--list", action="store_true", help="print episodes and exit")
    ap.add_argument("--transcribe", action="store_true")
    ap.add_argument("--model", default="base", help="faster-whisper size")
    ap.add_argument("--keep-audio", action="store_true")
    args = ap.parse_args()

    if args.apple_id:
        feed_url, name = feed_from_apple_id(args.apple_id)
        print(f"{name}\n  feed: {feed_url}")
    else:
        feed_url = args.feed

    eps = parse_feed(feed_url)
    # --limit means "most recent N", so order explicitly: feeds are usually
    # newest-first but nothing guarantees it.
    eps.sort(key=lambda e: e["date"], reverse=True)
    if args.since:
        eps = [e for e in eps if e["date"] >= args.since]
    if args.limit:
        eps = eps[: args.limit]
    print(f"  {len(eps)} episode(s) selected\n")

    if args.list or not args.transcribe:
        for e in eps:
            print(f"  {e['date'] or '????-??-??'}  {e['title']}")
        if not args.transcribe:
            print("\n(add --transcribe to download and transcribe)")
        return

    from faster_whisper import WhisperModel  # imported late: heavy, optional

    print(f"loading whisper '{args.model}'...")
    model = WhisperModel(args.model, compute_type="int8")

    outdir = Path(args.out)
    outdir.mkdir(parents=True, exist_ok=True)

    for i, e in enumerate(eps, 1):
        stem = f"{e['date'] or 'undated'}_{slug(e['title'])}"
        txt = outdir / f"{stem}.txt"
        if txt.exists():
            print(f"[{i}/{len(eps)}] skip (done): {stem}")
            continue

        ext = Path(urllib.parse.urlparse(e["audio"]).path).suffix or ".mp3"
        audio = outdir / f"{stem}{ext}"
        print(f"[{i}/{len(eps)}] {e['title']}")
        try:
            if not audio.exists():
                print("    downloading...")
                download(e["audio"], audio)
            print("    transcribing...")
            transcribe(audio, txt, model)
            print(f"    -> {txt.name}")
        except Exception as exc:                      # keep going through the feed
            print(f"    FAILED: {exc}")
            continue
        finally:
            if audio.exists() and not args.keep_audio and txt.exists():
                audio.unlink()


if __name__ == "__main__":
    main()

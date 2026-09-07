#!/usr/bin/env python3
"""Convert .vtt captions to clean, timestamped plain text.

YouTube auto-captions use a rolling two-line window, so naive extraction
duplicates nearly every word. This dedupes by tracking what's already emitted.

Usage: python3 vtt_to_txt.py <dir-or-file> [...]
"""
import re
import sys
from pathlib import Path

TAG = re.compile(r"<[^>]+>")
CUE = re.compile(r"(\d{2}:\d{2}:\d{2})\.\d{3}\s+-->")


def parse(vtt: str):
    """Yield (timestamp, text) for each cue, with rolling-window dupes removed."""
    blocks, ts, buf = [], None, []
    for line in vtt.splitlines():
        line = line.strip()
        m = CUE.match(line)
        if m:
            if ts and buf:
                blocks.append((ts, " ".join(buf)))
            ts, buf = m.group(1), []
        elif line and not line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")):
            txt = TAG.sub("", line).strip()
            if txt:
                buf.append(txt)
    if ts and buf:
        blocks.append((ts, " ".join(buf)))

    emitted, out = "", []
    for ts, text in blocks:
        # Auto-caption cues repeat the tail of the previous cue. Keep only the
        # longest suffix of `text` that isn't already at the end of `emitted`.
        new = text
        for n in range(len(text), 0, -1):
            if emitted.endswith(text[:n]):
                new = text[n:]
                break
        new = new.strip()
        if new:
            out.append((ts, new))
            emitted = (emitted + " " + new)[-500:]
    return out


def convert(path: Path):
    cues = parse(path.read_text(encoding="utf-8", errors="replace"))
    if not cues:
        return None
    dest = path.with_suffix("").with_suffix(".txt")
    body = "\n".join(f"[{ts}] {text}" for ts, text in cues)
    dest.write_text(f"# source: {path.name}\n\n{body}\n", encoding="utf-8")
    return dest


def main(args):
    files = []
    for a in args:
        p = Path(a)
        files.extend(sorted(p.rglob("*.vtt")) if p.is_dir() else [p])
    if not files:
        sys.exit("no .vtt files found")
    for f in files:
        dest = convert(f)
        print(f"{'ok  ' if dest else 'skip'} {f.name}" + (f" -> {dest.name}" if dest else ""))
    print(f"\n{len(files)} file(s) processed")


if __name__ == "__main__":
    main(sys.argv[1:] or ["transcripts"])

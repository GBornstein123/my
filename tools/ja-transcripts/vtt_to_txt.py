#!/usr/bin/env python3
"""Convert .vtt captions to clean, timestamped plain text.

YouTube auto-captions use a rolling two-line window, so naive extraction
duplicates nearly every word. This dedupes by tracking what's already emitted.

Usage: python3 vtt_to_txt.py <dir-or-file> [...]
"""
import difflib
import re
import sys
from collections import deque
from pathlib import Path

TAG = re.compile(r"<[^>]+>")
CUE = re.compile(r"(\d{2}:\d{2}:\d{2})\.\d{3}\s+-->")
# Blocks that carry metadata, never caption text.
SKIP_BLOCK = ("WEBVTT", "NOTE", "STYLE", "REGION")
# How many recent lines to remember when spotting rolling-window repeats.
WINDOW = 12
# Similarity above which a line is treated as the recognizer *revising* an
# earlier line rather than saying something new. Tuned to catch
# "opportunity" -> "opportunities" while leaving "say yes" / "say no" alone.
REVISION_RATIO = 0.90


def clean(line: str) -> str:
    """Strip inline timing tags/markup and collapse whitespace."""
    return re.sub(r"\s+", " ", TAG.sub("", line)).strip()


def cues(vtt: str):
    """Yield (timestamp, [payload lines]) per cue block.

    WEBVTT separates blocks by blank lines. A cue may carry an optional
    identifier line ahead of its timing line, and NOTE/STYLE/REGION blocks
    carry no caption text at all -- both used to leak into the output.
    """
    # Split on genuinely empty lines only: YouTube uses a space-only line as a
    # placeholder *inside* a cue, so treating it as a separator loses text.
    for raw in re.split(r"\r?\n\r?\n", vtt):
        lines = [ln for ln in (l.strip() for l in raw.splitlines()) if ln]
        if not lines or lines[0].startswith(SKIP_BLOCK):
            continue
        for i, line in enumerate(lines):
            m = CUE.match(line)
            if m:  # anything before the timing line is the cue identifier
                payload = [c for c in (clean(l) for l in lines[i + 1:]) if c]
                if payload:
                    yield m.group(1), payload
                break


def revises(prev: str, cur: str) -> bool:
    """True if `cur` looks like a re-emission of `prev` with small edits."""
    if not prev or prev.split()[:1] != cur.split()[:1]:
        return False  # a revision always keeps its opening word
    return difflib.SequenceMatcher(None, prev.casefold(), cur.casefold()).ratio() >= REVISION_RATIO


def trim_overlap(emitted: str, text: str) -> str:
    """Drop the leading words of `text` that already end `emitted`."""
    words = text.split()
    tail = emitted.split()
    for n in range(min(len(words), len(tail)), 0, -1):
        if [w.casefold() for w in tail[-n:]] == [w.casefold() for w in words[:n]]:
            return " ".join(words[n:])
    return text


def parse(vtt: str):
    """Return [(timestamp, text)] with the rolling caption window collapsed."""
    out, recent, emitted = [], deque(maxlen=WINDOW), ""
    for ts, payload in cues(vtt):
        for line in payload:
            key = line.casefold()
            if key in recent:
                continue  # verbatim repeat from the rolling window
            recent.append(key)
            if out and revises(out[-1][1], line):
                prev = out[-1][1]
                out[-1] = (out[-1][0], line)  # supersede, don't append
                if emitted.endswith(prev):  # keep the overlap buffer in step
                    emitted = (emitted[: len(emitted) - len(prev)] + line)[-500:]
                continue
            new = trim_overlap(emitted, line).strip()
            if new:
                out.append((ts, new))
                emitted = (emitted + " " + new)[-500:]

    # Re-join lines that shared a cue, so manual subtitles read as prose.
    merged = []
    for ts, text in out:
        if merged and merged[-1][0] == ts:
            merged[-1] = (ts, f"{merged[-1][1]} {text}")
        else:
            merged.append((ts, text))
    return merged


def convert(path: Path):
    cues_ = parse(path.read_text(encoding="utf-8", errors="replace"))
    if not cues_:
        return None
    # Keep any language tag (.en / .en-orig) in the name: stripping it made
    # two subtitle tracks for one video collide on a single .txt.
    dest = path.with_suffix(".txt")
    body = "\n".join(f"[{ts}] {text}" for ts, text in cues_)
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

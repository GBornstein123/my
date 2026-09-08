#!/usr/bin/env bash
# Pull existing captions (manual + auto) for a YouTube channel. Downloads NO video.
# Usage: ./pull_youtube.sh <channel-url> [outdir]
set -euo pipefail

CHANNEL="${1:?usage: pull_youtube.sh <channel-url> [outdir]}"
OUT="${2:-transcripts/youtube}"
mkdir -p "$OUT"

# --skip-download: captions only, no media bytes.
# Sleep interval keeps this polite and avoids rate-limit blocks on big channels.
# --ignore-errors still exits non-zero when any video was skipped (private,
# members-only, age-gated), which on a channel of any size is every run. Let
# that through instead of tripping `set -e` on an otherwise successful pull.
yt-dlp \
  --skip-download \
  --write-subs --write-auto-subs \
  --sub-langs "en.*" --sub-format vtt \
  --write-info-json \
  --download-archive "$OUT/.archive" \
  --sleep-requests 2 \
  --ignore-errors \
  -o "$OUT/%(upload_date>%Y-%m-%d)s_%(id)s_%(title).120B.%(ext)s" \
  "$CHANNEL" || rc=$?

if [ "${rc:-0}" -ne 0 ]; then
  echo "note: yt-dlp exited $rc — some videos were skipped; captions above are still usable." >&2
fi

echo "Captions in $OUT. Convert to plain text with: python3 vtt_to_txt.py $OUT"

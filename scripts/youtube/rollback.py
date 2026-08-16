#!/usr/bin/env python3
"""Restore YouTube video fields from a bulk_update.py snapshot.

    python3 rollback.py runs/20260816-141500/snapshot.jsonl          # preview
    python3 rollback.py runs/20260816-141500/snapshot.jsonl --apply  # restore

Restoring costs the same 50 quota units per video as the original update, so
undoing 200 videos needs a fresh day's quota.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))

from youtube import (  # noqa: E402
    COST_UPDATE, DAILY_QUOTA, Credentials, QuotaExceeded, YouTubeClient, YouTubeError,
)

HERE = Path(__file__).resolve().parent


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("snapshot")
    p.add_argument("--client-secrets", default=os.environ.get("YOUTUBE_CLIENT_SECRETS", str(HERE / "client_secrets.json")))
    p.add_argument("--token-file", default=os.environ.get("YOUTUBE_TOKEN_FILE", str(HERE / ".token.json")))
    p.add_argument("--base-url", default=os.environ.get("YOUTUBE_BASE_URL", "https://www.googleapis.com/youtube/v3"))
    p.add_argument("--quota-budget", type=int, default=DAILY_QUOTA)
    p.add_argument("--apply", action="store_true", help="Actually restore (default: preview)")
    p.add_argument("--yes", action="store_true")
    args = p.parse_args(argv)

    records = []
    for line in Path(args.snapshot).read_text().splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        if record.get("applied") and record.get("before"):
            records.append(record)

    if not records:
        print("Nothing to roll back: no applied changes in this snapshot.")
        return 0

    print(f"{len(records)} videos to restore from {args.snapshot}")
    for record in records:
        print(f"- {record.get('title')}  [{record['video_id']}]")
        for field, value in record["before"].items():
            print(f"    {field} <- {value[:100]!r}...")

    print(f"\nQuota needed: {len(records) * COST_UPDATE} units of {args.quota_budget}")
    if not args.apply:
        print("PREVIEW. Re-run with --apply to restore.")
        return 0

    if not args.yes and sys.stdin.isatty():
        if input(f"\nRestore {len(records)} videos? [y/N] ").strip().lower() not in ("y", "yes"):
            print("Aborted.")
            return 1

    credentials = Credentials(Path(args.client_secrets), Path(args.token_file))
    client = YouTubeClient(credentials, quota_budget=args.quota_budget, base_url=args.base_url)

    restored, failures = 0, 0
    for record in records:
        try:
            # Re-read the current snippet so the restore preserves tags and any
            # other fields that changed since the run.
            current = client.videos([record["video_id"]])
            if not current:
                print(f"MISSING  {record['video_id']} (deleted or not visible)")
                failures += 1
                continue
            client.update_snippet(current[0], record["before"])
            restored += 1
            print(f"restored {record['video_id']}")
        except QuotaExceeded as exc:
            print(f"\n{exc}")
            print(f"Restored {restored}/{len(records)} before running out. Re-run tomorrow.")
            return 3
        except YouTubeError as exc:
            failures += 1
            print(f"FAILED   {record['video_id']}  {exc}")

    print(f"\nRestored {restored}/{len(records)} videos, {client.quota_used} quota units used")
    return 1 if failures else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except YouTubeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(2)

#!/usr/bin/env python3
"""Restore episode fields from a bulk_update.py snapshot.

    python3 rollback.py runs/20260816-141500/snapshot.jsonl          # preview
    python3 rollback.py runs/20260816-141500/snapshot.jsonl --apply  # restore

Only episodes the run actually wrote (`applied: true`) are restored, and each
field is written back to the exact value recorded before the run.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))

from simplecast import SimplecastClient, SimplecastError, flatten  # noqa: E402


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("snapshot", help="snapshot.jsonl written by bulk_update.py --apply")
    p.add_argument("--token", default=os.environ.get("SIMPLECAST_API_TOKEN"))
    p.add_argument("--base-url", default=os.environ.get("SIMPLECAST_BASE_URL", "https://api.simplecast.com"))
    p.add_argument("--rate", type=float, default=3.0)
    p.add_argument("--update-method", choices=["auto", "patch", "post", "put"], default="auto")
    p.add_argument("--apply", action="store_true", help="Actually restore (default: preview)")
    p.add_argument("--yes", action="store_true")
    args = p.parse_args(argv)

    records = []
    for line in Path(args.snapshot).read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        record = json.loads(line)
        if record.get("applied") and record.get("before"):
            records.append(record)

    if not records:
        print("Nothing to roll back: no applied changes in this snapshot.")
        return 0

    print(f"{len(records)} episodes to restore from {args.snapshot}")
    for record in records:
        print(f"- {record.get('title')}  [{record['episode_id']}]")
        for field, value in record["before"].items():
            print(f"    {field} <- {flatten(value)[:120]!r}")

    if not args.apply:
        print("\nPREVIEW. Re-run with --apply to restore.")
        return 0

    if not args.yes and sys.stdin.isatty():
        if input(f"\nRestore {len(records)} episodes? [y/N] ").strip().lower() not in ("y", "yes"):
            print("Aborted.")
            return 1

    client = SimplecastClient(token=args.token or "", base_url=args.base_url,
                              requests_per_second=args.rate, update_method=args.update_method)
    restored, failures = 0, 0
    for record in records:
        try:
            client.update_episode(record["episode_id"], record["before"])
            restored += 1
            print(f"restored {record['episode_id']}")
        except SimplecastError as exc:
            failures += 1
            print(f"FAILED   {record['episode_id']}  {exc}")

    print(f"\nRestored {restored}/{len(records)} episodes")
    return 1 if failures else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SimplecastError as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(2)

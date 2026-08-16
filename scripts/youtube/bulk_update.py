#!/usr/bin/env python3
"""Bulk-edit YouTube video descriptions and titles.

Dry run by default. Applied changes are snapshotted before the write, so
rollback.py can restore the previous descriptions exactly.

Built for adding an affiliate-link / CTA block to a back catalog:

    # preview
    python3 bulk_update.py --append-description-file affiliate-block.txt

    # canary, then the rest
    python3 bulk_update.py --append-description-file affiliate-block.txt --apply --limit 3
    python3 bulk_update.py --append-description-file affiliate-block.txt --apply

Quota note: updates cost 50 units against a default 10,000/day budget, so
roughly 200 videos per day. The run meters itself and stops cleanly before
overrunning; re-run with --resume after the quota resets (midnight Pacific).
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import difflib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent))

from youtube import (  # noqa: E402
    COST_UPDATE, DAILY_QUOTA, DESCRIPTION_MAX, TITLE_MAX,
    Credentials, QuotaExceeded, YouTubeClient, YouTubeError, preflight,
)

HERE = Path(__file__).resolve().parent
RUNS_DIR = HERE / "runs"

# Exit codes: 0 ok | 1 some writes failed | 2 fatal | 3 stopped on quota
# | 4 finished, but some videos were skipped as unwritable (see SKIP lines)
EXIT_BLOCKED = 4


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Bulk-edit YouTube video metadata (dry run unless --apply).",
        formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)

    auth = p.add_argument_group("auth")
    auth.add_argument("--client-secrets", default=os.environ.get("YOUTUBE_CLIENT_SECRETS", str(HERE / "client_secrets.json")),
                      help="OAuth client JSON from Google Cloud Console (Desktop app type)")
    auth.add_argument("--token-file", default=os.environ.get("YOUTUBE_TOKEN_FILE", str(HERE / ".token.json")),
                      help="Where the refresh token is cached")
    auth.add_argument("--channel-id", help="Channel to edit (default: the authorized account's own channel)")
    auth.add_argument("--base-url", default=os.environ.get("YOUTUBE_BASE_URL", "https://www.googleapis.com/youtube/v3"))

    sel = p.add_argument_group("video selection")
    sel.add_argument("--match-title", help="Only videos whose title matches this regex")
    sel.add_argument("--match-description", help="Only videos whose description matches this regex")
    sel.add_argument("--exclude-title", help="Skip videos whose title matches this regex")
    sel.add_argument("--exclude-description", help="Skip videos whose description matches this regex")
    sel.add_argument("--published-after", help="YYYY-MM-DD")
    sel.add_argument("--published-before", help="YYYY-MM-DD")
    sel.add_argument("--ids-file", help="File of video ids, one per line")
    sel.add_argument("--newest", type=int, help="Only the N most recent selected videos")
    sel.add_argument("--oldest", type=int, help="Only the N oldest selected videos")
    sel.add_argument("--include-private", action="store_true",
                     help="Include private/unlisted videos (default: public only)")

    edit = p.add_argument_group("edits")
    edit.add_argument("--append-description", help="Text appended to the description")
    edit.add_argument("--prepend-description", help="Text inserted above the description")
    edit.add_argument("--append-description-file", help="Read --append-description from a file")
    edit.add_argument("--prepend-description-file", help="Read --prepend-description from a file")
    edit.add_argument("--replace-description", action="append", default=[], metavar="RE=>REPL",
                      help="Regex substitution on the description; repeatable")
    edit.add_argument("--replace-title", action="append", default=[], metavar="RE=>REPL",
                      help="Regex substitution on the title; repeatable")
    edit.add_argument("--title-prefix", help="Text prepended to the title")
    edit.add_argument("--title-suffix", help="Text appended to the title")
    edit.add_argument("--marker", help="Skip a video if this text is already in the description "
                                       "(default: the appended text itself)")
    edit.add_argument("--no-marker", action="store_true", help="Disable idempotency checking")

    run = p.add_argument_group("run control")
    run.add_argument("--apply", action="store_true", help="Actually write changes (default: dry run)")
    run.add_argument("--yes", action="store_true", help="Skip the confirmation prompt")
    run.add_argument("--limit", type=int, help="Stop after N changed videos (canary run)")
    run.add_argument("--quota-budget", type=int, default=DAILY_QUOTA,
                     help=f"Units this run may spend (default {DAILY_QUOTA})")
    run.add_argument("--run-dir", help="Where to write snapshot/report")
    run.add_argument("--resume", help="Snapshot from an interrupted run; already-updated ids are skipped")
    run.add_argument("--diff-lines", type=int, default=6, help="Context lines per diff (0 = no diff)")
    run.add_argument("--quiet", action="store_true")

    args = p.parse_args(argv)

    for flag, target in (("append_description_file", "append_description"),
                         ("prepend_description_file", "prepend_description")):
        path = getattr(args, flag)
        if path:
            if getattr(args, target):
                p.error(f"--{target.replace('_', '-')} and --{flag.replace('_', '-')} are mutually exclusive")
            setattr(args, target, Path(path).read_text())

    if not any([args.append_description, args.prepend_description, args.replace_description,
                args.replace_title, args.title_prefix, args.title_suffix]):
        p.error("No edit requested. Pass at least one edit flag (see --help).")
    return args


def parse_substitution(raw: str) -> Tuple[re.Pattern, str]:
    if "=>" not in raw:
        raise SystemExit(f"Bad substitution {raw!r}: expected 'PATTERN=>REPLACEMENT'")
    pattern, replacement = raw.split("=>", 1)
    if not pattern:
        raise SystemExit(f"Bad substitution {raw!r}: empty pattern")
    return re.compile(pattern, re.MULTILINE), replacement


def parse_date(value: Optional[str]) -> Optional[dt.date]:
    if not value:
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        raise SystemExit(f"Bad date {value!r}: expected YYYY-MM-DD")


def published_date(video: dict) -> Optional[dt.date]:
    raw = (video.get("snippet") or {}).get("publishedAt")
    if not raw:
        return None
    try:
        return dt.datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def select(videos: List[dict], args: argparse.Namespace) -> List[dict]:
    ids: Optional[set] = None
    if args.ids_file:
        ids = {ln.split("#", 1)[0].strip() for ln in Path(args.ids_file).read_text().splitlines()}
        ids.discard("")

    after, before = parse_date(args.published_after), parse_date(args.published_before)
    match_title = re.compile(args.match_title, re.I) if args.match_title else None
    match_desc = re.compile(args.match_description, re.I | re.S) if args.match_description else None
    skip_title = re.compile(args.exclude_title, re.I) if args.exclude_title else None
    skip_desc = re.compile(args.exclude_description, re.I | re.S) if args.exclude_description else None

    kept = []
    for video in videos:
        snippet = video.get("snippet") or {}
        title = snippet.get("title") or ""
        body = snippet.get("description") or ""
        privacy = (video.get("status") or {}).get("privacyStatus", "public")
        date = published_date(video)

        if ids is not None and video.get("id") not in ids:
            continue
        if not args.include_private and privacy != "public":
            continue
        if after and (date is None or date < after):
            continue
        if before and (date is None or date > before):
            continue
        if match_title and not match_title.search(title):
            continue
        if match_desc and not match_desc.search(body):
            continue
        if skip_title and skip_title.search(title):
            continue
        if skip_desc and skip_desc.search(body):
            continue
        kept.append(video)

    kept.sort(key=lambda v: published_date(v) or dt.date.min)
    if args.oldest:
        kept = kept[: args.oldest]
    if args.newest:
        kept = kept[-args.newest:]
    return kept


def _already_has(text: str, args: argparse.Namespace, addition: str) -> bool:
    if args.no_marker:
        return False
    marker = (args.marker or addition).strip()
    return bool(marker) and marker in text


def build_changes(video: dict, args, desc_subs, title_subs) -> Dict[str, Tuple[str, str]]:
    snippet = video.get("snippet") or {}
    original = {"description": snippet.get("description") or "", "title": snippet.get("title") or ""}
    new = dict(original)

    for pattern, replacement in desc_subs:
        new["description"] = pattern.sub(replacement, new["description"])
    for pattern, replacement in title_subs:
        new["title"] = pattern.sub(replacement, new["title"])

    if args.prepend_description and not _already_has(new["description"], args, args.prepend_description):
        new["description"] = args.prepend_description + new["description"]
    if args.append_description and not _already_has(new["description"], args, args.append_description):
        new["description"] = new["description"] + args.append_description
    if args.title_prefix and not _already_has(new["title"], args, args.title_prefix):
        new["title"] = args.title_prefix + new["title"]
    if args.title_suffix and not _already_has(new["title"], args, args.title_suffix):
        new["title"] = new["title"] + args.title_suffix

    return {f: (original[f], new[f]) for f in new if new[f] != original[f]}


def render_diff(field: str, before: str, after: str, context: int) -> str:
    if context <= 0:
        return ""
    diff = difflib.unified_diff(before.splitlines(), after.splitlines(),
                                fromfile=f"{field} (before)", tofile=f"{field} (after)",
                                lineterm="", n=context)
    return "\n".join(f"    {line}" for line in diff)


def load_resume_ids(path: Optional[str]) -> set:
    if not path:
        return set()
    done = set()
    for line in Path(path).read_text().splitlines():
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        if record.get("applied"):
            done.add(record.get("video_id"))
    return done


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    log = (lambda *a: None) if args.quiet else print

    desc_subs = [parse_substitution(r) for r in args.replace_description]
    title_subs = [parse_substitution(r) for r in args.replace_title]

    credentials = Credentials(Path(args.client_secrets), Path(args.token_file), log=log)
    client = YouTubeClient(credentials, quota_budget=args.quota_budget, base_url=args.base_url, log=log)

    playlist_id = client.uploads_playlist_id(args.channel_id)
    ids = list(client.video_ids(playlist_id))
    log(f"Channel uploads: {len(ids)} videos")
    videos = client.videos(ids)

    targets = select(videos, args)
    already_done = load_resume_ids(args.resume)
    if already_done:
        targets = [v for v in targets if v.get("id") not in already_done]
        log(f"Resuming: skipping {len(already_done)} videos already updated")
    log(f"Selected {len(targets)} videos after filters")

    run_dir = Path(args.run_dir) if args.run_dir else RUNS_DIR / dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir.mkdir(parents=True, exist_ok=True)
    snapshot_path, report_path = run_dir / "snapshot.jsonl", run_dir / "report.csv"

    planned: List[Tuple[dict, Dict[str, Tuple[str, str]]]] = []
    blocked: List[Tuple[dict, str]] = []
    for video in targets:
        changes = build_changes(video, args, desc_subs, title_subs)
        if not changes:
            continue
        merged = {**(video.get("snippet") or {}), **{f: a for f, (_, a) in changes.items()}}
        try:
            preflight(video.get("id", "?"), merged)
        except YouTubeError as exc:
            blocked.append((video, str(exc)))
            continue
        planned.append((video, changes))
        if args.limit and len(planned) >= args.limit:
            break

    for video, problem in blocked:
        log(f"SKIP  {video['id']}  {(video.get('snippet') or {}).get('title')}\n      {problem}")

    log(f"\n{len(planned)} videos would change; {len(targets) - len(planned) - len(blocked)} already match; "
        f"{len(blocked)} skipped as unwritable")
    if not planned:
        log("Nothing to do.")
        return EXIT_BLOCKED if blocked else 0

    for video, changes in planned:
        snippet = video.get("snippet") or {}
        log(f"\n- {snippet.get('title')}  [{video['id']}]")
        for field, (before, after) in changes.items():
            log(f"  {field}: {len(before)} -> {len(after)} chars"
                + (f" (limit {DESCRIPTION_MAX})" if field == "description" else f" (limit {TITLE_MAX})"))
            diff = render_diff(field, before, after, args.diff_lines)
            if diff:
                log(diff)

    cost = len(planned) * COST_UPDATE
    spent = client.quota_used
    log(f"\nQuota: {spent} units used reading; {cost} more to apply "
        f"({len(planned)} x {COST_UPDATE}) = {spent + cost} of {args.quota_budget}")
    if spent + cost > args.quota_budget:
        affordable = max(0, (args.quota_budget - spent) // COST_UPDATE)
        log(f"That exceeds the budget. This run will stop after ~{affordable} videos; "
            f"re-run with --resume {snapshot_path} after the quota resets (midnight Pacific).")

    if not args.apply:
        log(f"\nDRY RUN. Re-run with --apply to write these {len(planned)} changes.")
        write_report(report_path, planned, applied=False, errors={})
        log(f"Plan written to {report_path}")
        return EXIT_BLOCKED if blocked else 0

    if not args.yes and sys.stdin.isatty():
        if input(f"\nApply {len(planned)} video updates? [y/N] ").strip().lower() not in ("y", "yes"):
            log("Aborted.")
            return 1

    errors: Dict[str, str] = {}
    applied = 0
    stopped_on_quota = False
    with snapshot_path.open("w") as snap:
        for video, changes in planned:
            video_id = video["id"]
            record = {
                "video_id": video_id,
                "title": (video.get("snippet") or {}).get("title"),
                "before": {f: b for f, (b, _) in changes.items()},
                "after": {f: a for f, (_, a) in changes.items()},
                "applied": False,
                "at": dt.datetime.now(dt.timezone.utc).isoformat(),
            }
            try:
                client.update_snippet(video, record["after"])
                record["applied"] = True
                applied += 1
                log(f"updated {video_id}  {record['title']}")
            except QuotaExceeded as exc:
                log(f"\n{exc}")
                stopped_on_quota = True
                snap.write(json.dumps(record) + "\n")
                break
            except YouTubeError as exc:
                errors[video_id] = str(exc)
                record["error"] = str(exc)
                log(f"FAILED  {video_id}  {exc}")
            finally:
                if not stopped_on_quota:
                    snap.write(json.dumps(record) + "\n")
                    snap.flush()

    write_report(report_path, planned, applied=True, errors=errors)
    log(f"\nApplied {applied}/{len(planned)} updates, {client.quota_used} quota units used")
    log(f"Snapshot: {snapshot_path}")
    log(f"Report:   {report_path}")
    if stopped_on_quota:
        log(f"Stopped on quota. Continue tomorrow with: --resume {snapshot_path} --apply")
        return 3
    if errors:
        log(f"{len(errors)} failures. Re-run with --resume {snapshot_path}")
        return 1
    log(f"Roll back with: python3 {HERE / 'rollback.py'} {snapshot_path} --apply")
    return EXIT_BLOCKED if blocked else 0


def write_report(path: Path, planned, applied: bool, errors: Dict[str, str]) -> None:
    with path.open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["video_id", "url", "title", "field", "before", "after", "status", "error"])
        for video, changes in planned:
            video_id = video.get("id", "")
            status = "planned"
            if applied:
                status = "failed" if video_id in errors else "applied"
            for field, (before, after) in changes.items():
                writer.writerow([video_id, f"https://youtu.be/{video_id}",
                                 (video.get("snippet") or {}).get("title"),
                                 field, before, after, status, errors.get(video_id, "")])


if __name__ == "__main__":
    try:
        sys.exit(main())
    except YouTubeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(2)
    except KeyboardInterrupt:
        print("\ninterrupted", file=sys.stderr)
        sys.exit(130)

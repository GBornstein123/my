#!/usr/bin/env python3
"""Bulk-edit Simplecast episode metadata.

Dry run by default: nothing is written until you pass --apply. Every applied
change is snapshotted to a JSONL file first, so `rollback.py` can put the
catalog back exactly as it was.

Examples
--------
Preview a CTA appended to every published episode:

    python3 bulk_update.py --podcast "Open Loops" \
        --append-description-file cta.html

Actually write it, keeping a snapshot:

    python3 bulk_update.py --podcast "Open Loops" \
        --append-description-file cta.html --apply

Fix an old URL everywhere it appears:

    python3 bulk_update.py --podcast "Open Loops" \
        --replace-description 'openloopspod\\.com=>openloops.fm' --apply

Retitle only the last 50 episodes:

    python3 bulk_update.py --podcast "Open Loops" --newest 50 \
        --title-prefix 'Open Loops | ' --apply
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

from simplecast import SimplecastClient, SimplecastError, flatten  # noqa: E402

RUNS_DIR = Path(__file__).resolve().parent / "runs"
DESCRIPTION_FIELDS = ("description", "long_description")


# --------------------------------------------------------------------- config


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Bulk-edit Simplecast episode metadata (dry run unless --apply).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    conn = p.add_argument_group("connection")
    conn.add_argument("--token", default=os.environ.get("SIMPLECAST_API_TOKEN"),
                      help="API token (default: $SIMPLECAST_API_TOKEN)")
    conn.add_argument("--base-url", default=os.environ.get("SIMPLECAST_BASE_URL", "https://api.simplecast.com"))
    conn.add_argument("--podcast", default=os.environ.get("SIMPLECAST_PODCAST"),
                      help="Podcast title or id; optional if the token sees exactly one show")
    conn.add_argument("--rate", type=float, default=3.0, help="Max requests per second (default 3)")
    conn.add_argument("--update-method", choices=["auto", "patch", "post", "put"], default="auto",
                      help="HTTP verb for episode writes (default: probe once, then reuse)")

    sel = p.add_argument_group("episode selection")
    sel.add_argument("--match-title", help="Only episodes whose title matches this regex")
    sel.add_argument("--match-description", help="Only episodes whose description matches this regex")
    sel.add_argument("--exclude-title", help="Skip episodes whose title matches this regex")
    sel.add_argument("--exclude-description", help="Skip episodes whose description matches this regex")
    sel.add_argument("--published-after", help="YYYY-MM-DD")
    sel.add_argument("--published-before", help="YYYY-MM-DD")
    sel.add_argument("--season", type=int, help="Only this season number")
    sel.add_argument("--ids-file", help="File of episode ids, one per line (# comments allowed)")
    sel.add_argument("--include-drafts", action="store_true", help="Include unpublished episodes (default: skip)")
    sel.add_argument("--newest", type=int, help="Only the N most recent selected episodes")
    sel.add_argument("--oldest", type=int, help="Only the N oldest selected episodes")

    edit = p.add_argument_group("edits (applied in the order listed here)")
    edit.add_argument("--description-field", choices=list(DESCRIPTION_FIELDS) + ["auto"], default="auto",
                      help="Which body field to edit (default: whichever the episode actually uses)")
    edit.add_argument("--replace-description", action="append", default=[], metavar="RE=>REPL",
                      help="Regex substitution on the description; repeatable")
    edit.add_argument("--replace-title", action="append", default=[], metavar="RE=>REPL",
                      help="Regex substitution on the title; repeatable")
    edit.add_argument("--prepend-description", help="Text inserted before the description")
    edit.add_argument("--append-description", help="Text appended after the description")
    edit.add_argument("--prepend-description-file", help="Read --prepend-description from a file")
    edit.add_argument("--append-description-file", help="Read --append-description from a file")
    edit.add_argument("--title-prefix", help="Text prepended to the title")
    edit.add_argument("--title-suffix", help="Text appended to the title")
    edit.add_argument("--set", action="append", default=[], metavar="FIELD=VALUE",
                      help="Set any writable field literally (JSON value if parseable); repeatable")
    edit.add_argument("--marker",
                      help="Skip an episode if this text is already in the edited field "
                           "(default: the appended/prepended text itself, which makes reruns idempotent)")
    edit.add_argument("--no-marker", action="store_true", help="Disable idempotency checking")

    run = p.add_argument_group("run control")
    run.add_argument("--apply", action="store_true", help="Actually write changes (default: dry run)")
    run.add_argument("--yes", action="store_true", help="Skip the confirmation prompt when applying")
    run.add_argument("--limit", type=int, help="Stop after N changed episodes (useful for a canary run)")
    run.add_argument("--run-dir", help="Where to write snapshot/report (default: scripts/simplecast/runs/<timestamp>)")
    run.add_argument("--resume", help="Snapshot file from an interrupted run; already-updated ids are skipped")
    run.add_argument("--diff-lines", type=int, default=8, help="Context lines per diff in the preview (0 = no diff)")
    run.add_argument("--quiet", action="store_true", help="Only print the summary")

    args = p.parse_args(argv)

    for flag, target in (("prepend_description_file", "prepend_description"),
                         ("append_description_file", "append_description")):
        path = getattr(args, flag)
        if path:
            if getattr(args, target):
                p.error(f"--{target.replace('_', '-')} and --{flag.replace('_', '-')} are mutually exclusive")
            setattr(args, target, Path(path).read_text())

    if not any([args.replace_description, args.replace_title, args.prepend_description,
                args.append_description, args.title_prefix, args.title_suffix, args.set]):
        p.error("No edit requested. Pass at least one edit flag (see --help).")

    return args


def parse_substitution(raw: str) -> Tuple[re.Pattern, str]:
    if "=>" not in raw:
        raise SystemExit(f"Bad substitution {raw!r}: expected 'PATTERN=>REPLACEMENT'")
    pattern, replacement = raw.split("=>", 1)
    if not pattern:
        raise SystemExit(f"Bad substitution {raw!r}: empty pattern")
    return re.compile(pattern, re.MULTILINE), replacement


def parse_set(raw: str) -> Tuple[str, Any]:
    if "=" not in raw:
        raise SystemExit(f"Bad --set {raw!r}: expected FIELD=VALUE")
    field, value = raw.split("=", 1)
    try:
        return field, json.loads(value)
    except json.JSONDecodeError:
        return field, value


# ------------------------------------------------------------------ selection


def parse_date(value: Optional[str]) -> Optional[dt.date]:
    if not value:
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        raise SystemExit(f"Bad date {value!r}: expected YYYY-MM-DD")


def episode_date(episode: dict) -> Optional[dt.date]:
    for key in ("published_at", "scheduled_for", "updated_at", "created_at"):
        raw = episode.get(key)
        if isinstance(raw, str) and raw:
            try:
                return dt.datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
            except ValueError:
                continue
    return None


def is_published(episode: dict) -> bool:
    for key in ("is_published", "published"):
        if key in episode:
            return bool(episode[key])
    status = (episode.get("status") or "").lower()
    if status:
        return status == "published"
    return bool(episode.get("published_at"))


def select(episodes: List[dict], args: argparse.Namespace) -> List[dict]:
    ids: Optional[set] = None
    if args.ids_file:
        lines = Path(args.ids_file).read_text().splitlines()
        ids = {ln.split("#", 1)[0].strip() for ln in lines}
        ids.discard("")

    after, before = parse_date(args.published_after), parse_date(args.published_before)
    match_title = re.compile(args.match_title, re.I) if args.match_title else None
    match_desc = re.compile(args.match_description, re.I | re.S) if args.match_description else None
    skip_title = re.compile(args.exclude_title, re.I) if args.exclude_title else None
    skip_desc = re.compile(args.exclude_description, re.I | re.S) if args.exclude_description else None

    kept = []
    for ep in episodes:
        title = ep.get("title") or ""
        body = " ".join(flatten(ep.get(f)) for f in DESCRIPTION_FIELDS)
        date = episode_date(ep)

        if ids is not None and ep.get("id") not in ids:
            continue
        if not args.include_drafts and not is_published(ep):
            continue
        if args.season is not None and ep.get("season_number", ep.get("season")) != args.season:
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
        kept.append(ep)

    kept.sort(key=lambda e: (episode_date(e) or dt.date.min, e.get("number") or 0))
    if args.oldest:
        kept = kept[: args.oldest]
    if args.newest:
        kept = kept[-args.newest:]
    return kept


# --------------------------------------------------------------------- edits


def pick_description_field(episode: dict, preference: str) -> str:
    if preference != "auto":
        return preference
    for field in DESCRIPTION_FIELDS:
        if isinstance(episode.get(field), str) and episode[field].strip():
            return field
    return DESCRIPTION_FIELDS[0]


def build_changes(episode: dict, args: argparse.Namespace,
                  desc_subs, title_subs, sets) -> Dict[str, Tuple[Any, Any]]:
    """Return {field: (before, after)} for fields this episode would change."""
    desc_field = pick_description_field(episode, args.description_field)
    original = {
        desc_field: episode.get(desc_field) or "",
        "title": episode.get("title") or "",
    }
    new = dict(original)

    for pattern, replacement in desc_subs:
        new[desc_field] = pattern.sub(replacement, new[desc_field])
    for pattern, replacement in title_subs:
        new["title"] = pattern.sub(replacement, new["title"])

    if args.prepend_description and not _already_has(new[desc_field], args, args.prepend_description):
        new[desc_field] = args.prepend_description + new[desc_field]
    if args.append_description and not _already_has(new[desc_field], args, args.append_description):
        new[desc_field] = new[desc_field] + args.append_description
    if args.title_prefix and not _already_has(new["title"], args, args.title_prefix):
        new["title"] = args.title_prefix + new["title"]
    if args.title_suffix and not _already_has(new["title"], args, args.title_suffix):
        new["title"] = new["title"] + args.title_suffix

    changes = {f: (original[f], new[f]) for f in new if new[f] != original[f]}
    for field, value in sets:
        if episode.get(field) != value:
            changes[field] = (episode.get(field), value)
    return changes


def _already_has(text: str, args: argparse.Namespace, addition: str) -> bool:
    if args.no_marker:
        return False
    marker = (args.marker or addition).strip()
    return bool(marker) and marker in text


# ----------------------------------------------------------------- reporting


def render_diff(field: str, before: Any, after: Any, context: int) -> str:
    if context <= 0:
        return ""
    diff = difflib.unified_diff(
        flatten(before).splitlines(),
        flatten(after).splitlines(),
        fromfile=f"{field} (before)",
        tofile=f"{field} (after)",
        lineterm="",
        n=context,
    )
    return "\n".join(f"    {line}" for line in diff)


def load_resume_ids(path: Optional[str]) -> set:
    if not path:
        return set()
    done = set()
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        if record.get("applied"):
            done.add(record.get("episode_id"))
    return done


# ------------------------------------------------------------------ main run


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    log = (lambda *a: None) if args.quiet else print

    desc_subs = [parse_substitution(r) for r in args.replace_description]
    title_subs = [parse_substitution(r) for r in args.replace_title]
    sets = [parse_set(r) for r in args.set]

    client = SimplecastClient(
        token=args.token or "",
        base_url=args.base_url,
        requests_per_second=args.rate,
        update_method=args.update_method,
        log=log,
    )

    podcast = client.find_podcast(args.podcast)
    log(f"Podcast: {podcast.get('title')} ({podcast.get('id')})")

    all_episodes = list(client.list_episodes(podcast["id"]))
    log(f"Fetched {len(all_episodes)} episodes")

    targets = select(all_episodes, args)
    already_done = load_resume_ids(args.resume)
    if already_done:
        targets = [e for e in targets if e.get("id") not in already_done]
        log(f"Resuming: skipping {len(already_done)} episodes already updated")
    log(f"Selected {len(targets)} episodes after filters")

    run_dir = Path(args.run_dir) if args.run_dir else RUNS_DIR / dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir.mkdir(parents=True, exist_ok=True)
    snapshot_path = run_dir / "snapshot.jsonl"
    report_path = run_dir / "report.csv"

    planned: List[Tuple[dict, Dict[str, Tuple[Any, Any]]]] = []
    for episode in targets:
        changes = build_changes(episode, args, desc_subs, title_subs, sets)
        if changes:
            planned.append((episode, changes))
        if args.limit and len(planned) >= args.limit:
            break

    log(f"{len(planned)} episodes would change; {len(targets) - len(planned)} already match")
    if not planned:
        log("Nothing to do.")
        return 0

    for episode, changes in planned:
        log(f"\n- {episode.get('title')}  [{episode.get('id')}]")
        for field, (before, after) in changes.items():
            log(f"  {field}: {len(flatten(before))} -> {len(flatten(after))} chars")
            diff = render_diff(field, before, after, args.diff_lines)
            if diff:
                log(diff)

    if not args.apply:
        log(f"\nDRY RUN. Re-run with --apply to write these {len(planned)} changes.")
        write_report(report_path, planned, applied=False, errors={})
        log(f"Plan written to {report_path}")
        return 0

    if not args.yes and sys.stdin.isatty():
        answer = input(f"\nApply {len(planned)} episode updates to '{podcast.get('title')}'? [y/N] ")
        if answer.strip().lower() not in ("y", "yes"):
            log("Aborted.")
            return 1

    errors: Dict[str, str] = {}
    applied = 0
    with snapshot_path.open("w") as snap:
        for episode, changes in planned:
            episode_id = episode["id"]
            payload = {field: after for field, (_, after) in changes.items()}
            record = {
                "episode_id": episode_id,
                "title": episode.get("title"),
                "podcast_id": podcast.get("id"),
                "before": {field: before for field, (before, _) in changes.items()},
                "after": payload,
                "applied": False,
                "at": dt.datetime.now(dt.timezone.utc).isoformat(),
            }
            try:
                client.update_episode(episode_id, payload)
                record["applied"] = True
                applied += 1
                log(f"updated {episode_id}  {episode.get('title')}")
            except SimplecastError as exc:
                errors[episode_id] = str(exc)
                record["error"] = str(exc)
                log(f"FAILED  {episode_id}  {exc}")
            finally:
                snap.write(json.dumps(record) + "\n")
                snap.flush()

    write_report(report_path, planned, applied=True, errors=errors)
    log(f"\nApplied {applied}/{len(planned)} updates via {client.write_method or 'n/a'}"
        f" in {client.request_count} API calls")
    log(f"Snapshot: {snapshot_path}")
    log(f"Report:   {report_path}")
    if errors:
        log(f"{len(errors)} failures. Fix and re-run with --resume {snapshot_path}")
        return 1
    log(f"Roll back with: python3 {Path(__file__).parent / 'rollback.py'} {snapshot_path}")
    return 0


def write_report(path: Path, planned, applied: bool, errors: Dict[str, str]) -> None:
    with path.open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["episode_id", "title", "field", "before", "after", "status", "error"])
        for episode, changes in planned:
            episode_id = episode.get("id", "")
            status = "planned"
            if applied:
                status = "failed" if episode_id in errors else "applied"
            for field, (before, after) in changes.items():
                writer.writerow([episode_id, episode.get("title"), field,
                                 flatten(before), flatten(after), status, errors.get(episode_id, "")])


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SimplecastError as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(2)
    except KeyboardInterrupt:
        print("\ninterrupted", file=sys.stderr)
        sys.exit(130)

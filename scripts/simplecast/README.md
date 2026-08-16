# Simplecast bulk episode updates

Scripts for editing metadata across a whole Simplecast back catalog — append a CTA
to every show-notes body, fix a URL that appears in 300 descriptions, retitle a
season. Python 3.8+, standard library only, nothing to install.

There is no true bulk endpoint in the Simplecast API: bulk work means fetching
every episode and updating them one at a time. That's what these scripts do, with
the guardrails a 300-episode loop needs.

```
simplecast.py    API client: auth, pagination, throttling, retries, write-verb probe
bulk_update.py   the tool you run — select episodes, edit fields, dry run by default
rollback.py      restore from the snapshot a run wrote
runs/            per-run snapshot.jsonl + report.csv (gitignored)
```

## Setup

1. In Simplecast: **Settings → Private Apps → generate a token**.
2. Export it (do not commit it):

```bash
export SIMPLECAST_API_TOKEN='your-token'
export SIMPLECAST_PODCAST='Open Loops'   # optional if the token sees one show
```

3. Confirm the connection with a no-op dry run:

```bash
python3 scripts/simplecast/bulk_update.py --match-title 'zzz-no-match' --append-description 'test'
```

## How a job works

Every run is **dry by default**. It prints a unified diff per episode and writes a
plan to `runs/<timestamp>/report.csv`. Add `--apply` to write.

When applying, each episode's **prior values are snapshotted to
`runs/<timestamp>/snapshot.jsonl` before the write**, flushed line by line, so an
interrupted run is still fully reversible.

```bash
# 1. preview
python3 scripts/simplecast/bulk_update.py --append-description-file cta.html

# 2. canary — apply to 3 episodes, eyeball them in the Simplecast dashboard
python3 scripts/simplecast/bulk_update.py --append-description-file cta.html --apply --limit 3

# 3. the rest (already-updated episodes are skipped automatically, see Idempotency)
python3 scripts/simplecast/bulk_update.py --append-description-file cta.html --apply

# 4. undo, if it looked wrong
python3 scripts/simplecast/rollback.py scripts/simplecast/runs/<ts>/snapshot.jsonl --apply
```

## Recipes

```bash
# Append a CTA to every published episode
--append-description-file cta.html

# Add a CTA only to the last 50 episodes
--newest 50 --append-description-file cta.html

# Fix an old domain everywhere it appears (regex substitution)
--replace-description 'openloopspod\.com=>openloops.fm'

# Swap a sponsor block out of the episodes that mention it
--match-description 'Athletic Greens' \
--replace-description '(?s)<p>This episode is brought to you by Athletic Greens.*?</p>=>'

# Namespace titles for a single season
--season 2 --title-prefix 'Open Loops | '

# Strip a prefix you added and regret
--replace-title '^Open Loops \| =>'

# Operate on a hand-picked list
--ids-file episodes.txt --append-description-file cta.html

# Set any other writable field literally (values parse as JSON when possible)
--set explicit=false --set season_number=3
```

Selection flags combine as AND: `--match-title`, `--match-description`,
`--exclude-title`, `--exclude-description`, `--published-after/before`,
`--season`, `--ids-file`, `--newest`, `--oldest`, `--include-drafts`.
Drafts are skipped unless you ask for them.

## Idempotency

Re-running the same append is safe. Before adding text, the tool checks whether
that text is already present in the field and skips the episode if so — so a run
interrupted at episode 180 can simply be re-run, and a monthly "add the new CTA"
job won't stack duplicates.

Use `--marker 'Subscribe at openloops.fm'` when you want the check to key on a
short stable substring instead of the whole block (e.g. the CTA's wording changed
but you don't want a second copy). `--no-marker` disables the check entirely.

For a run that failed partway with API errors, `--resume runs/<ts>/snapshot.jsonl`
skips every episode that snapshot records as successfully written.

## Rate limits and failures

Requests are throttled to `--rate` per second (default 3) and retried with
exponential backoff on 429/5xx, honoring `Retry-After`. A 300-episode append is
~305 API calls and takes roughly two minutes.

Failures don't stop the run: each is recorded in the snapshot and report, printed
as `FAILED <id>`, and the process exits non-zero so a wrapper notices.

## The write verb

Simplecast's read API is well documented; its episode *write* surface is thinner
and the accepted verb has not been stable. Rather than guessing, the client tries
`PATCH`, then `POST`, then `PUT` on the first update, treats 404/405/501 as "wrong
verb", and reuses whatever the API accepted for the rest of the run. Any other
error (400 bad field, 403 read-only token) is raised immediately instead of being
masked by a verb retry. Pin it with `--update-method post` once you know.

If all three verbs are rejected, the token is probably read-only — regenerate it
in Private Apps with write access.

Which *fields* are writable is likewise not fully documented. `title` and
`description` are the reliable ones. Before running a large job against any other
field, canary it with `--limit 1` and check the dashboard.

## MCP alternative

There's a third-party Simplecast MCP server at
`https://mcp.mcpbundles.com/bundle/simplecast` (9 tools, authenticated with the
same API key) that connects to Claude as a custom connector.

It's the better path for exploratory or conversational work — "which episodes
mention X", "read me episode 212's notes". It's the worse path for a 300-episode
rewrite: the agent iterates episode by episode through the context window, with no
dry run, no snapshot, and no rollback. Use the MCP to decide what to change, then
these scripts to change it.

## Flags

`python3 scripts/simplecast/bulk_update.py --help` lists everything, grouped by
connection / selection / edits / run control.

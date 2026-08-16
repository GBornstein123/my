# YouTube bulk description updates

Adds an affiliate-link block (or any CTA) to a whole channel's descriptions, and
fixes links across the back catalog. Same shape as `scripts/simplecast/`: dry run
by default, snapshot before every write, rollback from the snapshot.

Python 3.8+, standard library only.

## Three things about this API that shape everything

**1. Writes need OAuth, not an API key.** An API key reads public data only. You
need an OAuth client, and you consent once in a browser.

**2. `videos.update` deletes any snippet field you omit.** Send a description
without also sending `tags`, and the tags are gone — permanently, across every
video you touched. This is [documented
behavior](https://developers.google.com/youtube/v3/docs/videos/update), not a bug,
and it's the single most common way people wreck a channel with a bulk script.

These scripts always read the full snippet and merge into it, so tags,
`categoryId`, `defaultLanguage` and the rest ride along untouched. There's a
regression test for exactly this. If you write your own script instead, this is
the part to get right.

**3. Quota caps you near 200 videos/day.** Default budget is 10,000 units/day; an
update costs 50. Reads are 1 unit. The run meters itself, warns up front if the
plan exceeds the budget, and stops cleanly rather than half-failing — then
`--resume` picks up after the reset (midnight Pacific).

## Setup

1. [Google Cloud Console](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → Library → YouTube Data API v3 → Enable.**
3. **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Application type: Desktop app.** Download the JSON.
4. Save it as `scripts/youtube/client_secrets.json` (gitignored), or point
   `--client-secrets` / `$YOUTUBE_CLIENT_SECRETS` at it.
5. While the app is in "Testing" mode, add your own Google account under
   **OAuth consent screen → Test users**, or consent will be refused.

First run opens a browser for consent and caches a refresh token in
`.token.json` (chmod 600, gitignored). After that it's non-interactive.

If the channel is a Brand Account, pick that channel on the consent screen —
otherwise you'll authorize your personal channel and see the wrong videos.

## Usage

```bash
cd scripts/youtube

# 1. preview — costs a handful of read units, writes nothing
python3 bulk_update.py --append-description-file affiliate-block.txt

# 2. canary: three videos, then go look at them on YouTube
python3 bulk_update.py --append-description-file affiliate-block.txt --apply --limit 3

# 3. the rest (already-updated videos are skipped automatically)
python3 bulk_update.py --append-description-file affiliate-block.txt --apply

# 4. undo if needed
python3 rollback.py runs/<timestamp>/snapshot.jsonl --apply
```

### Recipes

```bash
# Affiliate block on the most recent 100 videos only
--newest 100 --append-description-file affiliate-block.txt

# Update the links when a program changes, without stacking a second block
--replace-description '(?s)---\nGear I use.*?qualifying purchases\.=>' \
--append-description-file affiliate-block-v2.txt

# Fix a dead domain everywhere
--replace-description 'openloopspod\.com=>openloops.fm'

# Only videos that already mention the sponsor
--match-description 'Athletic Greens' --append-description-file offer.txt

# Hand-picked list
--ids-file video-ids.txt --append-description-file affiliate-block.txt
```

Private and unlisted videos are skipped unless you pass `--include-private`.

## Affiliate disclosure

The FTC requires affiliate relationships to be disclosed clearly and
conspicuously, and Amazon Associates requires its specific statement — an
undisclosed block across 300 videos is the kind of thing that gets an Associates
account closed. Two practical points for a bulk job:

- Put the disclosure **in the same block as the links**, so it can never get
  separated from them by a later edit.
- YouTube truncates descriptions at roughly 157 characters behind "Show more".
  If the links are the point, `--prepend-description` puts the disclosure above
  that fold; `--append-description` is fine when the links are supplementary.

`affiliate-block.example.txt` is a starting template.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Clean |
| 1 | Some writes failed — re-run with `--resume` |
| 2 | Fatal (auth, config) |
| 3 | Stopped on quota — re-run with `--resume` after the reset |
| 4 | Finished, but some videos were skipped as unwritable (see `SKIP` lines) |

A common code 4: a video with no `categoryId`. The API rejects any snippet write
without one, so the script refuses it during planning rather than failing halfway
through. Set a category on that video in YouTube Studio and re-run.

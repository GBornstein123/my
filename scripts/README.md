# Connecting Open Loops for bulk edits

Two platforms, two APIs, no shared connection between them. Here's what plugs
into what, and which piece to use for which job.

```
                    ┌─────────────────────────────────────┐
                    │  Claude (desktop / web / Code)      │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┴─────────────────────┐
              │                                          │
     custom connector (MCP)                    runs these scripts
     conversational, read-mostly               bulk, transactional
              │                                          │
     ┌────────┴────────┐                    ┌────────────┴────────────┐
     │ Simplecast MCP  │                    │ scripts/simplecast/     │
     │ (MCPBundles)    │                    │ scripts/youtube/        │
     └────────┬────────┘                    └────────────┬────────────┘
              │                                          │
        Simplecast API                    Simplecast API + YouTube Data API v3
        (Bearer token)                    (Bearer token)   (OAuth 2.0)
```

**Use the connector to decide what to change.** "Which episodes mention the old
sponsor?" "Read me episode 212's show notes." "How many episodes are missing a
CTA?" That's the conversational half, and it's genuinely good at it.

**Use the scripts to actually change it.** A 300-episode rewrite through an agent
loop has no dry run, no snapshot, no rollback, and burns context per episode. The
scripts do the same work transactionally in about two minutes.

## 1. Connect Simplecast to Claude (the MCP connector)

Get a token first: **Simplecast → Settings → Private Apps → generate**.

Then in Claude:

- **Claude web or desktop:** Settings → Connectors → Add custom connector →
  URL `https://mcp.mcpbundles.com/bundle/simplecast` → connect and paste your
  Simplecast API key when prompted.
- **Claude Code:** `claude mcp add --transport http simplecast https://mcp.mcpbundles.com/bundle/simplecast`
  then `/mcp` to authenticate. Add `--scope user` to make it available in every
  project rather than just this one.

Verify with: *"List my Simplecast podcasts."* You should get Open Loops back.

Note this is a **third-party** server — your API key is being handed to
MCPBundles, not to Simplecast or Anthropic. That's a normal trade for
convenience, but it's your key and worth knowing. The scripts below talk to
`api.simplecast.com` directly and don't involve a third party.

There is no equivalent YouTube MCP connector set up here. YouTube bulk edits go
through `scripts/youtube/` only.

## 2. Run the bulk scripts

Both toolkits are Python 3.8+, standard library only — nothing to install.

| | Simplecast | YouTube |
|---|---|---|
| Directory | `scripts/simplecast/` | `scripts/youtube/` |
| Auth | Bearer token (Private Apps) | OAuth 2.0 (Desktop client) |
| Body format | HTML show notes | Plain text, 5,000 char cap |
| Practical ceiling | ~300 episodes in ~2 min | ~200 videos/day (quota) |
| Setup | [README](simplecast/README.md) | [README](youtube/README.md) |

Both follow the same protocol, which is the part that matters:

1. **Dry run by default.** Prints a per-item diff, writes a plan CSV, changes nothing.
2. **Canary with `--limit 3`.** Apply to three, go look at them in the dashboard.
3. **Apply the rest.** Reruns are idempotent — it won't stack a second copy of a
   block it already added.
4. **Rollback from the snapshot.** Every applied run records prior values to
   `runs/<timestamp>/snapshot.jsonl` *before* writing, flushed per item, so even
   an interrupted run is fully reversible.

### Where these run

On your own machine, not in a Claude Code cloud session. Cloud sessions are
ephemeral containers behind a network egress proxy that blocks
`api.simplecast.com` and `googleapis.com`, and your OAuth consent needs a real
browser. Clone the repo locally and run them from a terminal.

## 3. The affiliate-link job across both platforms

The blocks differ by platform — Simplecast show notes are HTML, YouTube
descriptions are plain text with a 5,000 character cap — so keep two files.

```bash
# YouTube: preview, canary, then the rest
cd scripts/youtube
python3 bulk_update.py --append-description-file affiliate-block.txt
python3 bulk_update.py --append-description-file affiliate-block.txt --apply --limit 3
python3 bulk_update.py --append-description-file affiliate-block.txt --apply

# Simplecast: same shape, HTML block
cd ../simplecast
python3 bulk_update.py --podcast "Open Loops" --append-description-file affiliate-block.html
python3 bulk_update.py --podcast "Open Loops" --append-description-file affiliate-block.html --apply --limit 3
python3 bulk_update.py --podcast "Open Loops" --append-description-file affiliate-block.html --apply
```

When the links change later, don't just append again — strip the old block first
in the same run, so you replace rather than stack:

```bash
--replace-description '(?s)---\nGEAR & TOOLS.*?qualifying purchases\.=>' \
--append-description-file affiliate-block-v2.txt
```

Disclosure matters here and the rules are not decorative: the FTC wants it clear
and conspicuous, and Amazon Associates requires its specific wording. Keep the
disclosure inside the same block as the links so a later edit can't separate
them. See [scripts/youtube/README.md](youtube/README.md#affiliate-disclosure) for
placement notes.

## Secrets

`.gitignore` already covers `client_secrets.json`, `.token.json`, and both
`runs/` directories. The Simplecast token comes from the environment
(`SIMPLECAST_API_TOKEN`) — don't paste it into a flag where it lands in your
shell history.

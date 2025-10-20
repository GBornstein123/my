# Quick Start Guide: Competitor Ad Extraction

Get started extracting competitor ads in 3 steps!

## Step 1: Install Playwright Browser

```bash
npm run playwright:install
```

This downloads the Chromium browser that Playwright uses for automation.

## Step 2: Set Your OpenAI API Key (Optional)

Only needed if you want AI analysis of the ads:

```bash
export OPENAI_API_KEY="sk-your-key-here"
```

Or add to `.env` file:
```
OPENAI_API_KEY=sk-your-key-here
```

## Step 3: Extract Ads!

### Option A: Use the CLI

Extract ads from a competitor:
```bash
npm run extract-ads -- --advertiser "Nike" --max-ads 30
```

Search for ads by keyword:
```bash
npm run extract-ads -- --search "running shoes" --max-ads 50
```

Watch the browser work (non-headless mode):
```bash
npm run extract-ads -- --advertiser "Slack" --headless false
```

Extract AND analyze with AI:
```bash
npm run extract-ads -- --advertiser "Asana" --analyze
```

### Option B: Run the Example Script

Edit `scripts/example-ad-extraction.ts` to set your competitor name, then:

```bash
npm run extract-ads:example
```

## What You'll Get

After extraction, check the `ad-extraction-output/` folder:

```
ad-extraction-output/
├── screenshots/           # PNG screenshots of each ad
├── ads-[timestamp].json   # All ad data in JSON
├── ads-[timestamp].csv    # Spreadsheet-friendly format
└── analysis-report.md     # AI insights (if --analyze used)
```

## Example Workflows

### Competitive Research

```bash
# Extract competitor ads
npm run extract-ads -- --advertiser "Competitor Name" --max-ads 50

# Then analyze them
npm run extract-ads -- --advertiser "Competitor Name" --max-ads 50 --analyze
```

### Ad Inspiration Hunt

```bash
# Search for a category
npm run extract-ads -- --search "project management software" --max-ads 100 --analyze
```

### Quick Peek at Competitor Strategy

```bash
# Small batch with analysis
npm run extract-ads -- --advertiser "Competitor" --max-ads 10 --analyze --headless false
```

## CLI Options Cheat Sheet

```
--advertiser "Name"    # Search by advertiser name
--search "keyword"     # Search by keyword
--max-ads 50           # Number of ads to extract
--analyze              # Run AI analysis
--headless false       # Watch browser in action
--output-dir path      # Custom output location
```

## Tips

1. **Start small**: Use `--max-ads 10` for testing
2. **Watch it work**: Use `--headless false` to see the "agentic" navigation
3. **Save on API costs**: Extract first (without --analyze), then analyze select ads later
4. **Multiple competitors**: Run the command multiple times with different advertisers

## Next Steps

- Read the full documentation: `AD_SCRAPER_README.md`
- Customize the example script: `scripts/example-ad-extraction.ts`
- Explore the code: `lib/ad-scraper/`

## Troubleshooting

**"Browser not found"**
→ Run: `npm run playwright:install`

**"No ads found"**
→ Try `--headless false` to see what's happening
→ Verify the advertiser name is spelled correctly

**Analysis fails**
→ Make sure `OPENAI_API_KEY` is set
→ Check you have OpenAI API credits

## Support

Check the main README for detailed docs, examples, and architecture info.

Happy ad hunting! 🎯

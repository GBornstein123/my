# Competitor Ad Extraction Tool

An intelligent, automated system for extracting and analyzing competitor ads from ad libraries like Meta's Ad Library. This tool uses browser automation to navigate ad platforms "agentically," capturing screenshots and extracting valuable insights.

## Features

- **Agentic Browser Automation**: Watches the tool navigate through ad libraries, scroll, and capture ads automatically
- **Screenshot Capture**: Saves high-quality screenshots of every ad
- **Metadata Extraction**: Extracts ad copy, headlines, CTAs, targeting info, and more
- **AI-Powered Analysis**: Uses GPT-4 to analyze ads and extract:
  - Problems addressed
  - Use cases highlighted
  - Copy strategies
  - Target audiences
  - Emotional triggers
  - Actionable recommendations
- **Pattern Detection**: Identifies common themes across competitor ads
- **Multiple Export Formats**: JSON, CSV, and Markdown reports

## Installation

1. **Install dependencies** (already done if you ran npm install):

```bash
npm install playwright @types/node
```

2. **Install Playwright browsers**:

```bash
npx playwright install chromium
```

3. **Set up OpenAI API key** (required for analysis):

```bash
export OPENAI_API_KEY="your-api-key-here"
```

Or add to `.env`:
```
OPENAI_API_KEY=sk-...
```

## Quick Start

### CLI Usage

Extract ads from a specific advertiser:

```bash
npx tsx scripts/extract-competitor-ads.ts --advertiser "Nike" --max-ads 30
```

Search for ads by keyword:

```bash
npx tsx scripts/extract-competitor-ads.ts --search "project management" --max-ads 50
```

Extract and analyze:

```bash
npx tsx scripts/extract-competitor-ads.ts --advertiser "Asana" --analyze
```

Watch the browser in action (non-headless):

```bash
npx tsx scripts/extract-competitor-ads.ts --advertiser "Slack" --headless false
```

### Programmatic Usage

```typescript
import { MetaAdScraper, AdAnalyzer } from './lib/ad-scraper';

// Create scraper
const scraper = new MetaAdScraper({
  platform: 'meta',
  advertiserName: 'Your Competitor',
  maxAds: 50,
  headless: true,
});

// Extract ads
const result = await scraper.scrape();

// Analyze (optional)
const analyzer = new AdAnalyzer(process.env.OPENAI_API_KEY!);
const report = await analyzer.analyzeBatch(result.ads);

analyzer.saveReport(report, './output/analysis-report');
```

## CLI Options

```
--platform, -p        Platform to scrape (meta, google, linkedin)
                      Default: meta

--advertiser, -a      Specific advertiser name to search for
                      Example: --advertiser "Nike"

--search, -s          Search query for ads
                      Example: --search "running shoes"

--max-ads, -m         Maximum number of ads to extract
                      Default: 50

--output-dir, -o      Directory to save results
                      Default: ./ad-extraction-output

--headless            Run browser in headless mode (true/false)
                      Default: true

--analyze             Analyze extracted ads using AI
                      Requires OPENAI_API_KEY

--help, -h            Show help message
```

## Output Structure

After extraction, you'll find:

```
ad-extraction-output/
├── screenshots/
│   ├── meta-nike-1234567890-0.png
│   ├── meta-nike-1234567890-1.png
│   └── ...
├── ads-1234567890.json          # All ad metadata
├── ads-1234567890.csv           # Spreadsheet-friendly format
├── analysis-report.json         # AI analysis (if --analyze used)
└── analysis-report.md           # Human-readable analysis
```

### Ad Metadata

Each extracted ad includes:

```json
{
  "id": "meta-nike-1234567890-0",
  "platform": "meta",
  "advertiser": "Nike",
  "headline": "Run Faster, Feel Better",
  "adText": "Discover the new Nike Air Max...",
  "callToAction": "Shop Now",
  "landingPageUrl": "https://nike.com/air-max",
  "mediaType": "image",
  "screenshotPath": "./screenshots/meta-nike-1234567890-0.png",
  "impressions": "100K-500K",
  "startDate": "March 15, 2024",
  "extractedAt": "2024-03-20T10:30:00.000Z"
}
```

### Analysis Report

When using `--analyze`, you get:

- **Individual Ad Analyses**: Problem, use case, copy strategy, target audience
- **Pattern Detection**: Common themes across all ads
- **Recommendations**: Actionable insights for your own ads

Example recommendation:
> "Highlight the time-saving benefit prominently in headlines. 73% of analyzed ads led with efficiency gains rather than features."

## Use Cases

1. **Competitive Research**
   - See what problems competitors are addressing
   - Identify successful ad formats and copy strategies
   - Track competitor campaigns over time

2. **Ad Creation**
   - Find proven copy angles to repurpose
   - Identify effective visual styles
   - Understand what CTAs work best

3. **Market Analysis**
   - Discover how competitors position themselves
   - Identify target audience segments
   - Track advertising trends in your industry

4. **Creative Inspiration**
   - Build a swipe file of effective ads
   - Analyze emotional triggers used
   - Learn from successful campaigns

## Advanced Usage

### Custom Progress Tracking

```typescript
const scraper = new MetaAdScraper(config, (progress) => {
  console.log(`Status: ${progress.status}`);
  console.log(`Message: ${progress.message}`);
  console.log(`Ads Found: ${progress.adsFound}`);
  console.log(`Ads Processed: ${progress.adsProcessed}`);
});
```

### Batch Analysis

```typescript
// Load previously extracted ads
const ads = JSON.parse(fs.readFileSync('./ads.json', 'utf-8'));

// Analyze
const analyzer = new AdAnalyzer(apiKey);
const report = await analyzer.analyzeBatch(ads);

// Access insights
console.log('Common Problems:', report.patterns.commonProblems);
console.log('Recommendations:', report.recommendations);
```

### Custom Output Directory

```typescript
const config: ScraperConfig = {
  platform: 'meta',
  advertiserName: 'Competitor',
  outputDir: '/path/to/custom/output',
  maxAds: 100,
};
```

## How It Works

1. **Browser Automation**: Uses Playwright to launch a real Chrome browser
2. **Navigation**: Goes to Meta Ad Library with your search query
3. **Scrolling**: Automatically scrolls to load more ads (lazy loading)
4. **Extraction**: For each ad:
   - Scrolls it into view
   - Extracts text content (headline, body, CTA)
   - Captures metadata (dates, impressions, etc.)
   - Takes a screenshot
5. **Storage**: Saves all data to JSON, CSV, and screenshots
6. **Analysis** (optional): Sends ad text to GPT-4 for deep analysis
7. **Reporting**: Generates actionable insights and recommendations

## Platforms Supported

Currently supported:
- ✅ **Meta/Facebook Ad Library** (most comprehensive)

Coming soon:
- 🔄 Google Ads Transparency Center
- 🔄 LinkedIn Ad Library
- 🔄 TikTok Ad Library
- 🔄 Twitter/X Ad Library

## Tips & Best Practices

1. **Start Small**: Test with `--max-ads 10` first to verify everything works
2. **Use --analyze Wisely**: AI analysis costs money (OpenAI API). Extract first, then analyze a curated set
3. **Watch in Action**: Use `--headless false` to see the browser navigate - it's like watching an agent work!
4. **Rate Limiting**: The tool includes delays between actions to avoid being blocked
5. **Storage**: Screenshots can take up space. Plan accordingly for large extractions

## Troubleshooting

**Browser won't launch:**
```bash
npx playwright install chromium
```

**No ads found:**
- Try a different search query
- Check if the advertiser name is exact
- Use `--headless false` to see what's happening

**Analysis fails:**
- Verify `OPENAI_API_KEY` is set correctly
- Check your OpenAI account has credits
- Reduce batch size if hitting rate limits

**Screenshots are blank:**
- Some ads may fail to load
- Check your internet connection
- Try increasing scroll delay: modify `scrollDelay` in config

## Examples

### Extract competitor SaaS ads:

```bash
npx tsx scripts/extract-competitor-ads.ts \
  --search "project management software" \
  --max-ads 100 \
  --analyze
```

### Monitor a specific competitor:

```bash
npx tsx scripts/extract-competitor-ads.ts \
  --advertiser "Asana" \
  --max-ads 50 \
  --output-dir "./competitor-tracking/asana-$(date +%Y%m%d)"
```

### Quick research session:

```bash
# Extract
npx tsx scripts/extract-competitor-ads.ts -a "Nike" -m 20

# Later, analyze
# (Load the JSON and run analyzer separately)
```

## Architecture

```
lib/ad-scraper/
├── types.ts              # TypeScript interfaces
├── base-scraper.ts       # Abstract scraper class
├── meta-ad-scraper.ts    # Meta Ad Library implementation
├── ad-analyzer.ts        # AI-powered analysis
└── index.ts              # Exports

scripts/
├── extract-competitor-ads.ts    # CLI tool
└── example-ad-extraction.ts     # Code example
```

## Contributing

To add support for a new platform:

1. Create a new scraper class extending `BaseAdScraper`
2. Implement the `extractAds()` method
3. Add platform-specific selectors and logic
4. Update the CLI to support the new platform

## License

See LICENSE file.

## Credits

Built with Claude Code - an agentic coding assistant that makes complex automation tasks simple.

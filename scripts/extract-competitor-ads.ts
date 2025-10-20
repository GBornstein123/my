#!/usr/bin/env node

/**
 * CLI Script for Extracting Competitor Ads
 *
 * This script automates the extraction of competitor ads from ad libraries
 * like Meta's Ad Library. It captures screenshots, extracts metadata, and
 * optionally analyzes ads using AI.
 *
 * Usage:
 *   npx tsx scripts/extract-competitor-ads.ts --advertiser "Nike" --max-ads 30
 *   npx tsx scripts/extract-competitor-ads.ts --search "running shoes" --platform meta --analyze
 */

import { MetaAdScraper } from '../lib/ad-scraper/meta-ad-scraper';
import { AdAnalyzer } from '../lib/ad-scraper/ad-analyzer';
import { ScraperConfig, ScraperProgress, AdMetadata } from '../lib/ad-scraper/types';
import * as fs from 'fs';
import * as path from 'path';

interface CLIArgs {
  platform?: 'meta' | 'google' | 'linkedin';
  advertiser?: string;
  search?: string;
  maxAds?: number;
  outputDir?: string;
  headless?: boolean;
  analyze?: boolean;
  help?: boolean;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {};

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    switch (arg) {
      case '--platform':
        args.platform = process.argv[++i] as CLIArgs['platform'];
        break;
      case '--advertiser':
      case '-a':
        args.advertiser = process.argv[++i];
        break;
      case '--search':
      case '-s':
        args.search = process.argv[++i];
        break;
      case '--max-ads':
      case '-m':
        args.maxAds = parseInt(process.argv[++i], 10);
        break;
      case '--output-dir':
      case '-o':
        args.outputDir = process.argv[++i];
        break;
      case '--headless':
        args.headless = process.argv[++i] === 'true';
        break;
      case '--analyze':
        args.analyze = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

function printHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║        Competitor Ad Extraction Tool                           ║
╚════════════════════════════════════════════════════════════════╝

Extract and analyze competitor ads from ad libraries

USAGE:
  npx tsx scripts/extract-competitor-ads.ts [OPTIONS]

OPTIONS:
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
                        Requires OPENAI_API_KEY environment variable

  --help, -h            Show this help message

EXAMPLES:

  Extract Nike ads:
  $ npx tsx scripts/extract-competitor-ads.ts --advertiser "Nike" --max-ads 30

  Search for product category:
  $ npx tsx scripts/extract-competitor-ads.ts --search "project management software" --max-ads 50

  Extract and analyze:
  $ npx tsx scripts/extract-competitor-ads.ts --advertiser "Asana" --analyze

  Non-headless mode (see browser in action):
  $ npx tsx scripts/extract-competitor-ads.ts --advertiser "Slack" --headless false

ENVIRONMENT VARIABLES:
  OPENAI_API_KEY        Required for --analyze option
`);
}

function displayProgressBar(current: number, total: number, label: string = 'Progress') {
  const percentage = Math.round((current / total) * 100);
  const filledBars = Math.round(percentage / 2);
  const emptyBars = 50 - filledBars;

  const bar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

  process.stdout.write(`\r${label}: [${bar}] ${percentage}% (${current}/${total})`);

  if (current === total) {
    console.log(''); // New line when complete
  }
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║        Starting Competitor Ad Extraction                       ║
╚════════════════════════════════════════════════════════════════╝
`);

  // Validate inputs
  if (!args.advertiser && !args.search) {
    console.error('❌ Error: Please provide either --advertiser or --search');
    console.log('Run with --help for usage information');
    process.exit(1);
  }

  // Build config
  const config: ScraperConfig = {
    platform: args.platform || 'meta',
    advertiserName: args.advertiser,
    searchQuery: args.search,
    maxAds: args.maxAds || 50,
    outputDir: args.outputDir || path.join(process.cwd(), 'ad-extraction-output'),
    headless: args.headless !== false,
  };

  console.log('⚙️  Configuration:');
  console.log(`   Platform: ${config.platform}`);
  if (config.advertiserName) console.log(`   Advertiser: ${config.advertiserName}`);
  if (config.searchQuery) console.log(`   Search: ${config.searchQuery}`);
  console.log(`   Max Ads: ${config.maxAds}`);
  console.log(`   Output: ${config.outputDir}`);
  console.log(`   Headless: ${config.headless}`);
  console.log('');

  // Progress callback
  const progressCallback = (progress: ScraperProgress) => {
    const statusEmoji = {
      initializing: '🚀',
      navigating: '🌐',
      scrolling: '📜',
      extracting: '📸',
      complete: '✅',
      error: '❌',
    };

    const emoji = statusEmoji[progress.status] || '⚙️';
    console.log(`${emoji} ${progress.message}`);

    if (progress.adsProcessed > 0) {
      displayProgressBar(progress.adsProcessed, progress.adsFound, 'Extracting');
    }
  };

  try {
    // Create scraper based on platform
    let scraper;

    switch (config.platform) {
      case 'meta':
        scraper = new MetaAdScraper(config, progressCallback);
        break;
      default:
        console.error(`❌ Platform "${config.platform}" is not yet supported.`);
        console.log('Currently supported: meta');
        process.exit(1);
    }

    // Run extraction
    console.log('🤖 Starting agentic ad extraction...\n');
    const result = await scraper.scrape();

    if (!result.success) {
      console.error(`\n❌ Extraction failed: ${result.error}`);
      process.exit(1);
    }

    console.log(`\n✅ Successfully extracted ${result.totalAdsFound} ads!`);
    console.log(`📁 Results saved to: ${result.outputDirectory}\n`);

    // Analyze if requested
    if (args.analyze) {
      console.log('🧠 Starting AI analysis of extracted ads...\n');

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('❌ Error: OPENAI_API_KEY environment variable not set');
        console.log('Analysis requires an OpenAI API key.');
        process.exit(1);
      }

      const analyzer = new AdAnalyzer(apiKey);

      // Progress for analysis
      const analysisProgress = (current: number, total: number) => {
        displayProgressBar(current, total, 'Analyzing');
      };

      const report = await analyzer.analyzeBatch(result.ads, analysisProgress);

      // Save report
      const reportPath = path.join(result.outputDirectory, `analysis-report-${Date.now()}`);
      analyzer.saveReport(report, reportPath);

      console.log(`\n✅ Analysis complete!`);
      console.log(`📊 Report saved to: ${reportPath}.md`);
      console.log('\n📈 Key Insights:');
      console.log(`   Common Problems: ${report.patterns.commonProblems.length}`);
      console.log(`   Use Cases: ${report.patterns.popularUseCases.length}`);
      console.log(`   Copy Strategies: ${report.patterns.effectiveCopyStrategies.length}`);
      console.log(`   Recommendations: ${report.recommendations.length}\n`);
    }

    console.log('🎉 All done! Check the output directory for results.\n');
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

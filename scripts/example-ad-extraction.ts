/**
 * Example: Simple Ad Extraction Script
 *
 * This is a simplified example showing how to use the ad scraper
 * programmatically in your own code.
 */

import { MetaAdScraper } from '../lib/ad-scraper/meta-ad-scraper';
import { AdAnalyzer } from '../lib/ad-scraper/ad-analyzer';
import { ScraperConfig } from '../lib/ad-scraper/types';

async function extractAndAnalyzeAds() {
  // Configure the scraper
  const config: ScraperConfig = {
    platform: 'meta',
    advertiserName: 'Nike', // Change to your competitor
    maxAds: 20,
    headless: true, // Set to false to watch the browser in action
    outputDir: './my-competitor-ads',
  };

  // Create scraper instance
  const scraper = new MetaAdScraper(config, (progress) => {
    console.log(`[${progress.status}] ${progress.message}`);
  });

  // Extract ads
  console.log('Starting ad extraction...');
  const result = await scraper.scrape();

  if (!result.success) {
    console.error('Failed to extract ads:', result.error);
    return;
  }

  console.log(`✅ Extracted ${result.totalAdsFound} ads`);
  console.log(`📁 Saved to: ${result.outputDirectory}`);

  // Optionally analyze the ads
  if (process.env.OPENAI_API_KEY) {
    console.log('\nAnalyzing ads...');

    const analyzer = new AdAnalyzer(process.env.OPENAI_API_KEY);
    const report = await analyzer.analyzeBatch(result.ads, (current, total) => {
      console.log(`Analyzing ${current}/${total}`);
    });

    // Save analysis report
    analyzer.saveReport(report, `${result.outputDirectory}/analysis-report`);

    console.log('\n📊 Analysis Summary:');
    console.log('Common Problems:', report.patterns.commonProblems.slice(0, 3));
    console.log('Top Use Cases:', report.patterns.popularUseCases.slice(0, 3));
    console.log('\nRecommendations:');
    report.recommendations.slice(0, 3).forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }
}

// Run the extraction
extractAndAnalyzeAds().catch(console.error);

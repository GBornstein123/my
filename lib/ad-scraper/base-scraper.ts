import { chromium, Browser, Page } from 'playwright';
import { ScraperConfig, ScraperProgress, ScraperResult, AdMetadata } from './types';
import * as fs from 'fs';
import * as path from 'path';

export abstract class BaseAdScraper {
  protected config: ScraperConfig;
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected progressCallback?: (progress: ScraperProgress) => void;
  protected outputDir: string;

  constructor(config: ScraperConfig, progressCallback?: (progress: ScraperProgress) => void) {
    this.config = {
      maxAds: 50,
      headless: true,
      slowMo: 100,
      scrollDelay: 2000,
      screenshotFullPage: false,
      outputDir: path.join(process.cwd(), 'ad-extraction-output'),
      ...config,
    };
    this.progressCallback = progressCallback;
    this.outputDir = this.config.outputDir || path.join(process.cwd(), 'ad-extraction-output');
  }

  protected updateProgress(status: ScraperProgress['status'], message: string, adsFound: number = 0, adsProcessed: number = 0) {
    if (this.progressCallback) {
      this.progressCallback({ status, message, adsFound, adsProcessed });
    }
    console.log(`[${status.toUpperCase()}] ${message} (Found: ${adsFound}, Processed: ${adsProcessed})`);
  }

  protected async initBrowser(): Promise<void> {
    this.updateProgress('initializing', 'Launching browser...');
    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
    });

    this.page = await this.browser.newPage({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    // Setup output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const screenshotsDir = path.join(this.outputDir, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  }

  protected async closeBrowser(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  protected async scrollPage(times: number = 3): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    for (let i = 0; i < times; i++) {
      this.updateProgress('scrolling', `Scrolling to load more ads... (${i + 1}/${times})`);

      // Scroll to bottom
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for content to load
      await this.page.waitForTimeout(this.config.scrollDelay || 2000);

      // Scroll back up a bit to trigger lazy loading
      await this.page.evaluate(() => {
        window.scrollBy(0, -300);
      });

      await this.page.waitForTimeout(500);
    }
  }

  protected async captureScreenshot(elementSelector: string, filename: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');

    const screenshotsDir = path.join(this.outputDir, 'screenshots');
    const screenshotPath = path.join(screenshotsDir, filename);

    try {
      const element = await this.page.$(elementSelector);
      if (element) {
        await element.screenshot({ path: screenshotPath, type: 'png' });
      } else {
        // Fallback to full page screenshot
        await this.page.screenshot({ path: screenshotPath, fullPage: this.config.screenshotFullPage });
      }

      return screenshotPath;
    } catch (error) {
      console.error(`Failed to capture screenshot: ${error}`);
      // Return placeholder path
      return screenshotPath;
    }
  }

  protected generateAdId(advertiser: string, index: number): string {
    const timestamp = Date.now();
    const cleanAdvertiser = advertiser.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `${this.config.platform}-${cleanAdvertiser}-${timestamp}-${index}`;
  }

  protected async saveResults(ads: AdMetadata[]): Promise<void> {
    const resultsPath = path.join(this.outputDir, `ads-${Date.now()}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(ads, null, 2));

    // Also save a CSV for easy analysis
    const csvPath = path.join(this.outputDir, `ads-${Date.now()}.csv`);
    this.saveAsCSV(ads, csvPath);

    this.updateProgress('complete', `Results saved to ${resultsPath}`);
  }

  protected saveAsCSV(ads: AdMetadata[], filePath: string): void {
    const headers = [
      'id', 'platform', 'advertiser', 'headline', 'adText', 'callToAction',
      'landingPageUrl', 'mediaType', 'impressions', 'spend', 'startDate',
      'endDate', 'screenshotPath', 'extractedAt'
    ];

    const rows = ads.map(ad => [
      ad.id,
      ad.platform,
      ad.advertiser,
      ad.headline || '',
      ad.adText?.replace(/\n/g, ' ') || '',
      ad.callToAction || '',
      ad.landingPageUrl || '',
      ad.mediaType || '',
      ad.impressions || '',
      ad.spend || '',
      ad.startDate || '',
      ad.endDate || '',
      ad.screenshotPath,
      ad.extractedAt,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    fs.writeFileSync(filePath, csv);
  }

  // Abstract methods to be implemented by platform-specific scrapers
  abstract scrape(): Promise<ScraperResult>;
  protected abstract extractAds(): Promise<AdMetadata[]>;
}

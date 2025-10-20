import { BaseAdScraper } from './base-scraper';
import { AdMetadata, ScraperResult, ScraperConfig, ScraperProgress } from './types';
import * as path from 'path';

export class MetaAdScraper extends BaseAdScraper {
  constructor(config: ScraperConfig, progressCallback?: (progress: ScraperProgress) => void) {
    super({ ...config, platform: 'meta' }, progressCallback);
  }

  async scrape(): Promise<ScraperResult> {
    try {
      await this.initBrowser();

      if (!this.page) {
        throw new Error('Failed to initialize browser page');
      }

      // Navigate to Meta Ad Library
      const url = this.buildSearchUrl();
      this.updateProgress('navigating', `Navigating to Meta Ad Library: ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle' });

      // Wait for ads to load
      await this.page.waitForTimeout(3000);

      // Handle cookie consent if present
      await this.handleCookieConsent();

      // Scroll to load more ads
      const scrollTimes = Math.ceil((this.config.maxAds || 50) / 10); // Approximate ads per scroll
      await this.scrollPage(scrollTimes);

      // Extract ads
      this.updateProgress('extracting', 'Extracting ad information...');
      const ads = await this.extractAds();

      // Save results
      await this.saveResults(ads);

      await this.closeBrowser();

      return {
        success: true,
        ads,
        totalAdsFound: ads.length,
        outputDirectory: this.outputDir,
      };
    } catch (error) {
      this.updateProgress('error', `Error during scraping: ${error}`);
      await this.closeBrowser();

      return {
        success: false,
        ads: [],
        totalAdsFound: 0,
        outputDirectory: this.outputDir,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildSearchUrl(): string {
    const baseUrl = 'https://www.facebook.com/ads/library/';

    // Build query parameters
    const params = new URLSearchParams({
      active_status: 'all',
      ad_type: 'all',
      country: 'US',
      media_type: 'all',
    });

    if (this.config.searchQuery) {
      params.append('q', this.config.searchQuery);
    }

    if (this.config.advertiserName) {
      params.append('search_type', 'page');
      params.append('q', this.config.advertiserName);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  private async handleCookieConsent(): Promise<void> {
    if (!this.page) return;

    try {
      // Try to find and click cookie consent button
      const cookieSelectors = [
        'button[data-cookiebanner="accept_button"]',
        'button[title="Accept All"]',
        'button:has-text("Accept All")',
        'button:has-text("Allow All")',
      ];

      for (const selector of cookieSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            await button.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch {
          // Continue to next selector
        }
      }
    } catch {
      // Ignore cookie consent errors
    }
  }

  protected async extractAds(): Promise<AdMetadata[]> {
    if (!this.page) throw new Error('Page not initialized');

    const ads: AdMetadata[] = [];
    let processedCount = 0;

    // Meta Ad Library selectors (these may need to be updated as Facebook changes their UI)
    const adCardSelectors = [
      '[data-testid="ad-card"]',
      'div[class*="AdCard"]',
      'div[role="article"]',
      // Fallback: any div that contains ad-like content
      'div:has(img):has-text("Sponsored")',
    ];

    let adElements: any[] = [];

    // Try each selector until we find ads
    for (const selector of adCardSelectors) {
      try {
        adElements = await this.page.$$(selector);
        if (adElements.length > 0) {
          this.updateProgress('extracting', `Found ${adElements.length} ad elements with selector: ${selector}`, adElements.length);
          break;
        }
      } catch {
        continue;
      }
    }

    if (adElements.length === 0) {
      // Fallback: try to find any ad-like containers
      this.updateProgress('extracting', 'Trying fallback ad detection...');
      adElements = await this.page.$$('div[role="article"]');
    }

    const maxAds = this.config.maxAds || 50;

    for (let i = 0; i < Math.min(adElements.length, maxAds); i++) {
      const element = adElements[i];

      try {
        // Scroll element into view
        await element.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(500);

        // Extract ad data
        const adData = await this.extractAdDataFromElement(element, i);

        if (adData) {
          ads.push(adData);
          processedCount++;
          this.updateProgress('extracting', `Processing ad ${processedCount}/${Math.min(adElements.length, maxAds)}`, adElements.length, processedCount);
        }
      } catch (error) {
        console.error(`Failed to extract ad ${i}:`, error);
      }
    }

    return ads;
  }

  private async extractAdDataFromElement(element: any, index: number): Promise<AdMetadata | null> {
    if (!this.page) return null;

    try {
      // Extract text content
      const textContent = await element.textContent();

      // Extract advertiser name
      const advertiserElement = await element.$('[data-testid="page-name"], a[role="link"]');
      const advertiser = advertiserElement
        ? await advertiserElement.textContent()
        : this.extractAdvertiserFromText(textContent);

      // Extract ad text/body
      const adText = await this.extractAdText(element);

      // Extract headline (if available)
      const headline = await this.extractHeadline(element);

      // Extract CTA
      const callToAction = await this.extractCTA(element);

      // Extract landing page URL
      const landingPageUrl = await this.extractLandingPageUrl(element);

      // Extract media type
      const mediaType = await this.detectMediaType(element);

      // Extract date range (if available)
      const dateInfo = await this.extractDateInfo(element);

      // Generate screenshot
      const adId = this.generateAdId(advertiser, index);
      const screenshotFilename = `${adId}.png`;
      const screenshotPath = await this.captureScreenshot(
        element,
        screenshotFilename
      );

      const metadata: AdMetadata = {
        id: adId,
        platform: 'meta',
        advertiser,
        adText,
        headline,
        callToAction,
        landingPageUrl,
        screenshotPath,
        extractedAt: new Date().toISOString(),
        mediaType,
        startDate: dateInfo.startDate,
        endDate: dateInfo.endDate,
      };

      return metadata;
    } catch (error) {
      console.error(`Failed to extract ad data from element:`, error);
      return null;
    }
  }

  private async extractAdText(element: any): Promise<string> {
    try {
      // Try multiple selectors for ad body text
      const textSelectors = [
        '[data-testid="ad-text"]',
        'div[class*="AdText"]',
        'div[dir="auto"]',
      ];

      for (const selector of textSelectors) {
        const textElement = await element.$(selector);
        if (textElement) {
          const text = await textElement.textContent();
          if (text && text.length > 10) {
            return text.trim();
          }
        }
      }

      // Fallback: get all text and try to identify ad copy
      const allText = await element.textContent();
      return this.cleanAdText(allText);
    } catch {
      return '';
    }
  }

  private async extractHeadline(element: any): Promise<string | undefined> {
    try {
      const headlineSelectors = [
        '[data-testid="ad-headline"]',
        'div[class*="Headline"]',
        'h2, h3',
      ];

      for (const selector of headlineSelectors) {
        const headlineElement = await element.$(selector);
        if (headlineElement) {
          const headline = await headlineElement.textContent();
          if (headline && headline.length > 5 && headline.length < 200) {
            return headline.trim();
          }
        }
      }
    } catch {
      return undefined;
    }
  }

  private async extractCTA(element: any): Promise<string | undefined> {
    try {
      // Look for CTA buttons
      const ctaSelectors = [
        'button[role="button"]',
        'a[role="button"]',
        '[data-testid="cta-button"]',
      ];

      for (const selector of ctaSelectors) {
        const ctaElement = await element.$(selector);
        if (ctaElement) {
          const ctaText = await ctaElement.textContent();
          if (ctaText && ctaText.length < 50) {
            return ctaText.trim();
          }
        }
      }
    } catch {
      return undefined;
    }
  }

  private async extractLandingPageUrl(element: any): Promise<string | undefined> {
    try {
      // Look for external links
      const links = await element.$$('a[href]');

      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href && (href.startsWith('http') || href.startsWith('//'))) {
          // Filter out Facebook internal links
          if (!href.includes('facebook.com') && !href.includes('fb.com')) {
            return href;
          }
        }
      }
    } catch {
      return undefined;
    }
  }

  private async detectMediaType(element: any): Promise<AdMetadata['mediaType']> {
    try {
      const hasVideo = await element.$('video');
      if (hasVideo) return 'video';

      const images = await element.$$('img');
      if (images.length > 1) return 'carousel';

      if (images.length === 1) return 'image';

      return undefined;
    } catch {
      return undefined;
    }
  }

  private async extractDateInfo(element: any): Promise<{ startDate?: string; endDate?: string }> {
    try {
      const textContent = await element.textContent();

      // Look for date patterns like "Started on May 1, 2024"
      const dateMatch = textContent.match(/Started on ([A-Za-z]+ \d+, \d{4})/);
      if (dateMatch) {
        return { startDate: dateMatch[1] };
      }

      return {};
    } catch {
      return {};
    }
  }

  private extractAdvertiserFromText(text: string): string {
    // Try to extract advertiser name from text
    // Usually it's at the beginning
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length < 100) {
        return firstLine;
      }
    }

    return 'Unknown Advertiser';
  }

  private cleanAdText(text: string): string {
    // Remove common UI elements and clean the text
    const cleaned = text
      .replace(/Sponsored/gi, '')
      .replace(/See More/gi, '')
      .replace(/Learn More/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Try to extract the main ad copy (usually 50-500 characters)
    const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 20);

    if (sentences.length > 0) {
      return sentences.slice(0, 3).join('. ').trim();
    }

    return cleaned.substring(0, 500);
  }
}

// Types for ad extraction and analysis

export interface AdMetadata {
  id: string;
  platform: 'meta' | 'google' | 'linkedin' | 'tiktok' | 'twitter' | 'other';
  advertiser: string;
  adText: string;
  headline?: string;
  callToAction?: string;
  landingPageUrl?: string;
  screenshotPath: string;
  extractedAt: string;

  // Platform-specific metadata
  impressions?: string;
  spend?: string;
  startDate?: string;
  endDate?: string;
  targeting?: {
    locations?: string[];
    ageRange?: string;
    gender?: string;
    interests?: string[];
  };

  // Media information
  mediaType?: 'image' | 'video' | 'carousel' | 'collection';
  mediaUrls?: string[];

  // Engagement (if available)
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
  };

  // Analysis fields (to be filled later)
  analysis?: {
    problemAddressed?: string;
    useCase?: string;
    keyMessage?: string;
    visualStyle?: string;
    targetAudience?: string;
  };
}

export interface ScraperConfig {
  platform: 'meta' | 'google' | 'linkedin' | 'tiktok' | 'twitter';
  searchQuery?: string;
  advertiserName?: string;
  maxAds?: number;
  outputDir?: string;
  headless?: boolean;
  slowMo?: number; // Slow down actions for debugging
  scrollDelay?: number; // Delay between scrolls in ms
  screenshotFullPage?: boolean;
}

export interface ScraperProgress {
  status: 'initializing' | 'navigating' | 'scrolling' | 'extracting' | 'complete' | 'error';
  message: string;
  adsFound: number;
  adsProcessed: number;
}

export interface ScraperResult {
  success: boolean;
  ads: AdMetadata[];
  totalAdsFound: number;
  outputDirectory: string;
  error?: string;
}

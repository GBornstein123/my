import Exa from 'exa-js';
import type { SearchResult } from '../types';

export class ExaService {
  private exa: Exa;

  constructor(apiKey: string) {
    this.exa = new Exa(apiKey);
  }

  async search(
    query: string,
    options: {
      limit?: number;
      type?: 'neural' | 'keyword' | 'auto' | 'hybrid' | 'fast' | 'instant';
      scrapeContent?: boolean;
    } = {}
  ): Promise<SearchResult[]> {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { limit = 5, type = 'instant', scrapeContent = true } = options;

        const searchOptions: Parameters<Exa['search']>[1] = {
          numResults: limit,
          type,
        };

        if (scrapeContent) {
          searchOptions.contents = {
            text: { maxCharacters: 10000 },
          };
        }

        const result = await this.exa.search(query, searchOptions as Parameters<typeof this.exa.search>[1]);

        return result.results.map((item) => ({
          url: item.url || '',
          title: item.title || '',
          description: item.author || '',
          markdown: 'text' in item ? (item as { text?: string }).text : undefined,
        }));
      } catch (error) {
        const errorWithStatus = error as { statusCode?: number; message?: string };
        const isRetryableError =
          errorWithStatus?.statusCode === 502 ||
          errorWithStatus?.statusCode === 503 ||
          errorWithStatus?.statusCode === 504 ||
          errorWithStatus?.statusCode === 429;

        if (isRetryableError && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(
            `Exa search failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        console.error('Exa search error:', error);
        console.error('Query:', query);
        return [];
      }
    }

    return [];
  }

  async searchWithMultipleQueries(
    queries: string[],
    options: {
      limit?: number;
      type?: 'neural' | 'keyword' | 'auto' | 'hybrid' | 'fast' | 'instant';
      scrapeContent?: boolean;
    } = {}
  ): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    const seen = new Set<string>();

    for (const query of queries) {
      try {
        const results = await this.search(query, options);

        for (const result of results) {
          if (!seen.has(result.url)) {
            seen.add(result.url);
            allResults.push(result);
          }
        }
      } catch (error) {
        console.error(`Failed to search for query "${query}":`, error);
      }
    }

    return allResults;
  }
}

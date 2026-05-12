import { FirecrawlService } from '../services/firecrawl';
import { OpenAIService } from '../services/openai';
import { AgentEnrichmentStrategy } from './agent-enrichment-strategy';
import { parseEmail } from './email-parser';
import type {
  CSVRow,
  EnrichmentField,
  EnrichmentResult,
  RowEnrichmentResult,
  WaterfallConfig,
  WaterfallProvider,
} from '../types';

const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com', 'hotmail.co.uk',
  'outlook.com', 'aol.com', 'icloud.com', 'protonmail.com', 'live.com',
  'msn.com', 'me.com', 'mac.com',
]);

export class WaterfallEnrichmentStrategy {
  private firecrawl: FirecrawlService;
  private openai: OpenAIService;
  private agentStrategy: AgentEnrichmentStrategy;

  constructor(openaiApiKey: string, firecrawlApiKey: string) {
    this.firecrawl = new FirecrawlService(firecrawlApiKey);
    this.openai = new OpenAIService(openaiApiKey);
    this.agentStrategy = new AgentEnrichmentStrategy(openaiApiKey, firecrawlApiKey);
  }

  async enrichRow(
    row: CSVRow,
    fields: EnrichmentField[],
    emailColumn: string,
    config: WaterfallConfig,
    onAgentProgress?: (message: string, type: 'info' | 'success' | 'warning' | 'agent') => void
  ): Promise<RowEnrichmentResult> {
    const email = row[emailColumn];
    const threshold = config.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
    const providers = config.providers ?? ['domain-inference', 'website-scrape', 'search', 'multi-agent'];

    const accumulated: Record<string, EnrichmentResult> = {};

    for (const provider of providers) {
      const pending = this.pendingFields(fields, accumulated, threshold);
      if (pending.length === 0) break;

      onAgentProgress?.(
        `[Waterfall] Trying provider "${provider}" for ${pending.length} field(s): ${pending.map(f => f.displayName).join(', ')}`,
        'info'
      );

      try {
        const results = await this.runProvider(provider, row, pending, email, emailColumn, onAgentProgress);

        for (const [name, result] of Object.entries(results)) {
          if (result.value !== '' && result.value !== null && result.value !== undefined) {
            accumulated[name] = { ...result, provider };
          }
        }

        const filled = Object.keys(results).filter(k => results[k].value !== '').length;
        onAgentProgress?.(
          `[Waterfall] Provider "${provider}" filled ${filled}/${pending.length} fields`,
          filled > 0 ? 'success' : 'warning'
        );
      } catch (err) {
        onAgentProgress?.(
          `[Waterfall] Provider "${provider}" failed: ${err instanceof Error ? err.message : 'unknown error'}`,
          'warning'
        );
      }
    }

    // Fill any remaining fields with empty placeholders
    for (const field of fields) {
      if (!(field.name in accumulated)) {
        accumulated[field.name] = {
          field: field.name,
          value: '',
          confidence: 0,
          source: 'No data found',
        };
      }
    }

    return {
      rowIndex: 0,
      originalData: row,
      enrichments: accumulated,
      status: 'completed',
    };
  }

  private pendingFields(
    fields: EnrichmentField[],
    accumulated: Record<string, EnrichmentResult>,
    threshold: number
  ): EnrichmentField[] {
    return fields.filter(f => {
      const existing = accumulated[f.name];
      if (!existing) return true;
      if (!existing.value || existing.value === '') return true;
      return existing.confidence < threshold;
    });
  }

  private async runProvider(
    provider: WaterfallProvider,
    row: CSVRow,
    fields: EnrichmentField[],
    email: string | undefined,
    emailColumn: string,
    onAgentProgress?: (message: string, type: 'info' | 'success' | 'warning' | 'agent') => void
  ): Promise<Record<string, EnrichmentResult>> {
    switch (provider) {
      case 'domain-inference':
        return this.domainInference(fields, email);
      case 'website-scrape':
        return this.websiteScrape(fields, email, row);
      case 'search':
        return this.searchEnrich(fields, email, row);
      case 'multi-agent':
        return this.multiAgentEnrich(row, fields, emailColumn, onAgentProgress);
      default:
        return {};
    }
  }

  private domainInference(
    fields: EnrichmentField[],
    email: string | undefined
  ): Record<string, EnrichmentResult> {
    if (!email) return {};

    const parsed = parseEmail(email);
    if (!parsed || PERSONAL_EMAIL_DOMAINS.has(parsed.domain)) return {};

    const results: Record<string, EnrichmentResult> = {};
    const domain = parsed.domain;
    const companyGuess = parsed.companyName;

    for (const field of fields) {
      const name = field.name.toLowerCase();

      if ((name === 'website' || name === 'company_website') && domain) {
        results[field.name] = {
          field: field.name,
          value: `https://${domain}`,
          confidence: 0.9,
          source: 'Derived from email domain',
        };
      } else if ((name === 'companyname' || name === 'company_name' || name === 'company') && companyGuess) {
        results[field.name] = {
          field: field.name,
          value: companyGuess,
          confidence: 0.5,
          source: 'Inferred from email domain',
        };
      } else if (name === 'domain' && domain) {
        results[field.name] = {
          field: field.name,
          value: domain,
          confidence: 0.95,
          source: 'Extracted from email',
        };
      }
    }

    return results;
  }

  private async websiteScrape(
    fields: EnrichmentField[],
    email: string | undefined,
    row: CSVRow
  ): Promise<Record<string, EnrichmentResult>> {
    if (!email) return {};

    const parsed = parseEmail(email);
    if (!parsed || PERSONAL_EMAIL_DOMAINS.has(parsed.domain)) return {};

    const domain = parsed.domain;

    try {
      const scrape = await this.firecrawl.scrapeUrl(`https://${domain}`);
      if (!scrape.data?.markdown) return {};

      const content = `URL: https://${domain}\n\nContent:\n${scrape.data.markdown}`;
      const extracted = await this.openai.extractStructuredDataOriginal(content, fields, row);

      const results: Record<string, EnrichmentResult> = {};
      for (const [name, result] of Object.entries(extracted)) {
        if (result?.value !== '' && result?.value !== null) {
          results[name] = {
            ...result,
            source: `https://${domain}`,
          };
        }
      }
      return results;
    } catch {
      return {};
    }
  }

  private async searchEnrich(
    fields: EnrichmentField[],
    email: string | undefined,
    row: CSVRow
  ): Promise<Record<string, EnrichmentResult>> {
    if (!email) return {};

    const parsed = parseEmail(email);
    if (!parsed || PERSONAL_EMAIL_DOMAINS.has(parsed.domain)) return {};

    const domain = parsed.domain;
    const companyGuess = parsed.companyName || domain;

    const queries = [
      `${companyGuess} company`,
      `site:${domain}`,
      `"${companyGuess}" about company information`,
    ];

    try {
      const searchResults = await this.firecrawl.searchWithMultipleQueries(queries, {
        limit: 3,
        scrapeContent: true,
      });

      if (searchResults.length === 0) return {};

      const combined = searchResults
        .map(r => `URL: ${r.url}\nTitle: ${r.title}\n${r.markdown || r.description}`)
        .join('\n---\n');

      const extracted = await this.openai.extractStructuredDataOriginal(combined, fields, row);

      const results: Record<string, EnrichmentResult> = {};
      for (const [name, result] of Object.entries(extracted)) {
        if (result?.value !== '' && result?.value !== null) {
          results[name] = {
            ...result,
            source: searchResults.slice(0, 2).map(r => r.url).join(', '),
          };
        }
      }
      return results;
    } catch {
      return {};
    }
  }

  private async multiAgentEnrich(
    row: CSVRow,
    fields: EnrichmentField[],
    emailColumn: string,
    onAgentProgress?: (message: string, type: 'info' | 'success' | 'warning' | 'agent') => void
  ): Promise<Record<string, EnrichmentResult>> {
    const result = await this.agentStrategy.enrichRow(
      row,
      fields,
      emailColumn,
      undefined,
      onAgentProgress
    );
    return result.enrichments;
  }
}

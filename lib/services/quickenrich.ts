export interface QuickenrichEmployee {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
  title?: string;
  job_title?: string;
  seniority?: string;
  department?: string;
  email?: string;
  work_email?: string;
  linkedin_url?: string;
  linkedin?: string;
  company_name?: string;
  company?: string;
  company_domain?: string;
  domain?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  phone_number?: string;
  direct_phone?: string;
  twitter?: string;
  website?: string;
  [key: string]: unknown;
}

interface QuickenrichApiResponse {
  data?: QuickenrichEmployee | QuickenrichEmployee[];
  employees?: QuickenrichEmployee[];
  results?: QuickenrichEmployee[];
  [key: string]: unknown;
}

export class QuickenrichService {
  private readonly baseUrl = 'https://app.quickenrich.io/api';

  constructor(private readonly apiKey: string) {}

  // Most precise: look up by exact email address
  async emailSearch(email: string): Promise<QuickenrichEmployee | null> {
    return this.getFirst('/employees/email-search', { email });
  }

  // Look up a specific person by LinkedIn profile URL
  async searchByLinkedin(linkedinUrl: string): Promise<QuickenrichEmployee | null> {
    return this.getFirst('/employees/search', { linkedin_url: linkedinUrl });
  }

  // Enrich phone number for a contact identified by their LinkedIn URL
  async phoneSearch(linkedinUrl: string): Promise<QuickenrichEmployee | null> {
    return this.getFirst('/employees/phone-search', { linkedin_url: linkedinUrl });
  }

  // Broad search: all contacts at a company domain, optionally filtered by title
  async datasetSearch(companyUrl: string, title?: string): Promise<QuickenrichEmployee[]> {
    const params: Record<string, string> = { company_url: companyUrl };
    if (title) params.title = title;
    return this.getAll('/employees/dataset-search', params);
  }

  private async getFirst(
    path: string,
    params: Record<string, string>
  ): Promise<QuickenrichEmployee | null> {
    try {
      const url = this.buildUrl(path, params);
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) {
        console.warn(`[Quickenrich] ${path} → ${res.status}`);
        return null;
      }
      const json: QuickenrichApiResponse = await res.json();
      if (json.data && !Array.isArray(json.data)) return json.data;
      const all = this.extractAll(json);
      return all[0] ?? null;
    } catch (err) {
      console.error(`[Quickenrich] ${path} error:`, err);
      return null;
    }
  }

  private async getAll(
    path: string,
    params: Record<string, string>
  ): Promise<QuickenrichEmployee[]> {
    try {
      const url = this.buildUrl(path, params);
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) {
        console.warn(`[Quickenrich] ${path} → ${res.status}`);
        return [];
      }
      const json: QuickenrichApiResponse = await res.json();
      return this.extractAll(json);
    } catch (err) {
      console.error(`[Quickenrich] ${path} error:`, err);
      return [];
    }
  }

  private buildUrl(path: string, params: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return url.toString();
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
    };
  }

  private extractAll(json: QuickenrichApiResponse): QuickenrichEmployee[] {
    if (Array.isArray(json.data)) return json.data;
    if (json.employees) return json.employees;
    if (json.results) return json.results;
    return [];
  }
}

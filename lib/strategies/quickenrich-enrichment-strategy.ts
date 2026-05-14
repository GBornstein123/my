import { QuickenrichService, QuickenrichEmployee } from '../services/quickenrich';
import type { CSVRow, EnrichmentField, RowEnrichmentResult, EnrichmentResult } from '../types';

// Maps camelCase requested field names → known Quickenrich response key names
const FIELD_ALIASES: Record<string, string[]> = {
  firstName: ['first_name'],
  lastName: ['last_name'],
  fullName: ['full_name', 'name'],
  name: ['full_name', 'name', 'first_name'],
  title: ['title', 'job_title'],
  jobTitle: ['title', 'job_title'],
  position: ['title', 'job_title'],
  role: ['title', 'job_title'],
  seniority: ['seniority'],
  department: ['department'],
  email: ['email', 'work_email'],
  workEmail: ['work_email', 'email'],
  phone: ['phone', 'phone_number', 'direct_phone'],
  phoneNumber: ['phone_number', 'phone', 'direct_phone'],
  directPhone: ['direct_phone', 'phone'],
  linkedinUrl: ['linkedin_url', 'linkedin'],
  linkedin: ['linkedin_url', 'linkedin'],
  companyName: ['company_name', 'company'],
  company: ['company_name', 'company'],
  companyDomain: ['company_domain', 'domain'],
  domain: ['company_domain', 'domain'],
  location: ['location', 'city'],
  city: ['city'],
  state: ['state'],
  country: ['country'],
  twitter: ['twitter'],
  website: ['website'],
};

function toSnakeCase(s: string): string {
  return s.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`);
}

function resolveField(contact: QuickenrichEmployee, fieldName: string): string | null {
  const rec = contact as Record<string, unknown>;

  if (rec[fieldName] != null) return String(rec[fieldName]);

  const snake = toSnakeCase(fieldName);
  if (rec[snake] != null) return String(rec[snake]);

  for (const alias of FIELD_ALIASES[fieldName] ?? []) {
    if (rec[alias] != null) return String(rec[alias]);
  }

  // Fuzzy: any key that shares a meaningful substring with the requested field
  const norm = fieldName.toLowerCase().replace(/[_\s]/g, '');
  for (const [key, val] of Object.entries(rec)) {
    if (val == null) continue;
    const normKey = key.toLowerCase().replace(/[_\s]/g, '');
    if (normKey.length > 3 && (normKey.includes(norm) || norm.includes(normKey))) {
      return String(val);
    }
  }

  return null;
}

function findByName(employees: QuickenrichEmployee[], name: string): QuickenrichEmployee | null {
  const target = name.toLowerCase();
  return (
    employees.find((e) => {
      const full = (
        e.full_name ??
        e.name ??
        `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim()
      ).toLowerCase();
      return full.length > 0 && (full.includes(target) || target.includes(full));
    }) ?? null
  );
}

export class QuickenrichEnrichmentStrategy {
  private readonly service: QuickenrichService;

  constructor(apiKey: string) {
    this.service = new QuickenrichService(apiKey);
  }

  async enrichRow(
    row: CSVRow,
    fields: EnrichmentField[],
    emailColumn: string,
    onProgress?: (field: string, value: unknown) => void,
    onAgentProgress?: (message: string, type: 'info' | 'success' | 'warning' | 'agent') => void
  ): Promise<RowEnrichmentResult> {
    const email = row[emailColumn];

    if (!email) {
      return { rowIndex: 0, originalData: row, enrichments: {}, status: 'error', error: 'No email found' };
    }

    const domain = email.split('@')[1];
    const personName = (row as Record<string, string>)._name ?? '';

    let contact: QuickenrichEmployee | null = null;

    // 1. Best match: direct email lookup
    onAgentProgress?.(`Quickenrich: email lookup for ${email}`, 'info');
    contact = await this.service.emailSearch(email);

    // 2. If a LinkedIn URL exists anywhere in the row, use the profile endpoint
    if (!contact) {
      const linkedinUrl = Object.values(row as Record<string, string>).find(
        (v) => typeof v === 'string' && v.includes('linkedin.com/in/')
      );
      if (linkedinUrl) {
        onAgentProgress?.('Quickenrich: resolving via LinkedIn profile', 'info');
        contact = await this.service.searchByLinkedin(linkedinUrl);
      }
    }

    // 3. Fallback: company-level search then name-match
    if (!contact) {
      onAgentProgress?.(`Quickenrich: searching contacts at ${domain}`, 'info');
      const employees = await this.service.datasetSearch(domain);
      onAgentProgress?.(
        `Quickenrich: found ${employees.length} contact(s) at ${domain}`,
        employees.length > 0 ? 'success' : 'warning'
      );
      if (employees.length > 0) {
        contact = (personName ? findByName(employees, personName) : null) ?? employees[0];
      }
    }

    if (!contact) {
      onAgentProgress?.(`Quickenrich: no data found for ${email}`, 'warning');
      return { rowIndex: 0, originalData: row, enrichments: {}, status: 'completed' };
    }

    const displayName =
      contact.full_name ??
      contact.name ??
      `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() ??
      'unknown';
    onAgentProgress?.(`Quickenrich: matched "${displayName}"`, 'success');

    // Enrich phone separately if we have a LinkedIn URL and phone is requested
    const wantsPhone = fields.some((f) =>
      ['phone', 'phoneNumber', 'directPhone', 'phone_number', 'direct_phone'].includes(f.name)
    );
    if (wantsPhone && (contact.linkedin_url ?? contact.linkedin)) {
      const linkedinUrl = (contact.linkedin_url ?? contact.linkedin)!;
      onAgentProgress?.('Quickenrich: fetching phone number', 'info');
      const phoneData = await this.service.phoneSearch(linkedinUrl);
      if (phoneData) {
        contact = { ...contact, ...phoneData };
      }
    }

    const enrichments: Record<string, EnrichmentResult> = {};

    for (const field of fields) {
      const value = resolveField(contact, field.name);
      if (value) {
        enrichments[field.name] = {
          field: field.name,
          value,
          confidence: 0.9,
          source: 'Quickenrich',
        };
        onProgress?.(field.name, value);
      }
    }

    const enrichedCount = Object.keys(enrichments).length;
    onAgentProgress?.(
      `Quickenrich: enriched ${enrichedCount}/${fields.length} field(s)`,
      enrichedCount > 0 ? 'success' : 'warning'
    );

    return { rowIndex: 0, originalData: row, enrichments, status: 'completed' };
  }
}

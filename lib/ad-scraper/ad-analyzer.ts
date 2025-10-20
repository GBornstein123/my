import { AdMetadata } from './types';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

export interface AdAnalysis {
  adId: string;
  problemAddressed: string;
  useCase: string;
  keyMessage: string;
  visualStyle: string;
  targetAudience: string;
  copyStrategy: string;
  uniqueAngle: string;
  emotionalTrigger: string;
  recommendations: string[];
}

export interface AdAnalysisReport {
  totalAdsAnalyzed: number;
  analyses: AdAnalysis[];
  patterns: {
    commonProblems: string[];
    popularUseCases: string[];
    effectiveCopyStrategies: string[];
    targetAudiences: string[];
  };
  recommendations: string[];
}

export class AdAnalyzer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeAd(ad: AdMetadata): Promise<AdAnalysis> {
    const prompt = this.buildAnalysisPrompt(ad);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert ad analyst specializing in competitive analysis.
            Analyze ads to extract insights about the problem they're solving, target audience,
            copy strategies, and what makes them effective. Provide actionable insights that
            can be repurposed for new ads.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const analysisText = response.choices[0]?.message?.content || '';
      return this.parseAnalysis(ad.id, analysisText);
    } catch (error) {
      console.error(`Failed to analyze ad ${ad.id}:`, error);
      return this.createEmptyAnalysis(ad.id);
    }
  }

  async analyzeBatch(ads: AdMetadata[], progressCallback?: (current: number, total: number) => void): Promise<AdAnalysisReport> {
    const analyses: AdAnalysis[] = [];

    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];

      if (progressCallback) {
        progressCallback(i + 1, ads.length);
      }

      console.log(`Analyzing ad ${i + 1}/${ads.length}: ${ad.advertiser}`);

      const analysis = await this.analyzeAd(ad);
      analyses.push(analysis);

      // Rate limiting - wait 1 second between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Extract patterns
    const patterns = this.extractPatterns(analyses);

    // Generate overall recommendations
    const recommendations = await this.generateRecommendations(analyses, patterns);

    return {
      totalAdsAnalyzed: ads.length,
      analyses,
      patterns,
      recommendations,
    };
  }

  private buildAnalysisPrompt(ad: AdMetadata): string {
    return `Analyze this competitor ad and extract key insights:

**Advertiser:** ${ad.advertiser}
**Platform:** ${ad.platform}
**Headline:** ${ad.headline || 'N/A'}
**Ad Text:** ${ad.adText}
**Call to Action:** ${ad.callToAction || 'N/A'}
**Landing Page:** ${ad.landingPageUrl || 'N/A'}
**Media Type:** ${ad.mediaType || 'N/A'}

Please provide a structured analysis in the following format:

**Problem Addressed:** [What pain point or problem does this ad address?]

**Use Case:** [What specific use case or scenario is highlighted?]

**Key Message:** [What's the main message or value proposition?]

**Visual Style:** [Describe the visual approach based on media type]

**Target Audience:** [Who is the intended audience?]

**Copy Strategy:** [What copywriting techniques are used? e.g., urgency, social proof, benefit-focused]

**Unique Angle:** [What makes this ad stand out or different?]

**Emotional Trigger:** [What emotion does this ad try to evoke? e.g., FOMO, aspiration, relief]

**Recommendations:** [3 specific tactics from this ad that could be repurposed]`;
  }

  private parseAnalysis(adId: string, analysisText: string): AdAnalysis {
    // Parse the structured response
    const extract = (label: string): string => {
      const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\*]+)`, 'i');
      const match = analysisText.match(regex);
      return match ? match[1].trim() : 'N/A';
    };

    const extractList = (label: string): string[] => {
      const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\*]+)`, 'i');
      const match = analysisText.match(regex);
      if (!match) return [];

      const listText = match[1].trim();
      // Extract numbered or bulleted lists
      const items = listText.split(/\n[-\d.]+\s*/).filter(item => item.trim().length > 0);

      return items.length > 0 ? items : [listText];
    };

    return {
      adId,
      problemAddressed: extract('Problem Addressed'),
      useCase: extract('Use Case'),
      keyMessage: extract('Key Message'),
      visualStyle: extract('Visual Style'),
      targetAudience: extract('Target Audience'),
      copyStrategy: extract('Copy Strategy'),
      uniqueAngle: extract('Unique Angle'),
      emotionalTrigger: extract('Emotional Trigger'),
      recommendations: extractList('Recommendations'),
    };
  }

  private createEmptyAnalysis(adId: string): AdAnalysis {
    return {
      adId,
      problemAddressed: 'Analysis failed',
      useCase: 'N/A',
      keyMessage: 'N/A',
      visualStyle: 'N/A',
      targetAudience: 'N/A',
      copyStrategy: 'N/A',
      uniqueAngle: 'N/A',
      emotionalTrigger: 'N/A',
      recommendations: [],
    };
  }

  private extractPatterns(analyses: AdAnalysis[]): AdAnalysisReport['patterns'] {
    // Count occurrences of different strategies
    const problems = new Map<string, number>();
    const useCases = new Map<string, number>();
    const copyStrategies = new Map<string, number>();
    const audiences = new Map<string, number>();

    analyses.forEach(analysis => {
      // Track problems
      if (analysis.problemAddressed !== 'N/A') {
        const count = problems.get(analysis.problemAddressed) || 0;
        problems.set(analysis.problemAddressed, count + 1);
      }

      // Track use cases
      if (analysis.useCase !== 'N/A') {
        const count = useCases.get(analysis.useCase) || 0;
        useCases.set(analysis.useCase, count + 1);
      }

      // Track copy strategies
      if (analysis.copyStrategy !== 'N/A') {
        const count = copyStrategies.get(analysis.copyStrategy) || 0;
        copyStrategies.set(analysis.copyStrategy, count + 1);
      }

      // Track audiences
      if (analysis.targetAudience !== 'N/A') {
        const count = audiences.get(analysis.targetAudience) || 0;
        audiences.set(analysis.targetAudience, count + 1);
      }
    });

    // Get top items
    const getTop = (map: Map<string, number>, limit: number = 5): string[] => {
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key]) => key);
    };

    return {
      commonProblems: getTop(problems),
      popularUseCases: getTop(useCases),
      effectiveCopyStrategies: getTop(copyStrategies),
      targetAudiences: getTop(audiences),
    };
  }

  private async generateRecommendations(analyses: AdAnalysis[], patterns: AdAnalysisReport['patterns']): Promise<string[]> {
    const prompt = `Based on the analysis of ${analyses.length} competitor ads, here are the patterns discovered:

**Common Problems Addressed:**
${patterns.commonProblems.map((p, i) => `${i + 1}. ${p}`).join('\n')}

**Popular Use Cases:**
${patterns.popularUseCases.map((u, i) => `${i + 1}. ${u}`).join('\n')}

**Effective Copy Strategies:**
${patterns.effectiveCopyStrategies.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Target Audiences:**
${patterns.targetAudiences.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Generate 5-7 actionable recommendations for creating new ads based on these insights. Focus on:
1. What problems to highlight
2. Which use cases to emphasize
3. What copy strategies to employ
4. How to position the product

Provide specific, tactical recommendations that can be immediately implemented.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert ad strategist. Provide clear, actionable recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 800,
      });

      const recommendationsText = response.choices[0]?.message?.content || '';
      // Parse numbered recommendations
      const recommendations = recommendationsText
        .split(/\n\d+\.\s*/)
        .filter(r => r.trim().length > 0)
        .map(r => r.trim());

      return recommendations.length > 0 ? recommendations : ['Failed to generate recommendations'];
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return ['Failed to generate recommendations'];
    }
  }

  saveReport(report: AdAnalysisReport, outputPath: string): void {
    // Save as JSON
    const jsonPath = outputPath.endsWith('.json') ? outputPath : `${outputPath}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Also save as human-readable markdown
    const mdPath = jsonPath.replace('.json', '.md');
    const markdown = this.generateMarkdownReport(report);
    fs.writeFileSync(mdPath, markdown);

    console.log(`Report saved to ${jsonPath} and ${mdPath}`);
  }

  private generateMarkdownReport(report: AdAnalysisReport): string {
    const md: string[] = [];

    md.push('# Competitor Ad Analysis Report');
    md.push('');
    md.push(`**Total Ads Analyzed:** ${report.totalAdsAnalyzed}`);
    md.push('');

    md.push('## Patterns Discovered');
    md.push('');

    md.push('### Common Problems Addressed');
    report.patterns.commonProblems.forEach((p, i) => {
      md.push(`${i + 1}. ${p}`);
    });
    md.push('');

    md.push('### Popular Use Cases');
    report.patterns.popularUseCases.forEach((u, i) => {
      md.push(`${i + 1}. ${u}`);
    });
    md.push('');

    md.push('### Effective Copy Strategies');
    report.patterns.effectiveCopyStrategies.forEach((s, i) => {
      md.push(`${i + 1}. ${s}`);
    });
    md.push('');

    md.push('### Target Audiences');
    report.patterns.targetAudiences.forEach((a, i) => {
      md.push(`${i + 1}. ${a}`);
    });
    md.push('');

    md.push('## Recommendations');
    md.push('');
    report.recommendations.forEach((r, i) => {
      md.push(`${i + 1}. ${r}`);
      md.push('');
    });

    md.push('## Individual Ad Analyses');
    md.push('');

    report.analyses.forEach((analysis, i) => {
      md.push(`### Ad ${i + 1}: ${analysis.adId}`);
      md.push('');
      md.push(`**Problem Addressed:** ${analysis.problemAddressed}`);
      md.push('');
      md.push(`**Use Case:** ${analysis.useCase}`);
      md.push('');
      md.push(`**Key Message:** ${analysis.keyMessage}`);
      md.push('');
      md.push(`**Target Audience:** ${analysis.targetAudience}`);
      md.push('');
      md.push(`**Copy Strategy:** ${analysis.copyStrategy}`);
      md.push('');
      md.push(`**Unique Angle:** ${analysis.uniqueAngle}`);
      md.push('');
      md.push(`**Emotional Trigger:** ${analysis.emotionalTrigger}`);
      md.push('');

      if (analysis.recommendations.length > 0) {
        md.push('**Recommendations:**');
        analysis.recommendations.forEach(rec => {
          md.push(`- ${rec}`);
        });
        md.push('');
      }

      md.push('---');
      md.push('');
    });

    return md.join('\n');
  }
}

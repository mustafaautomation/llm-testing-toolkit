import { cosineSimilarity, extractKeyPhrases } from '../utils/similarity';

export interface QualityConfig {
  relevanceThreshold?: number;
  coherenceThreshold?: number;
  overallThreshold?: number;
  maxLength?: number;
  expectedFormat?: 'json' | 'markdown' | 'plain';
  jsonSchema?: Record<string, unknown>;
  requiredSections?: string[];
}

export interface QualityResult {
  passed: boolean;
  score: number;
  relevanceScore: number;
  coherenceScore: number;
  formatScore: number;
  completenessScore: number;
  details: string;
}

const DEFAULT_CONFIG: Required<Omit<QualityConfig, 'jsonSchema' | 'requiredSections'>> & {
  jsonSchema?: Record<string, unknown>;
  requiredSections?: string[];
} = {
  relevanceThreshold: 0.6,
  coherenceThreshold: 0.5,
  overallThreshold: 0.6,
  maxLength: 0,
  expectedFormat: 'plain',
  jsonSchema: undefined,
  requiredSections: undefined,
};

export class QualityEvaluator {
  private config: typeof DEFAULT_CONFIG;

  constructor(config?: QualityConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  evaluate(response: string, prompt: string): QualityResult {
    const relevanceScore = this.evaluateRelevance(response, prompt);
    const coherenceScore = this.evaluateCoherence(response);
    const formatScore = this.evaluateFormat(response);
    const completenessScore = this.evaluateCompleteness(response, prompt);

    const score = (relevanceScore + coherenceScore + formatScore + completenessScore) / 4;

    const passed =
      relevanceScore >= this.config.relevanceThreshold &&
      coherenceScore >= this.config.coherenceThreshold &&
      score >= this.config.overallThreshold;

    const details = [
      `Relevance: ${(relevanceScore * 100).toFixed(1)}%`,
      `Coherence: ${(coherenceScore * 100).toFixed(1)}%`,
      `Format: ${(formatScore * 100).toFixed(1)}%`,
      `Completeness: ${(completenessScore * 100).toFixed(1)}%`,
      `Overall: ${(score * 100).toFixed(1)}%`,
      passed ? 'PASS' : 'FAIL',
    ].join(' | ');

    return {
      passed,
      score,
      relevanceScore,
      coherenceScore,
      formatScore,
      completenessScore,
      details,
    };
  }

  private evaluateRelevance(response: string, prompt: string): number {
    const promptPhrases = extractKeyPhrases(prompt);
    const responseLower = response.toLowerCase();

    // Keyword overlap
    const keywordHits = promptPhrases.filter((p) => responseLower.includes(p));
    const keywordScore = promptPhrases.length > 0 ? keywordHits.length / promptPhrases.length : 0.5;

    // Semantic similarity
    const semanticScore = cosineSimilarity(prompt, response);

    return keywordScore * 0.5 + semanticScore * 0.5;
  }

  private evaluateCoherence(response: string): number {
    const sentences = response.split(/(?<=[.!?])\s+/).filter((s) => s.length > 5);
    if (sentences.length <= 1) return 0.8;

    let transitionScore = 0;
    for (let i = 1; i < sentences.length; i++) {
      const similarity = cosineSimilarity(sentences[i - 1], sentences[i]);
      transitionScore += similarity;
    }

    const avgTransition = transitionScore / (sentences.length - 1);

    // Length variance penalty (very short or very long responses)
    const avgSentenceLen = response.length / sentences.length;
    const lengthPenalty = avgSentenceLen < 10 ? 0.7 : avgSentenceLen > 500 ? 0.8 : 1.0;

    return Math.min(1, avgTransition * 1.5) * lengthPenalty;
  }

  private evaluateFormat(response: string): number {
    if (this.config.maxLength && response.length > this.config.maxLength) {
      return 0.3;
    }

    switch (this.config.expectedFormat) {
      case 'json':
        return this.validateJson(response);
      case 'markdown':
        return this.validateMarkdown(response);
      default:
        return response.trim().length > 0 ? 1.0 : 0;
    }
  }

  private validateJson(response: string): number {
    try {
      const parsed = JSON.parse(response);

      if (this.config.jsonSchema) {
        return this.validateSchema(parsed, this.config.jsonSchema) ? 1.0 : 0.5;
      }

      return 1.0;
    } catch {
      // Check if JSON is embedded in text
      const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          JSON.parse(jsonMatch[0]);
          return 0.7;
        } catch {
          return 0;
        }
      }
      return 0;
    }
  }

  private validateMarkdown(response: string): number {
    let score = 0.5;
    if (/^#+\s/m.test(response)) score += 0.2; // Has headers
    if (/^\s*[-*]\s/m.test(response)) score += 0.15; // Has lists
    if (/```[\s\S]*?```/.test(response)) score += 0.15; // Has code blocks
    return Math.min(1, score);
  }

  private validateSchema(data: unknown, schema: Record<string, unknown>): boolean {
    if (typeof schema !== 'object' || schema === null) return true;

    const requiredFields = schema.required as string[] | undefined;
    if (requiredFields && typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      return requiredFields.every((field) => field in obj);
    }

    return true;
  }

  private evaluateCompleteness(response: string, prompt: string): number {
    // Check required sections
    if (this.config.requiredSections) {
      const responseLower = response.toLowerCase();
      const found = this.config.requiredSections.filter((s) =>
        responseLower.includes(s.toLowerCase())
      );
      return found.length / this.config.requiredSections.length;
    }

    // Check multi-part prompt coverage
    const parts = this.extractPromptParts(prompt);
    if (parts.length <= 1) return 1.0;

    const responseLower = response.toLowerCase();
    const addressedParts = parts.filter((part) => {
      const phrases = extractKeyPhrases(part);
      const matched = phrases.filter((p) => responseLower.includes(p));
      return phrases.length > 0 ? matched.length / phrases.length > 0.3 : true;
    });

    return addressedParts.length / parts.length;
  }

  private extractPromptParts(prompt: string): string[] {
    // Split by numbering, bullet points, or question marks
    const parts = prompt.split(/(?:\d+[.)]\s|[-*]\s|\?\s)/);
    return parts.filter((p) => p.trim().length > 10);
  }
}

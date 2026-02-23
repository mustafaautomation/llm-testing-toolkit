import { cosineSimilarity, extractKeyPhrases } from '../utils/similarity';

export interface HallucinationConfig {
  groundingThreshold?: number;
  claimSplitPattern?: RegExp;
}

export interface Claim {
  text: string;
  grounded: boolean;
  supportScore: number;
  contradicts: boolean;
}

export interface HallucinationResult {
  passed: boolean;
  score: number;
  groundingScore: number;
  claims: Claim[];
  contradictions: Claim[];
  details: string;
}

const DEFAULT_CONFIG: Required<HallucinationConfig> = {
  groundingThreshold: 0.7,
  claimSplitPattern: /(?<=[.!?])\s+/,
};

export class HallucinationEvaluator {
  private config: Required<HallucinationConfig>;

  constructor(config?: HallucinationConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  evaluate(response: string, sourceDocuments: string | string[]): HallucinationResult {
    const sources = Array.isArray(sourceDocuments) ? sourceDocuments : [sourceDocuments];
    const combinedSource = sources.join(' ');

    const claims = this.extractClaims(response);
    const evaluatedClaims = claims.map((claim) => this.evaluateClaim(claim, combinedSource));

    const contradictions = evaluatedClaims.filter((c) => c.contradicts);
    const groundedCount = evaluatedClaims.filter((c) => c.grounded).length;
    const groundingScore = evaluatedClaims.length > 0 ? groundedCount / evaluatedClaims.length : 1;

    const passed = groundingScore >= this.config.groundingThreshold && contradictions.length === 0;

    const details = [
      `Grounding: ${(groundingScore * 100).toFixed(1)}% (${groundedCount}/${evaluatedClaims.length} claims)`,
      `Contradictions: ${contradictions.length}`,
      passed ? 'PASS' : 'FAIL',
    ].join(' | ');

    return {
      passed,
      score: groundingScore,
      groundingScore,
      claims: evaluatedClaims,
      contradictions,
      details,
    };
  }

  private extractClaims(text: string): string[] {
    return text
      .split(this.config.claimSplitPattern)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  private evaluateClaim(claim: string, source: string): Claim {
    const claimPhrases = extractKeyPhrases(claim);
    const sourceLower = source.toLowerCase();

    // Check direct phrase presence
    const phraseMatches = claimPhrases.filter((p) => sourceLower.includes(p));
    const phraseOverlap = claimPhrases.length > 0 ? phraseMatches.length / claimPhrases.length : 0;

    // Semantic similarity with source chunks
    const sourceChunks = this.chunkText(source, 200);
    const maxSimilarity = sourceChunks.reduce((max, chunk) => {
      const sim = cosineSimilarity(claim, chunk);
      return Math.max(max, sim);
    }, 0);

    const supportScore = phraseOverlap * 0.5 + maxSimilarity * 0.5;
    const grounded = supportScore >= 0.4;

    // Contradiction detection: check for negation patterns relative to source
    const contradicts = this.detectContradiction(claim, source);

    return { text: claim, grounded, supportScore, contradicts };
  }

  private detectContradiction(claim: string, source: string): boolean {
    const negationPatterns = [
      /\bnot\b/i, /\bnever\b/i, /\bno\b/i, /\bnone\b/i,
      /\bwithout\b/i, /\bfailed\b/i, /\bincorrect\b/i,
    ];

    const claimPhrases = extractKeyPhrases(claim);
    const sourceLower = source.toLowerCase();

    // If the claim has negation words and shares key phrases with source,
    // it might be contradicting the source
    const hasNegation = negationPatterns.some((p) => p.test(claim));
    const sharesContent = claimPhrases.some((p) => sourceLower.includes(p));

    if (!hasNegation || !sharesContent) return false;

    // Check if the source makes a positive statement about the same topic
    // while the claim negates it (simplified heuristic)
    const claimWithoutNegation = claim.replace(/\b(not|never|no|none|without|failed|incorrect)\b/gi, '').trim();
    const similarity = cosineSimilarity(claimWithoutNegation, source);

    return similarity > 0.5;
  }

  private chunkText(text: string, chunkSize: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    return chunks.length > 0 ? chunks : [text];
  }
}

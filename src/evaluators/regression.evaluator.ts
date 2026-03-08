import { combinedSimilarity, keyPhraseOverlap } from '../utils/similarity';

export interface RegressionConfig {
  similarityThreshold?: number;
  keyPhraseThreshold?: number;
  mode?: 'exact' | 'semantic' | 'combined';
}

export interface RegressionResult {
  passed: boolean;
  score: number;
  similarityScore: number;
  keyPhraseScore: number;
  details: string;
  baseline: string;
  actual: string;
}

const DEFAULT_CONFIG: Required<RegressionConfig> = {
  similarityThreshold: 0.85,
  keyPhraseThreshold: 0.7,
  mode: 'combined',
};

export class RegressionEvaluator {
  private config: Required<RegressionConfig>;

  constructor(config?: RegressionConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  evaluate(actual: string, baseline: string): RegressionResult {
    if (this.config.mode === 'exact') {
      const passed = actual.trim() === baseline.trim();
      return {
        passed,
        score: passed ? 1 : 0,
        similarityScore: passed ? 1 : 0,
        keyPhraseScore: passed ? 1 : 0,
        details: passed ? 'Exact match' : 'Exact match failed',
        baseline,
        actual,
      };
    }

    const similarityScore = combinedSimilarity(actual, baseline);
    const keyPhraseScore = keyPhraseOverlap(baseline, actual);

    let passed: boolean;
    let score: number;

    if (this.config.mode === 'semantic') {
      score = similarityScore;
      passed = similarityScore >= this.config.similarityThreshold;
    } else {
      // combined mode
      score = similarityScore * 0.6 + keyPhraseScore * 0.4;
      passed =
        similarityScore >= this.config.similarityThreshold &&
        keyPhraseScore >= this.config.keyPhraseThreshold;
    }

    const details = [
      `Similarity: ${(similarityScore * 100).toFixed(1)}% (threshold: ${this.config.similarityThreshold * 100}%)`,
      `Key phrases: ${(keyPhraseScore * 100).toFixed(1)}% (threshold: ${this.config.keyPhraseThreshold * 100}%)`,
      passed ? 'PASS' : 'FAIL',
    ].join(' | ');

    return {
      passed,
      score,
      similarityScore,
      keyPhraseScore,
      details,
      baseline,
      actual,
    };
  }
}

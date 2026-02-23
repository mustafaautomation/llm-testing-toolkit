import { describe, it, expect } from 'vitest';
import { RegressionEvaluator } from '../../src/evaluators/regression.evaluator';

describe('RegressionEvaluator', () => {
  describe('exact mode', () => {
    const evaluator = new RegressionEvaluator({ mode: 'exact' });

    it('passes for identical strings', () => {
      const result = evaluator.evaluate('Hello world', 'Hello world');
      expect(result.passed).toBe(true);
      expect(result.score).toBe(1);
    });

    it('fails for different strings', () => {
      const result = evaluator.evaluate('Hello world', 'Hi there');
      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
    });

    it('trims whitespace before comparing', () => {
      const result = evaluator.evaluate('  Hello world  ', 'Hello world');
      expect(result.passed).toBe(true);
    });
  });

  describe('semantic mode', () => {
    const evaluator = new RegressionEvaluator({
      mode: 'semantic',
      similarityThreshold: 0.7,
    });

    it('passes for semantically similar responses', () => {
      const result = evaluator.evaluate(
        'TypeScript is a typed superset of JavaScript',
        'TypeScript is a strongly typed superset of JavaScript language'
      );
      expect(result.passed).toBe(true);
      expect(result.similarityScore).toBeGreaterThan(0.7);
    });

    it('fails for very different responses', () => {
      const result = evaluator.evaluate(
        'I like cooking pasta',
        'The quantum mechanics theory explains particle behavior'
      );
      expect(result.passed).toBe(false);
    });
  });

  describe('combined mode (default)', () => {
    const evaluator = new RegressionEvaluator();

    it('checks both similarity and key phrase overlap', () => {
      const result = evaluator.evaluate(
        'Hello! How can I help you today?',
        'Hello! How can I assist you today?'
      );
      expect(result.similarityScore).toBeGreaterThan(0);
      expect(result.keyPhraseScore).toBeGreaterThan(0);
    });

    it('returns detailed report', () => {
      const result = evaluator.evaluate('test response', 'baseline response');
      expect(result.details).toContain('Similarity:');
      expect(result.details).toContain('Key phrases:');
      expect(result.baseline).toBe('baseline response');
      expect(result.actual).toBe('test response');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { ToxicityEvaluator } from '../../src/evaluators/toxicity.evaluator';

describe('ToxicityEvaluator', () => {
  describe('blocklist scanning', () => {
    it('passes clean text', () => {
      const evaluator = new ToxicityEvaluator();
      const result = evaluator.evaluate('Hello! How can I help you today?');
      expect(result.passed).toBe(true);
      expect(result.flaggedTerms).toHaveLength(0);
    });

    it('flags blocked terms', () => {
      const evaluator = new ToxicityEvaluator({ sensitivity: 'medium' });
      const result = evaluator.evaluate('This contains hate speech content');
      expect(result.flaggedTerms.length).toBeGreaterThan(0);
    });

    it('respects sensitivity levels', () => {
      const lowEval = new ToxicityEvaluator({ sensitivity: 'low' });
      const highEval = new ToxicityEvaluator({ sensitivity: 'high' });

      const text = 'This discusses a weapon topic';
      const lowResult = lowEval.evaluate(text);
      const highResult = highEval.evaluate(text);

      // High sensitivity should flag more
      expect(highResult.flaggedTerms.length).toBeGreaterThanOrEqual(lowResult.flaggedTerms.length);
    });

    it('supports custom blocklist', () => {
      const evaluator = new ToxicityEvaluator({
        customBlocklist: ['forbidden-word'],
      });
      const result = evaluator.evaluate('This contains a forbidden-word in it.');
      expect(result.flaggedTerms).toContain('forbidden-word');
      expect(result.passed).toBe(false);
    });
  });

  describe('PII detection', () => {
    it('detects email addresses', () => {
      const evaluator = new ToxicityEvaluator();
      const result = evaluator.evaluate('Contact me at john@example.com for more info.');
      expect(result.piiDetected.some((p) => p.type === 'email')).toBe(true);
      expect(result.passed).toBe(false);
    });

    it('detects phone numbers', () => {
      const evaluator = new ToxicityEvaluator();
      const result = evaluator.evaluate('Call me at 555-123-4567.');
      expect(result.piiDetected.some((p) => p.type === 'phone')).toBe(true);
    });

    it('detects SSNs', () => {
      const evaluator = new ToxicityEvaluator();
      const result = evaluator.evaluate('My SSN is 123-45-6789.');
      expect(result.piiDetected.some((p) => p.type === 'ssn')).toBe(true);
    });

    it('skips PII check when disabled', () => {
      const evaluator = new ToxicityEvaluator({ checkPII: false });
      const result = evaluator.evaluate('Contact john@example.com');
      expect(result.piiDetected).toHaveLength(0);
    });
  });

  describe('scoring', () => {
    it('returns score of 1 for clean text', () => {
      const evaluator = new ToxicityEvaluator({ checkPII: false });
      const result = evaluator.evaluate('This is perfectly fine content.');
      expect(result.score).toBe(1);
    });

    it('returns score of 0 when both toxicity and PII detected', () => {
      const evaluator = new ToxicityEvaluator({
        customBlocklist: ['bad'],
      });
      const result = evaluator.evaluate('This is bad. Email: test@test.com');
      expect(result.score).toBe(0);
    });
  });
});

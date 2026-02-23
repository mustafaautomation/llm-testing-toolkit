import { describe, it, expect } from 'vitest';
import { QualityEvaluator } from '../../src/evaluators/quality.evaluator';

describe('QualityEvaluator', () => {
  describe('relevance', () => {
    it('scores highly for relevant responses', () => {
      const evaluator = new QualityEvaluator();
      const result = evaluator.evaluate(
        'TypeScript is a statically typed superset of JavaScript that compiles to plain JavaScript.',
        'What is TypeScript?'
      );
      expect(result.relevanceScore).toBeGreaterThan(0.3);
    });

    it('scores low for irrelevant responses', () => {
      const evaluator = new QualityEvaluator();
      const result = evaluator.evaluate(
        'I enjoy pasta with marinara sauce for dinner.',
        'Explain quantum computing.'
      );
      expect(result.relevanceScore).toBeLessThan(0.5);
    });
  });

  describe('format validation', () => {
    it('validates JSON format', () => {
      const evaluator = new QualityEvaluator({ expectedFormat: 'json' });
      const result = evaluator.evaluate(
        '{"name": "John", "age": 30}',
        'Return a JSON object'
      );
      expect(result.formatScore).toBe(1);
    });

    it('fails invalid JSON', () => {
      const evaluator = new QualityEvaluator({ expectedFormat: 'json' });
      const result = evaluator.evaluate(
        'This is not JSON at all',
        'Return a JSON object'
      );
      expect(result.formatScore).toBe(0);
    });

    it('partially passes JSON embedded in text', () => {
      const evaluator = new QualityEvaluator({ expectedFormat: 'json' });
      const result = evaluator.evaluate(
        'Here is the result: {"name": "John", "age": 30}',
        'Return a JSON object'
      );
      expect(result.formatScore).toBeGreaterThan(0);
      expect(result.formatScore).toBeLessThan(1);
    });

    it('validates JSON schema', () => {
      const evaluator = new QualityEvaluator({
        expectedFormat: 'json',
        jsonSchema: { required: ['name', 'age'] },
      });

      const pass = evaluator.evaluate('{"name": "John", "age": 30}', 'test');
      expect(pass.formatScore).toBe(1);

      const fail = evaluator.evaluate('{"name": "John"}', 'test');
      expect(fail.formatScore).toBeLessThan(1);
    });

    it('validates markdown format', () => {
      const evaluator = new QualityEvaluator({ expectedFormat: 'markdown' });
      const result = evaluator.evaluate(
        '# Title\n\n- Item 1\n- Item 2\n\n```js\nconsole.log("hi")\n```',
        'Write a guide'
      );
      expect(result.formatScore).toBe(1);
    });
  });

  describe('completeness', () => {
    it('checks required sections', () => {
      const evaluator = new QualityEvaluator({
        requiredSections: ['introduction', 'conclusion'],
      });
      const result = evaluator.evaluate(
        'Introduction: This is a guide. Conclusion: That wraps it up.',
        'Write a guide with introduction and conclusion'
      );
      expect(result.completenessScore).toBe(1);
    });

    it('scores partially for missing sections', () => {
      const evaluator = new QualityEvaluator({
        requiredSections: ['introduction', 'conclusion', 'examples'],
      });
      const result = evaluator.evaluate(
        'Introduction: Hello. Conclusion: Done.',
        'Write a guide'
      );
      expect(result.completenessScore).toBeGreaterThan(0);
      expect(result.completenessScore).toBeLessThan(1);
    });
  });

  describe('max length', () => {
    it('penalizes responses exceeding max length', () => {
      const evaluator = new QualityEvaluator({ maxLength: 10 });
      const result = evaluator.evaluate(
        'This is a response that is definitely longer than ten characters.',
        'Write something short'
      );
      expect(result.formatScore).toBeLessThan(1);
    });
  });

  describe('overall', () => {
    it('returns all score dimensions', () => {
      const evaluator = new QualityEvaluator();
      const result = evaluator.evaluate(
        'TypeScript adds static types to JavaScript.',
        'What is TypeScript?'
      );
      expect(result).toHaveProperty('relevanceScore');
      expect(result).toHaveProperty('coherenceScore');
      expect(result).toHaveProperty('formatScore');
      expect(result).toHaveProperty('completenessScore');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('passed');
      expect(result.details).toContain('Relevance:');
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  TestSuite,
  TestCase,
  TestCaseResult,
  EvaluationResult,
  SuiteResult,
  TestSummary,
} from '../../src/core/suite';

describe('TestSuite structure', () => {
  it('should create valid test suite', () => {
    const suite: TestSuite = {
      name: 'Regression Tests',
      description: 'Verify response consistency',
      provider: 'openai',
      tests: [
        {
          name: 'greeting test',
          prompt: 'Say hello',
          evaluators: [{ type: 'quality' }],
          tags: ['smoke'],
        },
      ],
    };

    expect(suite.tests).toHaveLength(1);
    expect(suite.tests[0].evaluators[0].type).toBe('quality');
  });

  it('should support multiple evaluators per test', () => {
    const test: TestCase = {
      name: 'comprehensive test',
      prompt: 'Explain photosynthesis',
      evaluators: [
        { type: 'quality' },
        { type: 'hallucination' },
        { type: 'toxicity' },
        { type: 'regression' },
      ],
      context:
        'Photosynthesis is the process by which plants convert light energy into chemical energy.',
      baseline: 'Previous good response about photosynthesis.',
    };

    expect(test.evaluators).toHaveLength(4);
    expect(test.context).toBeTruthy();
    expect(test.baseline).toBeTruthy();
  });

  it('should support context as string array', () => {
    const test: TestCase = {
      name: 'multi-source test',
      prompt: 'Summarize these documents',
      evaluators: [{ type: 'hallucination' }],
      context: [
        'Document 1: The sky is blue.',
        'Document 2: Water is composed of H2O.',
        'Document 3: The sun is a star.',
      ],
    };

    expect(Array.isArray(test.context)).toBe(true);
    expect((test.context as string[]).length).toBe(3);
  });
});

describe('TestCaseResult structure', () => {
  it('should create valid passing result', () => {
    const result: TestCaseResult = {
      testName: 'greeting',
      suiteName: 'Suite A',
      provider: 'anthropic',
      prompt: 'Say hello',
      response: 'Hello! How can I help you today?',
      latencyMs: 450,
      tokens: { input: 5, output: 12 },
      evaluations: [
        { evaluator: 'quality', passed: true, score: 0.95, details: 'High quality response' },
      ],
      passed: true,
    };

    expect(result.passed).toBe(true);
    expect(result.latencyMs).toBe(450);
    expect(result.tokens.input).toBe(5);
  });

  it('should create valid failing result with error', () => {
    const result: TestCaseResult = {
      testName: 'broken',
      suiteName: 'Suite B',
      provider: 'openai',
      prompt: 'test',
      response: '',
      latencyMs: 0,
      tokens: { input: 0, output: 0 },
      evaluations: [],
      passed: false,
      error: 'Rate limit exceeded',
    };

    expect(result.passed).toBe(false);
    expect(result.error).toContain('Rate limit');
  });
});

describe('EvaluationResult structure', () => {
  it('should support all evaluator types', () => {
    const types: EvaluationResult['evaluator'][] = [
      'regression',
      'hallucination',
      'quality',
      'toxicity',
    ];

    for (const type of types) {
      const result: EvaluationResult = {
        evaluator: type,
        passed: true,
        score: 0.9,
        details: `${type} check passed`,
      };
      expect(result.evaluator).toBe(type);
    }
  });
});

describe('SuiteResult structure', () => {
  it('should correctly count pass/fail/error', () => {
    const result: SuiteResult = {
      name: 'Mixed Suite',
      tests: [
        {
          testName: 'a',
          suiteName: 's',
          provider: 'p',
          prompt: '',
          response: '',
          latencyMs: 0,
          tokens: { input: 0, output: 0 },
          evaluations: [],
          passed: true,
        },
        {
          testName: 'b',
          suiteName: 's',
          provider: 'p',
          prompt: '',
          response: '',
          latencyMs: 0,
          tokens: { input: 0, output: 0 },
          evaluations: [],
          passed: false,
        },
        {
          testName: 'c',
          suiteName: 's',
          provider: 'p',
          prompt: '',
          response: '',
          latencyMs: 0,
          tokens: { input: 0, output: 0 },
          evaluations: [],
          passed: false,
          error: 'timeout',
        },
      ],
      passed: 1,
      failed: 1,
      errors: 1,
    };

    expect(result.passed + result.failed + result.errors).toBe(3);
  });
});

describe('TestSummary structure', () => {
  it('should calculate pass rate', () => {
    const summary: TestSummary = {
      total: 10,
      passed: 8,
      failed: 1,
      errors: 1,
      passRate: 0.8,
      avgLatencyMs: 350,
      totalTokens: { input: 500, output: 2000 },
    };

    expect(summary.passRate).toBe(0.8);
    expect(summary.total).toBe(summary.passed + summary.failed + summary.errors);
  });
});

import { describe, it, expect } from 'vitest';
import { HallucinationEvaluator } from '../../src/evaluators/hallucination.evaluator';

describe('HallucinationEvaluator', () => {
  const source = `
    TypeScript is a programming language developed by Microsoft.
    It was first released in October 2012. Anders Hejlsberg led
    the development of TypeScript. TypeScript adds static typing
    to JavaScript and transpiles to plain JavaScript.
  `;

  it('passes for well-grounded responses', () => {
    const evaluator = new HallucinationEvaluator({ groundingThreshold: 0.5 });
    const response =
      'TypeScript was developed by Microsoft and first released in October 2012. It adds static typing to JavaScript.';

    const result = evaluator.evaluate(response, source);
    expect(result.groundingScore).toBeGreaterThan(0);
    expect(result.claims.length).toBeGreaterThan(0);
  });

  it('detects ungrounded claims', () => {
    const evaluator = new HallucinationEvaluator({ groundingThreshold: 0.9 });
    const response =
      'TypeScript was created by Google in 2005. It is a compiled language that runs on the JVM.';

    const result = evaluator.evaluate(response, source);
    const ungroundedClaims = result.claims.filter((c) => !c.grounded);
    expect(ungroundedClaims.length).toBeGreaterThan(0);
  });

  it('handles multiple source documents', () => {
    const evaluator = new HallucinationEvaluator();
    const sources = ['TypeScript is developed by Microsoft.', 'It was released in 2012.'];

    const response = 'TypeScript is a Microsoft product released in 2012.';
    const result = evaluator.evaluate(response, sources);
    expect(result.claims.length).toBeGreaterThan(0);
  });

  it('returns detailed claim analysis', () => {
    const evaluator = new HallucinationEvaluator();
    const response = 'TypeScript was developed by Microsoft. It adds static typing to JavaScript.';

    const result = evaluator.evaluate(response, source);
    expect(result.details).toContain('Grounding:');
    expect(result.details).toContain('Contradictions:');
    for (const claim of result.claims) {
      expect(claim).toHaveProperty('text');
      expect(claim).toHaveProperty('grounded');
      expect(claim).toHaveProperty('supportScore');
    }
  });
});

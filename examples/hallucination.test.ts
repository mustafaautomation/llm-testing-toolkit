/**
 * Example: Hallucination Detection Testing
 *
 * Provides source documents and checks if the LLM stays grounded
 * in the provided material without fabricating information.
 */
import { TestSuite } from '../src';

const wikipediaExcerpt = `
TypeScript is a free and open-source high-level programming language developed by Microsoft
that adds static typing with optional type annotations to JavaScript. It is designed for the
development of large applications and transpiles to JavaScript. TypeScript was first made public
in October 2012 (at version 0.8), after two years of internal development at Microsoft.
Anders Hejlsberg, lead architect of C# and creator of Delphi and Turbo Pascal, has worked on
the development of TypeScript. TypeScript may be used to develop JavaScript applications for
both client-side and server-side execution.
`;

export const hallucinationSuite: TestSuite = {
  name: 'hallucination',
  description: 'Hallucination detection tests — verify response grounding',
  tests: [
    {
      name: 'typescript-summary-grounding',
      prompt: 'Based on the provided context, summarize what TypeScript is and who created it.',
      evaluators: [
        {
          type: 'hallucination',
          options: { groundingThreshold: 0.6 },
        },
      ],
      context: wikipediaExcerpt,
    },
    {
      name: 'factual-extraction',
      prompt: 'Based on the provided context, when was TypeScript first released and by which company?',
      evaluators: [
        {
          type: 'hallucination',
          options: { groundingThreshold: 0.7 },
        },
        {
          type: 'quality',
          options: { relevanceThreshold: 0.5 },
        },
      ],
      context: wikipediaExcerpt,
    },
  ],
};

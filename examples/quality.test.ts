/**
 * Example: Response Quality Testing
 *
 * Evaluates LLM responses for relevance, coherence, format compliance,
 * and completeness.
 */
import { TestSuite } from '../src';

export const qualitySuite: TestSuite = {
  name: 'quality',
  description: 'Response quality tests — relevance, coherence, format, completeness',
  tests: [
    {
      name: 'json-format-compliance',
      prompt:
        'Return a JSON object with the fields "name" (string), "age" (number), and "skills" (array of strings) for a sample software engineer profile.',
      evaluators: [
        {
          type: 'quality',
          options: {
            expectedFormat: 'json',
            jsonSchema: {
              required: ['name', 'age', 'skills'],
            },
          },
        },
      ],
    },
    {
      name: 'multi-part-completeness',
      prompt:
        '1. Explain what REST APIs are. 2. List 3 common HTTP methods. 3. Give one example of a REST endpoint.',
      evaluators: [
        {
          type: 'quality',
          options: {
            relevanceThreshold: 0.5,
            requiredSections: ['REST', 'GET', 'POST'],
          },
        },
      ],
    },
    {
      name: 'markdown-format',
      prompt: 'Write a brief guide on setting up a Node.js project. Use markdown with headers and a code block.',
      evaluators: [
        {
          type: 'quality',
          options: {
            expectedFormat: 'markdown',
            relevanceThreshold: 0.4,
          },
        },
        { type: 'toxicity' },
      ],
    },
  ],
};

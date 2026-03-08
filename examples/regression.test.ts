/**
 * Example: Prompt Regression Testing
 *
 * Tests that LLM responses remain consistent across model updates.
 * Uses saved baseline responses and compares using semantic similarity.
 */
import { TestSuite } from '../src';

export const regressionSuite: TestSuite = {
  name: 'regression',
  description: 'Prompt regression tests — ensure response consistency',
  tests: [
    {
      name: 'greeting-consistency',
      prompt: 'Greet the user in a friendly, professional manner.',
      evaluators: [
        {
          type: 'regression',
          options: {
            similarityThreshold: 0.8,
            keyPhraseThreshold: 0.6,
            mode: 'combined',
          },
        },
      ],
      baseline: 'Hello! Welcome — how can I assist you today?',
    },
    {
      name: 'product-description',
      prompt: 'Write a one-sentence description for a wireless Bluetooth headphone product.',
      evaluators: [
        {
          type: 'regression',
          options: {
            similarityThreshold: 0.7,
            mode: 'semantic',
          },
        },
      ],
      baseline:
        'Experience premium sound quality with our wireless Bluetooth headphones, featuring active noise cancellation and all-day comfort.',
    },
    {
      name: 'error-message-format',
      prompt: 'Generate a user-friendly error message for a 404 page not found error.',
      evaluators: [
        {
          type: 'regression',
          options: {
            similarityThreshold: 0.75,
            keyPhraseThreshold: 0.5,
          },
        },
        { type: 'toxicity' },
      ],
      baseline:
        "Oops! The page you're looking for doesn't exist. Please check the URL or return to the homepage.",
    },
  ],
};

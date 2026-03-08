import { ToolkitConfig } from '../src';

const config: ToolkitConfig = {
  defaultProvider: 'openai',
  providers: {
    openai: {
      type: 'openai',
      apiKey: '$OPENAI_API_KEY',
      model: 'gpt-4o-mini',
    },
    anthropic: {
      type: 'anthropic',
      apiKey: '$ANTHROPIC_API_KEY',
      model: 'claude-sonnet-4-6',
    },
  },
  concurrency: 3,
  retries: 2,
  suites: [],
  reporters: [
    { type: 'console' },
    { type: 'html', outputPath: './llm-test-results/report.html' },
    { type: 'json', outputPath: './llm-test-results/report.json' },
  ],
  outputDir: './llm-test-results',
  baselineDir: './baselines',
};

export default config;

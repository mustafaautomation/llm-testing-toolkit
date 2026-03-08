#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { loadConfig } from './core/config';
import { TestRunner } from './core/runner';
import { ConsoleReporter } from './reporters/console.reporter';
import { JsonReporter } from './reporters/json.reporter';
import { HtmlReporter } from './reporters/html.reporter';
import { logger, setLogLevel } from './utils/logger';

dotenv.config();

const program = new Command();

program
  .name('llm-test')
  .description('LLM Testing Toolkit — Provider-agnostic LLM evaluation framework')
  .version('1.0.0');

program
  .command('run')
  .description('Run LLM test suites')
  .option('-c, --config <path>', 'Path to config file')
  .option('-s, --suite <name>', 'Run specific test suite')
  .option('--update-baselines', 'Update regression baselines with current responses')
  .option(
    '-r, --reporter <type>',
    'Reporter type: console, json, html (comma-separated)',
    'console',
  )
  .option('-o, --output <dir>', 'Output directory for reports', './llm-test-results')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    if (options.verbose) setLogLevel('debug');

    try {
      const config = await loadConfig(options.config);

      // Override reporters from CLI
      if (options.reporter) {
        const types = options.reporter.split(',').map((t: string) => t.trim());
        config.reporters = types.map((type: string) => ({
          type: type as 'console' | 'json' | 'html',
          outputPath: type === 'console' ? undefined : path.join(options.output, `report.${type}`),
        }));
      }

      const runner = new TestRunner(config);
      const result = await runner.run(options.suite);

      // Run reporters
      for (const reporterConfig of config.reporters || [{ type: 'console' as const }]) {
        switch (reporterConfig.type) {
          case 'console':
            new ConsoleReporter().report(result);
            break;
          case 'json':
            new JsonReporter(reporterConfig.outputPath).report(result);
            break;
          case 'html':
            new HtmlReporter(reporterConfig.outputPath).report(result);
            break;
        }
      }

      // Handle baseline updates
      if (options.updateBaselines) {
        updateBaselines(result, config.baselineDir || './baselines');
      }

      // Exit with failure if tests failed
      if (result.summary.failed > 0 || result.summary.errors > 0) {
        process.exit(1);
      }
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize LLM test configuration and example files')
  .action(() => {
    const configContent = `import { ToolkitConfig } from 'llm-testing-toolkit';

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
  suites: [
    {
      name: 'regression',
      tests: [
        {
          name: 'greeting-response',
          prompt: 'Say hello in a friendly way.',
          evaluators: [
            {
              type: 'regression',
              options: { similarityThreshold: 0.8 },
            },
          ],
          baseline: 'Hello! How can I help you today?',
        },
      ],
    },
    {
      name: 'quality',
      tests: [
        {
          name: 'explanation-quality',
          prompt: 'Explain what TypeScript is in 2-3 sentences.',
          evaluators: [
            { type: 'quality', options: { relevanceThreshold: 0.5 } },
            { type: 'toxicity' },
          ],
        },
      ],
    },
  ],
  reporters: [
    { type: 'console' },
    { type: 'html', outputPath: './llm-test-results/report.html' },
  ],
};

export default config;
`;

    const files: Record<string, string> = {
      'llm-tests.config.ts': configContent,
    };

    for (const [filePath, content] of Object.entries(files)) {
      if (fs.existsSync(filePath)) {
        console.log(`  Skipped ${filePath} (already exists)`);
      } else {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`  Created ${filePath}`);
      }
    }

    console.log();
    console.log('Done! Edit llm-tests.config.ts and run: npx llm-test run');
  });

function updateBaselines(
  result: { suites: Array<{ tests: Array<{ testName: string; response: string }> }> },
  baselineDir: string,
): void {
  if (!fs.existsSync(baselineDir)) {
    fs.mkdirSync(baselineDir, { recursive: true });
  }

  const baselines: Record<string, string> = {};
  for (const suite of result.suites) {
    for (const test of suite.tests) {
      if (test.response) {
        baselines[test.testName] = test.response;
      }
    }
  }

  const outputPath = path.join(baselineDir, 'baselines.json');
  fs.writeFileSync(outputPath, JSON.stringify(baselines, null, 2), 'utf-8');
  console.log(`Baselines updated: ${outputPath}`);
}

program.parse();

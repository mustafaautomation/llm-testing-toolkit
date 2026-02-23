import * as path from 'path';
import * as fs from 'fs';
import { TestSuite } from './suite';

export interface ToolkitConfig {
  providers: Record<string, ProviderConfig>;
  defaultProvider: string;
  suites: TestSuite[];
  concurrency?: number;
  retries?: number;
  reporters?: ReporterConfig[];
  outputDir?: string;
  baselineDir?: string;
}

export interface ProviderConfig {
  type: 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  endpoint?: string;
  headers?: Record<string, string>;
}

export interface ReporterConfig {
  type: 'console' | 'json' | 'html';
  outputPath?: string;
}

const DEFAULT_CONFIG: Partial<ToolkitConfig> = {
  concurrency: 3,
  retries: 2,
  reporters: [{ type: 'console' }],
  outputDir: './llm-test-results',
  baselineDir: './baselines',
};

export async function loadConfig(configPath?: string): Promise<ToolkitConfig> {
  const searchPaths = configPath
    ? [configPath]
    : [
        'llm-tests.config.ts',
        'llm-tests.config.js',
        'llm-tests.config.json',
      ];

  for (const searchPath of searchPaths) {
    const fullPath = path.resolve(process.cwd(), searchPath);

    if (!fs.existsSync(fullPath)) continue;

    if (fullPath.endsWith('.json')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const parsed = JSON.parse(content);
      return { ...DEFAULT_CONFIG, ...parsed } as ToolkitConfig;
    }

    // For .ts/.js, use require (after compilation)
    const loaded = require(fullPath);
    const config = loaded.default || loaded;
    return { ...DEFAULT_CONFIG, ...config } as ToolkitConfig;
  }

  throw new Error(
    `No config file found. Create llm-tests.config.ts or run 'llm-test init' to generate one.`
  );
}

export function resolveEnvVar(value: string | undefined): string {
  if (!value) return '';
  if (value.startsWith('$')) {
    const envKey = value.slice(1);
    return process.env[envKey] || '';
  }
  return value;
}

import { LLMProvider } from '../providers/base.provider';
import { OpenAIProvider } from '../providers/openai.provider';
import { AnthropicProvider } from '../providers/anthropic.provider';
import { CustomProvider } from '../providers/custom.provider';
import { RegressionEvaluator, RegressionConfig } from '../evaluators/regression.evaluator';
import { HallucinationEvaluator, HallucinationConfig } from '../evaluators/hallucination.evaluator';
import { QualityEvaluator, QualityConfig } from '../evaluators/quality.evaluator';
import { ToxicityEvaluator, ToxicityConfig } from '../evaluators/toxicity.evaluator';
import { ToolkitConfig, ProviderConfig, resolveEnvVar } from './config';
import {
  TestSuite,
  TestCase,
  TestCaseResult,
  TestRunResult,
  SuiteResult,
  EvaluationResult,
  EvaluatorConfig,
} from './suite';
import { logger } from '../utils/logger';

export class TestRunner {
  private providers: Map<string, LLMProvider> = new Map();
  private config: ToolkitConfig;

  constructor(config: ToolkitConfig) {
    this.config = config;
    this.initProviders();
  }

  private initProviders(): void {
    for (const [name, providerConfig] of Object.entries(this.config.providers)) {
      const provider = this.createProvider(name, providerConfig);
      this.providers.set(name, provider);
    }
  }

  private createProvider(name: string, config: ProviderConfig): LLMProvider {
    const apiKey = resolveEnvVar(config.apiKey);

    switch (config.type) {
      case 'openai':
        return new OpenAIProvider({
          apiKey,
          baseUrl: config.baseUrl,
          defaultModel: config.model,
        });

      case 'anthropic':
        return new AnthropicProvider({
          apiKey,
          baseUrl: config.baseUrl,
          defaultModel: config.model,
        });

      case 'custom':
        return new CustomProvider({
          name,
          endpoint: config.endpoint || '',
          headers: config.headers,
          bodyTemplate: (prompt, opts) => ({
            prompt,
            model: opts?.model || config.model,
            max_tokens: opts?.maxTokens || 1024,
          }),
          parseResponse: (data: unknown) => {
            const d = data as Record<string, unknown>;
            return { text: String(d.text || d.response || d.output || '') };
          },
          defaultModel: config.model,
        });

      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
  }

  async run(suiteFilter?: string): Promise<TestRunResult> {
    const startTime = Date.now();
    const suites = suiteFilter
      ? this.config.suites.filter((s) => s.name === suiteFilter)
      : this.config.suites;

    if (suites.length === 0) {
      throw new Error(suiteFilter ? `Suite "${suiteFilter}" not found` : 'No test suites configured');
    }

    logger.info(`Running ${suites.length} suite(s)...`);

    const suiteResults: SuiteResult[] = [];

    for (const suite of suites) {
      const result = await this.runSuite(suite);
      suiteResults.push(result);
    }

    const duration = Date.now() - startTime;
    const summary = this.computeSummary(suiteResults);

    return {
      timestamp: new Date().toISOString(),
      duration,
      suites: suiteResults,
      summary,
    };
  }

  private async runSuite(suite: TestSuite): Promise<SuiteResult> {
    logger.info(`Suite: ${suite.name}`);

    const concurrency = this.config.concurrency || 3;
    const results: TestCaseResult[] = [];

    // Process in batches for concurrency control
    for (let i = 0; i < suite.tests.length; i += concurrency) {
      const batch = suite.tests.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((test) => this.runTestCase(test, suite))
      );
      results.push(...batchResults);
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed && !r.error).length;
    const errors = results.filter((r) => r.error).length;

    return { name: suite.name, tests: results, passed, failed, errors };
  }

  private async runTestCase(test: TestCase, suite: TestSuite): Promise<TestCaseResult> {
    const providerName = test.provider || suite.provider || this.config.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      return this.errorResult(test, suite.name, providerName, `Provider "${providerName}" not found`);
    }

    const maxRetries = this.config.retries || 2;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await provider.call(test.prompt);

        const evaluations = this.runEvaluators(test, response.text);
        const passed = evaluations.every((e) => e.passed);

        logger.info(`  ${passed ? '\u2713' : '\u2717'} ${test.name}`);

        return {
          testName: test.name,
          suiteName: suite.name,
          provider: providerName,
          prompt: test.prompt,
          response: response.text,
          latencyMs: response.latencyMs,
          tokens: response.tokens,
          evaluations,
          passed,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          logger.warn(`  Retry ${attempt + 1}/${maxRetries} for "${test.name}"`);
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    return this.errorResult(test, suite.name, providerName, lastError?.message || 'Unknown error');
  }

  private runEvaluators(test: TestCase, response: string): EvaluationResult[] {
    return test.evaluators.map((evalConfig) => this.runEvaluator(evalConfig, test, response));
  }

  private runEvaluator(
    evalConfig: EvaluatorConfig,
    test: TestCase,
    response: string
  ): EvaluationResult {
    try {
      switch (evalConfig.type) {
        case 'regression': {
          if (!test.baseline) {
            return { evaluator: 'regression', passed: false, score: 0, details: 'No baseline provided' };
          }
          const evaluator = new RegressionEvaluator(evalConfig.options as RegressionConfig);
          const result = evaluator.evaluate(response, test.baseline);
          return {
            evaluator: 'regression',
            passed: result.passed,
            score: result.score,
            details: result.details,
            raw: result,
          };
        }

        case 'hallucination': {
          if (!test.context) {
            return { evaluator: 'hallucination', passed: false, score: 0, details: 'No context/source docs provided' };
          }
          const evaluator = new HallucinationEvaluator(evalConfig.options as HallucinationConfig);
          const result = evaluator.evaluate(response, test.context);
          return {
            evaluator: 'hallucination',
            passed: result.passed,
            score: result.score,
            details: result.details,
            raw: result,
          };
        }

        case 'quality': {
          const evaluator = new QualityEvaluator(evalConfig.options as QualityConfig);
          const result = evaluator.evaluate(response, test.prompt);
          return {
            evaluator: 'quality',
            passed: result.passed,
            score: result.score,
            details: result.details,
            raw: result,
          };
        }

        case 'toxicity': {
          const evaluator = new ToxicityEvaluator(evalConfig.options as ToxicityConfig);
          const result = evaluator.evaluate(response);
          return {
            evaluator: 'toxicity',
            passed: result.passed,
            score: result.score,
            details: result.details,
            raw: result,
          };
        }

        default:
          return {
            evaluator: evalConfig.type,
            passed: false,
            score: 0,
            details: `Unknown evaluator: ${evalConfig.type}`,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        evaluator: evalConfig.type,
        passed: false,
        score: 0,
        details: `Evaluator error: ${message}`,
      };
    }
  }

  private errorResult(
    test: TestCase,
    suiteName: string,
    providerName: string,
    error: string
  ): TestCaseResult {
    logger.error(`  \u2717 ${test.name}: ${error}`);
    return {
      testName: test.name,
      suiteName,
      provider: providerName,
      prompt: test.prompt,
      response: '',
      latencyMs: 0,
      tokens: { input: 0, output: 0 },
      evaluations: [],
      passed: false,
      error,
    };
  }

  private computeSummary(suites: SuiteResult[]) {
    const allTests = suites.flatMap((s) => s.tests);
    const total = allTests.length;
    const passed = allTests.filter((t) => t.passed).length;
    const failed = allTests.filter((t) => !t.passed && !t.error).length;
    const errors = allTests.filter((t) => t.error).length;

    const latencies = allTests.filter((t) => t.latencyMs > 0).map((t) => t.latencyMs);
    const avgLatencyMs = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    const totalTokens = allTests.reduce(
      (acc, t) => ({
        input: acc.input + t.tokens.input,
        output: acc.output + t.tokens.output,
      }),
      { input: 0, output: 0 }
    );

    return {
      total,
      passed,
      failed,
      errors,
      passRate: total > 0 ? passed / total : 0,
      avgLatencyMs,
      totalTokens,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

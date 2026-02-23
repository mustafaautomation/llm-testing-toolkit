import { RegressionConfig } from '../evaluators/regression.evaluator';
import { HallucinationConfig } from '../evaluators/hallucination.evaluator';
import { QualityConfig } from '../evaluators/quality.evaluator';
import { ToxicityConfig } from '../evaluators/toxicity.evaluator';

export type EvaluatorType = 'regression' | 'hallucination' | 'quality' | 'toxicity';

export interface EvaluatorConfig {
  type: EvaluatorType;
  options?: RegressionConfig | HallucinationConfig | QualityConfig | ToxicityConfig;
}

export interface TestCase {
  name: string;
  prompt: string;
  provider?: string;
  evaluators: EvaluatorConfig[];
  context?: string | string[];
  baseline?: string;
  schema?: Record<string, unknown>;
  tags?: string[];
}

export interface TestSuite {
  name: string;
  description?: string;
  provider?: string;
  tests: TestCase[];
}

export interface TestCaseResult {
  testName: string;
  suiteName: string;
  provider: string;
  prompt: string;
  response: string;
  latencyMs: number;
  tokens: { input: number; output: number };
  evaluations: EvaluationResult[];
  passed: boolean;
  error?: string;
}

export interface EvaluationResult {
  evaluator: EvaluatorType;
  passed: boolean;
  score: number;
  details: string;
  raw?: unknown;
}

export interface TestRunResult {
  timestamp: string;
  duration: number;
  suites: SuiteResult[];
  summary: TestSummary;
}

export interface SuiteResult {
  name: string;
  tests: TestCaseResult[];
  passed: number;
  failed: number;
  errors: number;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  passRate: number;
  avgLatencyMs: number;
  totalTokens: { input: number; output: number };
}

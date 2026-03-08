import { TestRunResult, SuiteResult, TestCaseResult } from '../core/suite';

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

export class ConsoleReporter {
  report(result: TestRunResult): void {
    console.log();
    console.log(`${COLORS.bold}${COLORS.cyan}LLM Test Results${COLORS.reset}`);
    console.log(`${COLORS.dim}${'─'.repeat(60)}${COLORS.reset}`);
    console.log();

    for (const suite of result.suites) {
      this.reportSuite(suite);
    }

    this.reportSummary(result);
  }

  private reportSuite(suite: SuiteResult): void {
    console.log(`${COLORS.bold}Suite: ${suite.name}${COLORS.reset}`);
    console.log();

    for (const test of suite.tests) {
      this.reportTest(test);
    }

    console.log();
  }

  private reportTest(test: TestCaseResult): void {
    const icon = test.error
      ? `${COLORS.yellow}!`
      : test.passed
        ? `${COLORS.green}\u2713`
        : `${COLORS.red}\u2717`;
    console.log(`  ${icon} ${test.testName}${COLORS.reset}`);

    if (test.error) {
      console.log(`    ${COLORS.yellow}Error: ${test.error}${COLORS.reset}`);
      return;
    }

    for (const evaluation of test.evaluations) {
      const evalIcon = evaluation.passed ? `${COLORS.green}\u2713` : `${COLORS.red}\u2717`;
      const scoreStr = `${(evaluation.score * 100).toFixed(0)}%`;
      console.log(
        `    ${evalIcon} [${evaluation.evaluator}] ${scoreStr} - ${evaluation.details}${COLORS.reset}`,
      );
    }

    if (test.latencyMs > 0) {
      console.log(
        `    ${COLORS.dim}Latency: ${test.latencyMs}ms | Tokens: ${test.tokens.input}in/${test.tokens.output}out${COLORS.reset}`,
      );
    }
  }

  private reportSummary(result: TestRunResult): void {
    const { summary } = result;
    const passRateColor =
      summary.passRate >= 0.8 ? COLORS.green : summary.passRate >= 0.5 ? COLORS.yellow : COLORS.red;

    console.log(`${COLORS.dim}${'─'.repeat(60)}${COLORS.reset}`);
    console.log(`${COLORS.bold}Summary${COLORS.reset}`);
    console.log();
    console.log(`  Total:     ${summary.total}`);
    console.log(`  ${COLORS.green}Passed:    ${summary.passed}${COLORS.reset}`);
    console.log(`  ${COLORS.red}Failed:    ${summary.failed}${COLORS.reset}`);
    if (summary.errors > 0) {
      console.log(`  ${COLORS.yellow}Errors:    ${summary.errors}${COLORS.reset}`);
    }
    console.log(
      `  ${passRateColor}Pass Rate: ${(summary.passRate * 100).toFixed(1)}%${COLORS.reset}`,
    );

    if (summary.avgLatencyMs > 0) {
      console.log(`  Avg Latency: ${summary.avgLatencyMs}ms`);
      console.log(
        `  Total Tokens: ${summary.totalTokens.input}in / ${summary.totalTokens.output}out`,
      );
    }

    console.log(`  Duration: ${(result.duration / 1000).toFixed(1)}s`);
    console.log();
  }
}

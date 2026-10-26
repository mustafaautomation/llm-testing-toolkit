# llm-testing-toolkit

[![CI](https://github.com/mustafaautomation/llm-testing-toolkit/actions/workflows/llm-tests.yml/badge.svg)](https://github.com/mustafaautomation/llm-testing-toolkit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](Dockerfile)

A provider-agnostic TypeScript toolkit for checking LLM output with regression, hallucination, quality and toxicity/PII evaluators. It can run from a CLI in a CI pipeline or be used from code.

The evaluators are heuristics computed locally (term-frequency cosine, Levenshtein and Dice similarity, regex-based PII checks, key-phrase overlap). They do not call a second model, so they are cheap and repeatable, but they measure wording overlap rather than meaning. Treat scores as signals that need a human look, not verdicts.

---

## Table of Contents

- [Why?](#why)
- [Demo](#demo)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Features](#features)
- [CLI](#cli)
- [Programmatic API](#programmatic-api)
- [CI/CD Integration](#cicd-integration)
- [Project Structure](#project-structure)
- [Development](#development)

---

## Why?

LLM outputs are non-deterministic. Traditional testing approaches don't work. This toolkit provides structured evaluation strategies to catch:

- **Regressions** -- responses drifting from expected baselines after model updates
- **Hallucinations** -- fabricated facts not grounded in source material
- **Quality issues** -- irrelevant, incoherent, or poorly formatted responses
- **Safety violations** -- toxic content, PII leakage, blocked terms

---

## Demo

```
$ npm test

 Test Files  7 passed (7)
      Tests  67 passed (67)
```

> **67 unit tests** in 7 files (`tests/unit/`) covering the four evaluators, the similarity utilities, config loading and the suite types. The unit tests do not call any LLM API.

---

## Quick Start

The package is not published to npm. Install it from source:

```bash
git clone https://github.com/mustafaautomation/llm-testing-toolkit.git
cd llm-testing-toolkit
npm install
npm test          # unit tests, no API key needed
npm run build     # compiles to dist/

# Set an API key (see .env.example)
export OPENAI_API_KEY=sk-...

# Run the example suites against a real model
node dist/cli.js run --config examples/llm-tests.config.json
```

Optionally run `npm link` to put the `llm-test` command on your PATH; the examples below use it.

The CLI loads `.json` or `.js` config files. A `.ts` config (such as `examples/llm-tests.config.ts`) is only loaded if your Node.js setup can `require` TypeScript, so use JSON or compiled JS with the CLI.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLI / API                         │
├─────────────────────────────────────────────────────┤
│                  Test Runner                         │
│          (parallel execution, retries)               │
├──────────┬──────────┬──────────┬────────────────────┤
│ Regression│Hallucin. │ Quality  │    Toxicity        │
│ Evaluator │Evaluator │Evaluator │    Evaluator       │
├──────────┴──────────┴──────────┴────────────────────┤
│              Provider Layer (fetch-based)             │
│         OpenAI  │  Anthropic  │  Custom HTTP         │
├─────────────────────────────────────────────────────┤
│              Reporters                               │
│         Console  │  JSON  │  HTML                    │
└─────────────────────────────────────────────────────┘
```

---

## Features

### Provider-Agnostic

Test any LLM through a unified interface. No SDK lock-in -- uses raw `fetch`.

```typescript
import { ToolkitConfig } from 'llm-testing-toolkit';

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
    custom: {
      type: 'custom',
      endpoint: 'https://your-api.com/v1/chat',
      headers: { Authorization: 'Bearer $CUSTOM_API_KEY' },
    },
  },
  suites: [],
  reporters: [{ type: 'console' }, { type: 'html' }],
};
```

### Regression Testing

Compare an LLM response with the `baseline` string in the test case. `semantic` mode uses term-frequency cosine similarity (word overlap, not embeddings); `combined` adds key-phrase overlap.

```typescript
{
  name: 'greeting-consistency',
  prompt: 'Greet the user in a friendly way.',
  evaluators: [{
    type: 'regression',
    options: {
      similarityThreshold: 0.85,
      keyPhraseThreshold: 0.7,
      mode: 'combined', // 'exact' | 'semantic' | 'combined'
    },
  }],
  baseline: 'Hello! How can I help you today?',
}
```

To capture new baselines, run with `--update-baselines`. This writes the current responses to `baselines/baselines.json` (keyed by test name). The runner compares against each test's `baseline` field, so copy the values you accept back into your config.

```bash
llm-test run --config llm-tests.config.json --update-baselines
```

### Hallucination Detection

Verify responses stay grounded in source material.

```typescript
{
  name: 'grounded-summary',
  prompt: 'Summarize the provided context.',
  evaluators: [{
    type: 'hallucination',
    options: { groundingThreshold: 0.7 },
  }],
  context: 'TypeScript is developed by Microsoft...',
}
```

Evaluates:

- Splits the response into sentence-level claims
- Scores each claim's word overlap with the supplied context
- Flags simple contradictions (for example a negation of a context statement)

### Quality Evaluation

Multi-dimensional response quality scoring.

```typescript
{
  name: 'json-output',
  prompt: 'Return a JSON user profile.',
  evaluators: [{
    type: 'quality',
    options: {
      expectedFormat: 'json',
      jsonSchema: { required: ['name', 'email'] },
      relevanceThreshold: 0.6,
    },
  }],
}
```

Scores: relevance (word overlap with the prompt), coherence, format compliance (for JSON, parses it and checks the `required` keys) and completeness.

### Toxicity & Safety

Detect harmful content and PII leakage.

```typescript
{
  name: 'safe-response',
  prompt: 'Explain password security.',
  evaluators: [{
    type: 'toxicity',
    options: {
      sensitivity: 'high',
      checkPII: true,
      customBlocklist: ['company-secret'],
    },
  }],
}
```

Detects: built-in and custom blocked terms, and regex matches for email addresses, phone numbers, US SSNs, 16-digit card numbers and IPv4 addresses.

---

## CLI

`run` is the only command. Examples assume `npm link`; otherwise use `node dist/cli.js`.

```bash
# Run all suites in a config file
llm-test run --config llm-tests.config.json

# Run one suite by name
llm-test run --config llm-tests.config.json --suite regression

# Multiple reporters
llm-test run --config llm-tests.config.json --reporter console,html,json

# Write current responses to baselines/baselines.json
llm-test run --config llm-tests.config.json --update-baselines

# Verbose output
llm-test run --config llm-tests.config.json -v
```

Without `--config`, the CLI looks for `llm-tests.config.ts`, `llm-tests.config.js` or `llm-tests.config.json` in the current directory.

---

## Programmatic API

```typescript
import {
  RegressionEvaluator,
  HallucinationEvaluator,
  QualityEvaluator,
  ToxicityEvaluator,
} from 'llm-testing-toolkit'; // after `npm link llm-testing-toolkit`, or import from the built dist/

// Use evaluators directly
const regression = new RegressionEvaluator({ similarityThreshold: 0.8 });
const result = regression.evaluate(actualResponse, baselineResponse);
console.log(result.passed, result.score);

// Full test runner
import { TestRunner, loadConfig } from 'llm-testing-toolkit';
const config = await loadConfig('llm-tests.config.json');
const runner = new TestRunner(config);
const results = await runner.run();
```

---

## CI/CD Integration

The included GitHub Actions workflow (`.github/workflows/llm-tests.yml`) runs on push and pull request to `main`, on Node 24:

1. Lint, format check and type check
2. Unit tests (no LLM calls, no API keys needed)
3. A TypeScript build

To evaluate a real model in your own pipeline, add `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` as secrets and add a step that runs `node dist/cli.js run --config <your-config>.json`. That step is not part of this repository's workflow.

---

## Reports

### Console

Colorized terminal output with pass/fail indicators and score breakdowns.

### HTML

Single HTML file with a summary, expandable test details, scores, and the prompt and response for each test. Dark theme; no external assets.

### JSON

Machine-readable output for programmatic analysis and dashboards.

---

## Project Structure

```
llm-testing-toolkit/
├── .github/
│   ├── workflows/llm-tests.yml    # CI pipeline (Node 24)
│   ├── dependabot.yml             # Automated dependency updates
│   ├── CODEOWNERS                 # Review ownership
│   └── pull_request_template.md   # PR checklist
├── src/
│   ├── providers/                 # LLM provider adapters
│   │   ├── base.provider.ts       # Abstract base with timedCall
│   │   ├── openai.provider.ts     # OpenAI chat completions
│   │   ├── anthropic.provider.ts  # Anthropic messages API
│   │   └── custom.provider.ts     # Any HTTP-based LLM
│   ├── evaluators/                # Evaluation strategies
│   │   ├── regression.evaluator.ts    # Baseline comparison
│   │   ├── hallucination.evaluator.ts # Grounding verification
│   │   ├── quality.evaluator.ts       # Multi-dimensional scoring
│   │   └── toxicity.evaluator.ts      # Safety & PII detection
│   ├── reporters/                 # Output formatters
│   │   ├── console.reporter.ts    # Colorized terminal output
│   │   ├── html.reporter.ts       # Dark theme HTML report
│   │   └── json.reporter.ts       # Machine-readable JSON
│   ├── core/                      # Framework core
│   │   ├── runner.ts              # Test runner (parallel, retries)
│   │   ├── config.ts              # Config loader + env resolution
│   │   └── suite.ts               # Type definitions
│   ├── utils/                     # Shared utilities
│   │   ├── similarity.ts          # Cosine, Levenshtein, Dice
│   │   └── logger.ts              # Colored structured logging
│   ├── cli.ts                     # Command-line interface
│   └── index.ts                   # Public API exports
├── tests/unit/                    # 67 unit tests in 7 files
├── examples/                      # Example suites (TypeScript) and a CLI-ready llm-tests.config.json
├── CONTRIBUTING.md
├── SECURITY.md
└── Dockerfile                     # Builds the CLI; mount a config to run it
```

---

## Development

```bash
git clone https://github.com/mustafaautomation/llm-testing-toolkit.git
cd llm-testing-toolkit
npm install
npm test              # Run unit tests
npm run typecheck     # Type checking
npm run lint          # ESLint
npm run format:check  # Prettier
npm run build         # Compile TypeScript
```

---

## License

MIT

---

Built by [Quvantic](https://quvantic.com)

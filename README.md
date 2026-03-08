# llm-testing-toolkit

[![CI](https://github.com/mustafaautomation/llm-testing-toolkit/actions/workflows/llm-tests.yml/badge.svg)](https://github.com/mustafaautomation/llm-testing-toolkit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](Dockerfile)

A provider-agnostic LLM testing framework for evaluating AI model outputs with regression, hallucination, quality, and toxicity checks. Built with TypeScript, designed for CI/CD pipelines.

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

 ✓ tests/unit/similarity.test.ts (21 tests) 4ms
 ✓ tests/unit/regression.test.ts (7 tests) 3ms
 ✓ tests/unit/hallucination.test.ts (4 tests) 3ms
 ✓ tests/unit/toxicity.test.ts (10 tests) 3ms
 ✓ tests/unit/quality.test.ts (11 tests) 3ms

 Test Files  5 passed (5)
      Tests  53 passed (53)
   Duration  339ms
```

> **53 unit tests** covering all 4 evaluators and similarity utilities. Tests run in under 400ms.

---

## Quick Start

```bash
# Install
npm install llm-testing-toolkit

# Initialize config
npx llm-test init

# Set API keys (see .env.example)
export OPENAI_API_KEY=sk-...

# Run tests
npx llm-test run
```

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

Compare LLM responses against saved baselines using semantic similarity.

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

Update baselines automatically:
```bash
npx llm-test run --update-baselines
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
- Claim extraction from response
- Per-claim grounding score against source documents
- Contradiction detection

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

Scores: relevance, coherence, format compliance, completeness.

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

Detects: blocked terms, email addresses, phone numbers, SSNs, credit card numbers, IP addresses.

---

## CLI

```bash
# Run all test suites
npx llm-test run

# Run specific suite
npx llm-test run --suite regression

# Multiple reporters
npx llm-test run --reporter console,html,json

# Custom config path
npx llm-test run --config ./my-config.ts

# Update regression baselines
npx llm-test run --update-baselines

# Verbose output
npx llm-test run -v

# Initialize project
npx llm-test init
```

---

## Programmatic API

```typescript
import {
  RegressionEvaluator,
  HallucinationEvaluator,
  QualityEvaluator,
  ToxicityEvaluator,
} from 'llm-testing-toolkit';

// Use evaluators directly
const regression = new RegressionEvaluator({ similarityThreshold: 0.8 });
const result = regression.evaluate(actualResponse, baselineResponse);
console.log(result.passed, result.score);

// Full test runner
import { TestRunner, loadConfig } from 'llm-testing-toolkit';
const config = await loadConfig();
const runner = new TestRunner(config);
const results = await runner.run();
```

---

## CI/CD Integration

The included GitHub Actions workflow:

1. Runs lint, format, type check on Node 18 & 20
2. Executes unit tests with full validation
3. Builds the package to verify publishability

Add your API keys as repository secrets for LLM evaluation:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

---

## Reports

### Console
Colorized terminal output with pass/fail indicators and score breakdowns.

### HTML
Single-file visual report with expandable test details, scores, and prompt/response diffs. Dark theme, zero external dependencies.

### JSON
Machine-readable output for programmatic analysis and dashboards.

---

## Project Structure

```
llm-testing-toolkit/
├── .github/
│   ├── workflows/llm-tests.yml    # CI pipeline (Node 18/20 matrix)
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
├── tests/unit/                    # 53 unit tests
├── examples/                      # Example test suite configs
├── CONTRIBUTING.md
├── SECURITY.md
├── Dockerfile
└── docker-compose.yml
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

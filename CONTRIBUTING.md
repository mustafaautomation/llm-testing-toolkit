# Contributing

## Setup

```bash
git clone https://github.com/mustafaautomation/llm-testing-toolkit.git
cd llm-testing-toolkit
npm install
```

## Development

```bash
npm test           # Run unit tests
npm run test:watch # Watch mode
npm run typecheck  # Type checking
npm run lint       # ESLint
npm run format     # Prettier
npm run build      # Compile TypeScript
```

## Adding an Evaluator

1. Create `src/evaluators/<name>.evaluator.ts`
2. Implement the `evaluate()` method with typed config and result interfaces
3. Export from `src/index.ts`
4. Add unit tests in `tests/unit/<name>.test.ts`
5. Register in `src/core/runner.ts` evaluator switch

## Adding a Provider

1. Create `src/providers/<name>.provider.ts` extending `BaseLLMProvider`
2. Implement the `call()` method
3. Export from `src/index.ts`
4. Register in `src/core/runner.ts` provider factory

## Code Style

- TypeScript strict mode — all types explicit
- Prettier: single quotes, trailing commas, 100 char width
- ESLint: recommended + TypeScript rules

## Commit Messages

```
feat: add new evaluator for X
fix: handle edge case in similarity
docs: update API examples
```

## Pull Requests

- One feature per PR
- Include tests for new code
- All checks must pass (lint, format, typecheck, tests)

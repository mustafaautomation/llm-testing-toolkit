import { describe, it, expect } from 'vitest';
import { resolveEnvVar } from '../../src/core/config';

describe('resolveEnvVar', () => {
  it('should return value directly when not env reference', () => {
    expect(resolveEnvVar('sk-123456')).toBe('sk-123456');
  });

  it('should resolve $ENV_VAR from process.env', () => {
    process.env.TEST_LLM_KEY = 'resolved-key';
    expect(resolveEnvVar('$TEST_LLM_KEY')).toBe('resolved-key');
    delete process.env.TEST_LLM_KEY;
  });

  it('should return empty string for missing env var', () => {
    expect(resolveEnvVar('$NONEXISTENT_VAR_12345')).toBe('');
  });

  it('should return empty string for undefined input', () => {
    expect(resolveEnvVar(undefined)).toBe('');
  });

  it('should return empty string for empty input', () => {
    expect(resolveEnvVar('')).toBe('');
  });

  it('should not resolve $ in middle of string', () => {
    expect(resolveEnvVar('price$100')).toBe('price$100');
  });
});

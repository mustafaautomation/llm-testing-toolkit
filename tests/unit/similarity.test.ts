import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  levenshteinDistance,
  levenshteinSimilarity,
  diceSimilarity,
  combinedSimilarity,
  extractKeyPhrases,
  keyPhraseOverlap,
} from '../../src/utils/similarity';

describe('cosineSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(cosineSimilarity('hello world', 'hello world')).toBeCloseTo(1, 10);
  });

  it('returns 0 for completely different strings', () => {
    expect(cosineSimilarity('cat dog', 'xyz abc')).toBe(0);
  });

  it('returns a value between 0 and 1 for similar strings', () => {
    const score = cosineSimilarity(
      'TypeScript is a programming language',
      'TypeScript is a typed programming language'
    );
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('handles empty strings', () => {
    expect(cosineSimilarity('', '')).toBe(0);
    expect(cosineSimilarity('hello', '')).toBe(0);
  });
});

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('returns correct distance for single edit', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1);
  });

  it('returns length of longer string when one is empty', () => {
    expect(levenshteinDistance('', 'hello')).toBe(5);
    expect(levenshteinDistance('hello', '')).toBe(5);
  });

  it('handles multiple edits', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });
});

describe('levenshteinSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(levenshteinSimilarity('hello', 'hello')).toBe(1);
  });

  it('returns 0 for completely different strings of equal length', () => {
    const score = levenshteinSimilarity('abc', 'xyz');
    expect(score).toBeLessThan(0.5);
  });

  it('returns 1 for two empty strings', () => {
    expect(levenshteinSimilarity('', '')).toBe(1);
  });
});

describe('diceSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(diceSimilarity('hello', 'hello')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    expect(diceSimilarity('abc', 'xyz')).toBe(0);
  });
});

describe('combinedSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(combinedSimilarity('hello world', 'hello world')).toBeCloseTo(1, 10);
  });

  it('returns a reasonable score for similar strings', () => {
    const score = combinedSimilarity(
      'The quick brown fox',
      'The fast brown fox'
    );
    expect(score).toBeGreaterThan(0.5);
  });
});

describe('extractKeyPhrases', () => {
  it('removes stop words', () => {
    const phrases = extractKeyPhrases('the cat and the dog are running');
    expect(phrases).not.toContain('the');
    expect(phrases).not.toContain('and');
    expect(phrases).not.toContain('are');
  });

  it('removes short words', () => {
    const phrases = extractKeyPhrases('I am a QA engineer');
    expect(phrases).not.toContain('am');
  });

  it('returns significant words', () => {
    const phrases = extractKeyPhrases('TypeScript programming language');
    expect(phrases).toContain('typescript');
    expect(phrases).toContain('programming');
    expect(phrases).toContain('language');
  });
});

describe('keyPhraseOverlap', () => {
  it('returns 1 when all key phrases match', () => {
    const score = keyPhraseOverlap(
      'TypeScript programming language',
      'TypeScript is a programming language developed by Microsoft'
    );
    expect(score).toBe(1);
  });

  it('returns 0 when no key phrases match', () => {
    const score = keyPhraseOverlap('quantum physics', 'cooking recipes pasta');
    expect(score).toBe(0);
  });

  it('returns partial score for partial match', () => {
    const score = keyPhraseOverlap(
      'TypeScript JavaScript programming',
      'TypeScript is great for programming'
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

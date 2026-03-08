/**
 * Compute cosine similarity between two texts using term-frequency vectors.
 */
export function cosineSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  const vocab = new Set([...tokensA, ...tokensB]);
  const vecA = buildVector(tokensA, vocab);
  const vecB = buildVector(tokensB, vocab);

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dot / magnitude;
}

/**
 * Compute Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Normalized Levenshtein similarity (0–1, where 1 = identical).
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * String similarity using Dice coefficient (bigram-based).
 */
export function diceSimilarity(a: string, b: string): number {
  const first = a.replace(/\s+/g, '').toLowerCase();
  const second = b.replace(/\s+/g, '').toLowerCase();

  if (first === second) return 1;
  if (first.length < 2 || second.length < 2) return 0;

  const firstBigrams = new Map<string, number>();
  for (let i = 0; i < first.length - 1; i++) {
    const bigram = first.substring(i, i + 2);
    firstBigrams.set(bigram, (firstBigrams.get(bigram) || 0) + 1);
  }

  let intersectionSize = 0;
  for (let i = 0; i < second.length - 1; i++) {
    const bigram = second.substring(i, i + 2);
    const count = firstBigrams.get(bigram) || 0;
    if (count > 0) {
      firstBigrams.set(bigram, count - 1);
      intersectionSize++;
    }
  }

  return (2 * intersectionSize) / (first.length - 1 + second.length - 1);
}

/**
 * Combined similarity score using multiple metrics.
 */
export function combinedSimilarity(a: string, b: string): number {
  const cosine = cosineSimilarity(a, b);
  const dice = diceSimilarity(a, b);
  // Weighted average: cosine 60%, dice 40%
  return cosine * 0.6 + dice * 0.4;
}

/**
 * Extract key phrases (multi-word or significant single words).
 */
export function extractKeyPhrases(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');
  const words = normalized.split(/\s+/).filter((w) => w.length > 2);
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'are',
    'but',
    'not',
    'you',
    'all',
    'can',
    'had',
    'her',
    'was',
    'one',
    'our',
    'out',
    'has',
    'have',
    'been',
    'this',
    'that',
    'with',
    'from',
    'they',
    'will',
    'would',
    'there',
    'their',
    'what',
    'about',
    'which',
    'when',
    'make',
    'like',
    'could',
    'into',
    'than',
    'then',
    'some',
    'these',
    'also',
    'more',
  ]);
  return words.filter((w) => !stopWords.has(w));
}

/**
 * Check what percentage of key phrases from `expected` appear in `actual`.
 */
export function keyPhraseOverlap(expected: string, actual: string): number {
  const expectedPhrases = extractKeyPhrases(expected);
  const actualText = actual.toLowerCase();

  if (expectedPhrases.length === 0) return 1;

  const matched = expectedPhrases.filter((phrase) => actualText.includes(phrase));
  return matched.length / expectedPhrases.length;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function buildVector(tokens: string[], vocab: Set<string>): number[] {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return [...vocab].map((word) => freq.get(word) || 0);
}

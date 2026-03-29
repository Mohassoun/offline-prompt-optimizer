import { encode } from 'gpt-tokenizer';

export function countTokens(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  try {
    return encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

export function estimateSavings(original: string, compressed: string): {
  tokensBefore: number;
  tokensAfter: number;
  savedTokens: number;
  savedPercent: number;
} {
  const tokensBefore = countTokens(original);
  const tokensAfter = countTokens(compressed);
  const savedTokens = tokensBefore - tokensAfter;
  const savedPercent = tokensBefore > 0
    ? Math.round((savedTokens / tokensBefore) * 100)
    : 0;

  return { tokensBefore, tokensAfter, savedTokens, savedPercent };
}

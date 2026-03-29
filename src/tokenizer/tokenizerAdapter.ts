export interface TokenizerAdapter {
  countTokens(text: string): number;
  estimateSavings(original: string, compressed: string): {
    tokensBefore: number;
    tokensAfter: number;
    savedTokens: number;
    savedPercent: number;
  };
  name: string;
}

import * as gptTokenizer from './gptTokenizer';

class GptTokenizerAdapter implements TokenizerAdapter {
  readonly name = 'gpt-tokenizer';

  countTokens(text: string): number {
    return gptTokenizer.countTokens(text);
  }

  estimateSavings(original: string, compressed: string) {
    return gptTokenizer.estimateSavings(original, compressed);
  }
}

let _current: TokenizerAdapter = new GptTokenizerAdapter();

export function getCurrentTokenizer(): TokenizerAdapter {
  return _current;
}

export function setTokenizer(adapter: TokenizerAdapter): void {
  _current = adapter;
}

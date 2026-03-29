interface CanonicalMapping {
  pattern: RegExp;
  replacement: string;
}

const CANONICAL_MAPPINGS: CanonicalMapping[] = [
  { pattern: /^\s*(?:hello|hi|hey)\b[!,.\s-]*/gim, replacement: '' },
  { pattern: /\blet(?:'s)?\s+say\b/gi, replacement: '' },
  { pattern: /\bplease help me\b/gi, replacement: '' },
  { pattern: /\bplease\s+/gi, replacement: '' },
  { pattern: /\bkindly\s+/gi, replacement: '' },
  { pattern: /\bi want to\b/gi, replacement: '' },
  { pattern: /\bi would like (?:you )?to\b/gi, replacement: '' },
  { pattern: /\bcan you please\b/gi, replacement: '' },
  { pattern: /\bcan you\b/gi, replacement: '' },
  { pattern: /\bcould you please\b/gi, replacement: '' },
  { pattern: /\bcould you\b/gi, replacement: '' },
  { pattern: /\bmake sure (?:to |that )?/gi, replacement: 'ensure ' },
  { pattern: /\bit is important that\b/gi, replacement: 'ensure' },
  { pattern: /\bit is crucial that\b/gi, replacement: 'ensure' },
  { pattern: /\bplease note that\b/gi, replacement: 'note:' },
  { pattern: /\bin order to\b/gi, replacement: 'to' },
  { pattern: /\bso that\b/gi, replacement: 'to' },
  { pattern: /\bdue to the fact that\b/gi, replacement: 'because' },
  { pattern: /\bfor the purpose of\b/gi, replacement: 'for' },
  { pattern: /\bat this point in time\b/gi, replacement: 'now' },
  { pattern: /\bat the present time\b/gi, replacement: 'now' },
  { pattern: /\bwhat i want is\b/gi, replacement: '' },
  { pattern: /\bwhat i need is\b/gi, replacement: '' },
  { pattern: /\bi need you to\b/gi, replacement: '' },
  { pattern: /\bi want you to\b/gi, replacement: '' },
  { pattern: /\bif possible,?\s*/gi, replacement: '' },
  { pattern: /\bif you can,?\s*/gi, replacement: '' },
  { pattern: /\bwhenever possible,?\s*/gi, replacement: '' },
  { pattern: /\bwherever applicable,?\s*/gi, replacement: '' },
  { pattern: /\bfeel free to\b/gi, replacement: '' },
  { pattern: /\bdo not hesitate to\b/gi, replacement: '' },
  { pattern: /\bas much as possible\b/gi, replacement: '' },
  { pattern: /\bto the best of your ability\b/gi, replacement: '' },
  { pattern: /\bwithout fail\b/gi, replacement: '' },
];

export function canonicalize(text: string): string {
  let result = text;
  for (const { pattern, replacement } of CANONICAL_MAPPINGS) {
    result = result.replace(pattern, replacement);
  }
  return result
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+/gm, '')
    .trim();
}

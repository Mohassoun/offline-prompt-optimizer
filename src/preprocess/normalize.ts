export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizePunctuation(text: string): string {
  return text
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '--');
}

export function detectRepetition(text: string): string[] {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(normalized)) {
      duplicates.push(sentence);
    } else {
      seen.add(normalized);
    }
  }
  return duplicates;
}

export function removeRepetition(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(sentence);
    }
  }
  return result.join(' ');
}

import { ProtectedRange } from '../core/types';

interface PatternDef {
  regex: RegExp;
  reason: string;
}

const PROTECTION_PATTERNS: PatternDef[] = [
  { regex: /```[\s\S]*?```/g, reason: 'fenced code block' },
  { regex: /`[^`\n]+`/g, reason: 'inline code' },
  { regex: /(?:^|[\s(])((?:[a-zA-Z]:)?(?:[\\/][\w.\-@]+)+[\\/]?)/g, reason: 'file path' },
  { regex: /https?:\/\/[^\s)"']+/g, reason: 'URL' },
  { regex: /\bv?\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?(?:\+[\w.]+)?\b/g, reason: 'semver' },
  { regex: /\b[A-Z][A-Z0-9_]{2,}(?:=[^\s]+)?\b/g, reason: 'env var' },
  { regex: /"[^"]{0,200}"/g, reason: 'quoted string' },
  { regex: /\b(?:error|Error|ERROR):[^\n]+/g, reason: 'error message' },
];

export function detectProtectedRanges(text: string, extraPatterns: RegExp[] = []): ProtectedRange[] {
  const ranges: ProtectedRange[] = [];
  const allPatterns: PatternDef[] = [
    ...PROTECTION_PATTERNS,
    ...extraPatterns.map(r => ({ regex: r, reason: 'custom pattern' })),
  ];

  for (const { regex, reason } of allPatterns) {
    const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (!isOverlapping(ranges, start, end)) {
        ranges.push({ start, end, reason, original: match[0] });
      }
    }
  }

  return ranges.sort((a, b) => a.start - b.start);
}

function isOverlapping(ranges: ProtectedRange[], start: number, end: number): boolean {
  return ranges.some(r => !(end <= r.start || start >= r.end));
}

export function isInProtectedRange(pos: number, ranges: ProtectedRange[]): boolean {
  return ranges.some(r => pos >= r.start && pos < r.end);
}

export function applyWithProtection(
  text: string,
  ranges: ProtectedRange[],
  transform: (segment: string, offset: number) => string
): string {
  const currentRanges = resolveRangesForCurrentText(text, ranges);
  if (currentRanges.length === 0) {
    return transform(text, 0);
  }

  const parts: string[] = [];
  let cursor = 0;

  for (const range of currentRanges) {
    if (cursor < range.start) {
      parts.push(transform(text.slice(cursor, range.start), cursor));
    }
    parts.push(text.slice(range.start, range.end));
    cursor = range.end;
  }

  if (cursor < text.length) {
    parts.push(transform(text.slice(cursor), cursor));
  }

  return parts.join('');
}

function resolveRangesForCurrentText(text: string, ranges: ProtectedRange[]): ProtectedRange[] {
  if (ranges.length === 0) {
    return [];
  }

  const ordered = [...ranges].sort((a, b) => a.start - b.start);
  const resolved: ProtectedRange[] = [];
  let cursor = 0;

  for (const range of ordered) {
    const start = text.indexOf(range.original, cursor);
    if (start === -1) {
      continue;
    }

    const end = start + range.original.length;
    resolved.push({ ...range, start, end });
    cursor = end;
  }

  return resolved;
}

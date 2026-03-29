import { CompressionMode, ProtectedRange } from '../../core/types';

/**
 * Git diff compression strategy.
 *
 * safe:        keep everything, normalise whitespace only
 * balanced:    keep diff headers + changed lines (+/-) + 2 context lines
 * aggressive:  keep diff headers + changed lines only (no context)
 */

const HUNK_HEADER_RE = /^@@.+@@/;
const ADDED_RE       = /^\+(?!\+\+)/;
const REMOVED_RE     = /^-(?!--)/;
const FILE_HEADER_RE = /^(?:diff --git|index |---|---|\+\+\+)/;
const CONTEXT_LINES_BALANCED   = 2;

export function compressDiff(
  text: string,
  mode: CompressionMode,
  _protectedRanges: ProtectedRange[]
): string {
  const lines = text.split('\n');

  if (mode === 'safe') {
    return lines.map(l => l.trimEnd()).join('\n').trim();
  }

  const contextWindow = mode === 'balanced' ? CONTEXT_LINES_BALANCED : 0;

  // Mark which lines are "important" (changed or structural)
  const important = lines.map(line =>
    FILE_HEADER_RE.test(line) ||
    HUNK_HEADER_RE.test(line) ||
    ADDED_RE.test(line) ||
    REMOVED_RE.test(line)
  );

  // Expand window around each important line
  const keep = new Array(lines.length).fill(false);
  for (let i = 0; i < lines.length; i++) {
    if (important[i]) {
      for (let j = Math.max(0, i - contextWindow);
               j <= Math.min(lines.length - 1, i + contextWindow); j++) {
        keep[j] = true;
      }
    }
  }

  const result = lines.filter((_, i) => keep[i]);

  // Add a compact summary at the top
  const added   = lines.filter(l => ADDED_RE.test(l)).length;
  const removed = lines.filter(l => REMOVED_RE.test(l)).length;
  const summary = `[diff: +${added} -${removed} lines]`;

  return [summary, ...result].join('\n').trim();
}

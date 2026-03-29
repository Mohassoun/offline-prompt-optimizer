import { CompressionMode, ProtectedRange } from '../../core/types';

/**
 * Code context compression strategy.
 * Used when the content type is 'code' (no surrounding prose).
 *
 * safe:        collapse multiple blank lines → one blank line
 * balanced:    safe + remove trailing whitespace + collapse blank lines
 * aggressive:  balanced + strip single-line comments (//, #) outside strings
 */

const MULTI_BLANK_LINE_RE = /\n{3,}/g;
const TRAILING_SPACE_RE   = /[ \t]+$/gm;

// Single-line comment patterns — only strip when not inside a string
const SLASH_COMMENT_RE  = /(?<!["'`][^"'`]*)\/\/[^\n]*/g;
const HASH_COMMENT_RE   = /(?<!['"[^'"]*)(#[^\n!{}\[\]"'`]+)/g;

export function compressCodeContext(
  text: string,
  mode: CompressionMode,
  _protectedRanges: ProtectedRange[]
): string {
  let result = text;

  // safe+: collapse 3+ consecutive blank lines to 1
  result = result.replace(MULTI_BLANK_LINE_RE, '\n\n');

  if (mode === 'safe') {
    return result.trim();
  }

  // balanced+: also remove trailing whitespace on each line
  result = result.replace(TRAILING_SPACE_RE, '');
  result = result.replace(MULTI_BLANK_LINE_RE, '\n\n');

  if (mode === 'balanced') {
    return result.trim();
  }

  // aggressive: also strip single-line comments
  result = stripSingleLineComments(result);
  result = result.replace(MULTI_BLANK_LINE_RE, '\n\n');

  return result.trim();
}

function stripSingleLineComments(code: string): string {
  const lines = code.split('\n');
  return lines.map(line => {
    // Skip lines that are entirely a comment (preserve structure)
    const trimmed = line.trimStart();
    if (trimmed.startsWith('//') || trimmed.startsWith('#!')) {
      return ''; // Remove the whole line
    }
    // Inline comment — strip from // onward if not inside a string
    const inlineIdx = findInlineCommentIndex(line);
    if (inlineIdx > 0) {
      return line.slice(0, inlineIdx).trimEnd();
    }
    return line;
  }).join('\n');
}

function findInlineCommentIndex(line: string): number {
  let inString: string | null = null;
  for (let i = 0; i < line.length - 1; i++) {
    const ch = line[i];
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch;
    } else if (inString && ch === inString && line[i - 1] !== '\\') {
      inString = null;
    } else if (!inString && ch === '/' && line[i + 1] === '/') {
      return i;
    }
  }
  return -1;
}

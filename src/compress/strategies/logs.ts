import { CompressionMode, ProtectedRange } from '../../core/types';

/**
 * Log compression strategy.
 *
 * safe:        shorten timestamps + deduplicate identical lines
 * balanced:    safe + trim stack traces to 3 frames + remove DEBUG/INFO lines
 * aggressive:  keep only ERROR/WARN lines + first stack frame
 */

const TIMESTAMP_RE = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/g;
const STACK_FRAME_RE = /^\s+at\s+/;
const LOG_LEVEL_RE = /\[(DEBUG|INFO|TRACE)\]/i;
const ERROR_LEVEL_RE = /\[(ERROR|WARN(?:ING)?|FATAL|CRITICAL)\]/i;

export function compressLogs(
  text: string,
  mode: CompressionMode,
  _protectedRanges: ProtectedRange[]
): string {
  let lines = text.split('\n');

  // Safe: shorten timestamps and deduplicate
  lines = lines.map(shortenTimestamp);
  lines = deduplicateLines(lines);

  if (mode === 'safe') {
    return lines.join('\n').trim();
  }

  // Balanced: also remove DEBUG/INFO/TRACE and trim stack traces
  if (mode === 'balanced') {
    lines = removeVerboseLevels(lines);
    lines = trimStackTrace(lines, 3);
    return lines.join('\n').trim();
  }

  // Aggressive: only ERROR/WARN lines + first stack frame per exception
  lines = keepOnlyErrors(lines);
  lines = trimStackTrace(lines, 1);
  return lines.join('\n').trim();
}

function shortenTimestamp(line: string): string {
  // Convert ISO timestamp to HH:MM:SS only — keeps the important part
  return line.replace(TIMESTAMP_RE, (ts) => {
    const timeMatch = ts.match(/(\d{2}:\d{2}:\d{2})/);
    return timeMatch ? timeMatch[1] : ts;
  });
}

function deduplicateLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = line.trim();
    if (!key || !seen.has(key)) {
      seen.add(key);
      result.push(line);
    }
  }
  return result;
}

function removeVerboseLevels(lines: string[]): string[] {
  return lines.filter(line => !LOG_LEVEL_RE.test(line));
}

function keepOnlyErrors(lines: string[]): string[] {
  const result: string[] = [];
  for (const line of lines) {
    if (ERROR_LEVEL_RE.test(line) || STACK_FRAME_RE.test(line)) {
      result.push(line);
    }
  }
  return result;
}

function trimStackTrace(lines: string[], maxFrames: number): string[] {
  const result: string[] = [];
  let frameCount = 0;
  let inStack = false;

  for (const line of lines) {
    if (STACK_FRAME_RE.test(line)) {
      inStack = true;
      if (frameCount < maxFrames) {
        result.push(line);
        frameCount++;
      }
    } else {
      if (inStack) {
        frameCount = 0;
        inStack = false;
      }
      result.push(line);
    }
  }
  return result;
}

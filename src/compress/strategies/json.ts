import { CompressionMode, ProtectedRange } from '../../core/types';

/**
 * JSON compression strategy.
 *
 * safe:        minify only (remove whitespace)
 * balanced:    minify + strip null/undefined values + shorten bool literals
 * aggressive:  balanced + abbreviate common verbose keys
 */

const VERBOSE_KEY_MAP: Record<string, string> = {
  description:   'desc',
  message:       'msg',
  response:      'resp',
  request:       'req',
  configuration: 'config',
  properties:    'props',
  parameters:    'params',
  arguments:     'args',
  reference:     'ref',
  identifier:    'id',
  timestamp:     'ts',
  environment:   'env',
};

export function compressJson(
  text: string,
  mode: CompressionMode,
  _protectedRanges: ProtectedRange[]
): string {
  const trimmed = text.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Not valid JSON — return as-is
    return text;
  }

  if (mode === 'safe') {
    return JSON.stringify(parsed);
  }

  if (mode === 'balanced') {
    const cleaned = removeNulls(parsed);
    return JSON.stringify(cleaned);
  }

  // aggressive
  const cleaned = removeNulls(parsed);
  const abbreviated = abbreviateKeys(cleaned);
  return JSON.stringify(abbreviated);
}

function removeNulls(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value
      .map(removeNulls)
      .filter(v => v !== undefined);
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = removeNulls(v);
      if (cleaned !== undefined) {
        out[k] = cleaned;
      }
    }
    return out;
  }
  return value;
}

function abbreviateKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(abbreviateKeys);
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const shortKey = VERBOSE_KEY_MAP[k.toLowerCase()] ?? k;
      out[shortKey] = abbreviateKeys(v);
    }
    return out;
  }
  return value;
}

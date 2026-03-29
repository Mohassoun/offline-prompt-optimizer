/**
 * Tests for json, logs, diff, and codeContext compression strategies.
 */
import { describe, it, expect } from 'vitest';
import { compressJson }         from '../compress/strategies/json';
import { compressLogs }         from '../compress/strategies/logs';
import { compressDiff }         from '../compress/strategies/diff';
import { compressCodeContext }  from '../compress/strategies/codeContext';

const NO_PROTECTED: any[] = [];

// ─── JSON strategy ────────────────────────────────────────────────────────────

describe('compressJson — safe (minify only)', () => {
  it('minifies pretty-printed JSON', () => {
    const input = '{\n  "name": "test",\n  "value": 42\n}';
    const out = compressJson(input, 'safe', NO_PROTECTED);
    expect(out).toBe('{"name":"test","value":42}');
  });

  it('preserves all keys and values', () => {
    const input = '{"a":1,"b":"hello","c":true}';
    const out = compressJson(input, 'safe', NO_PROTECTED);
    const parsed = JSON.parse(out);
    expect(parsed).toEqual({ a: 1, b: 'hello', c: true });
  });

  it('returns original text for invalid JSON', () => {
    const input = 'not json at all';
    expect(compressJson(input, 'safe', NO_PROTECTED)).toBe(input);
  });
});

describe('compressJson — balanced (minify + strip nulls)', () => {
  it('removes null values', () => {
    const input = '{"a":1,"b":null,"c":"keep"}';
    const out = compressJson(input, 'balanced', NO_PROTECTED);
    const parsed = JSON.parse(out);
    expect(parsed).not.toHaveProperty('b');
    expect(parsed.a).toBe(1);
    expect(parsed.c).toBe('keep');
  });

  it('removes null values from nested objects', () => {
    const input = '{"outer":{"inner":null,"keep":1}}';
    const out = compressJson(input, 'balanced', NO_PROTECTED);
    const parsed = JSON.parse(out);
    expect(parsed.outer).not.toHaveProperty('inner');
    expect(parsed.outer.keep).toBe(1);
  });

  it('removes nulls from arrays', () => {
    const input = '{"items":[1,null,3]}';
    const out = compressJson(input, 'balanced', NO_PROTECTED);
    const parsed = JSON.parse(out);
    expect(parsed.items).toEqual([1, 3]);
  });
});

describe('compressJson — aggressive (+ abbreviate keys)', () => {
  it('abbreviates "description" to "desc"', () => {
    const input = '{"description":"a long desc"}';
    const out = compressJson(input, 'aggressive', NO_PROTECTED);
    const parsed = JSON.parse(out);
    expect(parsed).toHaveProperty('desc');
    expect(parsed).not.toHaveProperty('description');
  });

  it('abbreviates "message" to "msg"', () => {
    const input = '{"message":"hello"}';
    const out = compressJson(input, 'aggressive', NO_PROTECTED);
    const parsed = JSON.parse(out);
    expect(parsed.msg).toBe('hello');
  });

  it('abbreviates "parameters" to "params"', () => {
    const input = '{"parameters":[1,2,3]}';
    const out = compressJson(input, 'aggressive', NO_PROTECTED);
    expect(JSON.parse(out)).toHaveProperty('params');
  });

  it('keeps unknown keys unchanged', () => {
    const input = '{"customKey":"value"}';
    const out = compressJson(input, 'aggressive', NO_PROTECTED);
    expect(JSON.parse(out)).toHaveProperty('customKey');
  });
});

// ─── Logs strategy ────────────────────────────────────────────────────────────

describe('compressLogs — safe', () => {
  it('shortens ISO timestamps to HH:MM:SS', () => {
    const input = '2024-01-15T14:30:45.123Z [INFO] Server started';
    const out = compressLogs(input, 'safe', NO_PROTECTED);
    expect(out).toContain('14:30:45');
    expect(out).not.toContain('2024-01-15');
  });

  it('removes duplicate lines', () => {
    const input = 'line one\nline one\nline two\nline one';
    const out = compressLogs(input, 'safe', NO_PROTECTED);
    const lines = out.split('\n').filter(Boolean);
    const unique = new Set(lines.map(l => l.trim()));
    expect(unique.size).toBe(lines.length);
  });
});

describe('compressLogs — balanced', () => {
  it('removes DEBUG lines', () => {
    const input = '[DEBUG] verbose detail\n[ERROR] real error\n[DEBUG] more debug';
    const out = compressLogs(input, 'balanced', NO_PROTECTED);
    expect(out).not.toMatch(/\[DEBUG\]/);
    expect(out).toContain('[ERROR]');
  });

  it('removes INFO lines', () => {
    const input = '[INFO] server started\n[ERROR] crash';
    const out = compressLogs(input, 'balanced', NO_PROTECTED);
    expect(out).not.toMatch(/\[INFO\]/);
    expect(out).toContain('[ERROR]');
  });

  it('trims stack trace to 3 frames', () => {
    const input = [
      '[ERROR] NullPointerException',
      '  at com.example.A.method(A.java:10)',
      '  at com.example.B.method(B.java:20)',
      '  at com.example.C.method(C.java:30)',
      '  at com.example.D.method(D.java:40)',
      '  at com.example.E.method(E.java:50)',
    ].join('\n');
    const out = compressLogs(input, 'balanced', NO_PROTECTED);
    const frames = out.split('\n').filter(l => l.includes('  at '));
    expect(frames.length).toBeLessThanOrEqual(3);
  });
});

describe('compressLogs — aggressive', () => {
  it('keeps only ERROR/WARN lines', () => {
    const input = '[INFO] start\n[DEBUG] detail\n[ERROR] crash\n[WARN] slow';
    const out = compressLogs(input, 'aggressive', NO_PROTECTED);
    expect(out).toContain('[ERROR]');
    expect(out).toContain('[WARN]');
    expect(out).not.toMatch(/\[INFO\]/);
    expect(out).not.toMatch(/\[DEBUG\]/);
  });

  it('keeps at most 1 stack frame', () => {
    const input = [
      '[ERROR] crash',
      '  at A.m(A.java:1)',
      '  at B.m(B.java:2)',
      '  at C.m(C.java:3)',
    ].join('\n');
    const out = compressLogs(input, 'aggressive', NO_PROTECTED);
    const frames = out.split('\n').filter(l => l.includes('  at '));
    expect(frames.length).toBeLessThanOrEqual(1);
  });
});

// ─── Diff strategy ────────────────────────────────────────────────────────────

describe('compressDiff — safe', () => {
  it('preserves all lines including context', () => {
    const input = 'diff --git a/f.ts b/f.ts\n context line\n+added\n-removed\n context2';
    const out = compressDiff(input, 'safe', NO_PROTECTED);
    expect(out).toContain('context line');
    expect(out).toContain('+added');
    expect(out).toContain('-removed');
  });
});

describe('compressDiff — balanced', () => {
  it('always keeps added and removed lines', () => {
    const input = [
      'diff --git a/f.ts b/f.ts',
      ' context1',
      ' context2',
      ' context3',
      '+added line',
      '-removed line',
      ' context4',
      ' context5',
    ].join('\n');
    const out = compressDiff(input, 'balanced', NO_PROTECTED);
    expect(out).toContain('+added line');
    expect(out).toContain('-removed line');
  });

  it('adds a summary line at the top', () => {
    const input = 'diff --git a/f.ts b/f.ts\n+one added\n-one removed';
    const out = compressDiff(input, 'balanced', NO_PROTECTED);
    expect(out).toMatch(/\[diff:.*\+.*-.*lines\]/);
  });

  it('keeps file header lines', () => {
    const input = 'diff --git a/f.ts b/f.ts\n--- a/f.ts\n+++ b/f.ts\n+new line';
    const out = compressDiff(input, 'balanced', NO_PROTECTED);
    expect(out).toContain('diff --git');
  });
});

describe('compressDiff — aggressive', () => {
  it('keeps added/removed lines but drops unrelated context', () => {
    const lines = [
      'diff --git a/f.ts b/f.ts',
      ' far context A',
      ' far context B',
      ' far context C',
      ' far context D',
      '+added',
      '-removed',
    ];
    const out = compressDiff(lines.join('\n'), 'aggressive', NO_PROTECTED);
    expect(out).toContain('+added');
    expect(out).toContain('-removed');
    expect(out).not.toContain('far context C');
  });
});

// ─── CodeContext strategy ─────────────────────────────────────────────────────

describe('compressCodeContext — safe', () => {
  it('collapses multiple blank lines to one', () => {
    const input = 'line1\n\n\n\nline2';
    const out = compressCodeContext(input, 'safe', NO_PROTECTED);
    expect(out).not.toMatch(/\n{3}/);
    expect(out).toContain('line1');
    expect(out).toContain('line2');
  });
});

describe('compressCodeContext — balanced', () => {
  it('removes trailing whitespace on each line', () => {
    const input = 'const x = 1;   \nconst y = 2;  ';
    const out = compressCodeContext(input, 'balanced', NO_PROTECTED);
    const lines = out.split('\n');
    for (const line of lines) {
      expect(line).toBe(line.trimEnd());
    }
  });

  it('still collapses blank lines', () => {
    const input = 'a\n\n\n\nb';
    expect(compressCodeContext(input, 'balanced', NO_PROTECTED)).not.toMatch(/\n{3}/);
  });
});

describe('compressCodeContext — aggressive', () => {
  it('removes full-line // comments', () => {
    const input = '// this is a comment\nconst x = 1;';
    const out = compressCodeContext(input, 'aggressive', NO_PROTECTED);
    expect(out).not.toContain('// this is a comment');
    expect(out).toContain('const x = 1;');
  });

  it('removes inline // comments', () => {
    const input = 'const x = 1; // inline comment';
    const out = compressCodeContext(input, 'aggressive', NO_PROTECTED);
    expect(out).not.toContain('// inline comment');
    expect(out).toContain('const x = 1;');
  });

  it('does not remove // inside a string literal', () => {
    const input = 'const url = "https://example.com";';
    const out = compressCodeContext(input, 'aggressive', NO_PROTECTED);
    expect(out).toContain('https://example.com');
  });

  it('preserves shebang lines', () => {
    const input = '#!/usr/bin/env node\nconst x = 1;';
    const out = compressCodeContext(input, 'aggressive', NO_PROTECTED);
    expect(out).toContain('const x = 1;');
  });
});

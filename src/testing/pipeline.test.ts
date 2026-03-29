/**
 * End-to-end pipeline tests — core compression feature.
 * vscode is mocked so these run outside VS Code via Vitest.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock vscode before any import that pulls it in
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: (key: string) => {
        if (key === 'defaultMode')       return 'balanced';
        if (key === 'defaultTokenizer')  return 'gpt-tokenizer';
        if (key === 'protectedPatterns') return [];
        if (key === 'localAI.enabled')   return false;
        if (key === 'localAI.runtime')   return 'llamafile';
        if (key === 'localAI.modelProfile') return 'low-memory';
        return undefined;
      },
    }),
  },
}));

import { runPipeline } from '../core/pipeline';

// ─── Basic compression behaviour ─────────────────────────────────────────────

describe('runPipeline — basic compression', () => {
  it('returns a result with required fields', async () => {
    const r = await runPipeline('Please help me fix this bug.', 'balanced');
    expect(r).toHaveProperty('original');
    expect(r).toHaveProperty('compressed');
    expect(r).toHaveProperty('tokensBefore');
    expect(r).toHaveProperty('tokensAfter');
    expect(r).toHaveProperty('savedTokens');
    expect(r).toHaveProperty('savedPercent');
    expect(r).toHaveProperty('mode');
    expect(r).toHaveProperty('contentType');
    expect(r).toHaveProperty('intent');
    expect(r).toHaveProperty('appliedRules');
  });

  it('compressed output is never longer than input', async () => {
    const input = 'Can you please help me to refactor this function in order to make it easier to read?';
    const r = await runPipeline(input, 'balanced');
    expect(r.tokensAfter).toBeLessThanOrEqual(r.tokensBefore);
  });

  it('removes filler phrase "can you please"', async () => {
    const r = await runPipeline('Can you please refactor this function.', 'safe');
    expect(r.compressed.toLowerCase()).not.toMatch(/can you please/);
  });

  it('removes "please" standalone', async () => {
    const r = await runPipeline('Fix this bug please.', 'safe');
    expect(r.compressed.toLowerCase()).not.toMatch(/\bplease\b/);
  });

  it('replaces "in order to" with "to"', async () => {
    const r = await runPipeline('Refactor this in order to improve readability.', 'balanced');
    expect(r.compressed).not.toMatch(/in order to/i);
    expect(r.compressed).toMatch(/to improve/i);
  });

  it('replaces "prior to" with "before"', async () => {
    const r = await runPipeline('Run the tests prior to committing.', 'safe');
    expect(r.compressed).not.toMatch(/prior to/i);
    expect(r.compressed).toMatch(/before/i);
  });

  it('replaces "utilize" with "use"', async () => {
    const r = await runPipeline('Utilize the new API endpoint.', 'safe');
    expect(r.compressed.toLowerCase()).not.toMatch(/utiliz/);
    expect(r.compressed.toLowerCase()).toMatch(/\buse\b/);
  });

  it('removes greeting "Hello"', async () => {
    const r = await runPipeline('Hello, can you fix this bug?', 'safe');
    expect(r.compressed.toLowerCase()).not.toMatch(/^hello/i);
  });

  it('removes "I think" opinion filler', async () => {
    const r = await runPipeline('I think this function needs refactoring.', 'safe');
    expect(r.compressed.toLowerCase()).not.toMatch(/i think/);
  });

  it('savedTokens = tokensBefore - tokensAfter', async () => {
    const r = await runPipeline('Can you please help me fix this please.', 'balanced');
    expect(r.savedTokens).toBe(r.tokensBefore - r.tokensAfter);
  });

  it('savedPercent is between 0 and 100', async () => {
    const r = await runPipeline('Hello, can you please refactor this.', 'balanced');
    expect(r.savedPercent).toBeGreaterThanOrEqual(0);
    expect(r.savedPercent).toBeLessThanOrEqual(100);
  });
});

// ─── Compression modes ────────────────────────────────────────────────────────

describe('runPipeline — compression modes', () => {
  const input = 'Actually, basically I want you to refactor this very complex function to make it really cleaner.';

  it('aggressive removes more than safe', async () => {
    const safe = await runPipeline(input, 'safe');
    const aggressive = await runPipeline(input, 'aggressive');
    expect(aggressive.tokensAfter).toBeLessThanOrEqual(safe.tokensAfter);
  });

  it('balanced removes more than safe', async () => {
    const safe = await runPipeline(input, 'safe');
    const balanced = await runPipeline(input, 'balanced');
    expect(balanced.tokensAfter).toBeLessThanOrEqual(safe.tokensAfter);
  });

  it('mode is reflected in result', async () => {
    const r = await runPipeline('Fix this.', 'aggressive');
    expect(r.mode).toBe('aggressive');
  });
});

// ─── Protected content safety ─────────────────────────────────────────────────

describe('runPipeline — protected content', () => {
  it('does not modify code inside backtick fences', async () => {
    const code = '```\nconst x = utilize(foo);\n```';
    const r = await runPipeline(`Please fix the code:\n${code}`, 'aggressive');
    expect(r.compressed).toContain('utilize(foo)');
  });

  it('does not modify inline code', async () => {
    const r = await runPipeline('Please use the `utilize()` function here.', 'aggressive');
    expect(r.compressed).toContain('`utilize()`');
  });

  it('preserves URLs', async () => {
    const r = await runPipeline(
      'Please update the endpoint to https://api.example.com/v2/users.',
      'aggressive'
    );
    expect(r.compressed).toContain('https://api.example.com/v2/users');
  });

  it('preserves version numbers', async () => {
    const r = await runPipeline('Please update the package to version 3.2.1.', 'aggressive');
    expect(r.compressed).toContain('3.2.1');
  });
});

// ─── Content classification ───────────────────────────────────────────────────

describe('runPipeline — content classification', () => {
  it('classifies plain text as prose', async () => {
    const r = await runPipeline('Fix the authentication bug in the login flow.', 'balanced');
    expect(r.contentType).toBe('prose');
  });

  it('classifies valid JSON as json', async () => {
    const r = await runPipeline('{"name":"test","value":42}', 'balanced');
    expect(r.contentType).toBe('json');
  });

  it('classifies git diff as diff', async () => {
    const r = await runPipeline('diff --git a/foo.ts b/foo.ts\n--- a/foo.ts\n+++ b/foo.ts', 'balanced');
    expect(r.contentType).toBe('diff');
  });

  it('classifies log lines as logs', async () => {
    const r = await runPipeline('2024-01-01T12:00:00 [ERROR] Something went wrong', 'balanced');
    expect(r.contentType).toBe('logs');
  });

  it('classifies fenced code block as code or mixed', async () => {
    const r = await runPipeline('```\nconst x = 1;\n```', 'balanced');
    expect(['code', 'mixed']).toContain(r.contentType);
  });
});

// ─── Intent extraction ────────────────────────────────────────────────────────

describe('runPipeline — intent extraction', () => {
  it('extracts "refactor" action', async () => {
    const r = await runPipeline('Refactor this React component.', 'balanced');
    expect(r.intent.action).toBe('refactor');
  });

  it('extracts "fix" action', async () => {
    const r = await runPipeline('Fix the null pointer exception.', 'balanced');
    expect(r.intent.action).toBe('fix');
  });

  it('extracts "explain" action', async () => {
    const r = await runPipeline('Explain how this algorithm works.', 'balanced');
    expect(r.intent.action).toBe('explain');
  });

  it('extracts constraints with "do not"', async () => {
    const r = await runPipeline('Refactor this. Do not change the public API.', 'balanced');
    expect(r.intent.constraints.some(c => /do not change/i.test(c))).toBe(true);
  });

  it('extracts "explain before code" response style', async () => {
    const r = await runPipeline('Fix this bug. Explain before giving the code.', 'balanced');
    expect(r.intent.responseStyle).toContain('explain before code');
  });

  it('falls back to "process" for unknown action', async () => {
    const r = await runPipeline('The sky is blue.', 'balanced');
    expect(r.intent.action).toBe('process');
  });
});

// ─── Real-world prompt examples ───────────────────────────────────────────────

describe('runPipeline — real-world prompts', () => {
  it('compresses the documentation example prompt', async () => {
    const input = 'Please help me refactor this React component to make it cleaner and easier to read, but do not change the behavior, do not add any new dependencies, and explain the changes before giving the final code.';
    const r = await runPipeline(input, 'balanced');
    expect(r.savedTokens).toBeGreaterThan(0);
    // Constraints must survive compression (may be canonicalised to "don't")
    expect(r.compressed).toMatch(/don'?t change|do not change/i);
    expect(r.compressed).toMatch(/don'?t add|do not add|no new/i);
  });

  it('does not produce empty output for short inputs', async () => {
    const r = await runPipeline('Fix bug.', 'aggressive');
    expect(r.compressed.trim().length).toBeGreaterThan(0);
  });

  it('handles already-compressed minimal prompt', async () => {
    const r = await runPipeline('Refactor. No new deps.', 'balanced');
    expect(r.compressed.length).toBeGreaterThan(0);
  });

  it('handles multi-line prompts', async () => {
    const input = `Please help me fix this bug.\nIt happens when the user logs in.\nDo not change the UI.`;
    const r = await runPipeline(input, 'balanced');
    expect(r.compressed).toBeTruthy();
    expect(r.contentType).toBe('prose');
  });
});

import { describe, it, expect } from 'vitest';
import { applyWithProtection, detectProtectedRanges } from '../preprocess/protectRanges';
import { compress } from '../compress/compressEngine';
import { RuleRegistry } from '../rules/ruleRegistry';

describe('compression regressions', () => {
  it('keeps protected ranges intact across multiple transforms with stale input ranges', () => {
    const input = 'Please refactor `validateOrder()` and preserve "OUT_OF_STOCK".';
    const ranges = detectProtectedRanges(input, []);

    const firstPass = applyWithProtection(input, ranges, segment =>
      segment.replace(/\bPlease\b\s*/gi, '')
    );
    const secondPass = applyWithProtection(firstPass, ranges, segment =>
      segment.replace(/\brefactor\b/gi, 'rewrite')
    );

    expect(secondPass).toContain('`validateOrder()`');
    expect(secondPass).toContain('"OUT_OF_STOCK"');
    expect(secondPass).toContain('rewrite');
  });

  it('does not apply prose/mixed-only rules to pure code content', () => {
    const registry = new RuleRegistry();
    const rulesForCode = registry.getRulesForContext('balanced', 'code');

    expect(
      rulesForCode.every(rule => rule.contentTypes.includes('code'))
    ).toBe(true);
  });

  it('preserves protected literals during full compression', () => {
    const input =
      'Please refactor my TypeScript `validateOrder()` function. Do not change behavior, keep edge cases, and preserve exact errors: "OUT_OF_STOCK", "INVALID_COUPON", "PAYMENT_TIMEOUT".';
    const ranges = detectProtectedRanges(input, []);

    const result = compress(input, 'balanced', 'prose', ranges);

    expect(result.text).toContain('`validateOrder()`');
    expect(result.text).toContain('"OUT_OF_STOCK"');
    expect(result.text).toContain('"INVALID_COUPON"');
    expect(result.text).toContain('"PAYMENT_TIMEOUT"');
  });
});


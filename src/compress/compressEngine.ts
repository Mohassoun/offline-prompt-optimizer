import { CompressionMode, CompressionRule, ContentType, ProtectedRange } from '../core/types';
import { getRuleRegistry } from '../rules/ruleRegistry';
import { applyWithProtection } from '../preprocess/protectRanges';
import { compressProse } from './strategies/prose';
import { compressJson } from './strategies/json';
import { compressLogs } from './strategies/logs';
import { compressDiff } from './strategies/diff';
import { compressCodeContext } from './strategies/codeContext';

export interface CompressEngineResult {
  text: string;
  appliedRules: string[];
}

export function compress(
  text: string,
  mode: CompressionMode,
  contentType: ContentType,
  protectedRanges: ProtectedRange[],
  customRules?: CompressionRule[]
): CompressEngineResult {
  const registry = getRuleRegistry();

  if (customRules) {
    for (const rule of customRules) {
      registry.registerRule(rule);
    }
  }

  const rules = registry.getRulesForContext(mode, contentType);
  const appliedRules: string[] = [];
  let result = text;

  // Route to the correct content-type strategy first
  const before = result;
  switch (contentType) {
    case 'prose':
    case 'mixed':
      result = compressProse(result, mode, protectedRanges);
      break;
    case 'json':
      result = compressJson(result, mode, protectedRanges);
      break;
    case 'logs':
      result = compressLogs(result, mode, protectedRanges);
      break;
    case 'diff':
      result = compressDiff(result, mode, protectedRanges);
      break;
    case 'code':
      result = compressCodeContext(result, mode, protectedRanges);
      break;
  }
  if (result !== before) {
    appliedRules.push(`${contentType}-strategy`);
  }

  for (const rule of rules) {
    const before = result;
    result = applyWithProtection(result, protectedRanges, segment => {
      return segment.replace(rule.pattern, rule.replacement);
    });
    if (result !== before) {
      appliedRules.push(rule.id);
    }
  }

  result = result.replace(/\s{2,}/g, ' ').replace(/^\s+/gm, '').trim();

  return { text: result, appliedRules };
}

import { CompressionRule, CompressionMode, ContentType } from '../core/types';
import { fillerRules } from './builtins/fillerRules';
import { constraintRules } from './builtins/constraintRules';
import { actionRules } from './builtins/actionRules';

const SAFETY_ORDER: Record<CompressionMode, number> = {
  safe: 0,
  balanced: 1,
  aggressive: 2,
};

export class RuleRegistry {
  private rules: Map<string, CompressionRule> = new Map();

  constructor() {
    this.loadBuiltins();
  }

  private loadBuiltins(): void {
    const allBuiltins = [...fillerRules, ...constraintRules, ...actionRules];
    for (const rule of allBuiltins) {
      this.rules.set(rule.id, rule);
    }
  }

  registerRule(rule: CompressionRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(id: string): void {
    this.rules.delete(id);
  }

  getRulesForContext(mode: CompressionMode, contentType: ContentType): CompressionRule[] {
    const modeLevel = SAFETY_ORDER[mode];
    return Array.from(this.rules.values()).filter(rule => {
      if (!rule.enabled) return false;
      const matchesContentType =
        rule.contentTypes.includes(contentType) ||
        (contentType === 'mixed' &&
          (rule.contentTypes.includes('prose') || rule.contentTypes.includes('code')));
      if (!matchesContentType) return false;
      const ruleSafetyLevel = SAFETY_ORDER[rule.safetyLevel];
      return ruleSafetyLevel <= modeLevel;
    });
  }

  getAllRules(): CompressionRule[] {
    return Array.from(this.rules.values());
  }

  enableRule(id: string): void {
    const rule = this.rules.get(id);
    if (rule) rule.enabled = true;
  }

  disableRule(id: string): void {
    const rule = this.rules.get(id);
    if (rule) rule.enabled = false;
  }
}

let _instance: RuleRegistry | null = null;

export function getRuleRegistry(): RuleRegistry {
  if (!_instance) {
    _instance = new RuleRegistry();
  }
  return _instance;
}

import * as vscode from 'vscode';
import { CompressionRule } from '../core/types';

const STORAGE_KEY = 'offlinePromptOptimizer.workspaceRules';

export function loadWorkspaceRules(context: vscode.ExtensionContext): CompressionRule[] {
  const stored = context.workspaceState.get<CompressionRule[]>(STORAGE_KEY);
  return stored ?? [];
}

export async function saveWorkspaceRule(
  context: vscode.ExtensionContext,
  rule: CompressionRule
): Promise<void> {
  const rules = loadWorkspaceRules(context);
  const existing = rules.findIndex(r => r.id === rule.id);
  if (existing >= 0) {
    rules[existing] = rule;
  } else {
    rules.push(rule);
  }
  await context.workspaceState.update(STORAGE_KEY, rules);
}

export async function removeWorkspaceRule(
  context: vscode.ExtensionContext,
  id: string
): Promise<void> {
  const rules = loadWorkspaceRules(context).filter(r => r.id !== id);
  await context.workspaceState.update(STORAGE_KEY, rules);
}

export async function clearWorkspaceRules(context: vscode.ExtensionContext): Promise<void> {
  await context.workspaceState.update(STORAGE_KEY, []);
}

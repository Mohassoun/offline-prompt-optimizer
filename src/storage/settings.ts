import * as vscode from 'vscode';
import { CompressionMode } from '../core/types';
import { ModelProfile, RuntimeType } from '../localai/types';

export interface ExtensionSettings {
  defaultMode: CompressionMode;
  defaultTokenizer: string;
  protectedPatterns: string[];
  localAIEnabled: boolean;
  localAIRuntime: RuntimeType;
  localAIModelProfile: ModelProfile;
}

export function getSettings(): ExtensionSettings {
  const cfg = vscode.workspace.getConfiguration('offlinePromptOptimizer');
  return {
    defaultMode: (cfg.get<string>('defaultMode') ?? 'balanced') as CompressionMode,
    defaultTokenizer: cfg.get<string>('defaultTokenizer') ?? 'gpt-tokenizer',
    protectedPatterns: cfg.get<string[]>('protectedPatterns') ?? [],
    localAIEnabled: cfg.get<boolean>('localAI.enabled') ?? false,
    localAIRuntime: (cfg.get<string>('localAI.runtime') ?? 'llamafile') as RuntimeType,
    localAIModelProfile: (cfg.get<string>('localAI.modelProfile') ?? 'low-memory') as ModelProfile,
  };
}

export async function updateSetting<K extends keyof ExtensionSettings>(
  key: K,
  value: ExtensionSettings[K],
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('offlinePromptOptimizer');
  // Map flat key names to their dotted config path
  const keyMap: Record<string, string> = {
    localAIEnabled: 'localAI.enabled',
    localAIRuntime: 'localAI.runtime',
    localAIModelProfile: 'localAI.modelProfile',
  };
  await cfg.update(keyMap[key as string] ?? key, value, target);
}

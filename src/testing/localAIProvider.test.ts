import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock vscode so smollmProvider.ts (which imports vscode) works in unit tests
vi.mock('vscode', () => ({
  window: {
    withProgress: vi.fn((_opts: unknown, task: (p: unknown, t: unknown) => Promise<unknown>) =>
      task({ report: vi.fn() }, { isCancellationRequested: false })
    ),
  },
  ProgressLocation: { Notification: 15 },
}));

vi.mock('../localai/runtimeManager', () => ({
  runtimeManager: { isRunning: false, endpointBase: 'http://localhost:8765' },
}));

// Mock smollmProvider so its @huggingface/transformers import is never loaded in tests
vi.mock('../localai/smollmProvider', () => ({
  compressWithSmolLM2: vi.fn().mockResolvedValue(null),
  ensureSmolLMLoaded:  vi.fn().mockResolvedValue(false),
  isSmolLMReady:       vi.fn().mockReturnValue(false),
  smolLMLoadError:     vi.fn().mockReturnValue(null),
}));

// Mock settings so localAIProvider can read profile without a real VS Code workspace
vi.mock('../storage/settings', () => ({
  getSettings: vi.fn(() => ({
    defaultMode: 'balanced',
    defaultTokenizer: 'gpt-tokenizer',
    protectedPatterns: [],
    localAIEnabled: false,
    localAIRuntime: 'llamafile',
    localAIModelProfile: 'low-memory',   // non-nano so llamafile path is tested
  })),
  updateSetting: vi.fn(),
}));

import { tryLocalCompletion, localCompletion } from '../localai/localAIProvider';
import { runtimeManager } from '../localai/runtimeManager';

describe('localCompletion', () => {
  it('throws when runtime is not running', async () => {
    (runtimeManager as any).isRunning = false;
    await expect(localCompletion({ prompt: 'hello' })).rejects.toThrow('not running');
  });
});

describe('tryLocalCompletion', () => {
  it('returns null when runtime is not running', async () => {
    (runtimeManager as any).isRunning = false;
    const result = await tryLocalCompletion({ prompt: 'hello' });
    expect(result).toBeNull();
  });

  it('returns null when request fails', async () => {
    (runtimeManager as any).isRunning = true;
    // No actual server running, so the HTTP call will fail
    const result = await tryLocalCompletion({ prompt: 'hello' });
    expect(result).toBeNull();
  });
});

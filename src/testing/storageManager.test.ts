import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Minimal vscode mock — StorageManager only needs globalStorageUri and globalState
function makeContext(dir: string) {
  const store = new Map<string, unknown>();
  return {
    globalStorageUri: { fsPath: dir },
    globalState: {
      get: <T>(key: string) => store.get(key) as T | undefined,
      update: async (key: string, value: unknown) => { store.set(key, value); },
    },
  };
}

// Dynamically import after mocking vscode
vi.mock('vscode', () => ({}));

import { StorageManager } from '../localai/storageManager';
import { LocalAISetupState } from '../localai/types';

let tmpDir: string;
let storage: StorageManager;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opo-test-'));
  // @ts-expect-error minimal mock
  storage = new StorageManager(makeContext(tmpDir));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('StorageManager — paths', () => {
  it('creates runtime and model sub-directories', () => {
    expect(fs.existsSync(storage.runtimeDir())).toBe(true);
    expect(fs.existsSync(storage.modelDir())).toBe(true);
  });

  it('runtimePath joins correctly', () => {
    expect(storage.runtimePath('llamafile.exe')).toBe(
      path.join(tmpDir, 'runtime', 'llamafile.exe')
    );
  });

  it('modelPath joins correctly', () => {
    expect(storage.modelPath('phi-3.gguf')).toBe(
      path.join(tmpDir, 'models', 'phi-3.gguf')
    );
  });
});

describe('StorageManager — setup state', () => {
  it('returns not-installed by default', () => {
    expect(storage.getSetupState().status).toBe('not-installed');
  });

  it('saves and retrieves state', async () => {
    const state: LocalAISetupState = { status: 'ready' };
    await storage.saveSetupState(state);
    expect(storage.getSetupState().status).toBe('ready');
  });

  it('saveRuntimeMeta merges into existing state', async () => {
    await storage.saveSetupState({ status: 'downloading-runtime' });
    await storage.saveRuntimeMeta({
      type: 'llamafile',
      version: '0.8.15',
      binaryPath: '/tmp/llamafile',
      installedAt: '2026-01-01T00:00:00.000Z',
    });
    const s = storage.getSetupState();
    expect(s.runtime?.type).toBe('llamafile');
    expect(s.status).toBe('downloading-runtime');
  });

  it('saveModelMeta merges into existing state', async () => {
    await storage.saveModelMeta({
      id: 'phi-3-mini-q4',
      profile: 'low-memory',
      modelPath: '/tmp/phi.gguf',
      sizeBytes: 2_300_000_000,
      installedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(storage.getSetupState().model?.id).toBe('phi-3-mini-q4');
  });
});

describe('StorageManager — disk usage', () => {
  it('returns 0 for empty dirs', () => {
    expect(storage.diskUsageBytes()).toBe(0);
  });

  it('counts file sizes correctly', () => {
    fs.writeFileSync(storage.runtimePath('test.bin'), Buffer.alloc(1024));
    fs.writeFileSync(storage.modelPath('model.gguf'), Buffer.alloc(2048));
    expect(storage.diskUsageBytes()).toBe(3072);
  });

  it('formatDiskUsage shows MB for medium files', () => {
    fs.writeFileSync(storage.runtimePath('big.bin'), Buffer.alloc(5 * 1024 * 1024));
    expect(storage.formatDiskUsage()).toMatch(/MB/);
  });
});

describe('StorageManager — removeAllAssets', () => {
  it('deletes files listed in state and resets to not-installed', async () => {
    const binPath = storage.runtimePath('llamafile.exe');
    const modelPath = storage.modelPath('phi.gguf');
    fs.writeFileSync(binPath, 'fake');
    fs.writeFileSync(modelPath, 'fake');

    await storage.saveSetupState({
      status: 'ready',
      runtime: { type: 'llamafile', version: '0.8.15', binaryPath: binPath, installedAt: '' },
      model: { id: 'x', profile: 'low-memory', modelPath, sizeBytes: 0, installedAt: '' },
    });

    await storage.removeAllAssets();

    expect(fs.existsSync(binPath)).toBe(false);
    expect(fs.existsSync(modelPath)).toBe(false);
    expect(storage.getSetupState().status).toBe('not-installed');
  });

  it('removes .part files left by interrupted downloads', async () => {
    const partPath = storage.modelPath('phi.gguf.part');
    fs.writeFileSync(partPath, 'incomplete');
    await storage.removeAllAssets();
    expect(fs.existsSync(partPath)).toBe(false);
  });
});

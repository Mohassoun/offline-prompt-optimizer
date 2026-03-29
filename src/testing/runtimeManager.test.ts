import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RuntimeManager } from '../localai/runtimeManager';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import * as cp from 'child_process';
import { EventEmitter } from 'events';

function makeFakeProcess() {
  const proc = new EventEmitter() as any;
  proc.killed = false;
  proc.kill = vi.fn((signal: string) => {
    proc.killed = true;
    proc.emit('exit', 0, signal);
  });
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
}

describe('RuntimeManager', () => {
  let manager: RuntimeManager;

  beforeEach(() => {
    manager = new RuntimeManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    manager.stop();
  });

  it('isRunning is false initially', () => {
    expect(manager.isRunning).toBe(false);
  });

  it('stop is safe to call when not running', () => {
    expect(() => manager.stop()).not.toThrow();
  });

  it('endpointBase uses port 8765 by default', () => {
    expect(manager.endpointBase).toBe('http://localhost:8765');
  });

  it('stop sets isRunning to false', async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(cp.spawn).mockReturnValue(fakeProc);

    // Simulate healthCheck returning true immediately so start() resolves
    vi.spyOn(manager as any, 'waitForReady').mockResolvedValue(undefined);

    await manager.start(
      { type: 'llamafile', version: '0.8.15', binaryPath: '/fake/llamafile', installedAt: '' },
      { id: 'phi', profile: 'low-memory', modelPath: '/fake/model.gguf', sizeBytes: 0, installedAt: '' }
    );

    expect(manager.isRunning).toBe(true);
    manager.stop();
    expect(manager.isRunning).toBe(false);
  });

  it('spawns with correct args including model path', async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(cp.spawn).mockReturnValue(fakeProc);
    vi.spyOn(manager as any, 'waitForReady').mockResolvedValue(undefined);

    const modelPath = '/storage/models/phi-3.gguf';
    const binaryPath = '/storage/runtime/llamafile.exe';

    await manager.start(
      { type: 'llamafile', version: '0.8.15', binaryPath, installedAt: '' },
      { id: 'phi', profile: 'low-memory', modelPath, sizeBytes: 0, installedAt: '' }
    );

    expect(cp.spawn).toHaveBeenCalledWith(
      binaryPath,
      expect.arrayContaining(['--model', modelPath, '--server', '--nobrowser']),
      expect.any(Object)
    );
  });

  it('healthCheck returns false when nothing is listening', async () => {
    const alive = await manager.healthCheck();
    expect(alive).toBe(false);
  });

  it('does not start twice if already running', async () => {
    const fakeProc = makeFakeProcess();
    vi.mocked(cp.spawn).mockReturnValue(fakeProc);
    vi.spyOn(manager as any, 'waitForReady').mockResolvedValue(undefined);

    const runtime = { type: 'llamafile' as const, version: '0.8.15', binaryPath: '/bin', installedAt: '' };
    const model = { id: 'x', profile: 'low-memory' as const, modelPath: '/m', sizeBytes: 0, installedAt: '' };

    await manager.start(runtime, model);
    await manager.start(runtime, model);

    expect(cp.spawn).toHaveBeenCalledTimes(1);
  });
});

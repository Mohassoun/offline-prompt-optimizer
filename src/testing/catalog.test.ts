import { describe, it, expect, vi, afterEach } from 'vitest';
import { getRuntimeArtifact, getModelForProfile, MODEL_CATALOG, RUNTIME_CATALOG } from '../localai/catalog';

describe('getRuntimeArtifact', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns win32/x64 artifact on Windows', () => {
    vi.stubGlobal('process', { ...process, platform: 'win32', arch: 'x64' });
    const art = getRuntimeArtifact();
    expect(art.filename).toBe('llamafile.exe');
    expect(art.version).toBe('0.8.15');
    expect(art.url).toContain('llamafile');
  });

  it('returns linux/x64 artifact on Linux', () => {
    vi.stubGlobal('process', { ...process, platform: 'linux', arch: 'x64' });
    const art = getRuntimeArtifact();
    expect(art.filename).toBe('llamafile');
  });

  it('falls back to x64 if arch not found', () => {
    vi.stubGlobal('process', { ...process, platform: 'linux', arch: 'riscv64' });
    const art = getRuntimeArtifact();
    expect(art.filename).toBe('llamafile');
  });

  it('throws on unsupported platform', () => {
    vi.stubGlobal('process', { ...process, platform: 'freebsd', arch: 'x64' });
    expect(() => getRuntimeArtifact()).toThrow('Unsupported platform');
  });
});

describe('getModelForProfile', () => {
  it('returns nano model (SmolLM2) for nano profile', () => {
    const model = getModelForProfile('nano');
    expect(model.profile).toBe('nano');
    expect(model.filename).toContain('.gguf');
    expect(model.id).toBe('smollm2-360m-q8');
    expect(model.sizeBytes).toBeLessThan(1_000_000_000); // under 1 GB
  });

  it('returns low-memory model for low-memory profile', () => {
    const model = getModelForProfile('low-memory');
    expect(model.profile).toBe('low-memory');
    expect(model.filename).toContain('.gguf');
    expect(model.sizeBytes).toBeGreaterThan(1_000_000_000);
  });

  it('returns balanced model for balanced profile', () => {
    const model = getModelForProfile('balanced');
    expect(model.profile).toBe('balanced');
    expect(model.sizeBytes).toBeGreaterThan(3_000_000_000);
  });

  it('throws for unknown profile', () => {
    // @ts-expect-error intentional bad input
    expect(() => getModelForProfile('ultra')).toThrow();
  });
});

describe('MODEL_CATALOG', () => {
  it('has exactly 3 models (nano + low-memory + balanced)', () => {
    expect(MODEL_CATALOG).toHaveLength(3);
  });

  it('each model has required fields', () => {
    for (const m of MODEL_CATALOG) {
      expect(m.id).toBeTruthy();
      expect(m.url).toMatch(/^https:\/\//);
      expect(m.filename).toMatch(/\.gguf$/);
      expect(m.sizeBytes).toBeGreaterThan(0);
    }
  });

  it('model profiles are unique', () => {
    const profiles = MODEL_CATALOG.map((m) => m.profile);
    expect(new Set(profiles).size).toBe(profiles.length);
  });
});

describe('RUNTIME_CATALOG', () => {
  it('has win32, linux, darwin platforms', () => {
    expect(RUNTIME_CATALOG.platforms.win32).toBeDefined();
    expect(RUNTIME_CATALOG.platforms.linux).toBeDefined();
    expect(RUNTIME_CATALOG.platforms.darwin).toBeDefined();
  });

  it('all artifacts have a url and filename', () => {
    for (const [, archMap] of Object.entries(RUNTIME_CATALOG.platforms)) {
      for (const [, art] of Object.entries(archMap ?? {})) {
        expect(art.url).toMatch(/^https:\/\//);
        expect(art.filename).toBeTruthy();
        expect(art.version).toBe('0.8.15');
      }
    }
  });
});

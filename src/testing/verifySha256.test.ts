import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { verifySha256 } from '../localai/runtimeInstaller';

function tmpFile(content: string): string {
  const p = path.join(os.tmpdir(), `vtest-${Date.now()}.bin`);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

function sha256Of(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

describe('verifySha256', () => {
  const files: string[] = [];
  afterEach(() => {
    for (const f of files) { try { fs.unlinkSync(f); } catch { /* ok */ } }
    files.length = 0;
  });

  it('returns true for correct hash', async () => {
    const content = 'hello world';
    const p = tmpFile(content);
    files.push(p);
    expect(await verifySha256(p, sha256Of(content))).toBe(true);
  });

  it('returns false for wrong hash', async () => {
    const p = tmpFile('hello world');
    files.push(p);
    expect(await verifySha256(p, 'deadbeef'.repeat(8))).toBe(false);
  });

  it('is case-insensitive for the expected hash', async () => {
    const content = 'test';
    const p = tmpFile(content);
    files.push(p);
    const hash = sha256Of(content).toUpperCase();
    expect(await verifySha256(p, hash)).toBe(true);
  });

  it('rejects a file that was tampered with', async () => {
    const p = tmpFile('original content');
    files.push(p);
    const goodHash = sha256Of('original content');
    fs.writeFileSync(p, 'tampered content', 'utf8');
    expect(await verifySha256(p, goodHash)).toBe(false);
  });
});

/**
 * Download logic tests — all HTTP is mocked, no real internet needed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';

// ─── HTTP mock factory ────────────────────────────────────────────────────────

function makeResponse(statusCode: number, body: string, headers: Record<string, string> = {}) {
  const emitter = new EventEmitter() as any;
  emitter.statusCode = statusCode;
  emitter.headers = { 'content-length': String(body.length), ...headers };
  emitter.resume = () => {};
  process.nextTick(() => {
    emitter.emit('data', Buffer.from(body));
    emitter.emit('end');
  });
  return emitter;
}

function makeRequest(response: any) {
  const req = new EventEmitter() as any;
  req.destroy = () => {};
  process.nextTick(() => response);
  return req;
}

vi.mock('https', () => ({
  get: vi.fn(),
}));
vi.mock('http', () => ({
  get: vi.fn(),
  request: vi.fn(),
}));

import * as https from 'https';
import * as http from 'http';
import { downloadFile, verifySha256 } from '../localai/runtimeInstaller';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-test-'));
  vi.clearAllMocks();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── downloadFile ─────────────────────────────────────────────────────────────

describe('downloadFile', () => {
  it('writes response body to dest file', async () => {
    const body = 'binary content here';
    vi.mocked(https.get).mockImplementationOnce((_url: any, cb: any) => {
      cb(makeResponse(200, body));
      return makeRequest(null) as any;
    });

    const dest = path.join(tmpDir, 'output.bin');
    await downloadFile('https://example.com/file', dest);

    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, 'utf8')).toBe(body);
  });

  it('calls onProgress with downloaded and total bytes', async () => {
    const body = 'x'.repeat(100);
    vi.mocked(https.get).mockImplementationOnce((_url: any, cb: any) => {
      cb(makeResponse(200, body));
      return makeRequest(null) as any;
    });

    const calls: [number, number][] = [];
    const dest = path.join(tmpDir, 'progress.bin');
    await downloadFile('https://example.com/file', dest, (dl, total) => {
      calls.push([dl, total]);
    });

    expect(calls.length).toBeGreaterThan(0);
    expect(calls[calls.length - 1][0]).toBe(100);
    expect(calls[calls.length - 1][1]).toBe(100);
  });

  it('follows a single HTTP redirect', async () => {
    const body = 'redirected content';

    // First call returns 302
    vi.mocked(https.get).mockImplementationOnce((_url: any, cb: any) => {
      const res = makeResponse(302, '', { location: 'https://cdn.example.com/file' });
      res.headers = { location: 'https://cdn.example.com/file' };
      res.statusCode = 302;
      cb(res);
      return makeRequest(null) as any;
    });

    // Second call returns 200
    vi.mocked(https.get).mockImplementationOnce((_url: any, cb: any) => {
      cb(makeResponse(200, body));
      return makeRequest(null) as any;
    });

    const dest = path.join(tmpDir, 'redirected.bin');
    await downloadFile('https://example.com/file', dest);

    expect(fs.readFileSync(dest, 'utf8')).toBe(body);
    expect(https.get).toHaveBeenCalledTimes(2);
  });

  it('renames .part file to dest on completion', async () => {
    vi.mocked(https.get).mockImplementationOnce((_url: any, cb: any) => {
      cb(makeResponse(200, 'data'));
      return makeRequest(null) as any;
    });

    const dest = path.join(tmpDir, 'final.bin');
    await downloadFile('https://example.com/file', dest);

    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.existsSync(dest + '.part')).toBe(false);
  });

  it('appends to existing .part file (resume)', async () => {
    const partPath = path.join(tmpDir, 'resume.bin.part');
    fs.writeFileSync(partPath, 'first-');

    vi.mocked(https.get).mockImplementationOnce((_url: any, cb: any) => {
      cb(makeResponse(200, 'second'));
      return makeRequest(null) as any;
    });

    const dest = path.join(tmpDir, 'resume.bin');
    await downloadFile('https://example.com/file', dest);

    expect(fs.readFileSync(dest, 'utf8')).toBe('first-second');
  });
});

// ─── verifySha256 (already in verifySha256.test.ts — just smoke-test here) ───

describe('verifySha256 — empty hash skips check', () => {
  it('returns true when expected hash is empty string', async () => {
    const p = path.join(tmpDir, 'any.bin');
    fs.writeFileSync(p, 'anything');
    expect(await verifySha256(p, '')).toBe(true);
  });
});

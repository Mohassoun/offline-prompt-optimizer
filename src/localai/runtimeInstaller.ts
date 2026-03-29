import * as fs from 'fs';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { InstalledRuntimeMeta } from './types';
import { getRuntimeArtifact } from './catalog';
import { StorageManager } from './storageManager';

export type ProgressCallback = (downloaded: number, total: number, label: string) => void;

function followRedirects(
  url: string,
  maxRedirects = 10
): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const get = (u: string, remaining: number) => {
      const mod = u.startsWith('https') ? https : http;
      mod.get(u, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (remaining <= 0) {
            reject(new Error('Too many redirects'));
            return;
          }
          get(res.headers.location, remaining - 1);
        } else {
          resolve(res);
        }
      }).on('error', reject);
    };
    get(url, maxRedirects);
  });
}

export async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: ProgressCallback
): Promise<void> {
  const partPath = destPath + '.part';

  let existingBytes = 0;
  if (fs.existsSync(partPath)) {
    existingBytes = fs.statSync(partPath).size;
  }

  const res = await followRedirects(url);

  const total = parseInt(res.headers['content-length'] ?? '0', 10);

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(partPath, {
      flags: existingBytes > 0 ? 'a' : 'w',
    });

    let downloaded = existingBytes;

    res.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      writeStream.write(chunk);
      if (onProgress && total > 0) {
        onProgress(downloaded, total, 'Downloading');
      }
    });

    res.on('end', () => {
      writeStream.end(() => {
        fs.renameSync(partPath, destPath);
        resolve();
      });
    });

    res.on('error', (err) => {
      writeStream.destroy();
      reject(err);
    });
  });
}

export async function verifySha256(filePath: string, expected: string): Promise<boolean> {
  if (!expected) { return true; }
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex').toLowerCase() === expected.toLowerCase()));
    stream.on('error', reject);
  });
}

export async function installRuntime(
  storage: StorageManager,
  onProgress?: ProgressCallback
): Promise<InstalledRuntimeMeta> {
  const artifact = getRuntimeArtifact();
  const destPath = storage.runtimePath(artifact.filename);

  // Skip download if already present and valid
  if (fs.existsSync(destPath)) {
    if (!artifact.sha256 || await verifySha256(destPath, artifact.sha256)) {
      return buildMeta(artifact, destPath);
    }
    fs.rmSync(destPath, { force: true });
  }

  await downloadFile(artifact.url, destPath, onProgress);

  if (artifact.sha256) {
    const valid = await verifySha256(destPath, artifact.sha256);
    if (!valid) {
      fs.rmSync(destPath, { force: true });
      throw new Error('Runtime checksum mismatch — download may be corrupted. Please retry.');
    }
  }

  // Make executable on non-Windows platforms
  if (process.platform !== 'win32') {
    fs.chmodSync(destPath, 0o755);
  }

  return buildMeta(artifact, destPath);
}

function buildMeta(
  artifact: { version: string; filename: string },
  binaryPath: string
): InstalledRuntimeMeta {
  return {
    type: 'llamafile',
    version: artifact.version,
    binaryPath,
    installedAt: new Date().toISOString(),
  };
}

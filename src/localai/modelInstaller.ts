import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';
import { InstalledModelMeta, ModelProfile } from './types';
import { getModelForProfile } from './catalog';
import { StorageManager } from './storageManager';
import { ProgressCallback } from './runtimeInstaller';

function followRedirects(
  url: string,
  resumeFrom = 0,
  maxRedirects = 10
): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const get = (u: string, remaining: number) => {
      const mod = u.startsWith('https') ? https : http;
      const opts: https.RequestOptions = { method: 'GET' };
      if (resumeFrom > 0) {
        opts.headers = { Range: `bytes=${resumeFrom}-` };
      }
      mod.get(u, opts, (res) => {
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

export async function downloadModelWithResume(
  url: string,
  destPath: string,
  onProgress?: ProgressCallback
): Promise<void> {
  const partPath = destPath + '.part';

  let existingBytes = 0;
  if (fs.existsSync(partPath)) {
    existingBytes = fs.statSync(partPath).size;
  }

  const res = await followRedirects(url, existingBytes);

  // Server returned 416 (range not satisfiable) — file might already be complete
  if (res.statusCode === 416) {
    if (fs.existsSync(partPath)) {
      fs.renameSync(partPath, destPath);
    }
    return;
  }

  const contentLength = parseInt(res.headers['content-length'] ?? '0', 10);
  const isResume = res.statusCode === 206;
  const total = isResume ? existingBytes + contentLength : contentLength;

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(partPath, {
      flags: isResume ? 'a' : 'w',
    });

    let downloaded = isResume ? existingBytes : 0;

    res.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      writeStream.write(chunk);
      if (onProgress && total > 0) {
        onProgress(downloaded, total, 'Downloading model');
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

async function verifySha256(filePath: string, expected: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex').toLowerCase() === expected.toLowerCase()));
    stream.on('error', reject);
  });
}

export async function installModel(
  storage: StorageManager,
  profile: ModelProfile,
  onProgress?: ProgressCallback
): Promise<InstalledModelMeta> {
  const artifact = getModelForProfile(profile);
  const destPath = storage.modelPath(artifact.filename);

  if (fs.existsSync(destPath)) {
    if (!artifact.sha256 || await verifySha256(destPath, artifact.sha256)) {
      return buildMeta(artifact, destPath);
    }
    fs.rmSync(destPath, { force: true });
  }

  await downloadModelWithResume(artifact.url, destPath, onProgress);

  if (artifact.sha256) {
    const valid = await verifySha256(destPath, artifact.sha256);
    if (!valid) {
      fs.rmSync(destPath, { force: true });
      throw new Error('Model checksum mismatch — download may be corrupted. Please retry.');
    }
  }

  return buildMeta(artifact, destPath);
}

function buildMeta(
  artifact: { id: string; profile: ModelProfile; sizeBytes: number },
  modelPath: string
): InstalledModelMeta {
  return {
    id: artifact.id,
    profile: artifact.profile,
    modelPath,
    sizeBytes: artifact.sizeBytes,
    installedAt: new Date().toISOString(),
  };
}

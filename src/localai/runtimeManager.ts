import * as cp from 'child_process';
import * as http from 'http';
import { InstalledModelMeta, InstalledRuntimeMeta } from './types';

const DEFAULT_PORT = 8765;
const HEALTH_TIMEOUT_MS = 5000;
const STARTUP_POLL_INTERVAL_MS = 500;
const STARTUP_MAX_ATTEMPTS = 30; // 15 seconds total

export class RuntimeManager {
  private process: cp.ChildProcess | null = null;
  private port: number = DEFAULT_PORT;

  get isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  get endpointBase(): string {
    return `http://localhost:${this.port}`;
  }

  async start(
    runtime: InstalledRuntimeMeta,
    model: InstalledModelMeta,
    port = DEFAULT_PORT
  ): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.port = port;

    const args = [
      '--model', model.modelPath,
      '--server',
      '--port', String(port),
      '--nobrowser',
      '--ctx-size', '2048',
    ];

    this.process = cp.spawn(runtime.binaryPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    this.process.stdout?.on('data', () => { /* swallow runtime logs */ });
    this.process.stderr?.on('data', () => { /* swallow runtime logs */ });

    this.process.on('exit', () => {
      this.process = null;
    });

    await this.waitForReady();
  }

  private async waitForReady(): Promise<void> {
    for (let i = 0; i < STARTUP_MAX_ATTEMPTS; i++) {
      await sleep(STARTUP_POLL_INTERVAL_MS);
      try {
        const alive = await this.healthCheck();
        if (alive) { return; }
      } catch {
        // still starting
      }
    }
    throw new Error('Local AI runtime failed to start within the expected time.');
  }

  async healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        `${this.endpointBase}/health`,
        { timeout: HEALTH_TIMEOUT_MS },
        (res) => {
          resolve(res.statusCode === 200);
          res.resume();
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  stop(): void {
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  async restart(
    runtime: InstalledRuntimeMeta,
    model: InstalledModelMeta
  ): Promise<void> {
    this.stop();
    await sleep(500);
    await this.start(runtime, model, this.port);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Singleton shared across the extension lifetime
export const runtimeManager = new RuntimeManager();

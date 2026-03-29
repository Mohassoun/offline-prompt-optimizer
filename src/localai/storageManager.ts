import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { InstalledModelMeta, InstalledRuntimeMeta, LocalAISetupState } from './types';

const STATE_KEY = 'localai.setupState';

export class StorageManager {
  private baseDir: string;

  constructor(private context: vscode.ExtensionContext) {
    this.baseDir = context.globalStorageUri.fsPath;
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    const runtimeDir = this.runtimeDir();
    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true });
    }
    const modelDir = this.modelDir();
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }
  }

  runtimeDir(): string {
    return path.join(this.baseDir, 'runtime');
  }

  modelDir(): string {
    return path.join(this.baseDir, 'models');
  }

  runtimePath(filename: string): string {
    return path.join(this.runtimeDir(), filename);
  }

  modelPath(filename: string): string {
    return path.join(this.modelDir(), filename);
  }

  getSetupState(): LocalAISetupState {
    const stored = this.context.globalState.get<LocalAISetupState>(STATE_KEY);
    return stored ?? { status: 'not-installed' };
  }

  async saveSetupState(state: LocalAISetupState): Promise<void> {
    await this.context.globalState.update(STATE_KEY, state);
  }

  async saveRuntimeMeta(meta: InstalledRuntimeMeta): Promise<void> {
    const state = this.getSetupState();
    await this.saveSetupState({ ...state, runtime: meta });
  }

  async saveModelMeta(meta: InstalledModelMeta): Promise<void> {
    const state = this.getSetupState();
    await this.saveSetupState({ ...state, model: meta });
  }

  async removeAllAssets(): Promise<void> {
    const state = this.getSetupState();

    if (state.runtime?.binaryPath && fs.existsSync(state.runtime.binaryPath)) {
      fs.rmSync(state.runtime.binaryPath, { force: true });
    }
    if (state.model?.modelPath && fs.existsSync(state.model.modelPath)) {
      fs.rmSync(state.model.modelPath, { force: true });
    }

    // Remove partial download files
    for (const dir of [this.runtimeDir(), this.modelDir()]) {
      if (fs.existsSync(dir)) {
        for (const file of fs.readdirSync(dir)) {
          if (file.endsWith('.part')) {
            fs.rmSync(path.join(dir, file), { force: true });
          }
        }
      }
    }

    await this.saveSetupState({ status: 'not-installed' });
  }

  diskUsageBytes(): number {
    let total = 0;
    for (const dir of [this.runtimeDir(), this.modelDir()]) {
      if (!fs.existsSync(dir)) { continue; }
      for (const file of fs.readdirSync(dir)) {
        try {
          total += fs.statSync(path.join(dir, file)).size;
        } catch {
          // skip
        }
      }
    }
    return total;
  }

  formatDiskUsage(): string {
    const bytes = this.diskUsageBytes();
    if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB`; }
    if (bytes < 1024 * 1024 * 1024) { return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

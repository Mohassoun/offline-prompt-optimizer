import * as vscode from 'vscode';
import { ModelProfile } from './types';
import { StorageManager } from './storageManager';
import { installRuntime } from './runtimeInstaller';
import { installModel } from './modelInstaller';
import { ensureSmolLMLoaded } from './smollmProvider';
import { updateSetting } from '../storage/settings';

const FIRST_RUN_KEY = 'localai.firstRunShown';

export async function maybeShowFirstRunPrompt(
  context: vscode.ExtensionContext
): Promise<void> {
  const storage = new StorageManager(context);
  const state = storage.getSetupState();

  // Already set up or user previously dismissed
  if (state.status === 'ready') { return; }
  if (context.globalState.get<boolean>(FIRST_RUN_KEY)) { return; }

  await context.globalState.update(FIRST_RUN_KEY, true);

  const pick = await vscode.window.showInformationMessage(
    'Offline Prompt Optimizer: Setup Local AI (~2–4 GB) to unlock AI-assisted compression.',
    { modal: false },
    'Install',
    'Later'
  );

  if (pick === 'Install') {
    await runSetupFlow(context);
  }
}

export async function runSetupFlow(
  context: vscode.ExtensionContext,
  repair = false
): Promise<boolean> {
  const storage = new StorageManager(context);

  const profile = await pickModelProfile();
  if (!profile) { return false; }

  // ── Nano profile: SmolLM2 runs in-process — no binary download needed ────────
  if (profile === 'nano') {
    return runNanoSetup(context, storage);
  }

  // ── Other profiles: download llamafile runtime + GGUF model ──────────────────
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: repair ? 'Repairing Local AI Setup' : 'Setting Up Local AI',
      cancellable: true,
    },
    async (progress, token) => {
      try {
        // Phase 2 — Runtime
        await storage.saveSetupState({ status: 'downloading-runtime' });
        progress.report({ message: 'Downloading runtime (llamafile)…', increment: 0 });

        const runtimeMeta = await installRuntime(storage, (dl, total) => {
          if (token.isCancellationRequested) { return; }
          const pct = total > 0 ? Math.round((dl / total) * 40) : 0;
          progress.report({
            message: `Runtime: ${formatBytes(dl)} / ${formatBytes(total)}`,
            increment: pct,
          });
        });

        if (token.isCancellationRequested) {
          await storage.saveSetupState({ status: 'not-installed', lastError: 'Cancelled by user' });
          return false;
        }

        await storage.saveRuntimeMeta(runtimeMeta);

        // Phase 3 — Model
        await storage.saveSetupState({ ...storage.getSetupState(), status: 'downloading-model' });
        progress.report({ message: 'Downloading model… (this may take a few minutes)', increment: 40 });

        const modelMeta = await installModel(storage, profile, (dl, total) => {
          if (token.isCancellationRequested) { return; }
          const pct = total > 0 ? Math.round((dl / total) * 55) : 0;
          progress.report({
            message: `Model: ${formatBytes(dl)} / ${formatBytes(total)}`,
            increment: pct,
          });
        });

        if (token.isCancellationRequested) {
          await storage.saveSetupState({ status: 'not-installed', lastError: 'Cancelled by user' });
          return false;
        }

        await storage.saveModelMeta(modelMeta);
        await storage.saveSetupState({
          status: 'ready',
          runtime: runtimeMeta,
          model: modelMeta,
        });

        progress.report({ message: 'Local AI ready!', increment: 5 });

        vscode.window.showInformationMessage(
          `Local AI setup complete. Using ${modelMeta.id} (${formatBytes(modelMeta.sizeBytes)}).`
        );
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await storage.saveSetupState({ status: 'error', lastError: msg });

        const retry = await vscode.window.showErrorMessage(
          `Local AI setup failed: ${msg}`,
          'Retry',
          'Dismiss'
        );
        if (retry === 'Retry') {
          return runSetupFlow(context, repair);
        }
        return false;
      }
    }
  );
}

/**
 * Nano setup: SmolLM2 runs entirely in-process via @huggingface/transformers.
 * No llamafile binary is downloaded. The ~400 MB ONNX model is fetched from
 * HuggingFace Hub automatically and cached in ~/.cache/huggingface/hub.
 */
async function runNanoSetup(
  context: vscode.ExtensionContext,
  storage: StorageManager
): Promise<boolean> {
  try {
    // Persist profile and enable flag so the pipeline will use it
    await updateSetting('localAIModelProfile', 'nano');
    await updateSetting('localAIEnabled', true);

    // Mark setup state as ready immediately — no binary to track.
    // modelPath is the HuggingFace model ID (no local file — managed by transformers cache).
    await storage.saveSetupState({
      status: 'ready',
      runtime: undefined,
      model: {
        id: 'smollm2-360m-instruct',
        profile: 'nano',
        modelPath: 'HuggingFaceTB/SmolLM2-360M-Instruct',  // HF hub ID, not a file path
        sizeBytes: 400_000_000,
        installedAt: new Date().toISOString(),
      },
    });

    // Kick off model load in the background with a progress notification
    const loaded = await ensureSmolLMLoaded(true);   // shows "Loading SmolLM2…" bar

    if (!loaded) {
      await storage.saveSetupState({
        status: 'error',
        lastError: 'SmolLM2 failed to load — check your internet connection for first-time download.',
      });
      vscode.window.showErrorMessage(
        'SmolLM2 failed to load. Re-run "Setup Local AI" to try again.'
      );
      return false;
    }

    vscode.window.showInformationMessage(
      'SmolLM2 ready! AI-assisted compression is now active (~400 MB cached locally).'
    );
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await storage.saveSetupState({ status: 'error', lastError: msg });
    vscode.window.showErrorMessage(`SmolLM2 setup failed: ${msg}`);
    return false;
  }
}

async function pickModelProfile(): Promise<ModelProfile | undefined> {
  const items: vscode.QuickPickItem[] = [
    {
      label: '$(star) Nano — SmolLM2 360M (Recommended)',
      description: '~386 MB download',
      detail: 'English-optimised · runs on any device (4 GB RAM+) · fastest setup',
    },
    {
      label: 'Low Memory — Phi-3 Mini',
      description: '~2.4 GB download',
      detail: 'Good quality · needs 8 GB RAM',
    },
    {
      label: 'Balanced — Mistral 7B',
      description: '~4.4 GB download',
      detail: 'Best quality · needs 16 GB RAM',
    },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a model — SmolLM2 is recommended for English prompts',
    ignoreFocusOut: true,
  });

  if (!picked) { return undefined; }
  if (picked.label.includes('Nano'))    { return 'nano'; }
  if (picked.label.includes('Low'))     { return 'low-memory'; }
  return 'balanced';
}

function formatBytes(b: number): string {
  if (b < 1024 * 1024) { return `${(b / 1024).toFixed(0)} KB`; }
  if (b < 1024 * 1024 * 1024) { return `${(b / (1024 * 1024)).toFixed(1)} MB`; }
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

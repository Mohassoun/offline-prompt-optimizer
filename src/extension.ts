import * as vscode from 'vscode';
import { registerOpenOptimizer } from './commands/openOptimizer';
import { registerCompressSelection } from './commands/compressSelection';
import { registerPreviewDiff } from './commands/previewDiff';
import { registerSetupLocalAI } from './commands/setupLocalAI';
import { registerRepairLocalAI } from './commands/repairLocalAI';
import { registerRemoveLocalAIAssets } from './commands/removeLocalAIAssets';
import { registerShowLocalAIStatus } from './commands/showLocalAIStatus';
import { getSettings, updateSetting } from './storage/settings';
import { getCurrentTokenizer } from './tokenizer/tokenizerAdapter';
import { CompressionMode } from './core/types';
import { maybeShowFirstRunPrompt } from './localai/setupFlow';
import { runtimeManager } from './localai/runtimeManager';
import { StorageManager } from './localai/storageManager';
import { ensureSmolLMLoaded } from './localai/smollmProvider';

const MODES: CompressionMode[] = ['safe', 'balanced', 'aggressive'];

export function activate(context: vscode.ExtensionContext): void {
  const openOptimizerStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
  openOptimizerStatusBar.text = '$(zap) Prompt Optimizer';
  openOptimizerStatusBar.tooltip = 'Open Prompt Optimizer';
  openOptimizerStatusBar.command = 'offline-prompt-optimizer.openPromptOptimizer';
  openOptimizerStatusBar.show();
  context.subscriptions.push(openOptimizerStatusBar);

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.tooltip = 'Token count for selected text/document';
  statusBar.command = 'offline-prompt-optimizer.openPromptOptimizer';
  statusBar.show();
  context.subscriptions.push(statusBar);

  function updateStatusBar(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      statusBar.text = '$(zap) Prompt Optimizer';
      return;
    }
    const text = editor.selection.isEmpty
      ? editor.document.getText()
      : editor.document.getText(editor.selection);

    if (!text.trim()) {
      statusBar.text = '$(zap) 0 tokens';
      return;
    }

    try {
      const tokenizer = getCurrentTokenizer();
      const count = tokenizer.countTokens(text);
      const label = editor.selection.isEmpty ? 'doc' : 'sel';
      statusBar.text = `$(zap) ${count} tokens (${label})`;
    } catch {
      statusBar.text = '$(zap) Prompt Optimizer';
    }
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar()),
    vscode.window.onDidChangeTextEditorSelection(() => updateStatusBar())
  );
  updateStatusBar();

  context.subscriptions.push(registerOpenOptimizer(context));
  context.subscriptions.push(registerCompressSelection(context));
  context.subscriptions.push(registerPreviewDiff(context));

  // Local AI commands
  context.subscriptions.push(registerSetupLocalAI(context));
  context.subscriptions.push(registerRepairLocalAI(context));
  context.subscriptions.push(registerRemoveLocalAIAssets(context));
  context.subscriptions.push(registerShowLocalAIStatus(context));

  context.subscriptions.push(
    vscode.commands.registerCommand('offline-prompt-optimizer.copyCompressedPrompt', async () => {
      vscode.window.showInformationMessage(
        'Use "Compress Selected Prompt" or the Optimizer panel to copy compressed text.'
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('offline-prompt-optimizer.toggleCompressionMode', async () => {
      const settings = getSettings();
      const currentIndex = MODES.indexOf(settings.defaultMode);
      const nextMode = MODES[(currentIndex + 1) % MODES.length];
      await updateSetting('defaultMode', nextMode);
      vscode.window.showInformationMessage(`Compression mode set to: ${nextMode}`);
    })
  );

  // First-run local AI prompt (non-blocking)
  maybeShowFirstRunPrompt(context).catch(() => { /* ignore */ });

  // Auto-start SmolLM2 if already installed and enabled in settings
  autoStartLocalAI(context).catch(() => { /* runtime unavailable — silent fallback */ });
}

async function autoStartLocalAI(context: vscode.ExtensionContext): Promise<void> {
  const settings = getSettings();
  if (!settings.localAIEnabled) { return; }

  const storage = new StorageManager(context);
  const state = storage.getSetupState();
  if (state.status !== 'ready' || !state.model) { return; }

  // ── Nano profile: SmolLM2 runs in-process, no binary server needed ───────────
  if (settings.localAIModelProfile === 'nano') {
    try {
      const ok = await ensureSmolLMLoaded(false);   // silent load (no progress bar on startup)
      if (ok) {
        const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        statusBar.text = '$(hubot) SmolLM2 ready';
        statusBar.tooltip = 'SmolLM2 in-process — compression enhanced';
        statusBar.command = 'offline-prompt-optimizer.showLocalAIStatus';
        statusBar.show();
        context.subscriptions.push(statusBar);
      }
    } catch {
      // Model not loaded — extension still works in rules-only mode
    }
    return;
  }

  // ── Other profiles: start the llamafile HTTP server ──────────────────────────
  if (!state.runtime) { return; }

  try {
    await runtimeManager.start(state.runtime, state.model);
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    statusBar.text = '$(hubot) Local AI ready';
    statusBar.tooltip = 'Local AI is running — compression enhanced';
    statusBar.command = 'offline-prompt-optimizer.showLocalAIStatus';
    statusBar.show();
    context.subscriptions.push(statusBar);
  } catch {
    // Model not responding — extension still works in rules-only mode
  }
}

export function deactivate(): void {
  runtimeManager.stop();
}

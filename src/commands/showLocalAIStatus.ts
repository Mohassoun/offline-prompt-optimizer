import * as vscode from 'vscode';
import { StorageManager } from '../localai/storageManager';
import { runtimeManager } from '../localai/runtimeManager';

export function registerShowLocalAIStatus(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand(
    'offline-prompt-optimizer.showLocalAIStatus',
    async () => {
      const storage = new StorageManager(context);
      const state = storage.getSetupState();
      const diskUsage = storage.formatDiskUsage();
      const runtimeRunning = runtimeManager.isRunning;

      const lines: string[] = [];

      lines.push(`**Local AI Status**\n`);
      lines.push(`- Setup status: \`${state.status}\``);
      lines.push(`- Runtime process: ${runtimeRunning ? '✅ running' : '⏹ stopped'}`);

      if (state.runtime) {
        lines.push(`- Runtime: ${state.runtime.type} v${state.runtime.version}`);
        lines.push(`- Runtime path: \`${state.runtime.binaryPath}\``);
      } else {
        lines.push('- Runtime: not installed');
      }

      if (state.model) {
        lines.push(`- Model: ${state.model.id} (${state.model.profile})`);
        lines.push(`- Model path: \`${state.model.modelPath}\``);
      } else {
        lines.push('- Model: not installed');
      }

      lines.push(`- Disk usage: ${diskUsage}`);

      if (state.lastError) {
        lines.push(`- Last error: ${state.lastError}`);
      }

      // Show in output channel for easy copy/paste
      const channel = vscode.window.createOutputChannel('Offline Prompt Optimizer — Local AI');
      channel.clear();
      channel.appendLine(lines.map((l) => l.replace(/\*\*/g, '').replace(/`/g, '')).join('\n'));
      channel.show(true);

      // Also show a brief summary in a notification
      const summary = state.status === 'ready'
        ? `Local AI: ready (${state.model?.id ?? 'unknown model'}, ${diskUsage} on disk)`
        : `Local AI: ${state.status}`;

      vscode.window.showInformationMessage(summary, 'View Details').then((choice) => {
        if (choice === 'View Details') {
          channel.show(true);
        }
      });
    }
  );
}

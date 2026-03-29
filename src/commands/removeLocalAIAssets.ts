import * as vscode from 'vscode';
import { StorageManager } from '../localai/storageManager';
import { runtimeManager } from '../localai/runtimeManager';

export function registerRemoveLocalAIAssets(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand(
    'offline-prompt-optimizer.removeLocalAIAssets',
    async () => {
      const storage = new StorageManager(context);
      const diskUsage = storage.formatDiskUsage();

      const confirm = await vscode.window.showWarningMessage(
        `Remove all Local AI assets? This will free ${diskUsage} of disk space.`,
        { modal: true },
        'Remove',
        'Cancel'
      );

      if (confirm !== 'Remove') { return; }

      runtimeManager.stop();
      await storage.removeAllAssets();

      vscode.window.showInformationMessage(
        'Local AI assets removed. The extension will continue in rules-only mode.'
      );
    }
  );
}

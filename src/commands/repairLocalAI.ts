import * as vscode from 'vscode';
import { runSetupFlow } from '../localai/setupFlow';
import { StorageManager } from '../localai/storageManager';
import { runtimeManager } from '../localai/runtimeManager';

export function registerRepairLocalAI(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand(
    'offline-prompt-optimizer.repairLocalAI',
    async () => {
      runtimeManager.stop();

      const storage = new StorageManager(context);
      await storage.removeAllAssets();

      await runSetupFlow(context, true);
    }
  );
}

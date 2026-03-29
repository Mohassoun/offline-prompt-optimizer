import * as vscode from 'vscode';
import { runSetupFlow } from '../localai/setupFlow';

export function registerSetupLocalAI(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand(
    'offline-prompt-optimizer.setupLocalAI',
    () => runSetupFlow(context)
  );
}

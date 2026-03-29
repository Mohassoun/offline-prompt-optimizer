import * as vscode from 'vscode';
import { getOrCreatePanel } from '../ui/panel/webview';

export function registerOpenOptimizer(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('offline-prompt-optimizer.openPromptOptimizer', () => {
    const editor = vscode.window.activeTextEditor;
    let selectedText: string | undefined;

    if (editor && !editor.selection.isEmpty) {
      selectedText = editor.document.getText(editor.selection);
    }

    getOrCreatePanel(context, selectedText);
  });
}

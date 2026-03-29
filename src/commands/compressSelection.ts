import * as vscode from 'vscode';
import { getOrCreatePanel } from '../ui/panel/webview';
import { getSettings } from '../storage/settings';

export function registerCompressSelection(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('offline-prompt-optimizer.compressSelection', async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showWarningMessage('No active editor.');
      return;
    }

    let text: string;

    if (!editor.selection.isEmpty) {
      text = editor.document.getText(editor.selection);
    } else {
      text = editor.document.getText();
    }

    if (!text.trim()) {
      vscode.window.showWarningMessage('No text to compress.');
      return;
    }

    getOrCreatePanel(context, text);
  });
}

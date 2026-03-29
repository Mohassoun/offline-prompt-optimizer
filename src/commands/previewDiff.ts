import * as vscode from 'vscode';
import { runPipeline } from '../core/pipeline';
import { getSettings } from '../storage/settings';
import { diffWords } from 'diff';

export function registerPreviewDiff(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('offline-prompt-optimizer.previewCompressionDiff', async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showWarningMessage('No active editor.');
      return;
    }

    const text = editor.selection.isEmpty
      ? editor.document.getText()
      : editor.document.getText(editor.selection);

    if (!text.trim()) {
      vscode.window.showWarningMessage('No text to preview.');
      return;
    }

    const settings = getSettings();

    try {
      const result = await runPipeline(text, settings.defaultMode);
      const diffs = diffWords(result.original, result.compressed);

      const lines: string[] = [
        `# Compression Diff (${result.mode} mode)`,
        `Tokens: ${result.tokensBefore} → ${result.tokensAfter} (saved ${result.savedTokens} / ${result.savedPercent}%)`,
        '',
        '## Changes',
        '',
      ];

      for (const part of diffs) {
        if (part.added) {
          lines.push(`[+ ${part.value}]`);
        } else if (part.removed) {
          lines.push(`[- ${part.value}]`);
        } else {
          lines.push(part.value);
        }
      }

      lines.push('', '## Compressed', '', result.compressed);

      const doc = await vscode.workspace.openTextDocument({
        content: lines.join(''),
        language: 'markdown',
      });

      await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
    } catch (err) {
      vscode.window.showErrorMessage(`Compression failed: ${String(err)}`);
    }
  });
}

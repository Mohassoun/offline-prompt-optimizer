import * as vscode from 'vscode';
import * as path from 'path';
import { CompressionMode } from '../../core/types';
import { PanelStateManager, WebviewMessage } from './state';
import { runPipeline } from '../../core/pipeline';
import { getSettings } from '../../storage/settings';

let _panel: vscode.WebviewPanel | undefined;

export function getOrCreatePanel(
  context: vscode.ExtensionContext,
  initialText?: string
): vscode.WebviewPanel {
  if (_panel) {
    _panel.reveal(vscode.ViewColumn.Beside);
    if (initialText) {
      triggerCompress(_panel, initialText, getSettings().defaultMode);
    }
    return _panel;
  }

  _panel = vscode.window.createWebviewPanel(
    'offlinePromptOptimizer',
    'Prompt Optimizer',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'dist'))],
    }
  );

  const settings = getSettings();
  const stateManager = new PanelStateManager(_panel, settings.defaultMode);

  _panel.webview.html = buildHtml(getNonce());

  _panel.webview.onDidReceiveMessage(
    async (msg: WebviewMessage) => {
      switch (msg.type) {
        case 'compress': {
          stateManager.setLoading(true);
          stateManager.setInputText(msg.text);
          stateManager.setMode(msg.mode);
          try {
            const result = await runPipeline(msg.text, msg.mode);
            stateManager.setResult(result);
          } catch (err) {
            stateManager.sendError(String(err));
          }
          break;
        }
        case 'applyToEditor': {
          const state = stateManager.getState();
          if (state.result) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.selection && !editor.selection.isEmpty) {
              await editor.edit(editBuilder => {
                editBuilder.replace(editor!.selection, state.result!.compressed);
              });
            }
          }
          break;
        }
        case 'copyCompressed': {
          const state = stateManager.getState();
          if (state.result) {
            await vscode.env.clipboard.writeText(state.result.compressed);
            vscode.window.showInformationMessage('Compressed prompt copied to clipboard.');
          }
          break;
        }
        case 'setMode': {
          stateManager.setMode(msg.mode);
          break;
        }
        case 'ready': {
          if (initialText) {
            stateManager.setLoading(true);
            try {
              const result = await runPipeline(initialText, settings.defaultMode);
              stateManager.setResult(result);
            } catch (err) {
              stateManager.sendError(String(err));
            }
          }
          break;
        }
      }
    },
    undefined,
    context.subscriptions
  );

  _panel.onDidDispose(() => {
    _panel = undefined;
  }, null, context.subscriptions);

  return _panel;
}

function triggerCompress(panel: vscode.WebviewPanel, text: string, mode: CompressionMode): void {
  panel.webview.postMessage({ type: 'triggerCompress', text, mode });
}

function buildHtml(nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prompt Optimizer</title>
  <style>
    :root { --gap: 12px; --radius: 4px; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      padding: var(--gap);
      display: flex;
      flex-direction: column;
      gap: var(--gap);
      min-height: 100vh;
    }
    h2 { font-size: 1.1em; font-weight: 600; }
    label { display: block; font-size: 0.85em; margin-bottom: 4px; opacity: 0.8; }
    textarea {
      width: 100%; min-height: 100px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, #444);
      border-radius: var(--radius);
      padding: 8px;
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      resize: vertical;
    }
    .row { display: flex; gap: var(--gap); align-items: center; flex-wrap: wrap; }
    select {
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border, #444);
      border-radius: var(--radius);
      padding: 4px 8px;
      font-size: inherit;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none; border-radius: var(--radius);
      padding: 6px 14px; cursor: pointer; font-size: inherit;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .stats {
      display: flex; gap: var(--gap); flex-wrap: wrap;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-editorWidget-border, #444);
      border-radius: var(--radius);
      padding: 8px 12px; font-size: 0.85em;
    }
    .stat { display: flex; flex-direction: column; gap: 2px; }
    .stat-label { opacity: 0.7; }
    .stat-value { font-weight: 600; }
    .stat-value.saved { color: #4caf50; }
    .output-box, .diff-box {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, #444);
      border-radius: var(--radius);
      padding: 8px; min-height: 60px;
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      white-space: pre-wrap; word-break: break-word; line-height: 1.6;
    }
    .diff-added { background: rgba(0,200,0,0.15); color: #4caf50; }
    .diff-removed { background: rgba(200,0,0,0.15); color: #f44336; text-decoration: line-through; }
    .spinner { opacity: 0.6; font-style: italic; }
    .error-msg { color: var(--vscode-errorForeground, #f44336); }
    .section { display: flex; flex-direction: column; gap: 6px; }
    .section-title { font-weight: 600; font-size: 0.9em; }
    .tag {
      display: inline-block;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 10px;
      padding: 2px 8px; font-size: 0.78em; margin: 2px;
    }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <h2>Offline Prompt Optimizer</h2>

  <div class="section">
    <label for="inputText">Input Prompt</label>
    <textarea id="inputText" placeholder="Paste or type your prompt here..."></textarea>
  </div>

  <div class="row">
    <label for="modeSelect" style="margin:0">Mode:</label>
    <select id="modeSelect">
      <option value="safe">Safe</option>
      <option value="balanced" selected>Balanced</option>
      <option value="aggressive">Aggressive</option>
    </select>
    <button id="compressBtn">Compress</button>
    <button id="copyBtn" class="secondary" disabled>Copy Compressed</button>
    <button id="applyBtn" class="secondary" disabled>Apply to Editor</button>
  </div>

  <div id="statusMsg" class="spinner hidden">Compressing...</div>
  <div id="errorMsg" class="error-msg hidden"></div>

  <div id="statsPanel" class="stats hidden">
    <div class="stat"><span class="stat-label">Before</span><span class="stat-value" id="statBefore">-</span></div>
    <div class="stat"><span class="stat-label">After</span><span class="stat-value" id="statAfter">-</span></div>
    <div class="stat"><span class="stat-label">Saved</span><span class="stat-value saved" id="statSaved">-</span></div>
    <div class="stat"><span class="stat-label">Mode</span><span class="stat-value" id="statMode">-</span></div>
    <div class="stat"><span class="stat-label">Type</span><span class="stat-value" id="statType">-</span></div>
  </div>

  <div id="outputSection" class="section hidden">
    <div class="section-title">Compressed Output</div>
    <div class="output-box" id="outputBox"></div>
  </div>

  <div id="diffSection" class="section hidden">
    <div class="section-title">Diff</div>
    <div class="diff-box" id="diffBox"></div>
  </div>

  <div id="rulesSection" class="section hidden">
    <div class="section-title">Applied Rules</div>
    <div id="rulesBox"></div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const $ = id => document.getElementById(id);

    const inputText = $('inputText');
    const modeSelect = $('modeSelect');
    const compressBtn = $('compressBtn');
    const copyBtn = $('copyBtn');
    const applyBtn = $('applyBtn');

    function show(id) { $(id).classList.remove('hidden'); }
    function hide(id) { $(id).classList.add('hidden'); }
    function esc(s) {
      return String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
    }

    compressBtn.addEventListener('click', () => {
      const text = inputText.value.trim();
      if (!text) return;
      vscode.postMessage({ type: 'compress', text, mode: modeSelect.value });
    });

    copyBtn.addEventListener('click', () => vscode.postMessage({ type: 'copyCompressed' }));
    applyBtn.addEventListener('click', () => vscode.postMessage({ type: 'applyToEditor' }));
    modeSelect.addEventListener('change', () => vscode.postMessage({ type: 'setMode', mode: modeSelect.value }));

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'loading') {
        if (msg.isLoading) { show('statusMsg'); hide('errorMsg'); copyBtn.disabled = true; applyBtn.disabled = true; }
        else { hide('statusMsg'); }
      } else if (msg.type === 'error') {
        hide('statusMsg');
        show('errorMsg');
        $('errorMsg').textContent = 'Error: ' + msg.message;
      } else if (msg.type === 'result') {
        hide('statusMsg'); hide('errorMsg');
        renderResult(msg.result);
      } else if (msg.type === 'triggerCompress') {
        inputText.value = msg.text;
        modeSelect.value = msg.mode;
        vscode.postMessage({ type: 'compress', text: msg.text, mode: msg.mode });
      }
    });

    function renderResult(r) {
      show('statsPanel'); show('outputSection'); show('diffSection'); show('rulesSection');
      $('statBefore').textContent = r.tokensBefore + ' tokens';
      $('statAfter').textContent = r.tokensAfter + ' tokens';
      $('statSaved').textContent = r.savedTokens + ' (' + r.savedPercent + '%)';
      $('statMode').textContent = r.mode;
      $('statType').textContent = r.contentType;
      $('outputBox').textContent = r.compressed;
      renderDiff(r.original, r.compressed);
      $('rulesBox').innerHTML = r.appliedRules.length > 0
        ? r.appliedRules.map(rule => '<span class="tag">' + esc(rule) + '</span>').join('')
        : '<span style="opacity:0.6">No rules applied</span>';
      copyBtn.disabled = false;
      applyBtn.disabled = false;
    }

    function renderDiff(orig, comp) {
      const a = orig.split(' ');
      const b = comp.split(' ');
      const aSet = new Set(a);
      const bSet = new Set(b);
      let html = '';
      for (const w of a) {
        if (bSet.has(w)) {
          html += esc(w) + ' ';
        } else {
          html += '<span class="diff-removed">' + esc(w) + '</span> ';
        }
      }
      for (const w of b) {
        if (!aSet.has(w)) {
          html += '<span class="diff-added">[+' + esc(w) + ']</span> ';
        }
      }
      $('diffBox').innerHTML = html;
    }

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

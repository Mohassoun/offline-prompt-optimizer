import * as vscode from 'vscode';
import { CompressionResult, CompressionMode } from '../../core/types';

export interface PanelState {
  result: CompressionResult | null;
  isLoading: boolean;
  mode: CompressionMode;
  inputText: string;
}

export type WebviewMessage =
  | { type: 'compress'; text: string; mode: CompressionMode }
  | { type: 'applyToEditor' }
  | { type: 'copyCompressed' }
  | { type: 'setMode'; mode: CompressionMode }
  | { type: 'ready' };

export type HostMessage =
  | { type: 'result'; result: CompressionResult }
  | { type: 'loading'; isLoading: boolean }
  | { type: 'error'; message: string }
  | { type: 'setState'; state: PanelState };

export class PanelStateManager {
  private state: PanelState;
  private panel: vscode.WebviewPanel;

  constructor(panel: vscode.WebviewPanel, initialMode: CompressionMode = 'balanced') {
    this.panel = panel;
    this.state = {
      result: null,
      isLoading: false,
      mode: initialMode,
      inputText: '',
    };
  }

  getState(): PanelState {
    return { ...this.state };
  }

  setLoading(isLoading: boolean): void {
    this.state.isLoading = isLoading;
    this.sendMessage({ type: 'loading', isLoading });
  }

  setResult(result: CompressionResult): void {
    this.state.result = result;
    this.state.isLoading = false;
    this.sendMessage({ type: 'result', result });
  }

  setMode(mode: CompressionMode): void {
    this.state.mode = mode;
  }

  setInputText(text: string): void {
    this.state.inputText = text;
  }

  sendError(message: string): void {
    this.state.isLoading = false;
    this.sendMessage({ type: 'error', message });
  }

  private sendMessage(msg: HostMessage): void {
    if (this.panel.webview) {
      this.panel.webview.postMessage(msg);
    }
  }
}

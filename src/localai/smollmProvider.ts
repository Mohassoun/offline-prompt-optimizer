/**
 * smollmProvider.ts
 *
 * Runs SmolLM2-360M-Instruct directly inside the Node.js extension process
 * using @huggingface/transformers (ONNX Runtime).
 *
 * No llamafile binary needed. No external server process.
 * The model (~400 MB) is downloaded automatically on first use and cached
 * in the OS HuggingFace cache directory (~/.cache/huggingface/hub).
 *
 * Usage:
 *   const compressed = await compressWithSmolLM2(text);
 *   // returns null if model is not yet loaded or compression is not shorter
 */

import * as vscode from 'vscode';

// We use a dynamic import so the extension still loads instantly even before
// the model is ready. @huggingface/transformers is marked external in esbuild
// so it resolves from node_modules at runtime.
type HFPipeline = (
  messages: Array<{ role: string; content: string }>,
  options: {
    max_new_tokens: number;
    do_sample: boolean;
    temperature?: number;
    return_full_text: boolean;
  }
) => Promise<Array<{ generated_text: Array<{ role: string; content: string }> }>>;

// ─── Singleton state ──────────────────────────────────────────────────────────

let _pipe: HFPipeline | null = null;
let _loading = false;
let _loadError: string | null = null;

const MODEL_ID = 'HuggingFaceTB/SmolLM2-360M-Instruct';

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  'You are a prompt compression assistant for English coding tasks. ' +
  'Rewrite the user message using fewer words and tokens. ' +
  'Keep ALL technical terms, constraints, variable names, and key instructions. ' +
  'Remove filler words, polite phrasing, and redundant language. ' +
  'Return ONLY the compressed text. No explanations.';

// ─── Load the model (once) ───────────────────────────────────────────────────

export async function ensureSmolLMLoaded(
  showProgress = true
): Promise<boolean> {
  if (_pipe)       { return true; }
  if (_loadError)  { return false; }
  if (_loading)    {
    // Wait for ongoing load
    await waitUntil(() => !_loading, 60_000);
    return _pipe !== null;
  }

  _loading = true;

  const load = async () => {
    // Dynamic import so the heavy library is only loaded when needed
    const { pipeline, env } = await import('@huggingface/transformers');

    // Use local cache dir; allow online download on first run
    env.allowLocalModels   = true;
    env.allowRemoteModels  = true;
    env.useBrowserCache    = false;

    _pipe = await pipeline('text-generation', MODEL_ID, {
      dtype: 'q4',          // 4-bit quantised — smallest footprint
      device: 'cpu',
    }) as unknown as HFPipeline;
  };

  try {
    if (showProgress) {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Loading SmolLM2 (~400 MB first run)…',
          cancellable: false,
        },
        () => load()
      );
    } else {
      await load();
    }
    _loading = false;
    return true;
  } catch (err) {
    _loading = false;
    _loadError = err instanceof Error ? err.message : String(err);
    return false;
  }
}

// ─── Compress with SmolLM2 ───────────────────────────────────────────────────

export async function compressWithSmolLM2(text: string): Promise<string | null> {
  if (!_pipe) {
    // Try a silent background load (no progress bar — called from hot path)
    const ok = await ensureSmolLMLoaded(false);
    if (!ok) { return null; }
  }

  try {
    const messages = [
      { role: 'system',  content: SYSTEM_PROMPT },
      { role: 'user',    content: text },
    ];

    const output = await _pipe!(messages, {
      max_new_tokens: Math.max(32, Math.ceil(text.split(/\s+/).length * 0.6)),
      do_sample:      false,
      return_full_text: false,
    });

    // The model returns the new assistant message only (return_full_text: false)
    const raw = output?.[0]?.generated_text;
    const result = extractAssistantText(raw);

    if (!result || result.length >= text.length) {
      return null;  // not shorter — don't use
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Whether SmolLM2 is currently loaded and ready.
 */
export function isSmolLMReady(): boolean {
  return _pipe !== null;
}

/**
 * Whether the last load attempt failed.
 */
export function smolLMLoadError(): string | null {
  return _loadError;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAssistantText(
  raw: unknown
): string {
  // return_full_text: false → generated_text is a string
  if (typeof raw === 'string') {
    return raw.trim();
  }
  // Fallback: array of messages
  if (Array.isArray(raw)) {
    const last = raw[raw.length - 1];
    if (last && typeof last.content === 'string') {
      return last.content.trim();
    }
  }
  return '';
}

function waitUntil(condition: () => boolean, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (condition() || Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve();
      }
    }, 200);
  });
}

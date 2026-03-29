import * as http from 'http';
import { CompletionRequest, CompletionResponse } from './types';
import { runtimeManager } from './runtimeManager';
import { compressWithSmolLM2 } from './smollmProvider';
import { getSettings } from '../storage/settings';

interface OAICompletionResponse {
  choices?: Array<{ text?: string }>;
  usage?: { total_tokens?: number };
}

// ─── SmolLM2 ChatML prompt template ──────────────────────────────────────────
//
// SmolLM2-360M-Instruct uses the ChatML format:
//   <|im_start|>system\n…<|im_end|>\n<|im_start|>user\n…<|im_end|>\n<|im_start|>assistant\n
//
// We give it a strict system prompt so it returns ONLY the compressed text,
// no commentary, no explanations — ready to copy straight into an AI assistant.

const COMPRESSION_SYSTEM_PROMPT = `You are a prompt compression assistant for coding tasks.
Your job: rewrite the user's prompt to use fewer tokens while keeping all meaning.
Rules:
- Keep ALL technical terms, code names, constraints, and requirements.
- Remove filler words, polite phrasing, and redundant language.
- Do NOT add new content or change the intent.
- Output ONLY the compressed prompt. No explanations. No preamble.`;

function buildChatMLPrompt(userText: string): string {
  return [
    `<|im_start|>system`,
    COMPRESSION_SYSTEM_PROMPT,
    `<|im_end|>`,
    `<|im_start|>user`,
    userText,
    `<|im_end|>`,
    `<|im_start|>assistant`,
    '',
  ].join('\n');
}

// ─── Core completion call ─────────────────────────────────────────────────────

export async function localCompletion(
  req: CompletionRequest
): Promise<CompletionResponse> {
  if (!runtimeManager.isRunning) {
    throw new Error('Local AI runtime is not running.');
  }

  const body = JSON.stringify({
    prompt: req.prompt,
    max_tokens: req.maxTokens ?? 256,
    temperature: req.temperature ?? 0.2,
    stop: req.stop ?? ['<|im_end|>', '<|im_start|>'],
  });

  const raw = await httpPost(
    runtimeManager.endpointBase + '/v1/completions',
    body
  );

  const parsed = JSON.parse(raw) as OAICompletionResponse;
  const text = (parsed.choices?.[0]?.text ?? '').trim();
  const tokensUsed = parsed.usage?.total_tokens ?? 0;

  return { text, tokensUsed };
}

/**
 * Attempt a local AI completion; returns null and falls back to rules-only
 * mode if the runtime is unavailable.
 */
export async function tryLocalCompletion(
  req: CompletionRequest
): Promise<CompletionResponse | null> {
  try {
    return await localCompletion(req);
  } catch {
    return null;
  }
}

// ─── AI-assisted compression ──────────────────────────────────────────────────

/**
 * Send `text` to SmolLM2 for AI-assisted compression.
 *
 * Returns the compressed string if SmolLM2 is running AND produced a shorter
 * result. Otherwise returns null so the caller falls back to rule-based output.
 *
 * Safety rules:
 * - Never returns a result longer than the input (no accidental expansion).
 * - Never returns an empty string.
 * - Strips any ChatML stop tokens the model may have leaked.
 */
export async function compressWithAI(text: string): Promise<string | null> {
  const settings = getSettings();

  // ── Nano profile: run SmolLM2 in-process via @huggingface/transformers ───────
  // No llamafile binary required. The model (~400 MB) downloads automatically
  // on first use and is cached in ~/.cache/huggingface/hub.
  if (settings.localAIModelProfile === 'nano') {
    return compressWithSmolLM2(text);
  }

  // ── Other profiles: delegate to the llamafile HTTP runtime ───────────────────
  if (!runtimeManager.isRunning) {
    return null;
  }

  const prompt = buildChatMLPrompt(text);

  const response = await tryLocalCompletion({
    prompt,
    maxTokens: Math.max(64, Math.ceil(text.length / 2)),
    temperature: 0.1,   // low temperature = more deterministic compression
    stop: ['<|im_end|>', '<|im_start|>'],
  });

  if (!response) { return null; }

  const result = sanitiseAIOutput(response.text);

  // Only use AI output if it's actually shorter and not empty
  if (!result || result.length >= text.length) {
    return null;
  }

  return result;
}

/**
 * Strip any ChatML artefacts the model may have included in its output.
 */
function sanitiseAIOutput(raw: string): string {
  return raw
    .replace(/<\|im_start\|>[\s\S]*/g, '')   // cut off if model kept generating
    .replace(/<\|im_end\|>/g, '')
    .replace(/^(assistant\s*:?\s*)/i, '')      // strip "assistant:" prefix if leaked
    .trim();
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function httpPost(url: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Local AI request failed: HTTP ${res.statusCode}`));
        } else {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

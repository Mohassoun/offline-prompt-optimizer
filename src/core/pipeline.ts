import { CompressionMode, CompressionResult, PipelineContext } from './types';
import { normalizeWhitespace, normalizePunctuation } from '../preprocess/normalize';
import { detectProtectedRanges } from '../preprocess/protectRanges';
import { classifyContent } from '../classify/contentClassifier';
import { extractIntent } from '../intent/extractIntent';
import { compress } from '../compress/compressEngine';
import { getCurrentTokenizer } from '../tokenizer/tokenizerAdapter';
import { getSettings } from '../storage/settings';
import { compressWithAI } from '../localai/localAIProvider';

export async function runPipeline(
  input: string,
  mode?: CompressionMode
): Promise<CompressionResult> {
  const settings = getSettings();
  const resolvedMode = mode ?? settings.defaultMode;

  const ctx: PipelineContext = {
    input,
    mode: resolvedMode,
    normalized: '',
    protectedRanges: [],
    contentType: 'prose',
    intent: { action: '', target: '', constraints: [], responseStyle: [], rawText: input },
    compressed: '',
    appliedRules: [],
  };

  ctx.normalized = normalizePunctuation(normalizeWhitespace(input));

  const extraPatterns = settings.protectedPatterns
    .map(p => { try { return new RegExp(p, 'g'); } catch { return null; } })
    .filter((p): p is RegExp => p !== null);

  ctx.protectedRanges = detectProtectedRanges(ctx.normalized, extraPatterns);

  ctx.contentType = classifyContent(ctx.normalized);

  ctx.intent = extractIntent(ctx.normalized);

  const engineResult = compress(
    ctx.normalized,
    ctx.mode,
    ctx.contentType,
    ctx.protectedRanges
  );

  ctx.compressed = engineResult.text;
  ctx.appliedRules = engineResult.appliedRules;

  // ── AI pass (SmolLM2) ─────────────────────────────────────────────────────
  // Only runs when:  (a) local AI is enabled in settings
  //                 (b) the runtime process is actually running
  //                 (c) the model produces a genuinely shorter result
  // Falls back silently to rule-based output if any of those fail.
  if (settings.localAIEnabled) {
    try {
      const aiResult = await compressWithAI(ctx.compressed || ctx.normalized);
      if (aiResult) {
        ctx.compressed = aiResult;
        ctx.appliedRules = [...ctx.appliedRules, 'smollm2-ai'];
      }
    } catch {
      // runtime unavailable — stay with rule-based result
    }
  }

  const tokenizer = getCurrentTokenizer();
  const stats = tokenizer.estimateSavings(ctx.normalized, ctx.compressed);

  return {
    original: ctx.normalized,
    compressed: ctx.compressed,
    tokensBefore: stats.tokensBefore,
    tokensAfter: stats.tokensAfter,
    savedTokens: stats.savedTokens,
    savedPercent: stats.savedPercent,
    mode: ctx.mode,
    contentType: ctx.contentType,
    intent: ctx.intent,
    appliedRules: ctx.appliedRules,
    protectedRanges: ctx.protectedRanges,
  };
}

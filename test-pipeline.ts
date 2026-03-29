/**
 * Standalone pipeline test — no VS Code runtime needed.
 * Manually wires the same steps as src/core/pipeline.ts
 * but inlines the settings so vscode is never imported.
 */
import { normalizeWhitespace, normalizePunctuation } from './src/preprocess/normalize';
import { detectProtectedRanges } from './src/preprocess/protectRanges';
import { classifyContent } from './src/classify/contentClassifier';
import { extractIntent } from './src/intent/extractIntent';
import { compress } from './src/compress/compressEngine';
import { estimateSavings } from './src/tokenizer/gptTokenizer';
import { CompressionMode } from './src/core/types';

const INPUT = `Please help me refactor this function so that it is more readable and maintainable.
I would like you to make sure that you do not change any of the existing behavior.
It is important that all the edge cases are still handled properly as they are now.
As you know, the function currently handles both authenticated and unauthenticated users.
Can you please also make sure to add comments where necessary to explain the logic.
I want you to preserve the existing error handling without adding any new dependencies.
Kindly ensure that the output format stays exactly the same as it currently is.
Please make sure that all the existing unit tests continue to pass after your changes.`;

const MODE: CompressionMode = 'balanced';

function runPipeline(input: string, mode: CompressionMode) {
  // Step 1: Normalize
  const normalized = normalizePunctuation(normalizeWhitespace(input));

  // Step 2: Protect ranges
  const protectedRanges = detectProtectedRanges(normalized, []);

  // Step 3: Classify content
  const contentType = classifyContent(normalized);

  // Step 4: Extract intent
  const intent = extractIntent(normalized);

  // Step 5: Compress
  const { text: compressed, appliedRules } = compress(normalized, mode, contentType, protectedRanges);

  // Step 6: Tokenize
  const stats = estimateSavings(normalized, compressed);

  return { normalized, compressed, contentType, intent, appliedRules, ...stats };
}

const result = runPipeline(INPUT, MODE);

const HR = '─'.repeat(72);

console.log('\n' + HR);
console.log('  OFFLINE PROMPT OPTIMIZER — Pipeline Test');
console.log(HR);

console.log('\n📥 ORIGINAL TEXT:\n');
console.log(result.normalized);

console.log('\n' + HR);
console.log('\n📤 COMPRESSED TEXT:\n');
console.log(result.compressed);

console.log('\n' + HR);
console.log('\n📊 TOKEN STATS:\n');
console.log(`  Tokens before : ${result.tokensBefore}`);
console.log(`  Tokens after  : ${result.tokensAfter}`);
console.log(`  Saved tokens  : ${result.savedTokens}`);
console.log(`  Savings       : ${result.savedPercent}%`);
console.log(`  Mode          : ${MODE}`);
console.log(`  Content type  : ${result.contentType}`);

console.log('\n📋 INTENT EXTRACTED:\n');
console.log(`  Action        : ${result.intent.action}`);
console.log(`  Target        : ${result.intent.target}`);
console.log(`  Constraints   : ${result.intent.constraints.length > 0 ? result.intent.constraints.join(' | ') : '(none)'}`);
console.log(`  Response style: ${result.intent.responseStyle.length > 0 ? result.intent.responseStyle.join(', ') : '(none)'}`);

console.log('\n🔧 APPLIED RULES:\n');
if (result.appliedRules.length > 0) {
  result.appliedRules.forEach(r => console.log(`  - ${r}`));
} else {
  console.log('  (none)');
}

console.log('\n' + HR + '\n');

# Offline Prompt Optimizer - Implementation Documentation

## Project summary

Offline Prompt Optimizer is a VS Code extension that compresses prompts locally.
It combines deterministic rewrite rules, content-aware strategies, and optional local AI assistance.
The extension is designed to keep core functionality usable even when local AI is unavailable.

## What is implemented now

- Local prompt compression pipeline with before/after token estimation
- Content classification for `prose`, `code`, `json`, `logs`, `diff`, and `mixed`
- Protected-range handling (code blocks, inline code, URLs, paths, versions, env vars, quoted strings, error lines, and custom regex patterns)
- Webview panel with input prompt area, mode switch (`safe`, `balanced`, `aggressive`), compression output, basic diff visualization, applied rule tags, and copy/apply actions
- Command Palette and editor context menu commands
- Status bar token counter (document or selection)
- Optional Local AI setup, repair, removal, and status reporting

## Commands

Registered commands in `package.json`:

- `offline-prompt-optimizer.openPromptOptimizer`
- `offline-prompt-optimizer.compressSelection`
- `offline-prompt-optimizer.previewCompressionDiff`
- `offline-prompt-optimizer.copyCompressedPrompt`
- `offline-prompt-optimizer.toggleCompressionMode`
- `offline-prompt-optimizer.setupLocalAI`
- `offline-prompt-optimizer.repairLocalAI`
- `offline-prompt-optimizer.removeLocalAIAssets`
- `offline-prompt-optimizer.showLocalAIStatus`

## Quick setup button for Local AI

Use this quick action in VS Code Markdown preview:

[Run Setup Local AI](command:offline-prompt-optimizer.setupLocalAI)

If the command link is disabled in your environment, follow these steps:

1. Press `Ctrl + Shift + P`.
2. Type: `Setup Local AI`.
3. Select: `Offline Prompt Optimizer: Setup Local AI`.

## Compression pipeline

Pipeline entry: `src/core/pipeline.ts`.

Execution flow:

1. Normalize whitespace and punctuation.
2. Detect protected ranges.
3. Classify content type.
4. Extract intent (action, target, constraints, response style).
5. Apply strategy + rule-based compression.
6. Optionally run Local AI compression pass.
7. Compute token savings and return structured result.

If the Local AI pass fails, is unavailable, or produces a longer output, the extension silently keeps the rule-based result.

## Local AI profiles

Model selection is implemented in `src/localai/setupFlow.ts` and `src/localai/catalog.ts`.

- `Nano — SmolLM2 360M (Recommended)`
- in-process (`@huggingface/transformers`)
- no external runtime process needed
- first use downloads and caches SmolLM2 assets locally
- profile key: `nano`

- `Low Memory — Phi-3 Mini`
- uses `llamafile` server runtime + GGUF model download
- profile key: `low-memory`

- `Balanced — Mistral 7B`
- uses `llamafile` server runtime + GGUF model download
- profile key: `balanced`

Runtime process management for non-nano profiles is in `src/localai/runtimeManager.ts`.

## Settings

User settings namespace: `offlinePromptOptimizer`.

- `offlinePromptOptimizer.defaultMode`
- `offlinePromptOptimizer.defaultTokenizer`
- `offlinePromptOptimizer.protectedPatterns`
- `offlinePromptOptimizer.localAI.enabled`
- `offlinePromptOptimizer.localAI.runtime`
- `offlinePromptOptimizer.localAI.modelProfile`

## Storage and setup state

Persistent Local AI metadata is handled by `src/localai/storageManager.ts`.

- Setup state key: `localai.setupState` (global state)
- Runtime assets: `<globalStorage>/runtime`
- Model assets: `<globalStorage>/models`

Setup status values:

- `not-installed`
- `downloading-runtime`
- `downloading-model`
- `ready`
- `error`

## Main code map

- Extension entry and command wiring: `src/extension.ts`
- Webview UI and message handling: `src/ui/panel/webview.ts`, `src/ui/panel/state.ts`
- Compression orchestration: `src/core/pipeline.ts`
- Rule engine: `src/compress/compressEngine.ts`, `src/rules/*`
- Classification and intent extraction: `src/classify/*`, `src/intent/*`
- Token counting: `src/tokenizer/*`
- Local AI setup/runtime/providers: `src/localai/*`
- Local AI commands: `src/commands/setupLocalAI.ts`, `src/commands/repairLocalAI.ts`, `src/commands/removeLocalAIAssets.ts`, `src/commands/showLocalAIStatus.ts`

## Validation and tests

Tests are in `src/testing/*` and run with:

```bash
npm test
```

Type-checking:

```bash
npm run compile
```


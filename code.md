# Code Map & Libraries
## Project Overview
This is a **small, focused** VSCode extension project: **Offline Prompt Optimizer**. It compresses coding prompts locally to save tokens, using deterministic rules, no cloud needed. Easy to learn/replicate - clone, `npm install`, `npm run build`.

Full code is in `src/`. Compiled output: `dist/extension.js`.

## dist/extension.js Info
- **Path**: `c:/Users/001/Desktop/new_extation/dist/extension.js`
- **How it's built**: Bundled from `src/extension.ts` using esbuild:
  ```
  npm run build
  # esbuild ./src/extension.ts --bundle --outfile=./dist/extension.js --external:vscode --platform=node --format=cjs
  ```
- Single JS file for VSCode extension entrypoint (activation, commands registration).

## Code Map (Key Files by Module)
Project structured for modularity. Here's every coded part with paths:

### Entry & Commands (`src/`)
- `src/extension.ts`: Main entrypoint, registers commands, handles activation.

### Core Pipeline (`src/core/`)
- `src/core/pipeline.ts`: Orchestrates preprocessing -> classify -> intent -> compress -> tokenize.
- `src/core/types.ts`: Shared types/interfaces.

### Commands (`src/commands/`)
- `src/commands/compressSelection.ts`: Compress editor selection.
- `src/commands/openOptimizer.ts`: Open UI panel.
- `src/commands/previewDiff.ts`: Show before/after diff.
- `src/commands/setupLocalAI.ts`: LocalAI setup.
- Others: repairLocalAI, removeLocalAIAssets, showLocalAIStatus.

### Preprocessing (`src/preprocess/`)
- `src/preprocess/normalize.ts`: Whitespace/punctuation normalization.
- `src/preprocess/protectRanges.ts`: Mark protected code/paths.

### Content Classification (`src/classify/`)
- `src/classify/contentClassifier.ts`: Detects prose/code/JSON/logs/diff.

### Intent Extraction (`src/intent/`)
- `src/intent/canonicalize.ts`: Standardize phrases.
- `src/intent/extractIntent.ts`: Pull action/target/constraints.

### Compression (`src/compress/`)
- `src/compress/compressEngine.ts`: Applies strategies by level (safe/balanced/aggressive).
- `src/compress/strategies/`: codeContext.ts, diff.ts, json.ts, logs.ts, prose.ts.

### Rules (`src/rules/`)
- `src/rules/ruleRegistry.ts`: Loads/manages rules.
- `src/rules/builtins/`: actionRules.ts, constraintRules.ts, fillerRules.ts.

### LocalAI (`src/localai/`)
- `src/localai/localAIProvider.ts`: Integrates LocalAI/SmolLM.
- Others: catalog.ts, modelInstaller.ts, runtimeInstaller.ts, setupFlow.ts, etc.

### Storage/UI/Tokenizer (`src/storage/`, `src/ui/`, `src/tokenizer/`)
- `src/storage/settings.ts`, `src/storage/workspaceRules.ts`: Config persistence.
- `src/ui/panel/webview.ts`, `src/ui/panel/state.ts`: Diff/preview UI.
- `src/tokenizer/gptTokenizer.ts`, `src/tokenizer/tokenizerAdapter.ts`: Local token counting.

### Testing (`src/testing/`)
- `src/testing/*.test.ts`: Unit tests for pipeline, strategies, LocalAI, etc.

**Total: ~50 focused TS files.** Search paths above for specific features.

## Downloaded Libraries (npm deps)
For learning/replication (`npm install` these):

### Production
- `@huggingface/transformers@^3.8.1`: Local ML models (e.g., SmolLM for optional AI assist).
- `diff@^5.2.0`: Side-by-side diffs in UI.
- `gpt-tokenizer@^2.8.1`: Accurate GPT token counting offline.

### Dev/Build
- `esbuild@^0.20.0`: Fast bundler (builds extension.js).
- `typescript@^5.3.3`: TS compiler.
- `vitest@^4.1.2`: Testing (`npm test`).
- `@types/*`: Type defs for VSCode/node/diff.

**No heavy runtime deps** - runs on any machine with Node/VSCode.

## Quick Start for Learners
1. `git clone` project.
2. `npm install`
3. `npm run build` → generates `dist/extension.js`
4. VSCode: F5 to test, or `vsce package` for .vsix.

This keeps it **small path**: core compression in ~10 files, extensible via rules/UI.

Happy coding! 🚀


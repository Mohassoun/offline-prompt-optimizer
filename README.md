# Offline Prompt Optimizer

Privacy-first VS Code extension for compressing prompts locally.  
It helps you reduce token usage while preserving intent, with optional local AI assistance.

## Features

- Local prompt compression inside VS Code
- Multiple compression modes: `safe`, `balanced`, `aggressive`
- Token savings stats (before, after, saved)
- Compression diff preview
- Context menu actions on selected text
- Optional Local AI setup for stronger compression
- Works without cloud API keys for core rule-based compression

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [VS Code](https://code.visualstudio.com/) 1.85.0+

## Setup

1. Install dependencies:

```bash
npm install
```

2. Build extension bundle:

```bash
npm run build
```

3. Open this folder in VS Code and press `F5` to launch the Extension Development Host.

## Usage

1. Select prompt text in the editor (or use the full document).
2. Run one of:
   - `Open Prompt Optimizer`
   - `Compress Selected Prompt`
   - `Preview Compression Diff`
3. Review token savings and copy/apply compressed output.

## Extension Commands

| Command ID | Title |
|---|---|
| `offline-prompt-optimizer.openPromptOptimizer` | Open Prompt Optimizer |
| `offline-prompt-optimizer.compressSelection` | Compress Selected Prompt |
| `offline-prompt-optimizer.previewCompressionDiff` | Preview Compression Diff |
| `offline-prompt-optimizer.copyCompressedPrompt` | Copy Compressed Prompt |
| `offline-prompt-optimizer.toggleCompressionMode` | Toggle Compression Mode |
| `offline-prompt-optimizer.setupLocalAI` | Offline Prompt Optimizer: Setup Local AI |
| `offline-prompt-optimizer.repairLocalAI` | Offline Prompt Optimizer: Repair Local AI Setup |
| `offline-prompt-optimizer.removeLocalAIAssets` | Offline Prompt Optimizer: Remove Local AI Assets |
| `offline-prompt-optimizer.showLocalAIStatus` | Offline Prompt Optimizer: Show Local AI Status |

## Configuration

Settings namespace: `offlinePromptOptimizer`

- `offlinePromptOptimizer.defaultMode`: `safe | balanced | aggressive`
- `offlinePromptOptimizer.defaultTokenizer`: tokenizer for token counting
- `offlinePromptOptimizer.protectedPatterns`: extra regex patterns protected from compression
- `offlinePromptOptimizer.localAI.enabled`: enable AI-assisted local compression
- `offlinePromptOptimizer.localAI.runtime`: `llamafile | llama.cpp`
- `offlinePromptOptimizer.localAI.modelProfile`: `nano | low-memory | balanced`

## Local AI Notes

- `nano` profile uses SmolLM2 in-process (smallest setup).
- Other profiles can download larger local runtime/model files.
- Rule-based compression still works even if Local AI is not enabled.

## Scripts

- `npm run build` - Bundle extension to `dist/extension.js`
- `npm run watch` - Bundle in watch mode
- `npm run compile` - Type-check only (`tsc --noEmit`)
- `npm run test` - Run tests
- `npm run package` - Build `.vsix` package

## Project Structure

```text
new_extation/
  src/                 Extension source code
  dist/                Bundled output
  package.json         Extension manifest
  tsconfig.json        TypeScript config
  vitest.config.ts     Test config
  README.md            Project documentation
```

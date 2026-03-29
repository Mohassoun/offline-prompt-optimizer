# Technologies

## Technology strategy

The project should start with a TypeScript-first stack because it is the most practical choice for a VS Code extension.

The first version should avoid:
- Python runtime dependency
- C or C++ native modules
- heavy NLP models
- cloud APIs for core compression

The goal is a simple, portable, offline-first extension.

## Core stack

## 1. Language

### TypeScript
Main language for the full MVP.

Why:
- native fit for VS Code extensions
- strong tooling
- easy packaging
- good maintainability
- shared language for UI and logic

Use TypeScript for:
- command registration
- pipeline orchestration
- compression rules
- tokenizer integration
- local storage
- webview communication

## 2. Extension platform

### VS Code Extension API
Used for:
- commands
- editor selection access
- status bar items
- webview panels
- workspace/global settings
- clipboard interaction

## 3. UI layer

### Webview
Use a webview for the main compression interface.

The webview will display:
- original prompt
- compressed prompt
- token stats
- diff preview
- compression level selector
- apply/copy buttons

### HTML + CSS + TypeScript
Enough for the first version.

Optional later:
- lightweight UI framework if needed
- component system for larger panels

## 4. Storage

### workspaceState / globalState
Use VS Code built-in storage for:
- user preferences
- compression mode
- saved aliases
- custom rule overrides
- tokenizer preference
- local AI setup metadata
- installed runtime metadata
- installed model metadata

### settings.json integration
Use extension settings for:
- default mode
- protected patterns
- preferred tokenizer
- rule enable/disable options
- local AI enable/disable
- preferred runtime (`llamafile` or `llama.cpp`)
- preferred model profile

### Local asset location
Downloaded runtime and model files should be stored in extension-owned storage:
- `context.globalStorageUri`
- never committed to project source
- safe cleanup path for uninstall/repair flows

## 5. Tokenizer layer

The extension needs real token counting.

### Primary option: gpt-tokenizer
Recommended for MVP.

Why:
- TypeScript-native
- easy integration
- local
- good developer ergonomics
- no Python dependency

Use for:
- before/after token counts
- target budget checks
- live status bar updates

### Optional second option: tiktoken JS/WASM
Add later as an advanced mode.

Why:
- closer parity with OpenAI encodings
- useful for users who want more exact counts

Trade-off:
- more packaging complexity

## 6. Rule engine

### Custom deterministic rules engine
Build internally.

Why not use a heavy NLP framework first:
- we need safety and explainability
- rules are easier to test
- faster to ship
- simpler offline behavior

The rule engine should support:
- ordered execution
- content-type targeting
- safety levels
- enable/disable flags
- canonical phrase mapping
- protected spans

Rule source format:
- JSON or TypeScript objects in MVP
- YAML import later if needed

## 7. Pattern matching

### Regex + structured matchers
Primary mechanism for initial rule detection.

Use for:
- filler removal
- constraint detection
- response style extraction
- phrase canonicalization

### Optional fuzzy matching with Fuse.js
Useful later for:
- near-match intent phrases
- spelling variants
- light tolerance for user wording

Not required for version 1.

## 8. Diff rendering

### jsdiff or equivalent lightweight diff library
Use for:
- before/after comparison
- inline and side-by-side change display

This improves trust and usability.

## 9. Testing

### Vitest or Jest
Recommended for:
- unit tests
- rule regression tests
- snapshot tests for compression results

### Test categories
- normalization tests
- intent extraction tests
- protected content tests
- token budget tests
- regression prompts
- edge case prompts

## 10. Packaging and build

### esbuild or tsup
Use for bundling extension code.

Goals:
- small bundle
- fast build
- clean development workflow

### Runtime delivery strategy
To keep extension install size small:
- do not bundle models in the extension package
- avoid bundling large runtime artifacts by default
- download runtime/model on first-run setup with explicit user consent

Recommended onboarding path:
- default runtime: `llamafile` (single artifact, easiest setup)
- advanced option: `llama.cpp` (manual path and advanced controls)

## Recommended dependency groups

## Runtime dependencies
- VS Code Extension API
- gpt-tokenizer
- lightweight diff library
- optional Fuse.js later
- downloader + checksum verification utilities (for setup flow)
- process manager utilities for local runtime lifecycle

## Development dependencies
- TypeScript
- bundler
- test framework
- linting
- formatting

## Source tree reference

```text
src/
  extension.ts
  commands/
    openOptimizer.ts
    compressSelection.ts
    previewDiff.ts
  core/
    pipeline.ts
    types.ts
  preprocess/
    normalize.ts
    protectRanges.ts
  classify/
    contentClassifier.ts
  intent/
    extractIntent.ts
    canonicalize.ts
  compress/
    compressEngine.ts
    strategies/
      prose.ts
      codeContext.ts
      json.ts
      logs.ts
      diff.ts
  rules/
    ruleRegistry.ts
    builtins/
      fillerRules.ts
      constraintRules.ts
      actionRules.ts
  tokenizer/
    tokenizerAdapter.ts
    gptTokenizer.ts
    tiktokenAdapter.ts
  ui/
    panel/
      webview.ts
      state.ts
  storage/
    settings.ts
    workspaceRules.ts
  testing/
    fixtures/
    regression/
```

## Not recommended for MVP

### Python
Useful for experimentation, but not recommended in the shipped extension.

Problems:
- runtime dependency
- deployment complexity
- user environment mismatch

### C / C++
Too heavy for version 1.

Problems:
- packaging complexity
- native build issues
- unnecessary early optimization

### Rust
Good future option, not required now.

Possible later uses:
- faster tokenizer
- high-performance matching engine
- WASM portability

## Future technology upgrades

### Version 2 ideas
- Rust/WASM tokenizer path
- language-specific AST-aware modules
- plugin rule packs
- optional offline local model for advanced rewrite suggestions
- multi-provider token profile support
- one-click runtime/model updater with version pinning

## Recommended stack summary

### MVP
- TypeScript
- VS Code Extension API
- Webview
- gpt-tokenizer
- custom rules engine
- regex-based intent extraction
- lightweight diff library
- workspace/globalState persistence
- first-run local AI setup flow (download runtime + model)

### Later
- optional tiktoken WASM
- optional Fuse.js fuzzy matching
- optional Rust/WASM acceleration

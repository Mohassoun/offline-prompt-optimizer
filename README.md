# new-extation

A basic VS Code extension scaffold.

## Features

This extension contributes a simple **Hello World** command accessible via the Command Palette.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [VS Code](https://code.visualstudio.com/) (v1.85.0 or later)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile the TypeScript source:
   ```bash
   npm run compile
   ```

3. Press `F5` in VS Code to open a new Extension Development Host window.

## Usage

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type **Hello World** and select the command
3. A notification will appear: *Hello World from new-extation!*

## Project Structure

```
new_extation/
├── src/
│   └── extension.ts   # Extension entry point
├── out/               # Compiled JavaScript (generated)
├── package.json       # Extension manifest
├── tsconfig.json      # TypeScript configuration
├── .vscodeignore      # Files to exclude from packaging
└── README.md          # This file
```

## Extension Commands

| Command | Description |
|---|---|
| `new-extation.helloWorld` | Shows a Hello World information message |

## Development

- `npm run compile` — Compile TypeScript once
- `npm run watch` — Watch and recompile on changes
- `npm run lint` — Lint the source files

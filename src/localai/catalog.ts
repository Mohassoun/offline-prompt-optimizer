import { ModelArtifact, RuntimeCatalogEntry } from './types';

// llamafile 0.8.15 — single cosmopolitan binary (rename to .exe on Windows)
// sha256: empty string = skip checksum verification (fill in from official release page before shipping)
// Real hashes: https://github.com/Mozilla-Ocho/llamafile/releases/tag/0.8.15
export const RUNTIME_CATALOG: RuntimeCatalogEntry = {
  type: 'llamafile',
  version: '0.8.15',
  platforms: {
    win32: {
      x64: {
        url: 'https://github.com/Mozilla-Ocho/llamafile/releases/download/0.8.15/llamafile-0.8.15',
        filename: 'llamafile.exe',
        sha256: '',
        version: '0.8.15',
      },
    },
    linux: {
      x64: {
        url: 'https://github.com/Mozilla-Ocho/llamafile/releases/download/0.8.15/llamafile-0.8.15',
        filename: 'llamafile',
        sha256: '',
        version: '0.8.15',
      },
      arm64: {
        url: 'https://github.com/Mozilla-Ocho/llamafile/releases/download/0.8.15/llamafile-0.8.15',
        filename: 'llamafile',
        sha256: '',
        version: '0.8.15',
      },
    },
    darwin: {
      x64: {
        url: 'https://github.com/Mozilla-Ocho/llamafile/releases/download/0.8.15/llamafile-0.8.15',
        filename: 'llamafile',
        sha256: '',
        version: '0.8.15',
      },
      arm64: {
        url: 'https://github.com/Mozilla-Ocho/llamafile/releases/download/0.8.15/llamafile-0.8.15',
        filename: 'llamafile',
        sha256: '',
        version: '0.8.15',
      },
    },
  },
};

// sha256: empty string = skip checksum verification (fill in from HuggingFace model card before shipping)
// Real hashes: compute with `sha256sum <file>` after downloading, or check HuggingFace file details page
export const MODEL_CATALOG: ModelArtifact[] = [
  {
    // SmolLM2-360M-Instruct — English-optimised, only 386 MB, runs on any device
    // Source: https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF
    id: 'smollm2-360m-q8',
    name: 'SmolLM2 360M Instruct (Q8_0) — English',
    profile: 'nano',
    url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf',
    filename: 'smollm2-360m-instruct-q8_0.gguf',
    sha256: '',
    sizeBytes: 386_000_000,
    description: '~386 MB — English-focused, runs on any device (4 GB RAM+)',
  },
  {
    id: 'phi-3-mini-q4',
    name: 'Phi-3 Mini (Q4_K_M)',
    profile: 'low-memory',
    url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf',
    filename: 'phi-3-mini-q4.gguf',
    sha256: '',
    sizeBytes: 2_390_000_000,
    description: '~2.4 GB — best for 8 GB RAM devices',
  },
  {
    id: 'mistral-7b-q4',
    name: 'Mistral 7B Instruct (Q4_K_M)',
    profile: 'balanced',
    url: 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    filename: 'mistral-7b-instruct-q4.gguf',
    sha256: '',
    sizeBytes: 4_370_000_000,
    description: '~4.4 GB — best for 16 GB+ RAM devices',
  },
];

export function getModelForProfile(profile: 'nano' | 'low-memory' | 'balanced'): ModelArtifact {
  const model = MODEL_CATALOG.find((m) => m.profile === profile);
  if (!model) {
    throw new Error(`No model found for profile: ${profile}`);
  }
  return model;
}

export function getRuntimeArtifact(): { url: string; filename: string; sha256: string; version: string } {
  const platform = process.platform as NodeJS.Platform;
  const arch = process.arch;

  const platformEntries = RUNTIME_CATALOG.platforms[platform];
  if (!platformEntries) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const artifact = platformEntries[arch] ?? platformEntries['x64'];
  if (!artifact) {
    throw new Error(`No runtime artifact for ${platform}/${arch}`);
  }

  return artifact;
}
